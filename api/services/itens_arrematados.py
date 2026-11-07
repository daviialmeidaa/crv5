"""Integracao VBA por item/empresa; independente do modal agrupado do portal."""

from datetime import date, timedelta
from decimal import Decimal, InvalidOperation
import logging
import re
from html import escape

from ..database import Database
from ..security import LegacyAPIError
from ..validation import validate_agenda_key

log = logging.getLogger(__name__)
TABLES = {"BML": 'itens_arrematados."IA_BML"', "NEXOMED": 'itens_arrematados."IA_NEXOMED"'}
FIELDS = (
    "COD_CONTRATO_CONCAT", "COD_CONTRATO", "ORGAO", "MUNICIPIO", "UF", "PARTICIPANTE",
    "EDITAL", "DATA_PREGAO", "TIPO_CONTRATO", "CLASSIFICACAO", "LOTE_ITEM", "MATERIAL",
    "QTDE", "UNIDADE", "FORNECEDOR", "DESCRICAO_DATABASE", "COD_SUPRA", "NOME_SUPRA",
    "VALOR_UNITARIO", "VALOR_TOTAL", "TOTAL_NORMALIZADO", "DATA_PROPOSTA", "COD_STATUS",
    "SITUACAO_STATUS", "DATA_ADJUDICACAO", "DATA_INICIO", "DATA_TERMINO", "VIGENCIA",
    "DATA_EMPENHO", "INSTRUMENTAL", "INSTRUMENTADOR", "LOCAL_ENTREGA", "PRAZO_ENTREGA", "DETALHAMENTO",
    "CODIGO_STATUS",
)
DATES = {"DATA_PREGAO", "DATA_PROPOSTA"}
INTEGERS = {"COD_CONTRATO", "QTDE", "COD_SUPRA", "CODIGO_STATUS"}
DECIMALS = {"VALOR_UNITARIO", "VALOR_TOTAL"}
CONTRACT_FIELDS = ("COD_CONTRATO_CONCAT", "EDITAL", "TIPO_CONTRATO", "CLASSIFICACAO")
ACTOR = "Integração VBA (Itens Arrematados)"
PARTICIPANTS = {
    "BML": {"BML": "BML HOSPITALAR", "BML HOSPITALAR": "BML HOSPITALAR"},
    "NEXOMED": {"NEXOMED": "NEXOMED", "MEDICAL LIFE": "MEDICAL LIFE"},
}


def normalize_participant(value, empresa, strict=False):
    text = (value or "").strip().upper()
    if not text:
        text = empresa
    canonical = PARTICIPANTS[empresa].get(text)
    if canonical is not None:
        return canonical
    if strict:
        bad("PARTICIPANTE", "incompatível com a empresa da URL")
    return value  # Preserva participantes legados desconhecidos em leituras.


def company(value):
    result = value.strip().upper()
    if result not in TABLES:
        raise LegacyAPIError(400, "Empresa inválida. Use BML ou NEXOMED.")
    return result


def bad(field, message):
    raise LegacyAPIError(400, f"{field}: {message}")


def number(value, field, integer=False):
    if isinstance(value, bool) or not isinstance(value, (str, int, float, Decimal)):
        bad(field, "informe um número válido")
    try:
        result = Decimal(str(value).strip().replace(",", "."))
    except InvalidOperation:
        bad(field, "use número sem separador de milhar")
    if not result.is_finite():
        bad(field, "número não finito")
    if integer:
        if result != result.to_integral_value() or not -(2**31) <= result < 2**31:
            bad(field, "informe um inteiro no intervalo permitido")
        return int(result)
    return result


def date_value(value, field):
    if isinstance(value, bool):
        bad(field, "use DD/MM/AAAA ou AAAA-MM-DD")
    if value in (0, "0"):
        return None
    try:
        if isinstance(value, (int, float, Decimal)):
            days = number(value, field, True)
            parsed = date(1899, 12, 30) + timedelta(days=days)
        elif isinstance(value, str) and re.fullmatch(r"\d{1,2}/\d{1,2}/\d{4}", value.strip()):
            day, month, year = map(int, value.strip().split("/"))
            parsed = date(year, month, day)
        elif isinstance(value, str):
            parsed = date.fromisoformat(value.strip())
        else:
            bad(field, "use DD/MM/AAAA ou AAAA-MM-DD")
        if parsed.year < 100:
            bad(field, "ano deve estar entre 0100 e 9999")
        return parsed.isoformat()
    except (ValueError, OverflowError):
        bad(field, "data inválida; use DD/MM/AAAA ou AAAA-MM-DD")


def prepare(payload, empresa, create=False):
    if not isinstance(payload, dict) or not payload:
        raise LegacyAPIError(400, "Envie um objeto JSON com os campos do item.")
    unknown = set(payload) - set(FIELDS)
    if unknown:
        raise LegacyAPIError(400, "Campos desconhecidos ou protegidos no payload.")
    result = {}
    for field, value in payload.items():
        if value is None or value == "":
            result[field] = None
        elif field == "COD_STATUS":
            result[field] = str(number(value, field, True))
        elif field in INTEGERS:
            result[field] = number(value, field, True)
        elif field in DECIMALS:
            result[field] = number(value, field)
        elif field in DATES:
            result[field] = date_value(value, field)
        elif isinstance(value, str) and "\x00" not in value:
            result[field] = value
        else:
            bad(field, "informe texto válido")
    if "COD_STATUS" in result:
        code = result["COD_STATUS"]
        numeric = None if code is None else number(code, "COD_STATUS", True)
        if "CODIGO_STATUS" in result and result["CODIGO_STATUS"] != numeric:
            bad("COD_STATUS", "diverge de CODIGO_STATUS")
        result["CODIGO_STATUS"] = numeric
    if "CODIGO_STATUS" in result:
        result["COD_STATUS"] = None if result["CODIGO_STATUS"] is None else str(result["CODIGO_STATUS"])
    if create and not any(result.get(f) not in (None, "") for f in ("COD_CONTRATO_CONCAT", "COD_CONTRATO", "ORGAO", "MATERIAL", "EDITAL")):
        raise LegacyAPIError(400, "Item sem dados. Inclusão vazia bloqueada.")
    if not any(v is not None for v in result.values()) and (create or len(payload) >= len(FIELDS) - 1):
        raise LegacyAPIError(400, "Payload inteiramente vazio bloqueado.")
    if create or "PARTICIPANTE" in result:
        result["PARTICIPANTE"] = normalize_participant(result.get("PARTICIPANTE"), empresa, strict=True)
    return result


def columns():
    return ', '.join(['"CHAVE"', *(
        f'CASE WHEN "{f}" BETWEEN DATE \'0100-01-01\' AND DATE \'9999-12-31\' THEN "{f}" ELSE NULL END AS "{f}"'
        if f in DATES else f'"{f}"' for f in FIELDS
    )])


def for_vba(row, empresa):
    result = dict(row)
    result["PARTICIPANTE"] = normalize_participant(result.get("PARTICIPANTE"), empresa)
    if result.get("CODIGO_STATUS") is not None:
        result["COD_STATUS"] = str(result["CODIGO_STATUS"])
    return result


def comparable(field, value):
    if value is None:
        return None
    if field in DATES:
        return str(value)[:10]
    if field in INTEGERS or field in DECIMALS:
        return Decimal(str(value))
    return str(value)


class ItensArrematadosService:
    def __init__(self, database: Database):
        self.db = database

    def list(self, empresa, chave=None):
        empresa = company(empresa)
        if chave is not None:
            chave = validate_agenda_key(chave)
        try:
            query = f'SELECT {columns()} FROM {TABLES[empresa]}'
            params = []
            if chave is not None:
                query += ' WHERE "CHAVE" = %s'
                params.append(chave)
            rows = self.db.query(query + ' ORDER BY "CHAVE" ASC', params)
            if chave is not None:
                if not rows:
                    raise LegacyAPIError(404, "Item não encontrado nesta empresa.")
                return for_vba(rows[0], empresa)
            return [for_vba(row, empresa) for row in rows]
        except LegacyAPIError:
            raise
        except Exception as exc:
            log.exception("Falha ao consultar itens via VBA")
            raise LegacyAPIError(500, "Erro interno ao consultar itens via VBA.") from exc

    def _contract(self, tx, row, empresa):
        code = row.get("COD_CONTRATO_CONCAT")
        if not code:
            return
        # UNIQUE_TBL legado nao tem UNIQUE no codigo: serializa concorrentes
        # sem criar constraint nem apagar duplicatas historicas.
        tx.query("SELECT pg_advisory_xact_lock(hashtext(%s), hashtext(%s))", ("vba-itens-contrato", code))
        values = [row.get(f) for f in CONTRACT_FIELDS[1:]]
        found = tx.query('UPDATE itens_arrematados."UNIQUE_TBL" SET "EDITAL"=%s, "TIPO_CONTRATO"=%s, "CLASSIFICACAO"=%s WHERE "COD_CONTRATO_CONCAT"=%s RETURNING "CHAVE"', [*values, code])
        if not found:
            tx.query('INSERT INTO itens_arrematados."UNIQUE_TBL" ("COD_CONTRATO_CONCAT","EDITAL","TIPO_CONTRATO","CLASSIFICACAO") VALUES (%s,%s,%s,%s)', [code, *values])
        tx.query("""INSERT INTO contratos (codigo_contrato,empresa,edital,tipo_contrato,classificacao)
            VALUES (%s,%s,%s,%s,%s) ON CONFLICT (codigo_contrato) DO UPDATE
            SET edital=EXCLUDED.edital,tipo_contrato=EXCLUDED.tipo_contrato,classificacao=EXCLUDED.classificacao,
                updated_at=CURRENT_TIMESTAMP WHERE contratos.empresa=EXCLUDED.empresa""",
            [code, "BML" if empresa == "BML" else "Nexomed", *(v or "" for v in values)])

    def save(self, empresa, payload, chave=None):
        empresa = company(empresa)
        if chave is not None:
            chave = validate_agenda_key(chave)
        data = prepare(payload, empresa, create=chave is None)
        try:
            with self.db.transaction() as tx:
                old = None
                if chave is not None:
                    rows = tx.query(f'SELECT {columns()} FROM {TABLES[empresa]} WHERE "CHAVE"=%s FOR UPDATE', (chave,))
                    if not rows:
                        raise LegacyAPIError(404, "Item não encontrado nesta empresa.")
                    old = rows[0]
                    if "PARTICIPANTE" not in data:
                        participant = normalize_participant(old.get("PARTICIPANTE"), empresa)
                        if participant != old.get("PARTICIPANTE"):
                            data["PARTICIPANTE"] = participant
                merged = {**(old or {}), **data}
                if not merged.get("COD_CONTRATO_CONCAT") and merged.get("COD_CONTRATO") is not None:
                    prefix = "BML" if empresa == "BML" else "BIO" if (merged.get("PARTICIPANTE") or empresa).strip().upper() == "NEXOMED" else "ML"
                    data["COD_CONTRATO_CONCAT"] = prefix + str(merged["COD_CONTRATO"])
                fields = list(data)
                values = [data[f] for f in fields]
                if old is None:
                    names = ', '.join(f'"{f}"' for f in fields)
                    rows = tx.query(f'INSERT INTO {TABLES[empresa]} ({names}) VALUES ({", ".join(["%s"] * len(fields))}) RETURNING "CHAVE"', values)
                    chave = rows[0]["CHAVE"]
                else:
                    sets = ', '.join(f'"{f}"=%s' for f in fields)
                    tx.query(f'UPDATE {TABLES[empresa]} SET {sets} WHERE "CHAVE"=%s', [*values, chave])
                saved = tx.query(f'SELECT {columns()} FROM {TABLES[empresa]} WHERE "CHAVE"=%s', (chave,))[0]
                if old is None or any(comparable(f, old.get(f)) != comparable(f, saved.get(f)) for f in CONTRACT_FIELDS):
                    self._contract(tx, saved, empresa)
                changed = old is None or any(comparable(f, old.get(f)) != comparable(f, saved.get(f)) for f in FIELDS)
            if changed:
                self._notify("INSERT" if old is None else "UPDATE", saved, empresa)
            return for_vba(saved, empresa)
        except LegacyAPIError:
            raise
        except Exception as exc:
            log.exception("Falha ao gravar item via VBA")
            raise LegacyAPIError(500, "Erro interno ao gravar item via VBA.") from exc

    def delete(self, empresa, chave):
        empresa = company(empresa)
        chave = validate_agenda_key(chave)
        try:
            rows = self.db.query(f'DELETE FROM {TABLES[empresa]} WHERE "CHAVE"=%s RETURNING "CHAVE", "COD_CONTRATO_CONCAT", "ORGAO"', (chave,))
            if not rows:
                raise LegacyAPIError(404, "Item não encontrado nesta empresa.")
            self._notify("DELETE", rows[0], empresa)
            return {"message": "Item excluído com sucesso via VBA.", "CHAVE": rows[0]["CHAVE"]}
        except LegacyAPIError:
            raise
        except Exception as exc:
            log.exception("Falha ao excluir item via VBA")
            raise LegacyAPIError(500, "Erro interno ao excluir item via VBA.") from exc

    def _notify(self, action, row, empresa):
        try:
            message = f"{ACTOR}: {action} na empresa {empresa}, contrato {escape(str(row.get('COD_CONTRATO_CONCAT') or '-'))}, item {row['CHAVE']}."
            self.db.query("INSERT INTO notifications (module,action,message,created_by) VALUES (%s,%s,%s,%s)", ("ITENS_ARREMATADOS", action, message, None))
            self.db.notify_refresh()
        except Exception:
            log.exception("Falha nao fatal ao notificar gravacao VBA de itens")
