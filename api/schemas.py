from typing import Any

from pydantic import BaseModel, Field


class AgendaPayload(BaseModel):
    """Documentação do contrato legado; não impor tipos novos ao VBA."""

    empresa: Any = Field(None, description="Empresa participante.", examples=["NEXOMED"])
    pregao: Any = Field(None, examples=["001/2026"])
    modalidade: Any = Field(None, examples=["Pregão Eletrônico"])
    orgao: Any = Field(None, examples=["Hospital de Exemplo"])
    uf: Any = Field(None, examples=["SP"])
    categoria: Any = Field(None, examples=["OPME"])
    objeto: Any = None
    portal: Any = None
    observacoes_status: Any = None
    data_cadastro: Any = Field(None, description="DD/MM/AAAA ou ISO, conforme integração atual.")
    data_limite: Any = Field(None, description="DD/MM/AAAA ou ISO.")
    hora_limite: Any = Field(None, description="HH:MM[:SS] ou fração de dia do Excel.", examples=["0,5"])
    data_lances: Any = Field(None, description="DD/MM/AAAA ou ISO.", examples=["05/11/2026"])
    hora_lances: Any = Field(None, description="HH:MM[:SS] ou fração de dia do Excel.", examples=["09:00"])
    antecedencia: Any = Field(None, description="Preserva nulo, zero e conversão do legado.")


class AgendaCreatePayload(AgendaPayload):
    chave: Any = Field(None, description="Opcional: omita para gerar a CHAVE no Hub. Se enviada, preserva a chave explícita do legado.", examples=[12345])


ERROR_SCHEMA = {
    "description": "Erro no formato legado.",
    "content": {"application/json": {"schema": {
        "type": "object", "properties": {"error": {"type": "string"}}, "required": ["error"]
    }}},
}


def body_documentation(model):
    return {"requestBody": {
        "required": True,
        "content": {"application/json": {"schema": model.model_json_schema()}},
    }}
