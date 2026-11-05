const fs = require('fs');
const bcrypt = require('bcryptjs');
module.exports = async function seed(client, runtime) {
    await client.query(fs.readFileSync(__dirname + '/schema.sql', 'utf8'));
    await client.query('SET search_path TO public');
    const permissions = Object.fromEntries(
        [
            'canViewCR',
            'canViewLC',
            'canViewUsers',
            'canManageUsers',
            'canViewClientes',
            'canCreateUsers',
            'canManageRoles',
            'canResetHeroku',
            'canViewOPME',
            'canViewCustos',
            'canReceiveEmailsLC',
            'canReceiveEmailsCR'
        ].map((name) => [name, true])
    );
    for (const role of ['ADMIN', 'CR1', 'LC1', 'OPME1', 'QA_READER']) {
        await client.query('INSERT INTO roles (name, permissions, is_system) VALUES ($1, $2, true)', [
            role,
            role === 'ADMIN' ? permissions : { canViewCR: true, canViewClientes: true }
        ]);
    }
    const hash = await bcrypt.hash(runtime.password, 4);
    for (const [nome, email, role, active] of [
        ['Administrador QA', 'admin@example.invalid', 'ADMIN', true],
        ['Leitor QA', 'reader@example.invalid', 'QA_READER', true],
        ['Inativo QA', 'inactive@example.invalid', 'CR1', false],
        ['Primeiro acesso QA', 'first@example.invalid', 'CR1', true]
    ]) {
        await client.query(
            'INSERT INTO users (nome,email,role,password_hash,first_access,is_active) VALUES ($1,$2,$3,$4,false,$5)',
            [nome, email, role, hash, active]
        );
    }
    await client.query("UPDATE users SET first_access=true WHERE email='first@example.invalid'");
    await client.query('INSERT INTO metas_recebimento (id,valor_meta) VALUES (1,0)');
    await client.query(`INSERT INTO contratos (codigo_contrato,empresa,edital,tipo_contrato,classificacao)
        VALUES ('QA-SEED','Nexomed','QA','ATA','OPME')`);
    await client.query(`INSERT INTO titulos (empresa,nota,documento,cod_cliente,cliente,esfera,uf,contrato,
        valor_nota,valor_deposito,data_emissao,data_vencimento,status)
        VALUES ('Nexomed','900010','QA-DOC','900001','Hospital QA','Estadual','SP','QA-SEED',25,0,CURRENT_DATE,'2099-12-31','PENDENTE')`);
    await client.query(`INSERT INTO opme.contratos (id_contrato,empresa,material,cod_cliente,cliente,uf,total_ata,inicio_ata,termino_ata)
        VALUES ('QA-SEED','NEXOMED','OPME',900001,'Hospital QA','SP',1000,'2026-01-01','2099-12-31')`);
    await client.query(`INSERT INTO opme.unidades (contrato,cod_cliente,hospital,sigla)
        VALUES ('QA-SEED',900001,'Hospital QA','HQA')`);
    for (const [code, item, price] of [
        [710100, '1', 12.5],
        [710101, '2', 0]
    ]) {
        await client.query(
            `INSERT INTO opme.bancocodigos (contrato,cod_bio,cod_fab,produto,descricao_personalizada,classificacao,item_ata)
            VALUES ('QA-SEED',$1,$2,$3,$3,'OPME',$4)`,
            [code, 'FAB' + code, 'Produto QA ' + code, item]
        );
        await client.query(
            `INSERT INTO opme.saldoata (contrato,item_ata,descricao_item,quantidade_ata,valor_unitario,valor_total)
            VALUES ('QA-SEED',$1,$2,100,$3,$4)`,
            [item, 'Produto QA ' + code, price, price * 100]
        );
    }
    await client.query(`INSERT INTO financeiro.vendas_custos
        (empresa,nota_fiscal,codigo_cliente,cliente,uf,data_emissao,tipo_nota,cod_produto,produto,lote,quantidade,valor_unitario,valor_total,custo_unitario,custo_total)
        VALUES ('Nexomed',900010,900001,'Hospital QA','SP',CURRENT_DATE,'VENDA','710100','Produto QA','QA-LOTE',2,12.5,25,0,0)`);
};
