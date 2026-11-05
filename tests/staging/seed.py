# Exclusivo do PostgreSQL descartavel definido no README de homologacao.
from pathlib import Path
import json, subprocess
import psycopg
from psycopg import sql
host='127.0.0.1'
port=6778
with psycopg.connect(host=host,connect_timeout=5,port=port,user='postgres',password='qa-only',dbname='nexomed_qa',autocommit=True) as c:
 if c.execute('SELECT current_database()').fetchone()[0] != 'nexomed_qa': raise RuntimeError('Banco QA obrigatorio')
 for schema in ('public','agenda_licitacoes','financeiro','itens_arrematados','opme'):
  c.execute(sql.SQL('DROP SCHEMA IF EXISTS {} CASCADE').format(sql.Identifier(schema)))
 c.execute(Path('tests/staging/schema.sql').read_text())
 c.execute(Path('tests/staging/indexes.sql').read_text())
 permissions={key:True for key in ('canViewCR','canViewLC','canViewOPME','canViewUsers','canManageUsers','canViewClientes','canCreateUsers','canManageRoles','canResetHeroku','canViewCustos','canReceiveEmailsLC','canReceiveEmailsCR')}
 for name,perms in [('ADMIN',permissions),('LC1',{'canViewLC':True}),('CR1',{'canViewCR':True,'canViewClientes':True}),('OPME1',{'canViewOPME':True}),('BLOQUEADO',{})]:
  c.execute('INSERT INTO roles(name,permissions,is_system) VALUES(%s,%s::jsonb,true)',(name,json.dumps(perms)))
 hashed=subprocess.check_output(['node','-e',"process.stdout.write(require('bcryptjs').hashSync('qa-password',10))"],text=True)
 for name,role,first,active in [('admin','ADMIN',False,True),('lc','LC1',False,True),('cr','CR1',False,True),('opme','OPME1',False,True),('first','ADMIN',True,True),('inactive','ADMIN',False,False),('blocked','BLOQUEADO',False,True)]:
  c.execute('INSERT INTO users(nome,email,password_hash,role,first_access,is_active) VALUES(%s,%s,%s,%s,%s,%s)',(name,name+'@qa.invalid',hashed,role,first,active))
 c.execute('INSERT INTO metas_recebimento(id,valor_meta) VALUES(1,100000)')
 c.execute("INSERT INTO contratos(codigo_contrato,empresa,edital,tipo_contrato,classificacao) VALUES('BIO001','Nexomed','PE001','ATA','OPME')")
 for i in range(1,61):
  c.execute("""INSERT INTO titulos(empresa,nota,documento,cod_cliente,cliente,esfera,uf,contrato,valor_nota,valor_deposito,data_emissao,data_vencimento,status,banco)
   VALUES('Nexomed',%s,%s,'123','Hospital QA','PUBLICO','SP','BIO001',1000,0,CURRENT_DATE,CURRENT_DATE+5,'PENDENTE','BANCO QA')""",(str(1000+i),str(1000+i)))
 for empresa in ('NEXOMED','BML'):
  for i in range(31):c.execute('''INSERT INTO agenda_licitacoes."AGENDA_LICITACOES"(empresa,pregao,orgao,uf,data_cadastro,data_lances,hora_lances,antecedencia)
  VALUES(%s,%s,'Hospital QA','SP',CURRENT_DATE,CURRENT_DATE+%s,'09:00',1)''',(empresa,empresa+' QA '+str(i),1+i%3))
 c.execute("INSERT INTO opme.contratos(id_contrato,material,cod_cliente,cliente,uf,pregao,total_ata,inicio_ata,termino_ata,empresa) VALUES('BIO001','Kit QA',123,'Hospital QA','SP','PE001',1000,CURRENT_DATE,CURRENT_DATE+365,'NEXOMED')")
 c.execute("INSERT INTO opme.unidades(contrato,cod_cliente,hospital,sigla) VALUES('BIO001',123,'Hospital QA','HQA')")
 c.execute("INSERT INTO opme.bancocodigos(contrato,cod_bio,cod_fab,produto,classificacao,item_ata) VALUES('BIO001',1,'FAB1','Produto QA','OPME','1')")
 c.execute("INSERT INTO opme.saldoata(contrato,item_ata,descricao_item,quantidade_ata,valor_unitario,valor_total,quantidade_utilizada,saldo) VALUES('BIO001','1','Produto QA',10,100,1000,0,10)")
 c.execute("INSERT INTO opme.saldoatahospital(contrato,unidade,item_ata,descricao_item,quantidade_ata,valor_unitario,valor_total,quantidade_utilizada,saldo) VALUES('BIO001','HQA','1','Produto QA',10,100,1000,0,10)")
 c.execute("INSERT INTO opme.cirurgias(contrato,paciente,local_cirurgia,cod_cliente,data_cirurgia,cod_bio,produto,quantidade_utilizada,valor_unitario,valor_total) VALUES('BIO001','Paciente Ficticio','Hospital QA',123,CURRENT_DATE,1,'Produto QA',1,100,100)")
 c.execute("INSERT INTO agenda_contatos(codigo_cliente,nome_contato,cargo_contato,email_contato,ativo) VALUES('123','Contato QA','Financeiro','contato@qa.invalid',true)")
 c.execute("INSERT INTO historico_cobranca(codigo_cliente,tipo_contato,has_agendamento,agendamento_data_contato,agendamento_hora_contato,created_by) VALUES('123','EMAIL',true,CURRENT_DATE,'14:00',1)")
print('Banco nexomed_qa preparado: 26 tabelas, 33 restricoes; somente dados ficticios.')
