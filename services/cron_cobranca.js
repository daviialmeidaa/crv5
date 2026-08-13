const cron = require('node-cron');
const pgPool = require('../db/pgConnection');
const { getPool } = require('../db/connection');
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

async function runCobrancaCronLogic() {
    try {
        // Busca agendamentos de cobrança de hoje, integrando com o usuário criador e com o contato
        const query = `
            SELECT 
                h.id, 
                h.codigo_cliente, 
                h.tipo_contato, 
                h.resultado_contato, 
                h.descritivo_contato, 
                h.agendamento_data_contato, 
                h.agendamento_hora_contato, 
                h.agendamento_tipo_retorno_contato, 
                h.agendamento_nota_contato,
                h.created_by,
                u.nome AS usuario_nome,
                u.email AS usuario_email,
                c.nome_contato AS pessoa_contatada
            FROM historico_cobranca h
            JOIN users u ON h.created_by = u.id
            LEFT JOIN agenda_contatos c ON h.agenda_contato_id = c.id
            WHERE h.has_agendamento = true 
              AND h.agendamento_data_contato = CURRENT_DATE
            ORDER BY h.agendamento_hora_contato ASC
        `;
        
        const pgResult = await pgPool.query(query);
        
        if (pgResult.rows.length === 0) {
            console.log('[Cobrança Cron] Nenhum agendamento para hoje.');
            return;
        }

        // Recupera nomes dos clientes do SGC em lote
        const clientCodes = [...new Set(pgResult.rows.map(r => r.codigo_cliente))];
        const sqlPool = await getPool();
        let clientMap = {};
        
        if (sqlPool && clientCodes.length > 0) {
            const clientCodesStr = clientCodes.join(',');
            const sqlQuery = `
                SELECT 
                    [Código] AS codigo, 
                    [Nome_Razão_Social] AS razaoSocial, 
                    [Nome_Fantasia] AS nomeFantasia 
                FROM SGC.dbo.bi_cadastro_clientes 
                WHERE [Código] IN (${clientCodesStr})
            `;
            try {
                const sqlResult = await sqlPool.request().query(sqlQuery);
                sqlResult.recordset.forEach(c => {
                    clientMap[c.codigo] = {
                        razaoSocial: c.razaoSocial || '',
                        nomeFantasia: c.nomeFantasia || ''
                    };
                });
            } catch (err) {
                console.error('[Cobrança Cron] Erro ao buscar clientes no SQL Server:', err);
            }
        }

        // Agrupa resultados por usuário criador (created_by)
        const userSchedules = {};
        
        for (const row of pgResult.rows) {
            const userId = row.created_by;
            if (!userSchedules[userId]) {
                userSchedules[userId] = {
                    nome: row.usuario_nome,
                    email: row.usuario_email,
                    agendamentos: []
                };
            }
            
            const clientData = clientMap[row.codigo_cliente] || { razaoSocial: 'Cliente não encontrado', nomeFantasia: '' };
            
            userSchedules[userId].agendamentos.push({
                ...row,
                razaoSocial: clientData.razaoSocial,
                nomeFantasia: clientData.nomeFantasia
            });
        }
        
        // Gera Notificação e Email para cada usuário separadamente
        const todayStr = new Date().toISOString().split('T')[0];
        
        for (const userId in userSchedules) {
            const user = userSchedules[userId];
            const count = user.agendamentos.length;
            
            // 1. Notificação de Sistema (notifications)
            const actionId = `AG_${userId}`;
            const plural = count === 1 ? 'agendamento' : 'agendamentos';
            
            let notificacaoTexto = `⏰ Lembrete: Você tem ${count} ${plural} para hoje:\n\n`;
            
            user.agendamentos.forEach(ag => {
                const horaStr = ag.agendamento_hora_contato ? ag.agendamento_hora_contato.substring(0, 5) : '--:--';
                const motivo = ag.agendamento_tipo_retorno_contato || 'Sem motivo especificado';
                const obs = ag.agendamento_nota_contato ? ` - Obs: ${ag.agendamento_nota_contato}` : '';
                
                notificacaoTexto += `• Cliente: ${ag.codigo_cliente} - ${ag.razaoSocial}\n  Ligar às ${horaStr} | Motivo: ${motivo}${obs}\n\n`;
            });

            // Remove duplicatas se o cron rodar 2x
            await pgPool.query(
                `DELETE FROM notifications WHERE module = 'COBRANCA' AND action = $1`,
                [actionId]
            );

            // Insere
            await pgPool.query(
                `INSERT INTO notifications (module, action, message, created_by) VALUES ($1, $2, $3, $4)`,
                ['COBRANCA', actionId, notificacaoTexto.trim(), userId]
            );
            
            // 2. Email HTML Responsivo e Elegante
            if (user.email) {
                const formatAgendamentoHtml = (ag) => {
                    const horaStr = ag.agendamento_hora_contato ? ag.agendamento_hora_contato.substring(0, 5) : '--:--';
                    const nomeFantasiaHtml = ag.nomeFantasia ? `<br><small style="color: #6b7280; font-size: 11px;">${ag.nomeFantasia}</small>` : '';
                    const obsHtml = ag.agendamento_nota_contato ? `<br><span style="color: #6b7280; font-size: 12px;"><i>Obs: ${ag.agendamento_nota_contato}</i></span>` : '';
                    
                    return `<tr style="border-bottom: 1px solid #e5e7eb;">
                                <td style="padding: 12px 16px; font-weight: 600; color: #0097A7; white-space: nowrap; vertical-align: top;">${horaStr}</td>
                                <td style="padding: 12px 16px; color: #111827; font-weight: 500; word-break: break-word; vertical-align: top;">
                                    ${ag.codigo_cliente} - ${ag.razaoSocial}${nomeFantasiaHtml}
                                </td>
                                <td style="padding: 12px 16px; color: #4b5563; word-break: break-word; vertical-align: top;">${ag.agendamento_tipo_retorno_contato || '-'}${obsHtml}</td>
                                <td style="padding: 12px 16px; color: #4b5563; word-break: break-word; vertical-align: top;">${ag.pessoa_contatada || '-'}</td>
                                <td style="padding: 12px 16px; color: #4b5563; font-size: 12px; word-break: break-word; vertical-align: top;">
                                    ${ag.tipo_contato || '-'} <br> <span style="color: #6b7280;">${ag.resultado_contato || '-'}</span>
                                </td>
                            </tr>`;
                };

                const dateFormatted = new Date().toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' });

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
                            Agenda de Cobrança
                        </h1>
                        <p style="color: #4b5563; font-size: 15px; line-height: 1.6; margin: 0 0 24px 0;">
                            Olá, <strong>${user.nome}</strong>.<br><br>
                            Você possui <strong>${count} ${plural}</strong> para hoje, <strong>${dateFormatted}</strong>.
                        </p>
                        
                        <div style="background-color: #ffffff; border: 1px solid #e5e7eb; border-radius: 6px; padding: 0; margin-bottom: 24px; overflow: hidden;">
                            <table style="width: 100%; table-layout: fixed; border-collapse: collapse; font-size: 13px; text-align: left;">
                                <thead>
                                    <tr style="background-color: #f9fafb; border-bottom: 1px solid #e5e7eb;">
                                        <th style="padding: 12px 16px; color: #4b5563; font-weight: 600; text-transform: uppercase; font-size: 11px; letter-spacing: 0.05em; width: 10%;">Hora</th>
                                        <th style="padding: 12px 16px; color: #4b5563; font-weight: 600; text-transform: uppercase; font-size: 11px; letter-spacing: 0.05em; width: 35%;">Cliente</th>
                                        <th style="padding: 12px 16px; color: #4b5563; font-weight: 600; text-transform: uppercase; font-size: 11px; letter-spacing: 0.05em; width: 25%;">Motivo / Obs</th>
                                        <th style="padding: 12px 16px; color: #4b5563; font-weight: 600; text-transform: uppercase; font-size: 11px; letter-spacing: 0.05em; width: 15%;">Falar com</th>
                                        <th style="padding: 12px 16px; color: #4b5563; font-weight: 600; text-transform: uppercase; font-size: 11px; letter-spacing: 0.05em; width: 15%;">Contato Anterior</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    ${user.agendamentos.map(formatAgendamentoHtml).join('')}
                                </tbody>
                            </table>
                        </div>
                        
                        <div style="text-align: center; margin-top: 32px;">
                            <p style="color: #111827; font-size: 14px; font-weight: 500; margin: 0;">Bom trabalho e excelentes negociações!</p>
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

                // Dispatch Email
                let toEmail = process.env.NODE_ENV === 'production' ? user.email : 'davifreitasdealmeida@gmail.com';
                
                try {
                    await transporter.sendMail({
                        from: '"Nexomed Cobrança" <davi.almeida@iebtinnovation.com>',
                        to: toEmail,
                        subject: `AGENDAMENTOS DE COBRANÇA PARA HOJE (${count})`,
                        html: emailHtml
                    });
                    console.log(`[Cobrança Cron] E-mail enviado com sucesso para ${toEmail}`);
                } catch (emailErr) {
                    console.error(`[Cobrança Cron] Falha ao enviar e-mail para ${toEmail}:`, emailErr);
                }
            }
        }
        
        eventBus.emit('refresh');
        
    } catch (error) {
        console.error('Erro no cron de agendamentos de cobrança:', error);
    }
}

function initCobrancaCron() {
    cron.schedule('0 8 * * 1-5', () => {
        console.log('[Cobrança Cron] Iniciando rotina diária de notificações de agendamentos...');
        runCobrancaCronLogic();
    }, {
        scheduled: true,
        timezone: "America/Sao_Paulo"
    });

    console.log('Cron Job de Cobrança iniciado (Seg-Sex às 08h, Horário de Brasília).');
}

async function runCobrancaLiveRemindersLogic() {
    try {
        const now = new Date();
        // Calcula hora atual em Brasília e soma 10 minutos
        const brtString = now.toLocaleString("en-US", { timeZone: "America/Sao_Paulo" });
        const targetTime = new Date(new Date(brtString).getTime() + 10 * 60000);
        
        const targetHours = String(targetTime.getHours()).padStart(2, '0');
        const targetMinutes = String(targetTime.getMinutes()).padStart(2, '0');
        const targetTimeStr = `${targetHours}:${targetMinutes}:00`;

        const query = `
            SELECT 
                h.id, 
                h.codigo_cliente, 
                h.tipo_contato, 
                h.agendamento_tipo_retorno_contato,
                h.created_by
            FROM historico_cobranca h
            WHERE h.has_agendamento = true 
              AND h.agendamento_data_contato = CURRENT_DATE
              AND h.agendamento_hora_contato = $1
        `;
        
        const pgResult = await pgPool.query(query, [targetTimeStr]);
        
        if (pgResult.rows.length === 0) {
            return;
        }

        // Buscar nomes no SGC
        const clientCodes = [...new Set(pgResult.rows.map(r => r.codigo_cliente))];
        const sqlPool = await getPool();
        let clientMap = {};
        
        if (sqlPool && clientCodes.length > 0) {
            const clientCodesStr = clientCodes.join(',');
            const sqlQuery = `
                SELECT [Código] AS codigo, [Nome_Razão_Social] AS razaoSocial, [Nome_Fantasia] AS nomeFantasia 
                FROM SGC.dbo.bi_cadastro_clientes 
                WHERE [Código] IN (${clientCodesStr})
            `;
            try {
                const sqlResult = await sqlPool.request().query(sqlQuery);
                sqlResult.recordset.forEach(c => {
                    clientMap[c.codigo] = c.razaoSocial || c.nomeFantasia || '';
                });
            } catch (err) {
                console.error('[Live Reminders] Erro SQL:', err);
            }
        }

        for (const row of pgResult.rows) {
            const clienteNome = clientMap[row.codigo_cliente] || 'Cliente não encontrado';
            const motivo = row.agendamento_tipo_retorno_contato || 'Contato';
            const msg = `⏰ Lembrete iminente: Faltam 10 minutos para o agendamento de cobrança!\n\n• Cliente: ${row.codigo_cliente} - ${clienteNome}\n  Motivo: ${motivo}`;
            
            // action = REM_1234 (assim o JS puxa a cor roxa e ícone de relógio se der match em REMINDER)
            // Espera, no JS a validação é startsWith('REMINDER'), então precisa ser REMINDER_1234
            // Como varchar tem tamanho 20, REMINDER_ tem 9 chars. ID pode ter até 11. Perfeito.
            const actionId = `REMINDER_${row.id}`.substring(0, 20);

            // Evitar duplicatas caso rode duas vezes no mesmo minuto
            await pgPool.query(
                `DELETE FROM notifications WHERE module = 'COBRANCA' AND action = $1`,
                [actionId]
            );

            await pgPool.query(
                `INSERT INTO notifications (module, action, message, created_by) VALUES ($1, $2, $3, $4)`,
                ['COBRANCA', actionId, msg, row.created_by]
            );
        }

        eventBus.emit('refresh');
        
    } catch (error) {
        console.error('Erro no cron live reminders:', error);
    }
}

function initCobrancaLiveReminders() {
    // Roda todo minuto de Seg a Sex
    cron.schedule('* * * * 1-5', () => {
        runCobrancaLiveRemindersLogic();
    }, {
        scheduled: true,
        timezone: "America/Sao_Paulo"
    });
    console.log('Cron Job de Lembretes (10min) iniciado (Seg-Sex a cada minuto).');
}

module.exports = { initCobrancaCron, runCobrancaCronLogic, initCobrancaLiveReminders };
