import logging

from ..compat import js_iso, js_string, js_truthy, parse_vba_date, parse_vba_time
from ..database import Database
from ..security import LegacyAPIError

log = logging.getLogger(__name__)
ACTOR = "Integração VBA (Sistema Legado)"
TABLE = 'agenda_licitacoes."AGENDA_LICITACOES"'
TEXT_FIELDS = (
    "empresa", "pregao", "modalidade", "orgao", "uf",
    "categoria", "objeto", "portal", "observacoes_status",
)
FIELDS = (*TEXT_FIELDS, "data_cadastro", "data_limite", "hora_limite",
          "data_lances", "hora_lances", "antecedencia")
DATE_FIELDS = frozenset(("data_cadastro", "data_limite", "data_lances"))


def values_from_payload(payload):
    if payload is None:
        raise TypeError("Payload ausente")
    data = payload if isinstance(payload, dict) else {}
    return [
        *(data.get(key) for key in TEXT_FIELDS),
        parse_vba_date(data.get("data_cadastro")),
        parse_vba_date(data.get("data_limite")),
        parse_vba_time(data.get("hora_limite")),
        parse_vba_date(data.get("data_lances")),
        parse_vba_time(data.get("hora_lances")),
        data.get("antecedencia") if data.get("antecedencia") != "" else None,
    ]


def display(value, fallback):
    return js_string(value) if js_truthy(value) else fallback


class AgendaService:
    def __init__(self, database: Database):
        self.db = database

    def list(self, empresa=None):
        try:
            # O legado contém datas BC. Filtrar o valor antes da decodificação:
            # psycopg não representa anos <= 0 e DateSerial aceita 100..9999.
            # Apenas a leitura para a planilha recebe null; o banco não muda.
            columns = ', '.join(['"CHAVE"', *(
                f"CASE WHEN {field} BETWEEN DATE '0100-01-01' AND DATE '9999-12-31' "
                f"THEN {field} ELSE NULL END AS {field}"
                if field in DATE_FIELDS else field
                for field in FIELDS
            )])
            query = f"SELECT {columns} FROM {TABLE}"
            params = []
            if empresa is not None:
                query += " WHERE UPPER(empresa) = %s"
                params.append(empresa.upper())
            query += ' ORDER BY data_lances DESC NULLS LAST, hora_lances ASC NULLS LAST, "CHAVE" DESC'
            return self.db.query(query, params)
        except Exception as exc:
            log.exception("Erro na API VBA Agenda Licitações (GET /)")
            raise LegacyAPIError(500, "Erro interno do servidor ao consultar agenda via VBA") from exc

    def _notify(self, action, message):
        try:
            self.db.query(
                "INSERT INTO notifications (module, action, message, created_by) VALUES (%s, %s, %s, %s)",
                ("AGENDA", action, message, None),
            )
        except Exception:
            log.exception("Erro ao registrar notificação (VBA %s)", action)
        # Mesmo quando o log falha, o legado emite refresh. Falha de transporte é não-fatal.
        try:
            self.db.notify_refresh()
        except Exception:
            log.exception("Erro ao publicar refresh de notificações")

    def create(self, payload):
        try:
            values = values_from_payload(payload)
            data = payload if isinstance(payload, dict) else {}
            # Planilhas antigas continuam enviando a CHAVE do Access. A versão
            # somente API omite o campo e usa a mesma sequência do Hub.
            columns = list(FIELDS) if "chave" not in data else ['"CHAVE"', *FIELDS]
            params = values if "chave" not in data else [data.get("chave"), *values]
            rows = self.db.query(
                f"INSERT INTO {TABLE} ({', '.join(columns)}) VALUES ({', '.join(['%s'] * len(params))}) RETURNING *",
                params,
            )
            parsed_date = parse_vba_date(data.get("data_lances"))
            parsed_time = parse_vba_time(data.get("hora_lances"))
            date_text = "/".join(reversed(parsed_date.split("-"))) if parsed_date else "N/A"
            time_text = parsed_time[:5] if parsed_time else "N/A"
            message = (
                f"{ACTOR} acaba de inserir a agenda do pregão {display(data.get('pregao'), 'Sem Nº')} "
                f"da empresa {display(data.get('empresa'), 'N/A')} para o dia {date_text} às {time_text}."
            )
            self._notify("INSERT", message)
            return rows[0]
        except Exception as exc:
            log.exception("Erro na API VBA Agenda Licitações (POST /)")
            raise LegacyAPIError(500, "Erro interno do servidor ao criar item via VBA") from exc

    def update(self, chave, payload):
        try:
            values = values_from_payload(payload)
            old = None
            try:
                rows = self.db.query(
                    f'SELECT data_lances, hora_lances FROM {TABLE} WHERE "CHAVE" = %s', (chave,)
                )
                old = rows[0] if rows else None
            except Exception:
                log.exception("Erro ao buscar dados antigos para diff VBA")
            assignments = ", ".join(f"{field} = %s" for field in FIELDS)
            rows = self.db.query(
                f'UPDATE {TABLE} SET {assignments} WHERE "CHAVE" = %s RETURNING *',
                [*values, chave],
            )
            if old and rows:
                new = rows[0]
                old_date = js_iso(old["data_lances"]).split("T")[0] if old.get("data_lances") else None
                new_date = js_iso(new["data_lances"]).split("T")[0] if new.get("data_lances") else None
                old_time = old["hora_lances"][:8] if old.get("hora_lances") else None
                new_time = new["hora_lances"][:8] if new.get("hora_lances") else None
                if old_date != new_date or old_time != new_time:
                    date_text = "/".join(reversed(new_date.split("-"))) if new_date else "N/A"
                    time_text = new_time[:5] if new_time else "N/A"
                    self._notify(
                        "UPDATE",
                        f"{ACTOR} acaba de alterar a data do pregão {display(new.get('pregao'), 'Sem Nº')} "
                        f"da empresa {display(new.get('empresa'), 'N/A')} para o dia {date_text} às {time_text}.",
                    )
            if not rows:
                raise LegacyAPIError(404, "Item não encontrado para atualização")
            return rows[0]
        except LegacyAPIError:
            raise
        except Exception as exc:
            log.exception("Erro na API VBA Agenda Licitações (PUT /:chave)")
            raise LegacyAPIError(500, "Erro interno do servidor ao atualizar item via VBA") from exc

    def delete(self, chave):
        try:
            rows = self.db.query(f'DELETE FROM {TABLE} WHERE "CHAVE" = %s RETURNING *', (chave,))
            if not rows:
                raise LegacyAPIError(404, "Item não encontrado para exclusão")
            # O DELETE original não gera notificação nem refresh.
            return {"message": "Item deletado com sucesso via VBA"}
        except LegacyAPIError:
            raise
        except Exception as exc:
            log.exception("Erro na API VBA Agenda Licitações (DELETE /:chave)")
            raise LegacyAPIError(500, "Erro interno do servidor ao deletar item via VBA") from exc
