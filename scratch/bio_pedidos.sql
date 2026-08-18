
CREATE VIEW [dbo].[bio_pedidos] AS

WITH

BIO_PEDIDOS AS (
SELECT        dbo.pedido.codigo AS Numero_Pedido, dbo.pedido_item.codigo AS Seq, dbo.cliente_fornecedor.nome AS Cliente, dbo.pedido.data AS Data_Emissao, MONTH(dbo.pedido.data) AS mes_Data_Emissao, YEAR(dbo.pedido.data) 
                         AS ano_Data_Emissao, dbo.pedido.data_entrega, dbo.pedido.numero_secundario, dbo.pedido.numero_pedido_cliente AS Seu_numero, 
                         CASE pedido.id_situacao WHEN 1 THEN 'CADASTRADO' WHEN 2 THEN 'PEND FINANCEIRO' WHEN 3 THEN 'CONFIRMADO' WHEN 4 THEN 'CONCRETIZADO' WHEN 5 THEN 'CANCELADO' WHEN 6 THEN 'DEVOLVIDO' WHEN 7 THEN
                          'DOCUM PENDENTE' ELSE NULL END AS situacao, dbo.tipo_pedido.nome AS Tipo_de_Pedido, 
                         CASE tipo_pedido.id_tipo_operacao WHEN 1 THEN 'VENDA' WHEN 2 THEN 'DEVOLUÇÃO VENDA' WHEN 3 THEN 'BONIFICACÃO' WHEN 4 THEN CASE tipo_pedido.id_acao_consignacao WHEN 1 THEN 'REMESSA CONSIGNAÇÃO'
                          WHEN 2 THEN 'FATURA CONSIGNAÇÃO' WHEN 3 THEN 'DEVOL CONSIGNAÇÃO' ELSE NULL 
                         END WHEN 5 THEN CASE tipo_pedido.id_entrada_saida WHEN 1 THEN 'DEVOL COMODATO' WHEN 2 THEN 'REMESSA COMODATO' ELSE NULL END WHEN 6 THEN 'REPRESENTAÇÃO' ELSE NULL END AS tipo_operacao, 
                         dbo.vendedor.nome AS Vendedor, atendente.nome AS Atendente, dbo.condicao_pagamento.nome AS Condicao_de_Pagamento, dbo.cobranca.nome AS Forma_de_Cobranca, dbo.produto.codigo AS Codigo_Produto, 
                         dbo.produto.codigo_fabricante AS cod_produto_fabricante, dbo.produto.nome AS Produto, dbo.fabricante.nome AS Fabricante, ISNULL(dbo.pedido_item_lote.unidade_comercializacao, 
                         dbo.pedido_item.unid_unidade_comercializacao) AS Unidade, ISNULL(dbo.pedido_item_lote.quantidade_comercializacao, 0) AS Quantidade, dbo.pedido_item.valor_custo AS valor_custo_unitario, CONVERT(decimal(10, 2), 
                         dbo.pedido_item.valor_unitario_comercializacao) AS Valor_Unitario, CASE isnull(pedido_item.valor_custo, 0) WHEN 0 THEN 0.00 ELSE CONVERT(decimal(10, 2), round((CONVERT(decimal(10, 2), 
                         pedido_item.valor_unitario_comercializacao) - pedido_item.valor_custo) / pedido_item.valor_custo * 100, 2)) END AS Margem_Bruta_Item, ISNULL(dbo.pedido_item_lote.quantidade_comercializacao, 
                         dbo.pedido_item.quantidade_comercializacao) * CONVERT(decimal(10, 2), dbo.pedido_item.valor_unitario_comercializacao) AS V_Total_Unitario, CONVERT(decimal(10, 2), 
                         ISNULL(dbo.pedido_item_lote.quantidade_comercializacao, dbo.pedido_item.quantidade_comercializacao) * CONVERT(decimal(10, 2), dbo.pedido_item.valor_unitario_comercializacao) / ISNULL(NULLIF
                             ((SELECT        SUM(ISNULL(plote.quantidade_comercializacao, pitem.quantidade_comercializacao) * CONVERT(decimal(10, 2), pitem.valor_unitario_comercializacao)) AS Expr1
                                 FROM            dbo.pedido_item AS pitem LEFT OUTER JOIN
                                                          dbo.pedido_item_lote AS plote ON pitem.ped_codigo = plote.pedit_ped_codigo AND pitem.codigo = plote.pedit_codigo
                                 WHERE        (pitem.ped_codigo = dbo.pedido_item.ped_codigo)), 0), 1) * dbo.pedido.valor_desconto_acrescimo *
                             (SELECT        CASE pedido.id_desconto_acrescimo WHEN 1 THEN - 1 ELSE 1 END AS Expr1)) AS rateio_desc_acres, ISNULL(dbo.pedido_item_lote.quantidade_comercializacao, dbo.pedido_item.quantidade_comercializacao) 
                         * CONVERT(decimal(10, 2), dbo.pedido_item.valor_unitario_comercializacao) + CONVERT(decimal(10, 2), ISNULL(dbo.pedido_item_lote.quantidade_comercializacao, dbo.pedido_item.quantidade_comercializacao) 
                         * CONVERT(decimal(10, 2), dbo.pedido_item.valor_unitario_comercializacao) / ISNULL(NULLIF
         ((SELECT        SUM(ISNULL(plote.quantidade_comercializacao, pitem.quantidade_comercializacao) * CONVERT(decimal(10, 2), pitem.valor_unitario_comercializacao)) AS Expr1
                                 FROM            dbo.pedido_item AS pitem LEFT OUTER JOIN
                                                          dbo.pedido_item_lote AS plote ON pitem.ped_codigo = plote.pedit_ped_codigo AND pitem.codigo = plote.pedit_codigo
                                 WHERE        (pitem.ped_codigo = dbo.pedido_item.ped_codigo)), 0), 1) * dbo.pedido.valor_desconto_acrescimo *
                             (SELECT        CASE pedido.id_desconto_acrescimo WHEN 1 THEN - 1 ELSE 1 END AS Expr1)) AS V_total_Unit_com_desc_acresc, Transp.nome AS Transportadora, dbo.pedido_item_lote.lote_numero AS Lote, 
                         clascli.nome AS ClassificacaoCliente, claspro.nome AS ClassificacaoProduto, CASE id_pedido_empenho WHEN 1 THEN 'PEDIDO' WHEN 2 THEN 'EMPENHO' ELSE NULL END AS Pedido_Empenho, 
                         prescritor.nome AS Nome_Prescritor, prescritor.inscricao_crm AS CRM_Prescritor, nfv.numero_nota AS Num_Ultima_NF, nfv.data AS data_emissao_nf
FROM            dbo.pedido INNER JOIN
                         dbo.pedido_item ON dbo.pedido_item.ped_codigo = dbo.pedido.codigo INNER JOIN
                         dbo.produto ON dbo.produto.codigo = dbo.pedido_item.prod_codigo INNER JOIN
                         dbo.fabricante ON dbo.fabricante.codigo = dbo.produto.fabr_codigo INNER JOIN
                         dbo.cliente_fornecedor ON dbo.cliente_fornecedor.codigo = dbo.pedido.clifor_codigo INNER JOIN
                         dbo.tipo_pedido ON dbo.tipo_pedido.codigo = dbo.pedido.tipoped_codigo LEFT OUTER JOIN
                         dbo.vendedor ON dbo.vendedor.codigo = dbo.pedido.Vend_codigo LEFT OUTER JOIN
                         dbo.condicao_pagamento ON dbo.condicao_pagamento.codigo = dbo.pedido.condpg_codigo LEFT OUTER JOIN
                         dbo.cobranca ON dbo.cobranca.codigo = dbo.pedido.cob_codigo LEFT OUTER JOIN
                         dbo.vendedor AS atendente ON atendente.codigo = dbo.pedido.vend_codigo_2 LEFT OUTER JOIN
                         dbo.cliente_fornecedor AS Transp ON Transp.codigo = dbo.pedido.tran_codigo LEFT OUTER JOIN
                         dbo.classificacao_cliente AS clascli ON clascli.codigo = dbo.cliente_fornecedor.clascli_codigo_1 LEFT OUTER JOIN
                         dbo.classificacao_produto AS claspro ON claspro.codigo = dbo.produto.claspro_codigo_1 LEFT OUTER JOIN
                         dbo.pedido_item_lote ON dbo.pedido_item_lote.pedit_ped_codigo = dbo.pedido_item.ped_codigo AND dbo.pedido_item_lote.pedit_codigo = dbo.pedido_item.codigo LEFT OUTER JOIN
                         dbo.vendedor AS prescritor ON prescritor.codigo = dbo.pedido.vend_codigo_prescritor LEFT OUTER JOIN
                             (SELECT        ped_codigo, MAX(nf_codigo) AS nf
                               FROM            dbo.pedido_nota_fiscal
                               GROUP BY ped_codigo) AS pnf ON pnf.ped_codigo = dbo.pedido.codigo LEFT OUTER JOIN
                         dbo.nota_fiscal_venda AS nfv ON nfv.codigo = pnf.nf
WHERE        (dbo.pedido.id_situacao <> 5)
	)
	
,BIO_PED_FU AS (
SELECT DISTINCT
	pedido_follow_up.ped_codigo
	,usuario.nome
FROM pedido_follow_up
LEFT JOIN usuario
ON pedido_follow_up.usu_codigo = usuario.codigo
WHERE pedido_follow_up.historico = 'Cadastrado'
	)
	
,TAB AS (
SELECT 
	BIO_PEDIDOS.*
	,BIO_PED_FU.nome as Usuario
FROM BIO_PEDIDOS
LEFT JOIN BIO_PED_FU
ON BIO_PEDIDOS.Numero_Pedido = BIO_PED_FU.ped_codigo
	)
	
SELECT * FROM TAB
