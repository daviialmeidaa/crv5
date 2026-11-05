from collections.abc import Sequence
from typing import Any, Protocol

from psycopg import InterfaceError, OperationalError
from psycopg.rows import dict_row
from psycopg_pool import ConnectionPool

from .compat import pg_value, serialize_pg_value
from .config import Settings

NOTIFICATION_CHANNEL = "hub_notifications_refresh"


class Database(Protocol):
    def query(self, sql: str, params: Sequence[Any] = ()) -> list[dict]: ...
    def notify_refresh(self) -> None: ...


class PostgresDatabase:
    def __init__(self, settings: Settings):
        self.pool = ConnectionPool(
            conninfo=settings.database_url or "",
            kwargs={**settings.database_kwargs(), "autocommit": True, "row_factory": dict_row},
            min_size=0, max_size=10, open=False,
            # Descarta conexoes mortas antes da operacao, sem repetir gravacoes.
            check=self._check_connection,
        )

    def _check_connection(self, conn):
        try:
            ConnectionPool.check_connection(conn)
        except (InterfaceError, OperationalError):
            # Um restart pode invalidar todas as conexoes ociosas. Verifica o
            # restante do pool de uma vez, antes de executar qualquer operacao.
            self.pool.check()
            raise

    def open(self):
        self.pool.open()

    def close(self):
        self.pool.close()

    def query(self, sql, params=()):
        # Autocommit por query preserva os commits independentes do pgPool.query.
        with self.pool.connection() as conn:
            with conn.cursor() as cursor:
                cursor.execute(sql, tuple(pg_value(value) for value in params))
                if cursor.description is None:
                    return []
                columns = {column.name: column.type_code for column in cursor.description}
                return [
                    {key: serialize_pg_value(value, columns[key]) for key, value in row.items()}
                    for row in cursor.fetchall()
                ]

    def notify_refresh(self):
        self.query("SELECT pg_notify(%s, %s)", (NOTIFICATION_CHANNEL, "refresh"))
