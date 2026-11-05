from datetime import date, time
from pathlib import Path
import pytest
from fastapi.testclient import TestClient
from api.compat import parse_vba_date, parse_vba_time, serialize_pg_value
from api.config import ROOT, Settings
from api.main import create_app


class Database:
    def __init__(self, rows=None):
        self.rows = rows if rows is not None else [{'CHAVE': '9007199254740993', 'data_lances': None, 'hora_lances': None}]
        self.queries = []
        self.refreshes = 0

    def query(self, sql, params=()):
        self.queries.append((sql, params))
        if sql.startswith('INSERT INTO notifications'):
            return []
        return self.rows

    def notify_refresh(self):
        self.refreshes += 1


@pytest.mark.parametrize('method,path', [('GET',''),('POST',''),('PUT','/1'),('DELETE','/1')])
@pytest.mark.parametrize('key,status', [(None,401),('',401),('wrong',403)])
def test_authentication_precedes_database(method, path, key, status):
    db = Database()
    with TestClient(create_app(Settings(vba_api_key='test-key'), db)) as client:
        response = client.request(method, '/api/vba/agenda_licitacoes' + path, headers={} if key is None else {'x-api-key':key}, json={})
    assert response.status_code == status
    assert 'error' in response.json()
    assert db.queries == []


def test_contract_and_docs():
    db = Database()
    with TestClient(create_app(Settings(vba_api_key='test-key'), db)) as client:
        for path in ('/docs','/docs/','/api/docs'):
            assert 'SwaggerUIBundle' in client.get(path).text
        schema = client.get('/api/openapi.json').json()
        assert set(schema['paths']['/api/vba/agenda_licitacoes']) == {'get','post'}
        assert set(schema['paths']['/api/vba/agenda_licitacoes/{chave}']) == {'put','delete'}
        assert schema['components']['securitySchemes']['VBAApiKey']['name'] == 'x-api-key'
        read = client.get('/api/vba/agenda_licitacoes?empresa=BML', headers={'x-api-key':'test-key'})
        assert read.status_code == 200 and read.json()[0]['CHAVE'] == '9007199254740993'
        assert read.headers['cache-control'] == 'no-store'
        assert db.queries[-1][1] == ['BML']
    assert ROOT == Path(__file__).resolve().parents[2]


def test_write_contract_and_notifications():
    db = Database()
    with TestClient(create_app(Settings(vba_api_key='test-key'), db), headers={'x-api-key':'test-key'}) as client:
        assert client.post('/api/vba/agenda_licitacoes', json={'empresa':'NEXOMED'}).status_code == 201
        assert len(db.queries[0][1]) == 15
        assert db.refreshes == 1
        assert client.put('/api/vba/agenda_licitacoes/1', json={'empresa':'NEXOMED'}).status_code == 200
        assert db.refreshes == 1
        assert client.delete('/api/vba/agenda_licitacoes/1').json() == {'message':'Item deletado com sucesso via VBA'}
        assert db.refreshes == 1


@pytest.mark.parametrize('method', ['PUT','DELETE'])
def test_missing_record(method):
    with TestClient(create_app(Settings(vba_api_key='test-key'), Database([]))) as client:
        assert client.request(method, '/api/vba/agenda_licitacoes/1', headers={'x-api-key':'test-key'}, json={}).status_code == 404


@pytest.mark.parametrize('value,expected', [(None,None),('',None),('5/11/2026','2026-11-05'),('2026-11-05','2026-11-05')])
def test_dates(value, expected):
    assert parse_vba_date(value) == expected


@pytest.mark.parametrize('value,expected', [(None,None),(0,None),('0','00:00:00'),('0,5','12:00:00'),('09:30','09:30')])
def test_times(value, expected):
    assert parse_vba_time(value) == expected


def test_postgres_json_compatibility():
    assert serialize_pg_value(9007199254740993,20) == '9007199254740993'
    assert serialize_pg_value(date(2026,11,5),1082) == '2026-11-05T03:00:00.000Z'
    assert serialize_pg_value(time(12,30,0,123400),1083) == '12:30:00.1234'
