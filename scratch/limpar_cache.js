const { clearCache } = require('../db/redis');

async function run() {
    try {
        const anos = [2024, 2025, 2026];
        for (const ano of anos) {
            await clearCache(`financeiro:resumo:${ano}`);
            await clearCache(`financeiro:historico:${ano}`);
            console.log(`Cache limpado para o ano ${ano}`);
        }
    } catch (e) {
        console.error('Erro:', e);
    } finally {
        process.exit(0);
    }
}
run();
