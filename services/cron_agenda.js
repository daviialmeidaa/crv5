const cron = require('node-cron');
const pgPool = require('../db/pgConnection');
const nodemailer = require('nodemailer');
const eventBus = require('./eventBus');

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
        
        const result = await pgPool.query(query);
        
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
            eventBus.emit('refresh');
            console.log(`[Agenda Cron] Lembrete diário consolidado gerado para ${result.rows.length} pregões ${diaTexto}.`);

            // ==========================================
            // Lógica para Notificação por E-mail
            // ==========================================
            
            const nexomedBids = result.rows.filter(item => item.empresa && item.empresa.toUpperCase() === 'NEXOMED');
            const bmlBids = result.rows.filter(item => item.empresa && item.empresa.toUpperCase() === 'BML');

            const formatBidHtml = (item) => {
                const horaStr = item.hora_lances ? item.hora_lances.substring(0, 5) : '--:--';
                return `<tr style="border-bottom: 1px solid #e5e7eb;">
                            <td style="padding: 12px 16px; font-weight: 600; color: #0097A7; white-space: nowrap;">${horaStr}</td>
                            <td style="padding: 12px 16px; font-weight: 600; color: #111827; word-break: break-word;">${item.pregao || '-'}</td>
                            <td style="padding: 12px 16px; color: #4b5563; word-break: break-word;">${item.orgao || '-'}</td>
                            <td style="padding: 12px 16px; color: #4b5563; text-align: center;">${item.uf || '-'}</td>
                            <td style="padding: 12px 16px; color: #4b5563; word-break: break-word;">${item.categoria || '-'}</td>
                            <td style="padding: 12px 16px; color: #4b5563; word-break: break-word;">${item.portal || '-'}</td>
                        </tr>`;
            };

            let emailHtml = `
            <div style="font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f3f4f6; padding: 40px 20px; margin: 0;">
                <div style="max-width: 800px; margin: 0 auto; background-color: #ffffff; border: 1px solid #e5e7eb; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);">
                    
                    <!-- Header with Logo -->
                    <div style="background-color: #111827; padding: 24px 32px; text-align: center; border-bottom: 4px solid #0097A7;">
                        <img src="https://hub.nexomed.com.br/assets/images/logo.png" alt="Nexomed" style="height: 32px; display: inline-block; outline: none; text-decoration: none;">
                    </div>

                    <!-- Content -->
                    <div style="padding: 40px 32px;">
                        <h1 style="color: #111827; font-size: 22px; font-weight: 700; margin: 0 0 16px 0; line-height: 1.3;">
                            Agenda de Licitações
                        </h1>
                        <p style="color: #4b5563; font-size: 15px; line-height: 1.6; margin: 0 0 24px 0;">
                            Olá.<br><br>
                            Este é um lembrete oficial de que ${diaTexto}, <strong>${dateFormatted}</strong>, teremos os seguintes pregões agendados.
                        </p>
            `;

            const tableHeader = `
                <table style="width: 100%; table-layout: fixed; border-collapse: collapse; font-size: 13px; text-align: left;">
                    <thead>
                        <tr style="background-color: #f9fafb; border-bottom: 1px solid #e5e7eb;">
                            <th style="padding: 12px 16px; color: #4b5563; font-weight: 600; text-transform: uppercase; font-size: 11px; letter-spacing: 0.05em; width: 10%;">Hora</th>
                            <th style="padding: 12px 16px; color: #4b5563; font-weight: 600; text-transform: uppercase; font-size: 11px; letter-spacing: 0.05em; width: 15%;">Pregão</th>
                            <th style="padding: 12px 16px; color: #4b5563; font-weight: 600; text-transform: uppercase; font-size: 11px; letter-spacing: 0.05em; width: 35%;">Órgão</th>
                            <th style="padding: 12px 16px; color: #4b5563; font-weight: 600; text-transform: uppercase; font-size: 11px; letter-spacing: 0.05em; text-align: center; width: 8%;">UF</th>
                            <th style="padding: 12px 16px; color: #4b5563; font-weight: 600; text-transform: uppercase; font-size: 11px; letter-spacing: 0.05em; width: 15%;">Categoria</th>
                            <th style="padding: 12px 16px; color: #4b5563; font-weight: 600; text-transform: uppercase; font-size: 11px; letter-spacing: 0.05em; width: 17%;">Portal</th>
                        </tr>
                    </thead>
                    <tbody>
            `;

            if (nexomedBids.length > 0) {
                emailHtml += `
                        <h3 style="color: #374151; font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em; margin: 24px 0 16px 0;">
                            Unidade Nexomed
                        </h3>
                        <div style="background-color: #ffffff; border: 1px solid #e5e7eb; border-radius: 6px; padding: 0; margin-bottom: 24px; overflow: hidden;">
                            ${tableHeader}
                                ${nexomedBids.map(formatBidHtml).join('')}
                            </tbody>
                            </table>
                        </div>
                `;
            }

            if (bmlBids.length > 0) {
                emailHtml += `
                        <h3 style="color: #374151; font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em; margin: 24px 0 16px 0;">
                            Unidade BML
                        </h3>
                        <div style="background-color: #ffffff; border: 1px solid #e5e7eb; border-radius: 6px; padding: 0; margin-bottom: 24px; overflow: hidden;">
                            ${tableHeader}
                                ${bmlBids.map(formatBidHtml).join('')}
                            </tbody>
                            </table>
                        </div>
                `;
            }

            emailHtml += `
                        <div style="text-align: center; margin-top: 32px;">
                            <p style="color: #111827; font-size: 14px; font-weight: 500; margin: 0;">Bom trabalho e excelentes disputas!</p>
                        </div>
                    </div>

                    <!-- Footer -->
                    <div style="background-color: #f9fafb; padding: 24px 32px; text-align: center; border-top: 1px solid #e5e7eb;">
                        <p style="color: #6b7280; font-size: 13px; line-height: 1.5; margin: 0;">
                            © ${new Date().getFullYear()} Nexomed. Todos os direitos reservados.<br>
                            Esta é uma mensagem automática. Por favor, não responda.
                        </p>
                    </div>
                </div>
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
    // 1 - Segunda a Quinta-feira (1-4) às 18:00
    cron.schedule('0 18 * * 1-4', () => {
        runAgendaCronLogic({ daysToAdd: 1, isFridayRoutine: false });
    }, {
        scheduled: true,
        timezone: "America/Sao_Paulo"
    });

    // 2 - Sexta-feira (5) às 17:00
    cron.schedule('0 17 * * 5', () => {
        runAgendaCronLogic({ daysToAdd: 3, isFridayRoutine: true });
    }, {
        scheduled: true,
        timezone: "America/Sao_Paulo"
    });

    console.log('Cron Job de Agenda de Licitações iniciado (Seg-Qui às 18h, Sex às 17h, Horário de Brasília).');
}

module.exports = { initAgendaCron, runAgendaCronLogic };
