import os
from dataclasses import dataclass, field
from pathlib import Path

from dotenv import load_dotenv

ROOT = Path(__file__).resolve().parent.parent


@dataclass(frozen=True)
class Settings:
    vba_api_key: str | None = field(default=None, repr=False)
    database_url: str | None = field(default=None, repr=False)
    pg_host: str = "localhost"
    pg_port: int = 5432
    pg_user: str = "nexomed"
    pg_password: str | None = field(default=None, repr=False)
    pg_database: str = "nexomed_auth"

    @classmethod
    def from_env(cls):
        # Nunca sobrescrever configuração fornecida pelo processo/servidor.
        load_dotenv(ROOT / ".env", override=False)
        return cls(
            vba_api_key=os.getenv("VBA_API_KEY"),
            database_url=os.getenv("DATABASE_URL"),
            pg_host=os.getenv("PG_HOST") or "localhost",
            pg_port=int(os.getenv("PG_PORT") or 5432),
            pg_user=os.getenv("PG_USER") or "nexomed",
            pg_password=os.getenv("PG_PASSWORD"),
            pg_database=os.getenv("PG_DATABASE") or "nexomed_auth",
        )

    def database_kwargs(self):
        if self.database_url:
            # Equivalente ao SSL sem validação de CA do pgConnection.js.
            return {"sslmode": "require"}
        return {
            "host": self.pg_host,
            "port": self.pg_port,
            "user": self.pg_user,
            "password": self.pg_password,
            "dbname": self.pg_database,
        }
