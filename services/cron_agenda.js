const cron = require('node-cron');
const supaPool = require('../db/supabaseConnection');
const pgPool = require('../db/pgConnection');
const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 465,
    secure: true,
    auth: {
        user: 'davi.almeida@iebtinnovation.com',
        pass: process.env.GMAIL_APP_PASSWORD
    }
});

async function runAgendaCronLogic(options = {}) {
    const daysToAdd = options.daysToAdd || 1;
    const isFridayRoutine = options.isFridayRoutine || false;

    try {
        // Busca todos os pregões que ocorrerão daqui a 'daysToAdd' dias
        const query = `
            SELECT "CHAVE", pregao, orgao, uf, categoria, portal, empresa, data_lances, hora_lances
            FROM agenda_licitacoes."AGENDA_LICITACOES"
            WHERE data_lances IS NOT NULL
              AND data_lances::date = CURRENT_DATE + INTERVAL '${daysToAdd} DAY'
            ORDER BY hora_lances ASC
        `;
        
        const result = await supaPool.query(query);
        
        if (result.rows.length > 0) {
            // Pega a data alvo para montar uma chave única do dia
            const today = new Date();
            const targetDate = new Date(today);
            targetDate.setDate(targetDate.getDate() + daysToAdd);
            const dateISO = targetDate.toISOString().split('T')[0];
            const dateFormatted = targetDate.toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' });
            
            const actionId = isFridayRoutine ? `FRI_RM_${dateISO}` : `REMINDER_${dateISO}`;
            const diaTexto = isFridayRoutine ? 'na próxima segunda-feira' : 'amanhã';
            const diaTextoMaiusculo = diaTexto.charAt(0).toUpperCase() + diaTexto.slice(1);
            
            let pregoesLista = result.rows.map(item => {
                const horaStr = item.hora_lances ? item.hora_lances.substring(0, 5) : '--:--';
                return `• <b>${item.pregao || 'Sem Nº'}</b> - ${item.orgao || 'N/D'} - às ${horaStr}`;
            }).join('\n\n');

            const msg = `⏰ LEMBRETE: ${diaTextoMaiusculo} teremos ${result.rows.length} pregão(ões):\n\n${pregoesLista}`;

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
            console.log(`[Agenda Cron] Lembrete diário consolidado gerado para ${result.rows.length} pregões ${diaTexto}.`);

            // ==========================================
            // Lógica para Notificação por E-mail
            // ==========================================
            
            const nexomedBids = result.rows.filter(item => item.empresa && item.empresa.toUpperCase() === 'NEXOMED');
            const bmlBids = result.rows.filter(item => item.empresa && item.empresa.toUpperCase() === 'BML');

            const formatBidHtml = (item) => {
                const horaStr = item.hora_lances ? item.hora_lances.substring(0, 5) : '--:--';
                return `<tr style="border-bottom: 1px solid #e5e7eb;">
                            <td style="padding: 10px; font-weight: bold; color: #0097A7; white-space: nowrap;">${horaStr}</td>
                            <td style="padding: 10px; font-weight: 600; word-break: break-word;">${item.pregao || '-'}</td>
                            <td style="padding: 10px; color: #374151; word-break: break-word;">${item.orgao || '-'}</td>
                            <td style="padding: 10px; color: #374151; text-align: center;">${item.uf || '-'}</td>
                            <td style="padding: 10px; color: #374151; word-break: break-word;">${item.categoria || '-'}</td>
                            <td style="padding: 10px; color: #374151; word-break: break-word;">${item.portal || '-'}</td>
                        </tr>`;
            };

            let emailHtml = `
                <div style="font-family: 'Inter', Arial, sans-serif; max-width: 800px; margin: 0 auto; color: #1f2937; background-color: #f9fafb; padding: 20px; border-radius: 8px;">
                    <h2 style="color: #00838F; border-bottom: 2px solid #0097A7; padding-bottom: 10px;">Lembrete de Licitações</h2>
                    <p style="font-size: 16px; line-height: 1.5;">Olá, esse e-mail é um lembrete oficial de que ${diaTexto}, <strong>${dateFormatted}</strong>, teremos os seguintes pregões agendados:</p>
            `;

            const tableHeader = `
                <table style="width: 100%; table-layout: fixed; border-collapse: collapse; margin-top: 10px; font-size: 13px; text-align: left;">
                    <thead>
                        <tr style="background-color: #f3f4f6; border-bottom: 2px solid #e5e7eb;">
                            <th style="padding: 10px; color: #4b5563; width: 10%;">Hora</th>
                            <th style="padding: 10px; color: #4b5563; width: 15%;">Pregão</th>
                            <th style="padding: 10px; color: #4b5563; width: 35%;">Órgão</th>
                            <th style="padding: 10px; color: #4b5563; text-align: center; width: 8%;">UF</th>
                            <th style="padding: 10px; color: #4b5563; width: 15%;">Categoria</th>
                            <th style="padding: 10px; color: #4b5563; width: 17%;">Portal</th>
                        </tr>
                    </thead>
                    <tbody>
            `;

            if (nexomedBids.length > 0) {
                emailHtml += `
                    <div style="background-color: white; padding: 15px; border-radius: 6px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); margin-top: 20px; overflow-x: auto;">
                        <h3 style="color: #0097A7; margin-top: 0; margin-bottom: 10px;">Nexomed:</h3>
                        ${tableHeader}
                            ${nexomedBids.map(formatBidHtml).join('')}
                        </tbody>
                        </table>
                    </div>
                `;
            }

            if (bmlBids.length > 0) {
                emailHtml += `
                    <div style="background-color: white; padding: 15px; border-radius: 6px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); margin-top: 20px; overflow-x: auto;">
                        <h3 style="color: #0097A7; margin-top: 0; margin-bottom: 10px;">BML:</h3>
                        ${tableHeader}
                            ${bmlBids.map(formatBidHtml).join('')}
                        </tbody>
                        </table>
                    </div>
                `;
            }

            emailHtml += `
                    <p style="margin-top: 30px; font-size: 16px; font-weight: bold; text-align: center; color: #111827;">
                        ☕ Já busque o seu café e vamos pra cima! Boa sorte nas disputas!
                    </p>
                </div>
            `;

            let destinatarios = [];
            
            if (process.env.NODE_ENV === 'production') {
                const usersRes = await pgPool.query(
                    `SELECT email FROM users WHERE role IN ('ADMIN', 'LC1', 'LC2', 'LC3', 'LC4') AND email IS NOT NULL`
                );
                destinatarios = usersRes.rows.map(u => u.email);
            } else {
                destinatarios = ['davifreitasdealmeida@gmail.com'];
            }

            if (destinatarios.length > 0) {
                const mailOptions = {
                    from: '"Nexomed Licitações" <davi.almeida@iebtinnovation.com>',
                    to: destinatarios,
                    subject: 'LEMBRETE DE PREGÕES AGENDADOS',
                    html: emailHtml
                };

                await transporter.sendMail(mailOptions);
                console.log(`[Agenda Cron] E-mail enviado com sucesso para ${destinatarios.length} destinatário(s).`);
            }

        } else {
            console.log(`[Agenda Cron] Nenhum pregão agendado para amanhã. Nenhuma notificação gerada.`);
        }
    } catch (error) {
        console.error('Erro no cron de agenda de licitações:', error);
    }
}

function initAgendaCron() {
    // 1 - Segunda a Quinta-feira (1-4) às 17:00
    cron.schedule('0 17 * * 1-4', () => {
        runAgendaCronLogic({ daysToAdd: 1, isFridayRoutine: false });
    }, {
        scheduled: true,
        timezone: "America/Sao_Paulo"
    });

    // 2 - Sexta-feira (5) às 16:00
    cron.schedule('0 16 * * 5', () => {
        runAgendaCronLogic({ daysToAdd: 3, isFridayRoutine: true });
    }, {
        scheduled: true,
        timezone: "America/Sao_Paulo"
    });

    console.log('Cron Job de Agenda de Licitações iniciado (Seg-Qui às 17h, Sex às 16h, Horário de Brasília).');
}

module.exports = { initAgendaCron, runAgendaCronLogic };
