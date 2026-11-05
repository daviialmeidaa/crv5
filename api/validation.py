import re

from .security import LegacyAPIError


def validate_agenda_key(value):
    """Valida bigint sem passar por float ou alterar seus digitos."""
    if isinstance(value, (str, int)) and not isinstance(value, bool):
        text = str(value)
        if re.fullmatch(r"-?[0-9]+", text):
            try:
                if -(2**63) <= int(text) <= 2**63 - 1:
                    return text
            except ValueError:
                # Strings numericas muito longas tambem sao entrada invalida.
                pass
    raise LegacyAPIError(400, "CHAVE inválida. Informe um inteiro válido para o identificador do registro.")
