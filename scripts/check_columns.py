import pyodbc

ACCESS_DB_PATH = r"C:\SupraSGC\BD_Ferramentas\Nova Ferramenta Consignados\controle_consignados.accdb"
ACCESS_CONN_STR = (
    r"Driver={Microsoft Access Driver (*.mdb, *.accdb)};"
    f"DBQ={ACCESS_DB_PATH};"
)

try:
    conn = pyodbc.connect(ACCESS_CONN_STR)
    cursor = conn.cursor()
    print("Colunas reais da tabela Cirurgias no Access:")
    for row in cursor.columns(table='Cirurgias'):
        print(f"- {row.column_name}")
except Exception as e:
    print("Erro:", e)
