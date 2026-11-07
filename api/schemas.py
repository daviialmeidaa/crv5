from typing import Any

from pydantic import BaseModel, Field


class ItemVbaPayload(BaseModel):
    """Documentação; a validação do serviço distingue inclusão e PUT parcial."""
    model_config = {"extra": "forbid", "json_schema_extra": {"example": {
        "COD_CONTRATO": 123, "MATERIAL": "Prótese de exemplo", "QTDE": 2,
        "VALOR_UNITARIO": "12,50", "VALOR_TOTAL": "25.00", "COD_STATUS": "0",
    }}}
    COD_CONTRATO_CONCAT: Any = Field(None, examples=["BML123"])
    COD_CONTRATO: Any = Field(None, examples=[123])
    ORGAO: Any = None
    MUNICIPIO: Any = None
    UF: Any = None
    PARTICIPANTE: Any = Field(None, description="BML/BML HOSPITALAR são gravados como BML HOSPITALAR; NEXOMED é normalizado. Vazio usa a empresa da URL. MEDICAL LIFE permanece aceito na tabela NEXOMED.", examples=["BML HOSPITALAR"])
    EDITAL: Any = None
    DATA_PREGAO: Any = Field(None, description="DD/MM/AAAA, ISO ou serial Excel.", examples=["07/11/2026"])
    TIPO_CONTRATO: Any = None
    CLASSIFICACAO: Any = None
    LOTE_ITEM: Any = None
    MATERIAL: Any = Field(None, examples=["Prótese de exemplo"])
    QTDE: Any = Field(None, examples=["2"])
    UNIDADE: Any = None
    FORNECEDOR: Any = None
    DESCRICAO_DATABASE: Any = None
    COD_SUPRA: Any = None
    NOME_SUPRA: Any = None
    VALOR_UNITARIO: Any = Field(None, examples=["12,50"])
    VALOR_TOTAL: Any = Field(None, examples=["25.00"])
    TOTAL_NORMALIZADO: Any = Field(None, description="Texto legado, inclusive AVALIAÇÃO INDIVIDUAL.")
    DATA_PROPOSTA: Any = Field(None, description="DD/MM/AAAA, ISO ou serial Excel.")
    COD_STATUS: Any = Field(None, examples=["0"])
    SITUACAO_STATUS: Any = None
    DATA_ADJUDICACAO: Any = Field(None, description="Texto legado; aceita datas e observações.")
    DATA_INICIO: Any = None
    DATA_TERMINO: Any = None
    VIGENCIA: Any = None
    DATA_EMPENHO: Any = None
    INSTRUMENTAL: Any = None
    INSTRUMENTADOR: Any = None
    LOCAL_ENTREGA: Any = None
    PRAZO_ENTREGA: Any = None
    DETALHAMENTO: Any = None
    CODIGO_STATUS: Any = Field(None, description="Alias numérico de COD_STATUS; quando ambos enviados, devem coincidir.")


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
