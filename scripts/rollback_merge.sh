#!/bin/bash
# Script para realizar rollback automático do último merge/pull na branch atual

echo "================================================"
echo "    Rollback Dinâmico do Último Merge/Pull      "
echo "================================================"

# Pega o hash atual
CURRENT_HASH=$(git rev-parse HEAD)

# Procura o último commit de Merge no histórico
LAST_MERGE=$(git log --merges -n 1 --pretty=format:"%H")

if [ -n "$LAST_MERGE" ]; then
    # Se encontrou um merge no histórico, o estado anterior da main 
    # é sempre o "Pai 1" (First Parent) desse commit de merge.
    PREVIOUS_HASH=$(git rev-parse $LAST_MERGE^1)
    echo "Último merge encontrado: $LAST_MERGE"
else
    # Se não for um "Merge Commit" (ex: Fast-forward), usamos o ORIG_HEAD
    # que o Git salva automaticamente antes de qualquer git pull/reset/merge
    PREVIOUS_HASH=$(git rev-parse ORIG_HEAD 2>/dev/null)
    echo "Nenhum merge explícito encontrado. Utilizando fallback do ORIG_HEAD."
fi

if [ -z "$PREVIOUS_HASH" ]; then
    echo "⚠️  Não foi possível determinar um ponto de rollback seguro."
    exit 1
fi

echo ""
echo "Hash atual da branch: $CURRENT_HASH"
echo "Hash antes do último merge: $PREVIOUS_HASH"
echo ""
echo "O que este script fará:"
echo "Ele retornará todos os seus arquivos locais exatamente para o estado do hash: $PREVIOUS_HASH"
echo ""

read -p "Tem certeza que deseja executar o rollback local? (s/N): " confirmar

if [[ "$confirmar" == "s" || "$confirmar" == "S" ]]; then
    # Faz o reset para o hash anterior
    git reset --hard $PREVIOUS_HASH
    echo ""
    echo "✅ Rollback local concluído com sucesso!"
    echo "Sua branch retornou ao estado anterior ao merge."
    echo ""
    echo "⚠️  ATENÇÃO: Se esse merge já estava no GitHub (origin/main), o GitHub ainda o tem."
    echo "Para forçar o GitHub a aceitar esse rollback (sobreescrevendo o histórico online),"
    echo "você precisará rodar manualmente o seguinte comando (use com cuidado se trabalhar em equipe):"
    echo ""
    echo "   git push origin main --force"
    echo ""
else
    echo "❌ Rollback cancelado pelo usuário."
fi
