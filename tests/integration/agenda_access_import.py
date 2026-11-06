"""Executado pelo E2E somente no PostgreSQL descartavel nexomed_qa."""

from pathlib import Path
import tempfile
import unittest

import psycopg
from psycopg import sql
from psycopg.rows import dict_row

from api.config import Settings
from api.services.agenda import FIELDS
from scripts.import_agenda_access import apply_plan, build_plan, snapshot


class ImportIntegrationTests(unittest.TestCase):
    def setUp(self):
        settings = Settings.from_env()
        self.conn = psycopg.connect(settings.database_url or "", **settings.database_kwargs(),
                                    row_factory=dict_row, autocommit=True, connect_timeout=5,
                                    options="-c timezone=UTC -c statement_timeout=15000")
        if self.conn.info.dbname != "nexomed_qa":
            self.conn.close()
            raise RuntimeError("Testes limitados ao banco descartavel")
        self.created = []
        self.folder = tempfile.TemporaryDirectory()
        self.addCleanup(self.folder.cleanup)
        self.addCleanup(self.conn.close)
        self.addCleanup(self.cleanup_rows)

    def cleanup_rows(self):
        if self.created:
            self.conn.execute('DELETE FROM agenda_licitacoes."AGENDA_LICITACOES" WHERE "CHAVE"=ANY(%s)', (self.created,))

    def create(self, label, **values):
        data = {**dict.fromkeys(FIELDS), "empresa": "BML", "pregao": "QA-" + label,
                "uf": "SP", "orgao": "Hospital QA " + label, "data_lances": "2026-11-06", **values}
        columns = sql.SQL(",").join(map(sql.Identifier, FIELDS))
        placeholders = sql.SQL(",").join(sql.Placeholder() for _ in FIELDS)
        key = self.conn.execute(sql.SQL('INSERT INTO agenda_licitacoes."AGENDA_LICITACOES" ({}) VALUES ({}) RETURNING "CHAVE"').format(columns, placeholders),
                                [data[f] for f in FIELDS]).fetchone()["CHAVE"]
        self.created.append(key)
        return {"CHAVE": str(key), **data}

    def source(self, rows):
        return {"path": "/synthetic-fixture.xlsx", "sha256": "fixture", "sheet": "AGENDA_LICITACAO", "warnings": [], "rows": rows}

    def test_reconcile_preserves_hub_keys_and_is_idempotent(self):
        a = self.create("UPDATE", observacoes_status="ANTIGO")
        b = self.create("UNCHANGED")
        c = self.create("COLLISION")
        d = self.create("ALIAS", observacoes_status="ANTIGO")
        e = self.create("HUBONLY")
        new_collision = {**c, "pregao": "QA-NOVA-LICITACAO", "orgao": "Outro Hospital", "uf": "RO"}
        cross_key = {**d, "CHAVE": "9000000", "orgao": "Nome Alternativo QA", "observacoes_status": "NOVO"}
        new = {**a, "CHAVE": "9000001", "pregao": "QA-NEW", "orgao": "Hospital Novo QA"}
        source = self.source([{**a, "observacoes_status": "NOVO"}, b, new_collision, cross_key, new])
        before = snapshot(self.conn)
        plan = build_plan(source, before, self.conn.info.dbname)
        self.assertEqual((plan["summary"]["updates"], plan["summary"]["inserts"], plan["summary"]["unchanged"]), (2, 2, 1))
        with self.conn.transaction():
            receipt = apply_plan(self.conn, plan, source, Path(self.folder.name) / "backup.json")
        self.created.extend(int(item["target_key"]) for item in receipt["inserted_mapping"])
        after = snapshot(self.conn)
        final = {str(r["CHAVE"]): r for r in after}
        previous = {str(r["CHAVE"]): r for r in before}
        self.assertEqual(final[c["CHAVE"]], previous[c["CHAVE"]])
        self.assertEqual(final[e["CHAVE"]], previous[e["CHAVE"]])
        self.assertEqual(final[a["CHAVE"]]["observacoes_status"], "NOVO")
        self.assertEqual(final[d["CHAVE"]]["observacoes_status"], "NOVO")
        repeated = build_plan(source, after, self.conn.info.dbname)
        self.assertEqual((repeated["summary"]["updates"], repeated["summary"]["inserts"], repeated["summary"]["unchanged"]), (0, 0, 5))
        self.assertEqual(repeated["ambiguous"], [])
        self.assertEqual((Path(self.folder.name) / "backup.json").stat().st_mode & 0o777, 0o600)

    def test_concurrent_edit_invalidates_plan_before_writing(self):
        row = self.create("CONCURRENT", observacoes_status="ANTIGO")
        source = self.source([{**row, "observacoes_status": "NOVO"}])
        plan = build_plan(source, snapshot(self.conn), self.conn.info.dbname)
        self.conn.execute('UPDATE agenda_licitacoes."AGENDA_LICITACOES" SET observacoes_status=%s WHERE "CHAVE"=%s', ("EDICAO CONCORRENTE", row["CHAVE"]))
        before = snapshot(self.conn)
        with self.assertRaisesRegex(ValueError, "mudou"):
            with self.conn.transaction():
                apply_plan(self.conn, plan, source, Path(self.folder.name) / "backup.json")
        self.assertEqual(snapshot(self.conn), before)
        self.assertFalse((Path(self.folder.name) / "backup.json").exists())

    def test_insert_failure_rolls_back_earlier_updates(self):
        row = self.create("ROLLBACK", observacoes_status="ANTIGO")
        incoming = self.source([{**row, "observacoes_status": "NOVO"},
                               {**row, "CHAVE": "9000002", "pregao": "QA-IMPORT-FAIL", "orgao": "QA Fail"}])
        before = snapshot(self.conn)
        plan = build_plan(incoming, before, self.conn.info.dbname)
        self.conn.execute("""CREATE FUNCTION public.qa_agenda_import_fail() RETURNS trigger LANGUAGE plpgsql AS $$
            BEGIN IF NEW.pregao='QA-IMPORT-FAIL' THEN RAISE EXCEPTION 'QA rollback'; END IF; RETURN NEW; END $$""")
        self.conn.execute('CREATE TRIGGER qa_agenda_import_fail BEFORE INSERT ON agenda_licitacoes."AGENDA_LICITACOES" FOR EACH ROW EXECUTE FUNCTION public.qa_agenda_import_fail()')
        try:
            with self.assertRaises(psycopg.Error):
                with self.conn.transaction():
                    apply_plan(self.conn, plan, incoming, Path(self.folder.name) / "backup.json")
            self.assertEqual(snapshot(self.conn), before)
        finally:
            self.conn.execute('DROP TRIGGER qa_agenda_import_fail ON agenda_licitacoes."AGENDA_LICITACOES"')
            self.conn.execute('DROP FUNCTION public.qa_agenda_import_fail()')


if __name__ == "__main__":
    unittest.main(verbosity=2)
