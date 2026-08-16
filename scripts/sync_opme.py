import pyodbc
import psycopg2
from psycopg2.extras import execute_values
import os
import sys

# ==========================================
# CONFIGURAÇÕES DE CONEXÃO
# ==========================================

# 1. Banco Access (Windows) - Caminho Físico
ACCESS_DB_PATH = r"C:\SupraSGC\BD_Ferramentas\Nova Ferramenta Consignados\controle_consignados.accdb"
ACCESS_CONN_STR = (
    r"Driver={Microsoft Access Driver (*.mdb, *.accdb)};"
    f"DBQ={ACCESS_DB_PATH};"
)

# 2. Banco PostgreSQL (Destino) - Produção Heroku
PG_HOST = "cfvjo1ihkvjh5f.cluster-czrs8kj4isg7.us-east-1.rds.amazonaws.com"
PG_PORT = "5432"
PG_USER = "udhqir02rfn26e"
PG_PASS = "pe4b041c75c4a667726b1a9ca771be6169290357cef3f9121839d796a19e1dd20"
PG_DB   = "d188abdhkdtrl0"
PG_SCHEMA = "opme"

# ==========================================
# MAPEAMENTO DE TABELAS E COLUNAS
# A ordem importa: As Tabelas "Pais" vem primeiro!
# ==========================================
TABLES = [
    {
        "name": "Contratos",
        "columns": ["id", "id_contrato", "material", "cod_cliente", "cliente", "uf", "pregao", "total_ata", "inicio_ata", "termino_ata", "inativo"]
    },
    {
        "name": "Unidades",
        "columns": ["id", "contrato", "cod_cliente", "hospital", "sigla"]
    },
    {
        "name": "BancoCodigos",
        "columns": ["id", "contrato", "cod_bio", "cod_fab", "produto", "descricao_personalizada", "classificacao", "item_ata"]
    },
    {
        "name": "SaldoAta",
        "columns": ["id", "contrato", "item_ata", "descricao_item", "quantidade_ata", "valor_unitario", "valor_total", "quantidade_utilizada", "saldo"]
    },
    {
        "name": "SaldoAtaHospital",
        "columns": ["id", "contrato", "unidade", "item_ata", "descricao_item", "quantidade_ata", "valor_unitario", "valor_total", "quantidade_utilizada", "saldo"]
    },
    {
        "name": "Cirurgias",
        "columns": ["id", "contrato", "acao", "paciente", "local_cirurgias", "cod_cliente", "data_cirurgia", "cod_bio", "classificacao", "produto", "descricao_personalizada", "quantidade_utilizada", "lote", "prontuario", "medico", "crm", "valor_unitario", "valor_total", "item_pregao", "empenho", "autorizacao", "pedido", "retorno_consignacao", "status_expedicao", "autorizacao_opme", "nota_fiscal"]
    }
]

def main():
    print(f"Iniciando sincronização (Access -> PostgreSQL) ...")
    print(f"Lendo de: {ACCESS_DB_PATH}")
    
    try:
        # Conexões
        print("Conectando aos bancos...")
        conn_acc = pyodbc.connect(ACCESS_CONN_STR)
        cursor_acc = conn_acc.cursor()
        
        conn_pg = psycopg2.connect(
            host=PG_HOST, port=PG_PORT, user=PG_USER, password=PG_PASS, database=PG_DB
        )
        cursor_pg = conn_pg.cursor()

        # Loop por cada tabela mapeada
        for table in TABLES:
            table_name = table["name"]
            columns = table["columns"]
            
            print(f"\n--- Sincronizando: {table_name} ---")
            
            # 1. Buscar todos os dados do Access
            cols_str_acc = ", ".join([f"[{c}]" for c in columns])
            query_acc = f"SELECT {cols_str_acc} FROM [{table_name}]"
            
            try:
                cursor_acc.execute(query_acc)
                rows_acc = cursor_acc.fetchall()
            except Exception as e:
                print(f"Erro ao ler tabela [{table_name}] no Access. Ignorando... Detalhe: {e}")
                continue
                
            # Converter dados brutos para tuplas (formato que o psycopg2 adora)
            access_data = [tuple(row) for row in rows_acc]
            access_ids = {row[0] for row in access_data}
            
            # 2. Buscar IDs no Postgres para identificar o que foi DELETADO no Access
            cursor_pg.execute(f"SELECT id FROM {PG_SCHEMA}.{table_name}")
            pg_ids = {row[0] for row in cursor_pg.fetchall()}
            
            # 3. DELEÇÃO DE ÓRFÃOS (Diferença de Conjuntos)
            ids_to_delete = pg_ids - access_ids
            if ids_to_delete:
                print(f" > Encontrados {len(ids_to_delete)} registros excluídos no Access. Removendo do Postgres...")
                format_strings = ','.join(['%s'] * len(ids_to_delete))
                cursor_pg.execute(f"DELETE FROM {PG_SCHEMA}.{table_name} WHERE id IN ({format_strings})", tuple(ids_to_delete))
                conn_pg.commit()
                
            # 4. UPSERT (Update/Insert em massa)
            if access_data:
                print(f" > Realizando Upsert de {len(access_data)} registros...")
                
                cols_str_pg = ", ".join(columns)
                
                # Montar o trecho ON CONFLICT DO UPDATE (ignora a chave 'id')
                update_cols = [c for c in columns if c != "id"]
                if update_cols:
                    update_str = ", ".join([f"{c} = EXCLUDED.{c}" for c in update_cols])
                    upsert_sql = f"""
                        INSERT INTO {PG_SCHEMA}.{table_name} ({cols_str_pg})
                        VALUES %s
                        ON CONFLICT (id) DO UPDATE SET {update_str}
                    """
                else:
                    upsert_sql = f"""
                        INSERT INTO {PG_SCHEMA}.{table_name} ({cols_str_pg})
                        VALUES %s
                        ON CONFLICT (id) DO NOTHING
                    """
                
                # A função execute_values é altamente otimizada para milhares de linhas
                execute_values(cursor_pg, upsert_sql, access_data)
                conn_pg.commit()
                
        print("\n✅ SINCRONIZAÇÃO CONCLUÍDA COM SUCESSO!")
        
    except Exception as e:
        print(f"\n❌ ERRO CRÍTICO: {e}")
    finally:
        if 'conn_acc' in locals(): conn_acc.close()
        if 'conn_pg' in locals(): conn_pg.close()

if __name__ == "__main__":
    main()
