"""Concilia um XLSX do Access com a Agenda, sem excluir registros do Hub.

Audita por padrao. --apply exige um plano sem ambiguidades e backup privado.
Nao envia notificacoes/e-mails e nao altera o contrato das APIs.
"""

import argparse
from collections import Counter
from datetime import date, timedelta
from decimal import Decimal, ROUND_HALF_UP
import hashlib
from io import BytesIO
import json
from pathlib import Path
import re
import unicodedata
import xml.etree.ElementTree as ET
import zipfile

import psycopg
from psycopg import sql
from psycopg.rows import dict_row

from api.services.agenda import FIELDS, TEXT_FIELDS
from scripts.fix_agenda_encoding import connection_settings, private_json

NS = {"m": "http://schemas.openxmlformats.org/spreadsheetml/2006/main"}
TABLE = sql.Identifier("agenda_licitacoes", "AGENDA_LICITACOES")
DATE_FIELDS = {"data_limite", "data_lances", "data_cadastro"}
TIME_FIELDS = {"hora_limite", "hora_lances"}
HEADERS = {"CHAVE", *FIELDS} - {"observacoes_status"} | {"observacoes"}


def digest(value):
    return hashlib.sha256(json.dumps(value, sort_keys=True, ensure_ascii=True).encode()).hexdigest()


def integer(value, minimum, maximum):
    number = Decimal(str(value))
    if not number.is_finite() or number != number.to_integral_value() or not minimum <= number <= maximum:
        raise ValueError("Inteiro fora do intervalo ou fracionario")
    return int(number)


def normalized_date(value, epoch_1904=False):
    if value in (None, "", "0", Decimal(0)):
        return None
    if isinstance(value, Decimal):
        serial = integer(value, 1, 2958465)
        if epoch_1904:
            return (date(1904, 1, 1) + timedelta(days=serial)).isoformat()
        if serial == 60:
            raise ValueError("Data ficticia 29/02/1900 do Excel")
        return (date(1899, 12, 30) + timedelta(days=serial + (serial < 60))).isoformat()
    text = str(value).strip()
    if re.fullmatch(r"\d{1,2}/\d{1,2}/\d{4}", text):
        day, month, year = map(int, text.split("/"))
        return date(year, month, day).isoformat()
    return date.fromisoformat(text).isoformat()


def normalized_time(value):
    if value in (None, ""):
        return None
    if isinstance(value, Decimal):
        if not value.is_finite() or not 0 <= value <= 1:
            raise ValueError("Fracao de hora invalida")
        seconds = int((value * 86400).quantize(Decimal(1), rounding=ROUND_HALF_UP))
    else:
        match = re.fullmatch(r"(\d{1,2}):(\d{2})(?::(\d{2}))?", str(value).strip())
        if not match:
            raise ValueError("Hora invalida")
        hour, minute, second = (int(v or 0) for v in match.groups())
        if hour > 24 or minute > 59 or second > 59 or (hour == 24 and (minute or second)):
            raise ValueError("Hora fora do intervalo")
        seconds = hour * 3600 + minute * 60 + second
    return f"{seconds // 3600:02}:{seconds % 3600 // 60:02}:{seconds % 60:02}"


def read_workbook(path):
    path = Path(path).resolve()
    content = path.read_bytes()
    rows, warnings, seen = [], [], set()
    with zipfile.ZipFile(BytesIO(content)) as book:
        workbook = ET.fromstring(book.read("xl/workbook.xml"))
        sheets = workbook.findall("m:sheets/m:sheet", NS)
        if len(sheets) != 1 or sheets[0].get("name") != "AGENDA_LICITACAO":
            raise ValueError("Esperada uma unica aba AGENDA_LICITACAO")
        props = workbook.find("m:workbookPr", NS)
        epoch_1904 = props is not None and props.get("date1904") in ("1", "true")
        rels = ET.fromstring(book.read("xl/_rels/workbook.xml.rels"))
        rel_id = sheets[0].get("{http://schemas.openxmlformats.org/officeDocument/2006/relationships}id")
        target = next(r.get("Target") for r in rels if r.get("Id") == rel_id)
        sheet_path = target.lstrip("/") if target.startswith("/") else "xl/" + target
        shared = []
        if "xl/sharedStrings.xml" in book.namelist():
            shared = ["".join(e.itertext()) for e in ET.fromstring(book.read("xl/sharedStrings.xml"))]
        sheet = ET.fromstring(book.read(sheet_path))
        headers = None
        for element in sheet.findall("m:sheetData/m:row", NS):
            cells = {}
            for cell in element:
                if cell.find("m:f", NS) is not None or cell.get("t") == "e":
                    raise ValueError("Exportacao contem formula ou celula com erro")
                column = re.sub(r"\d", "", cell.get("r"))
                value = cell.find("m:v", NS)
                inline = cell.find("m:is", NS)
                if cell.get("t") == "inlineStr":
                    decoded = "".join(inline.itertext()) if inline is not None else ""
                elif cell.get("t") == "s":
                    decoded = shared[int(value.text)]
                elif value is None:
                    decoded = None
                elif cell.get("t") == "str":
                    decoded = value.text or ""
                elif cell.get("t") in (None, "n"):
                    decoded = Decimal(value.text)
                else:
                    raise ValueError("Tipo de celula nao suportado")
                cells[column] = decoded
            if not any(v not in (None, "") for v in cells.values()):
                continue
            if headers is None:
                headers = {column: str(value).strip() for column, value in cells.items() if value is not None}
                if set(headers.values()) != HEADERS or len(headers) != len(HEADERS):
                    raise ValueError("Cabecalhos inesperados na exportacao")
                continue
            if set(cells) - set(headers):
                raise ValueError("Dados fora das colunas declaradas")
            raw = {field: cells.get(column) for column, field in headers.items()}
            if isinstance(raw["CHAVE"], Decimal) and abs(raw["CHAVE"]) >= 10**15:
                raise ValueError("CHAVE numerica grande no Excel; exporte como texto para preservar digitos")
            key = str(integer(raw["CHAVE"], -(2**63), 2**63 - 1))
            if key in seen:
                raise ValueError("CHAVE duplicada no XLSX")
            seen.add(key)
            record = {"CHAVE": key}
            for field in FIELDS:
                value = raw["observacoes" if field == "observacoes_status" else field]
                if field in DATE_FIELDS:
                    if value in ("0", Decimal(0)):
                        warnings.append({"source_key": key, "field": field, "normalization": "zero-date-to-null"})
                    value = normalized_date(value, epoch_1904)
                elif field in TIME_FIELDS:
                    value = normalized_time(value)
                elif field == "antecedencia":
                    value = None if value in (None, "") else integer(value, -(2**31), 2**31 - 1)
                else:
                    value = None if value is None else str(value)
                    if value is not None and ("\x00" in value or "\ufffd" in value):
                        raise ValueError("Texto com NUL ou caractere de substituicao")
                record[field] = value
            if not any(record[f] not in (None, "") for f in TEXT_FIELDS):
                raise ValueError("Registro sem dados textuais no XLSX")
            rows.append(record)
    if not rows:
        raise ValueError("Exportacao vazia")
    return {"path": str(path), "sha256": hashlib.sha256(content).hexdigest(),
            "sheet": "AGENDA_LICITACAO", "rows": rows, "warnings": warnings}


def compact(value):
    text = unicodedata.normalize("NFKD", str(value or "")).casefold()
    return "".join(c for c in text if c.isalnum() and not unicodedata.combining(c))


def bid(value):
    text = re.sub(r"\s", "", str(value or "")).casefold()
    match = re.fullmatch(r"(\d+)/(\d{4})", text)
    return (str(int(match[1])), match[2]) if match else (text, "")


def identity(row):
    return compact(row.get("empresa")), bid(row.get("pregao")), compact(row.get("uf")), compact(row.get("orgao"))


def event_identity(row):
    return compact(row.get("empresa")), bid(row.get("pregao")), compact(row.get("uf")), row.get("data_lances")


def valid_signature(signature):
    return bool(signature[0] and signature[1][0] and signature[2] and signature[3])


def same_key_business(source, target):
    if all(source[f] == target.get(f) for f in FIELDS):
        return True
    a, b = identity(source), identity(target)
    if not a[0] or not a[1][0] or not a[2] or not a[3] or a[0] != b[0] or a[2] != b[2]:
        return False
    if a[1] == b[1]:
        return a[3] == b[3] or source.get("data_lances") == target.get("data_lances")
    # Corrige, por exemplo, o ano digitado errado no numero do pregao,
    # somente com numero-base, orgao, empresa, UF e data coincidentes.
    return (a[1][0] == b[1][0] and a[3] == b[3]
            and source.get("data_lances") is not None
            and source.get("data_lances") == target.get("data_lances"))


def snapshot(conn):
    return [row["record"] for row in conn.execute(
        sql.SQL('SELECT to_jsonb(t) AS record FROM {} t ORDER BY "CHAVE"').format(TABLE)
    ).fetchall()]


def build_plan(source, existing_rows, database):
    existing = {str(row["CHAVE"]): row for row in existing_rows}
    sources = {row["CHAVE"]: row for row in source["rows"]}
    mappings, assigned, conflicts = {}, set(), []
    for key, row in sources.items():
        if key in existing and same_key_business(row, existing[key]):
            mappings[key] = (key, "same-key-and-business")
            assigned.add(key)
        elif key in existing:
            conflicts.append(key)
    ambiguous = []
    for signature, label in ((identity, "business-identity"), (event_identity, "unique-company-bid-uf-date")):
        proposals, reverse = {}, Counter()
        for key, row in sources.items():
            if key in mappings:
                continue
            sign = signature(row)
            if not valid_signature(sign):
                continue
            candidates = [k for k, r in existing.items() if k not in assigned and signature(r) == sign]
            if len(candidates) > 1:
                dated = [k for k in candidates if existing[k].get("data_lances") == row.get("data_lances")]
                if len(dated) == 1:
                    candidates = dated
            proposals[key] = candidates
            reverse.update(candidates)
        for key, candidates in proposals.items():
            if len(candidates) == 1 and reverse[candidates[0]] == 1:
                mappings[key] = (candidates[0], label)
                assigned.add(candidates[0])
    pending = [key for key in sources if key not in mappings]
    # Nao cria duplicatas silenciosas quando existe mais de uma correspondencia
    # ou quando outra linha da origem ja utiliza o mesmo registro do Hub.
    pending_signatures = Counter(identity(sources[key]) for key in pending)
    for key in pending:
        row = sources[key]
        candidates = [k for k, r in existing.items() if identity(r) == identity(row)
                      or (valid_signature(event_identity(row)) and event_identity(r) == event_identity(row))]
        if candidates or pending_signatures[identity(row)] > 1:
            ambiguous.append({"source_key": key, "candidates": candidates})
    changes, unchanged, inserts = [], [], []
    for key, row in sources.items():
        if key not in mappings:
            inserts.append({"source_key": key, "after": {f: row[f] for f in FIELDS}})
            continue
        target_key, match = mappings[key]
        before = existing[target_key]
        fields = [f for f in FIELDS if before.get(f) != row[f]]
        entry = {"source_key": key, "target_key": target_key, "match": match}
        if fields:
            changes.append({**entry, "before": before, "after": {f: row[f] for f in FIELDS}, "changed_fields": fields})
        else:
            unchanged.append(entry)
    summary = {"source_rows": len(sources), "hub_rows_before": len(existing),
               "unchanged": len(unchanged), "updates": len(changes), "inserts": len(inserts),
               "hub_only_preserved": len(existing) - len(assigned), "ambiguous": len(ambiguous),
               "key_collisions_preserved": len(conflicts),
               "cross_key_matches": sum(k != v[0] for k, v in mappings.items())}
    return {"version": 1, "database": database,
            "source": {k: source[k] for k in ("path", "sha256", "sheet", "warnings")},
            "snapshot_hash": digest(existing_rows), "summary": summary,
            "updates": changes, "inserts": inserts, "unchanged": unchanged,
            "hub_only_keys": sorted(set(existing) - assigned, key=int),
            "colliding_source_keys": conflicts, "ambiguous": ambiguous}


def apply_plan(conn, plan, source, backup_path):
    if plan["database"] != conn.info.dbname:
        raise ValueError("Plano pertence a outro banco")
    if source["sha256"] != plan["source"]["sha256"]:
        raise ValueError("O arquivo de origem mudou")
    conn.execute(sql.SQL("LOCK TABLE {} IN SHARE ROW EXCLUSIVE MODE").format(TABLE))
    before = snapshot(conn)
    current_plan = build_plan(source, before, conn.info.dbname)
    if current_plan != plan:
        raise ValueError("Banco ou plano mudou desde a auditoria; gere um novo plano")
    if plan["ambiguous"]:
        raise ValueError("Correspondencias ambiguas precisam ser resolvidas")
    sequence = conn.execute("SELECT pg_get_serial_sequence(%s, %s) AS name",
                            ('agenda_licitacoes."AGENDA_LICITACOES"', "CHAVE")).fetchone()["name"]
    if not sequence:
        raise ValueError("Sequencia de CHAVE ausente")
    seq_schema, seq_name = sequence.split(".", 1)
    sequence_id = sql.Identifier(seq_schema.strip('"'), seq_name.strip('"'))
    sequence_before = conn.execute(sql.SQL("SELECT last_value,is_called FROM {}").format(sequence_id)).fetchone()
    max_key = max((int(row["CHAVE"]) for row in before), default=0)
    next_key = sequence_before["last_value"] + int(sequence_before["is_called"])
    if next_key <= max_key:
        raise ValueError("Sequencia atrasada; requer manutencao separada")
    private_json(backup_path, {"plan": plan, "rows": before, "sequence_before": sequence_before})
    columns = sql.SQL(", ").join(map(sql.Identifier, FIELDS))
    placeholders = sql.SQL(", ").join(sql.Placeholder() for _ in FIELDS)
    assignments = sql.SQL(", ").join(sql.SQL("{} = %s").format(sql.Identifier(f)) for f in FIELDS)
    mapping = [{"source_key": item["source_key"], "target_key": item["target_key"]}
               for item in (*plan["unchanged"], *plan["updates"])]
    # Todas as operacoes usam a mesma conexao/transacao. Sem retry automatico.
    with conn.pipeline():
        cursors = [conn.execute(sql.SQL('UPDATE {} SET {} WHERE "CHAVE" = %s').format(TABLE, assignments),
                               [*(item["after"][f] for f in FIELDS), item["target_key"]])
                   for item in plan["updates"]]
    if any(cursor.rowcount != 1 for cursor in cursors):
        raise ValueError("Uma atualizacao nao atingiu exatamente um registro")
    for item in plan["inserts"]:
        key = conn.execute(sql.SQL('INSERT INTO {} ({}) VALUES ({}) RETURNING "CHAVE"').format(TABLE, columns, placeholders),
                           [item["after"][f] for f in FIELDS]).fetchone()["CHAVE"]
        mapping.append({"source_key": item["source_key"], "target_key": str(key)})
    after = snapshot(conn)
    verify(source, before, after, mapping, plan)
    return {"summary": {**plan["summary"], "hub_rows_after": len(after)},
            "source_sha256": source["sha256"], "mapping": sorted(mapping, key=lambda m: int(m["source_key"])),
            "inserted_mapping": [m for m in mapping if m["source_key"] in {i["source_key"] for i in plan["inserts"]}],
            "after_hash": digest(after)}


def verify(source, before, after, mapping, plan):
    final = {str(r["CHAVE"]): r for r in after}
    if len(after) != len(before) + len(plan["inserts"]):
        raise ValueError("Quantidade final inesperada")
    links = {m["source_key"]: m["target_key"] for m in mapping}
    if len(links) != len(source["rows"]) or len(set(links.values())) != len(links):
        raise ValueError("Mapeamento nao e um para um")
    for row in source["rows"]:
        actual = final[links[row["CHAVE"]]]
        if any(actual.get(f) != row[f] for f in FIELDS):
            raise ValueError("Registro final difere da origem")
    changed = {item["target_key"] for item in plan["updates"]}
    for old in before:
        key = str(old["CHAVE"])
        if key not in final or final[key].get("created_at") != old.get("created_at"):
            raise ValueError("Registro anterior removido ou created_at modificado")
        if key not in changed and final[key] != old:
            raise ValueError("Um registro preservado foi modificado")


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--heroku-app")
    parser.add_argument("--source", type=Path)
    parser.add_argument("--plan", type=Path)
    parser.add_argument("--apply", type=Path)
    parser.add_argument("--backup", type=Path)
    parser.add_argument("--receipt", type=Path)
    args = parser.parse_args()
    if args.apply:
        if not args.backup or not args.receipt or args.source or args.plan:
            parser.error("--apply exige --backup e --receipt; nao aceita --source/--plan")
        plan = json.loads(args.apply.read_text(encoding="utf-8"))
        source = read_workbook(plan["source"]["path"])
        if args.backup.exists() or args.receipt.exists():
            raise ValueError("Backup/recibo ja existe; confira a execucao anterior")
    else:
        if not args.source or not args.plan or args.backup or args.receipt:
            parser.error("Auditoria exige --source e --plan")
        source = read_workbook(args.source)
    conninfo, kwargs = connection_settings(args.heroku_app)
    mode = "off" if args.apply else "on"
    with psycopg.connect(conninfo, **kwargs, row_factory=dict_row, connect_timeout=10,
                         options=f"-c default_transaction_read_only={mode} -c statement_timeout=30000 -c lock_timeout=5000 -c timezone=UTC") as conn:
        if args.apply:
            receipt = apply_plan(conn, plan, source, args.backup)
        else:
            plan = build_plan(source, snapshot(conn), conn.info.dbname)
            private_json(args.plan, plan)
    if args.apply:
        # A conexao acima ja confirmou a transacao. Falha ao salvar recibo nao
        # autoriza repetir gravacoes sem verificar o estado atual do banco.
        try:
            private_json(args.receipt, receipt)
        except Exception:
            raise SystemExit("Transacao confirmada, mas o recibo local nao foi salvo. Confira o banco antes de repetir.") from None
        print(json.dumps(receipt["summary"]))
    else:
        print(json.dumps(plan["summary"]))


if __name__ == "__main__":
    try:
        main()
    except Exception as exc:
        # Nao imprimir dados de conexao, parametros SQL ou dados de registros.
        raise SystemExit(f"Falha ({type(exc).__name__}); transacao pendente nao confirmada.") from None
