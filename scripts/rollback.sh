#!/bin/bash

echo "⚠️  INICIANDO PROCESSO DE ROLLBACK DE EMERGÊNCIA ⚠️"
echo "------------------------------------------------"

# Pega o branch atual
CURRENT_BRANCH=$(git branch --show-current)

if [ -z "$1" ]; then
    echo "Nenhum commit especificado. O rollback será feito para o commit anterior (HEAD~1)."
    TARGET="HEAD~1"
else
    echo "Rollback será feito para o commit/hash especificado: $1"
    TARGET="$1"
fi

echo ""
read -p "Tem certeza que deseja forçar o rollback do repositório e de produção para '$TARGET'? (s/n): " CONFIRM
if [[ "$CONFIRM" != "s" && "$CONFIRM" != "S" ]]; then
    echo "Rollback cancelado."
    exit 0
fi

echo "🔄 1. Revertendo commit localmente..."
git reset --hard $TARGET

if [ $? -ne 0 ]; then
    echo "❌ Erro ao reverter o commit localmente."
    exit 1
fi

echo "🚀 2. Forçando push para o GitHub (origin)..."
git push origin $CURRENT_BRANCH --force

echo "🚀 3. Forçando push para o Heroku (produção)..."
# Heroku geralmente usa a branch 'main' ou 'master' para deploy automático, mas como podemos estar pushando de uma feature branch
# o correto é mapear a branch atual para o main do heroku, ou se tiver deploy automatico pelo github ativado, o origin push já basta.
# Mas para garantir o push direto manual:
git push heroku $CURRENT_BRANCH:main --force

echo "------------------------------------------------"
echo "✅ ROLLBACK CONCLUÍDO COM SUCESSO!"
echo "O sistema local, o repositório no GitHub e a Produção no Heroku foram revertidos para: $TARGET"
