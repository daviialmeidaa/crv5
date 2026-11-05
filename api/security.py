from typing import Annotated

from fastapi import Request, Security
from fastapi.security import APIKeyHeader

api_key_header = APIKeyHeader(name="x-api-key", auto_error=False, scheme_name="VBAApiKey")


class LegacyAPIError(Exception):
    def __init__(self, status_code: int, message: str):
        self.status_code = status_code
        self.message = message


def require_vba_key(request: Request, api_key: Annotated[str | None, Security(api_key_header)]):
    if not api_key:
        raise LegacyAPIError(401, "Acesso negado. Header x-api-key não fornecido.")
    if api_key != request.app.state.settings.vba_api_key:
        raise LegacyAPIError(403, "Acesso negado. API Key inválida.")
