require('dotenv').config();
const { runSync } = require('../services/syncService');

console.log("Iniciando sincronização manual...");

runSync((progress) => {
    console.log(`[Sync] ${progress.message}`);
}).then((result) => {
    console.log("\n✅", result.message);
    process.exit(0);
}).catch((err) => {
    console.error("\n❌ Falha na sincronização:", err);
    process.exit(1);
});
