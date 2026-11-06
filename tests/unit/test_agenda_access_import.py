from decimal import Decimal
from pathlib import Path
import tempfile
import unittest
import xml.etree.ElementTree as ET
import zipfile

from api.services.agenda import FIELDS
from scripts.import_agenda_access import (
    build_plan, normalized_date, normalized_time, read_workbook,
)


def record(key, **changes):
    return {"CHAVE": str(key), **dict.fromkeys(FIELDS),
            "empresa": "BML", "pregao": f"QA-{key}/2026", "orgao": f"Hospital QA {key}",
            "uf": "SP", "data_lances": "2026-11-06", **changes}


def source(rows):
    return {"path": "/fixture.xlsx", "sha256": "fixture", "sheet": "AGENDA_LICITACAO", "warnings": [], "rows": rows}


class ImportUnitTests(unittest.TestCase):
    def test_dates_and_times_preserve_empty_zero_and_fraction(self):
        self.assertIsNone(normalized_date("0"))
        self.assertIsNone(normalized_date(None))
        self.assertEqual(normalized_date("05/11/2026"), "2026-11-05")
        self.assertEqual(normalized_date(Decimal(46331)), "2026-11-05")
        self.assertIsNone(normalized_time(None))
        self.assertEqual(normalized_time(Decimal(0)), "00:00:00")
        self.assertEqual(normalized_time(Decimal("0.395833333333333")), "09:30:00")
        with self.assertRaises(ValueError):
            normalized_date("31/02/2026")
        with self.assertRaises(ValueError):
            normalized_time(Decimal("-0.1"))

    def test_unchanged_update_new_and_hub_only(self):
        rows = [record(1), record(2, observacoes_status="ANTIGO"), record(99)]
        incoming = source([record(1), record(2, observacoes_status="NOVO"), record(3)])
        plan = build_plan(incoming, rows, "qa")
        self.assertEqual(plan["summary"]["unchanged"], 1)
        self.assertEqual(plan["summary"]["updates"], 1)
        self.assertEqual(plan["summary"]["inserts"], 1)
        self.assertEqual(plan["hub_only_keys"], ["99"])
        self.assertEqual(plan["ambiguous"], [])

    def test_key_collision_preserves_hub_and_matches_other_key(self):
        rows = [record(10, pregao="008/2026", orgao="Hospital Antigo"),
                record(11, pregao="61/2026", uf="MA", orgao="Empresa Hospitalar", observacoes_status="ANTIGO")]
        incoming = source([record(10, pregao="290/2026", orgao="Outro Hospital", uf="RO"),
                           record(50, pregao="061/2026", uf="MA", orgao="Hospital Universitario", observacoes_status="NOVO")])
        plan = build_plan(incoming, rows, "qa")
        self.assertEqual(plan["colliding_source_keys"], ["10"])
        self.assertEqual(plan["hub_only_keys"], ["10"])
        self.assertEqual(plan["updates"][0]["target_key"], "11")
        self.assertEqual(plan["updates"][0]["source_key"], "50")
        self.assertEqual(plan["inserts"][0]["source_key"], "10")
        self.assertEqual(plan["ambiguous"], [])

    def test_multiple_matches_are_not_silently_merged(self):
        rows = [record(1, pregao="8/2026", orgao="Mesmo Hospital"),
                record(2, pregao="08/2026", orgao="Mesmo Hospital")]
        plan = build_plan(source([record(20, pregao="008/2026", orgao="Mesmo Hospital")]), rows, "qa")
        self.assertEqual(len(plan["ambiguous"]), 1)

    def test_idempotent_after_generated_key(self):
        old = record(1)
        incoming = source([old, record(5)])
        final = [old, {**record(5), "CHAVE": 100}]
        plan = build_plan(incoming, final, "qa")
        self.assertEqual(plan["summary"]["unchanged"], 2)
        self.assertEqual(plan["summary"]["updates"], 0)
        self.assertEqual(plan["summary"]["inserts"], 0)

    def test_wrong_year_in_bid_is_update_with_other_identity_equal(self):
        before = record(1, pregao="065/2016")
        incoming = record(1, pregao="065/2026")
        plan = build_plan(source([incoming]), [before], "qa")
        self.assertEqual(plan["updates"][0]["target_key"], "1")
        self.assertEqual(plan["inserts"], [])

    def test_excel_reader_alias_zero_date_and_duplicate_keys(self):
        namespace = "http://schemas.openxmlformats.org/spreadsheetml/2006/main"
        headers = ["CHAVE", *["observacoes" if f == "observacoes_status" else f for f in FIELDS]]
        values = {**record(5, observacoes_status="Preço", data_cadastro="0"), "observacoes": "Preço"}
        sheet = ET.Element("worksheet", xmlns=namespace)
        table = ET.SubElement(sheet, "sheetData")
        for number in (1, 2, 3):
            row = ET.SubElement(table, "row", r=str(number))
            for index, field in enumerate(headers):
                value = field if number == 1 else values.get(field)
                if value is None:
                    continue
                cell = ET.SubElement(row, "c", r=f"{chr(65 + index)}{number}", t="inlineStr")
                ET.SubElement(ET.SubElement(cell, "is"), "t").text = str(value)
        with tempfile.TemporaryDirectory() as folder:
            path = Path(folder) / "fixture.xlsx"
            workbook = '<workbook xmlns="' + namespace + '" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets><sheet name="AGENDA_LICITACAO" sheetId="1" r:id="rId1"/></sheets></workbook>'
            rels = '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Target="worksheets/sheet1.xml"/></Relationships>'
            with zipfile.ZipFile(path, "w") as book:
                book.writestr("xl/workbook.xml", workbook)
                book.writestr("xl/_rels/workbook.xml.rels", rels)
                book.writestr("xl/worksheets/sheet1.xml", ET.tostring(sheet))
            with self.assertRaisesRegex(ValueError, "CHAVE duplicada"):
                read_workbook(path)
            table.remove(table[-1])
            with zipfile.ZipFile(path, "w") as book:
                book.writestr("xl/workbook.xml", workbook)
                book.writestr("xl/_rels/workbook.xml.rels", rels)
                book.writestr("xl/worksheets/sheet1.xml", ET.tostring(sheet))
            parsed = read_workbook(path)
            self.assertEqual(parsed["rows"][0]["observacoes_status"], "Preço")
            self.assertIsNone(parsed["rows"][0]["data_cadastro"])
            self.assertEqual(len(parsed["warnings"]), 1)


if __name__ == "__main__":
    unittest.main()
