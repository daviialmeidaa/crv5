"""Audita a Agenda por padrao; aplica apenas um plano revisado, com backup.

Executar da raiz com .venv/bin/python -m scripts.fix_agenda_encoding --help.
Credenciais usam Settings do Hub ou a configuracao do app Heroku informado.
"""

import argparse
from collections import Counter
import json
import os
from pathlib import Path
import re
import urllib.parse
import urllib.request

import psycopg
from psycopg import sql
from psycopg.rows import dict_row

from api.config import Settings
from api.services.agenda import TEXT_FIELDS

TABLE = sql.Identifier("agenda_licitacoes", "AGENDA_LICITACOES")


def repair(value):
    """Inverte somente conversoes estritas, sem ignorar/substituir caracteres."""
    if not isinstance(value, str):
        return value
    candidates = set()
    for encoding in ("latin1", "cp1252"):
        try:
            candidate = value.encode(encoding).decode("utf-8")
        except UnicodeError:
            continue
        if candidate != value:
            candidates.add(candidate)
    # Conversoes ambiguas ficam para revisao, nunca para gravacao automatica.
    return candidates.pop() if len(candidates) == 1 else value


def private_json(path, data):
    # Nao sobrescrever plano/backup de uma execucao anterior.
    with open(path, "x", encoding="utf-8", opener=lambda p, f: os.open(p, f, 0o600)) as handle:
        json.dump(data, handle, ensure_ascii=True, indent=2)
        handle.write("\n")
        handle.flush()
        os.fsync(handle.fileno())


def needs_review(value):
    if not isinstance(value, str):
        return False
    if "\ufffd" in value or any(0x80 <= ord(c) <= 0x9f for c in value):
        return True
    # Detecta tambem trechos corrompidos em textos que misturam acentos validos.
    return any(
        repair(value[start:start + size]) != value[start:start + size]
        for start, char in enumerate(value) if char in "\u00c2\u00c3\u00e2\u00f0"
        for size in (2, 3, 4)
    )


def connection_settings(app):
    settings = Settings.from_env()
    if not app:
        return settings.database_url or "", settings.database_kwargs()
    if not re.fullmatch(r"[a-z][a-z0-9-]*", app):
        raise ValueError("Nome de aplicativo Heroku invalido")
    request = urllib.request.Request(
        "https://api.heroku.com/apps/" + urllib.parse.quote(app, safe="") + "/config-vars",
        headers={
            "Authorization": "Bearer " + os.environ["HEROKU_API_KEY"],
            "Accept": "application/vnd.heroku+json; version=3",
        },
    )
    with urllib.request.urlopen(request, timeout=15) as response:
        config = json.load(response)
    return config["DATABASE_URL"], {"sslmode": "require"}


def audit(conn):
    fields = sql.SQL(", ").join(map(sql.Identifier, TEXT_FIELDS))
    rows = conn.execute(sql.SQL('SELECT "CHAVE", {} FROM {} ORDER BY "CHAVE"').format(fields, TABLE))
    changes, review = [], []
    total = 0
    for row in rows:
        total += 1
        for field in TEXT_FIELDS:
            before = row[field]
            after = repair(before)
            if before != after:
                changes.append({"CHAVE": str(row["CHAVE"]), "field": field, "before": before, "after": after})
            elif needs_review(before):
                review.append({"CHAVE": str(row["CHAVE"]), "field": field})
    return {
        "database": conn.info.dbname,
        "total_rows": total,
        "changes": changes,
        "review": review,
    }


def apply_plan(conn, plan, backup):
    if plan["database"] != conn.info.dbname:
        raise ValueError("O plano pertence a outro banco")
    changes = plan["changes"]
    seen = set()
    for change in changes:
        key, field = change["CHAVE"], change["field"]
        if field not in TEXT_FIELDS or (key, field) in seen:
            raise ValueError("Campo fora do escopo ou duplicado no plano")
        if change["before"] == change["after"] or repair(change["before"]) != change["after"]:
            raise ValueError("Conversao invalida no plano")
        seen.add((key, field))
    # O plano com os valores originais fica duravel antes da primeira escrita.
    private_json(backup, plan)
    for change in changes:
        field = sql.Identifier(change["field"])
        result = conn.execute(
            sql.SQL('UPDATE {} SET {} = %s WHERE "CHAVE" = %s AND {} IS NOT DISTINCT FROM %s').format(TABLE, field, field),
            (change["after"], change["CHAVE"], change["before"]),
        )
        if result.rowcount != 1:
            raise ValueError("Registro ausente ou alterado desde a auditoria; lote revertido")
    # O contexto da conexao confirma o lote inteiro somente se nao houve erro.


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--heroku-app", help="Le as credenciais atuais do app, sem alterar o .env")
    parser.add_argument("--report", type=Path, help="Grava plano de auditoria em arquivo novo e privado")
    parser.add_argument("--apply", type=Path, help="Aplica exatamente o plano revisado")
    parser.add_argument("--backup", type=Path, help="Arquivo novo e privado com os valores originais")
    args = parser.parse_args()
    if args.apply and (not args.backup or args.report):
        parser.error("--apply exige --backup e nao aceita --report")
    conninfo, kwargs = connection_settings(args.heroku_app)
    mode = "off" if args.apply else "on"
    with psycopg.connect(
        conninfo, **kwargs, row_factory=dict_row, connect_timeout=10,
        options=f"-c default_transaction_read_only={mode} -c statement_timeout=20000 -c lock_timeout=5000",
    ) as conn:
        if args.apply:
            plan = json.loads(args.apply.read_text(encoding="utf-8"))
            apply_plan(conn, plan, args.backup)
            summary = {"applied_cells": len(plan["changes"])}
        else:
            plan = audit(conn)
            if args.report:
                private_json(args.report, plan)
            summary = {
                "total_rows": plan["total_rows"],
                "affected_rows": len({c["CHAVE"] for c in plan["changes"]}),
                "cells_by_field": dict(Counter(c["field"] for c in plan["changes"])),
                "manual_review_cells": len(plan["review"]),
            }
    print(json.dumps(summary, ensure_ascii=True))


if __name__ == "__main__":
    try:
        main()
    except Exception as exc:
        # Erros de conexao podem incluir credenciais; nao reproduzir a excecao.
        raise SystemExit(f"Falha ({type(exc).__name__}); nenhuma transacao pendente foi confirmada.") from None
