const { syncAnoMes } = require('../services/sync_custos');

async function run() {
    try {
        await syncAnoMes(2026, 7);
        console.log("Success");
    } catch (e) {
        console.error("Error:", e);
    }
    process.exit(0);
}

run();
