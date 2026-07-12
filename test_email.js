const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
    host: 'mail.nexomed.com.br',
    port: 465,
    secure: true,
    auth: {
        user: 'ti@nexomed.com.br',
        pass: 'nexo123'
    },
    debug: true, // show debug output
    logger: true // log information in console
});

async function main() {
    try {
        const info = await transporter.sendMail({
            from: '"Nexomed TI" <ti@nexomed.com.br>',
            to: 'davifreitasdealmeida@gmail.com',
            subject: 'Teste NodeMailer',
            text: 'Testando...'
        });
        console.log('E-mail enviado:', info.messageId);
    } catch (error) {
        console.error('Erro ao enviar e-mail:', error);
    }
}

main();
