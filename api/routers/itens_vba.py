from typing import Annotated, Any

from fastapi import APIRouter, Body, Depends, Request, Response

from ..schemas import ERROR_SCHEMA, ItemVbaPayload, body_documentation
from ..security import require_vba_key
from ..services.itens_arrematados import ItensArrematadosService

router = APIRouter(prefix="/api/vba/itens_arrematados", tags=["Integração VBA — Itens Arrematados"],
                   dependencies=[Depends(require_vba_key)], responses={400: ERROR_SCHEMA, 401: ERROR_SCHEMA, 403: ERROR_SCHEMA, 404: ERROR_SCHEMA, 500: ERROR_SCHEMA})


def service(request):
    return ItensArrematadosService(request.app.state.database)


@router.get("/{empresa}", summary="Ler os itens de BML ou NEXOMED")
def list_items(empresa: str, request: Request, response: Response):
    response.headers["Cache-Control"] = "no-store"
    return service(request).list(empresa)


@router.get("/{empresa}/{chave}", summary="Ler um item por empresa e CHAVE")
def get_item(empresa: str, chave: str, request: Request, response: Response):
    response.headers["Cache-Control"] = "no-store"
    return service(request).list(empresa, chave)


@router.post("/{empresa}", status_code=201, summary="Inserir item; CHAVE gerada pelo Hub",
             openapi_extra=body_documentation(ItemVbaPayload))
def create_item(empresa: str, request: Request, payload: Annotated[Any, Body()] = None):
    return service(request).save(empresa, payload)


@router.put("/{empresa}/{chave}", summary="Atualizar os campos enviados de um item",
            openapi_extra=body_documentation(ItemVbaPayload))
def update_item(empresa: str, chave: str, request: Request, payload: Annotated[Any, Body()] = None):
    return service(request).save(empresa, payload, chave)


@router.delete("/{empresa}/{chave}", summary="Excluir somente o item indicado nesta empresa")
def delete_item(empresa: str, chave: str, request: Request):
    return service(request).delete(empresa, chave)
