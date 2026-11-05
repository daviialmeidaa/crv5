"""Integração opcional: PostgreSQL descartável, sem usar o .env real."""
import os
import psycopg
import pytest
from fastapi.testclient import TestClient
from api.config import Settings
from api.main import create_app

PORT = os.getenv('HUB_TEST_PG_PORT')
pytestmark = pytest.mark.skipif(not PORT, reason='Defina HUB_TEST_PG_PORT para o PostgreSQL descartavel')


def test_full_crud_and_legacy_date_against_postgres():
    settings = Settings(vba_api_key='test-key', pg_host='127.0.0.1', pg_port=int(PORT),
                        pg_user='postgres', pg_password='test-only', pg_database='nexomed_test')
    with psycopg.connect(**settings.database_kwargs(), autocommit=True) as db:
        db.execute('CREATE SCHEMA IF NOT EXISTS agenda_licitacoes')
        db.execute('''CREATE TABLE IF NOT EXISTS agenda_licitacoes."AGENDA_LICITACOES" (
            "CHAVE" bigserial PRIMARY KEY, empresa text, pregao text, modalidade text,
            orgao text, uf text, categoria text, objeto text, portal text, observacoes_status text,
            data_cadastro date, data_limite date, hora_limite time, data_lances date, hora_lances time,
            antecedencia integer, created_at timestamptz DEFAULT now())''')
        db.execute('CREATE TABLE IF NOT EXISTS notifications (module text, action text, message text, created_by integer)')
        db.execute('TRUNCATE agenda_licitacoes."AGENDA_LICITACOES", notifications RESTART IDENTITY')
        with TestClient(create_app(settings)) as client:
            headers={'x-api-key':'test-key'}
            body={'empresa':'NEXOMED','pregao':'Teste','data_lances':'05/11/2026','hora_lances':'0,5','antecedencia':0}
            created=client.post('/api/vba/agenda_licitacoes',headers=headers,json=body)
            assert created.status_code==201
            row=created.json(); key=row['CHAVE']
            assert isinstance(key,str)
            assert row['data_lances']=='2026-11-05T03:00:00.000Z'
            assert row['hora_lances']=='12:00:00'
            assert row['antecedencia']==0
            assert client.get('/api/vba/agenda_licitacoes?empresa=BML',headers=headers).json()==[]
            assert len(client.get('/api/vba/agenda_licitacoes',headers=headers).json())==1
            assert client.put('/api/vba/agenda_licitacoes/'+key,headers=headers,json={**body,'hora_lances':'09:00'}).status_code==200
            assert db.execute('SELECT count(*) FROM notifications').fetchone()[0]==2
            db.execute('INSERT INTO agenda_licitacoes."AGENDA_LICITACOES" (data_cadastro) VALUES (%s::date)',('0001-01-01 BC',))
            read=client.get('/api/vba/agenda_licitacoes',headers=headers)
            assert read.status_code==200
            assert all(record['data_cadastro'] is None for record in read.json())
            assert client.delete('/api/vba/agenda_licitacoes/'+key,headers=headers).status_code==200
            assert client.delete('/api/vba/agenda_licitacoes/'+key,headers=headers).status_code==404
            assert db.execute('SELECT count(*) FROM notifications').fetchone()[0]==2
