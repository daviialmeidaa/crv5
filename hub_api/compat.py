"""Conversões do legado JavaScript; não adicionar validação de negócio aqui."""

import json
import math
import re
from datetime import date, datetime, time, timezone
from decimal import Decimal
from zoneinfo import ZoneInfo

BRT = ZoneInfo("America/Sao_Paulo")
FLOAT_PREFIX = re.compile(r"^[+-]?(?:Infinity|(?:\d+\.?\d*|\.\d+)(?:[eE][+-]?\d+)?)")


def js_truthy(value):
    if value is None or value is False:
        return False
    if isinstance(value, (int, float)):
        return value != 0 and not (isinstance(value, float) and math.isnan(value))
    if isinstance(value, str):
        return bool(value)
    return True


def js_string(value):
    if value is None:
        return "null"
    if isinstance(value, bool):
        return "true" if value else "false"
    if isinstance(value, list):
        return ",".join("" if item is None else js_string(item) for item in value)
    if isinstance(value, dict):
        return "[object Object]"
    if isinstance(value, float) and value.is_integer():
        return str(int(value))
    return str(value)


def pg_value(value):
    """node-postgres envia escalares como texto e objetos como JSON."""
    if value is None:
        return None
    if isinstance(value, list):
        def element(item):
            if item is None:
                return "NULL"
            if isinstance(item, list):
                return pg_value(item)
            text = pg_value(item).replace("\\", "\\\\").replace('"', '\\"')
            return f'"{text}"'
        return "{" + ",".join(element(item) for item in value) + "}"
    if isinstance(value, dict):
        return json.dumps(value, ensure_ascii=False, separators=(",", ":"))
    return js_string(value)


def parse_vba_date(value):
    if not js_truthy(value) or js_string(value).strip() == "":
        return None
    text = js_string(value).strip()
    if "/" in text:
        parts = text.split("/")
        if len(parts) >= 3:
            return f"{parts[2][:4]}-{parts[1].rjust(2, '0')}-{parts[0].rjust(2, '0')}"
    return text


def parse_vba_time(value):
    if not js_truthy(value) or js_string(value).strip() == "":
        return None
    text = js_string(value).strip().replace(",", ".", 1)
    if ":" in text:
        return text
    match = FLOAT_PREFIX.match(text)
    number = float(match.group()) if match else math.nan
    if not math.isnan(number) and number < 1:
        seconds_total = math.floor(number * 86400 + 0.5)  # Math.round
        hours = math.floor(seconds_total / 3600)
        minutes = math.floor(math.fmod(seconds_total, 3600) / 60)
        seconds = int(math.fmod(seconds_total, 60))
        return ":".join(str(n).rjust(2, "0") for n in [hours, minutes, seconds])
    return text


def js_iso(value):
    if isinstance(value, date) and not isinstance(value, datetime):
        value = datetime.combine(value, time())
    if isinstance(value, str):
        value = datetime.fromisoformat(value.replace("Z", "+00:00"))
    if value.tzinfo is None:
        value = value.replace(tzinfo=BRT)
    return value.astimezone(timezone.utc).isoformat(timespec="milliseconds").replace("+00:00", "Z")


def serialize_pg_value(value, oid):
    if value is None:
        return None
    if oid in (20, 1700):  # int8/numeric: pg retorna strings, inclusive CHAVE.
        return str(value)
    if oid in (1082, 1114, 1184):  # date / timestamp / timestamptz.
        return js_iso(value)
    if isinstance(value, time):
        return value.isoformat().rstrip("0").rstrip(".") if value.microsecond else value.isoformat()
    if isinstance(value, Decimal):
        return str(value)
    return value
