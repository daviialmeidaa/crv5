from typing import Annotated, Any

from fastapi import APIRouter, Body, Depends, Query, Request, Response

from ..schemas import AgendaCreatePayload, AgendaPayload, ERROR_SCHEMA, body_documentation
from ..security import require_vba_key
from ..services.agenda import AgendaService

router = APIRouter(
    prefix="/api/vba", tags=["Integração VBA — Agenda de Licitações"],
    dependencies=[Depends(require_vba_key)],
    responses={400: ERROR_SCHEMA, 401: ERROR_SCHEMA, 403: ERROR_SCHEMA, 500: ERROR_SCHEMA},
)


def service(request: Request):
    return AgendaService(request.app.state.database)


@router.get("/agenda_licitacoes/", include_in_schema=False)
@router.get(
    "/agenda_licitacoes", summary="Ler a agenda compartilhada pelo Hub e pela planilha",
    description="Retorna todos os registros atuais, inclusive inclusões e alterações feitas pelo Hub. Não altera dados.",
    response_model=list[dict[str, Any]],
)
def list_agenda(
    request: Request, response: Response,
    empresa: Annotated[str | None, Query(description="Filtro opcional por empresa, sem diferenciar maiúsculas/minúsculas.")] = None,
):
    response.headers["Cache-Control"] = "no-store"
    return service(request).list(empresa)


@router.post("/agenda_licitacoes/", status_code=201, include_in_schema=False)
@router.post(
    "/agenda_licitacoes", status_code=201,
    summary="Inserir agenda enviada pela planilha VBA",
    openapi_extra=body_documentation(AgendaCreatePayload),
)
def create_agenda(
    request: Request, payload: Annotated[Any, Body()] = None,
):
    return service(request).create(payload)


@router.put("/agenda_licitacoes/{chave}/", include_in_schema=False)
@router.put(
    "/agenda_licitacoes/{chave}", summary="Atualizar agenda pela CHAVE",
    responses={404: ERROR_SCHEMA},
    openapi_extra=body_documentation(AgendaPayload),
)
def update_agenda(
    chave: str, request: Request, payload: Annotated[Any, Body()] = None,
):
    return service(request).update(chave, payload)


@router.delete("/agenda_licitacoes/{chave}/", include_in_schema=False)
@router.delete(
    "/agenda_licitacoes/{chave}", summary="Excluir agenda pela CHAVE",
    responses={404: ERROR_SCHEMA},
)
def delete_agenda(chave: str, request: Request):
    return service(request).delete(chave)
