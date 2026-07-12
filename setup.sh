#!/bin/bash

echo "=========================================================="
echo "🚀 Iniciando configuração do Contas a Receber (Nexomed)..."
echo "=========================================================="

echo "[1/4] Verificando arquivo de variáveis de ambiente (.env)..."
if [ ! -f .env ]; then
    echo "⚠️ Arquivo .env não encontrado. Gerando modelo padrão..."
    cat <<EOF > .env
# Configurações do Banco Local (PostgreSQL no Docker)
PG_HOST=db
PG_PORT=5432
PG_USER=nexomed
PG_PASSWORD=nexomed123
PG_DATABASE=nexomed_auth

# URL da Aplicação (Para os e-mails apontarem para o IP correto da rede)
APP_URL=http://10.0.0.2:3000

# Configurações de Conexão com o Supra ERP (Acesso Apenas Leitura!)
SUPRA_USER=sa
SUPRA_PASSWORD=sua_senha_do_supra

# Chave JWT
JWT_SECRET=super_secret_key_nexomed_123!
EOF
    echo "✅ Arquivo .env criado! Lembre-se de editar as credenciais do SUPRA_PASSWORD depois."
else
    echo "✅ Arquivo .env encontrado."
fi

echo ""
echo "[2/4] Construindo e iniciando containers Docker..."
docker compose up -d --build

echo ""
echo "[3/4] Aguardando o PostgreSQL inicializar (10 segundos)..."
sleep 10

echo ""
echo "[4/4] Criando tabelas no banco de dados (Seed)..."
if [ -f db/seed.js ]; then
    docker exec -it nexomed_app node db/seed.js
    echo "✅ Tabelas criadas e usuário Admin inserido!"
else
    echo "❌ Arquivo db/seed.js não encontrado. Não foi possível criar as tabelas."
fi

echo ""
echo "📊 Alimentando o banco com as planilhas Excel base..."
echo "-> Importando contratos (contrato_insert.xlsx)..."
docker exec -it nexomed_app node scripts/import_contratos.js

echo "-> Importando títulos (contas a receber base inicial.xlsx)..."
docker exec -it nexomed_app node scripts/seed_from_excel.js
echo "✅ Planilhas importadas com sucesso!"

echo ""
echo "=========================================================="
echo "🎉 TUDO PRONTO! O sistema já deve estar acessível."
echo "🔗 Acesse: http://localhost:3000"
echo "=========================================================="
