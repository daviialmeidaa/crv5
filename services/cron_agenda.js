const cron = require('node-cron');
const supaPool = require('../db/supabaseConnection');
const pgPool = require('../db/pgConnection');

async function runAgendaCronLogic() {
    try {
        // Busca todos os pregões que ocorrerão exatamente amanhã
        const query = `
            SELECT "CHAVE", pregao, orgao, data_lances, hora_lances
            FROM agenda_licitacoes."AGENDA_LICITACOES"
            WHERE data_lances IS NOT NULL
              AND data_lances::date = CURRENT_DATE + INTERVAL '1 DAY'
            ORDER BY hora_lances ASC
        `;
        
        const result = await supaPool.query(query);
        
        if (result.rows.length > 0) {
            // Pega a data de amanhã para montar uma chave única do dia
            const today = new Date();
            const tomorrow = new Date(today);
            tomorrow.setDate(tomorrow.getDate() + 1);
            const dateISO = tomorrow.toISOString().split('T')[0];
            const actionId = `REMINDER_${dateISO}`;
            
            let pregoesLista = result.rows.map(item => {
                const horaStr = item.hora_lances ? item.hora_lances.substring(0, 5) : '--:--';
                return `• <b>${item.pregao || 'Sem Nº'}</b> - ${item.orgao || 'N/D'} - às ${horaStr}`;
            }).join('\n\n');

            const msg = `⏰ LEMBRETE: Amanhã teremos ${result.rows.length} pregão(ões):\n\n${pregoesLista}`;

            // Para garantir que a lista fique sempre atualizada caso um novo pregão seja adicionado durante o dia
            // para o dia seguinte, nós deletamos o lembrete consolidado anterior e inserimos um novo no topo.
            await pgPool.query(
                `DELETE FROM notifications WHERE module = 'AGENDA' AND action = $1`,
                [actionId]
            );

            // Insere o lembrete consolidado
            await pgPool.query(
                `INSERT INTO notifications (module, action, message, created_by) VALUES ($1, $2, $3, NULL)`,
                ['AGENDA', actionId, msg]
            );
            console.log(`[Agenda Cron] Lembrete diário consolidado gerado para ${result.rows.length} pregões amanhã.`);
        } else {
            console.log(`[Agenda Cron] Nenhum pregão agendado para amanhã. Nenhuma notificação gerada.`);
        }
    } catch (error) {
        console.error('Erro no cron de agenda de licitações:', error);
    }
}

function initAgendaCron() {
    // Roda a cada hora no minuto 0 (ex: 08:00, 09:00, etc)
    cron.schedule('0 * * * *', runAgendaCronLogic);
    console.log('Cron Job de Agenda de Licitações iniciado (Execução horária).');
}

module.exports = { initAgendaCron, runAgendaCronLogic };
