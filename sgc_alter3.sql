ALTER view [dbo].[bi_nota_fiscal_emitida_bio] as 

select 
	nota_fiscal_venda.numero_nota as Numero_Nota,
	case 	
	case isnull(nota_fiscal_venda.id_situacao_nfe, nota_fiscal_venda.situacao) 
		when (3) then nota_fiscal_venda.situacao 
		when (5) then nota_fiscal_venda.situacao 
		when (6) then nota_fiscal_venda.situacao 
		else isnull(nota_fiscal_venda.id_situacao_nfe, nota_fiscal_venda.situacao) 
	end
	when (1) then 'Emitida'
	when (2) then 'Impressa'
	when (3) then 'Cancelada'
	when (4) then 'Transmitida'
	when (5) then 'Denegada'
	when (6) then 'Cancelada'
	when (7) then 'Denegada'
	when (8) then 'inutilizada'
	end 	
	as situacao
	,cliente_fornecedor.codigo as CodCliente
	,cliente_fornecedor.nome as Cliente
    ,cliente_fornecedor.cnpj as CNPJ_CPF
	,cliente_fornecedor.inscricao as Insc_estadual
	,cliente_fornecedor.inscricao_municipal as Insc_Municipal
	,cliente_fornecedor.tipo_logradouro as TipoLogradouro
	,cliente_fornecedor.logradouro as Logradouro
	,cliente_fornecedor.numero
	,cliente_fornecedor.complemento
	,cliente_fornecedor.bairro
	,regiao.nome as regiaoCliente 
	,cliente_fornecedor.ddd_telefone1 as DDD
	,cliente_fornecedor.telefone1 as Telefone 
	,nota_fiscal_venda.data as Data_Emissao 
	,month(nota_fiscal_venda.data) as mes_Data_Emissao
	,year(nota_fiscal_venda.data) as ano_Data_Emissao
	,nota_fiscal_venda.data_saida as Data_Saida 
	,tipo_nota_fiscal.nome as Tipo_de_Nota
	,case tipo_nota_fiscal.ind_venda 
		when 1 then 'Venda'
		when 2 then 'Devolução'
		when 3 then 'Bonificação'
		else 'Outras' end as tipo_nota_operacao
	,vendedor.nome as Vendedor
	,atendente.nome as Atendente
	,condicao_pagamento.nome as Condicao_de_Pagamento
	,cobranca.nome as Forma_de_Cobranca
	,produto.codigo as Codigo_Produto
	,case produto.id_classificacao
	 	when 0 then 'Referência'
		when 1 then 'Genérico'
		when 2 then 'Similar'
		when 3 then 'Outros' end as categoria_medicamento
	,case produto.id_lista_pis_cofins 
		when 2 then 'Negativa'
		when 1 then 'Positiva'
		when 3 then 'Neutra' end as Lista_Pis_Cofins
    ,produto.codigo
	,produto.nome as Produto
	,nota_fiscal_venda_item.cfop_codigo
	,nota_fiscal_venda_item_lote.lote_numero as LoteNumero
	,fabricante.nome as Fabricante
	,produto.classificacao_fiscal as NCM
	,produto.peso_bruto as PesoBruto
	,produto.preco_custo_real as Preco_custo_real_produto -- adicionada em 20/10/2016 por Ricardo
	--,case when nota_fiscal_venda_item.unidade <> produto.unid_unidade
	--then 
	--nota_fiscal_venda_item.preco_custo_produto * isnull(puc.multiplicador,1)
	--else nota_fiscal_venda_item.preco_custo_produto end as preco_custo_nota,
	--case when nota_fiscal_venda_item.unidade <> produto.unid_unidade
	--then 
	--nota_fiscal_venda_item.custo_medio_unitario * isnull(puc.multiplicador,1)
	--else nota_fiscal_venda_item.custo_medio_unitario end as custo_medio_unitario
	,nota_fiscal_venda_item.cfop_codigo as CFOP
	,nota_fiscal_venda_item.Unidade as Unidade
	,nota_fiscal_venda_item.codigo_cst as CST 
	,nota_fiscal_venda_item.margem_valor_agregado as MVA
	,round(nota_fiscal_venda_item.valor_base_calculo_icms / nota_fiscal_venda_item.quantidade * (isnull(nota_fiscal_venda_item_lote.quantidade,nota_fiscal_venda_item.quantidade)),2) as base_icms
	,round(nota_fiscal_venda_item.valor_icms  / nota_fiscal_venda_item.quantidade * (isnull(nota_fiscal_venda_item_lote.quantidade,nota_fiscal_venda_item.quantidade)),2) as valor_icms 
	,round(nota_fiscal_venda_item.valor_base_calculo_icms_substituicao  / nota_fiscal_venda_item.quantidade * (isnull(nota_fiscal_venda_item_lote.quantidade,nota_fiscal_venda_item.quantidade)),2) as base_icms_st
	,round(nota_fiscal_venda_item.valor_substituicao_tributaria  / nota_fiscal_venda_item.quantidade * (isnull(nota_fiscal_venda_item_lote.quantidade,nota_fiscal_venda_item.quantidade)),2) as valor_icms_st
	,isnull(nota_fiscal_venda_item_lote.quantidade,nota_fiscal_venda_item.quantidade) as Quantidade 
	,convert(decimal(12,4),nota_fiscal_venda_item.valor_unitario) as Valor_Unitario -- precisão alterada de 2 para 4 casas em 24/04/2017
	,(isnull(nota_fiscal_venda_item_lote.quantidade,nota_fiscal_venda_item.quantidade))* (convert(decimal(12,4),nota_fiscal_venda_item.valor_unitario)) as V_total_item -- precisão alterada para 4 casas em 24/04/2017
	,convert(decimal(12,4),
	isnull(nota_fiscal_venda_item_lote.quantidade,nota_fiscal_venda_item.quantidade) * 
		   (Convert(decimal(12,4),nota_fiscal_venda_item.valor_unitario)) / 		   
	isnull(nullif((select sum(isnull(nlote.quantidade,nitem.quantidade) * 
		   (Convert(decimal(12,4),nitem.valor_unitario))) 
	 from nota_fiscal_venda_item nitem 
	 left join nota_fiscal_venda_item_lote nlote on nitem.nf_numero = nlote.nfit_nf_numero and nitem.codigo = nlote.nfit_codigo
	 where nitem.nf_numero = nota_fiscal_venda_item.nf_numero),0),1) 
	 * nota_fiscal_venda.valor_desconto_acrescimo
	 * (select case nota_fiscal_venda.id_desconto_acrescimo when 1 then -1 else 1 end)) as rateio_desc_acres 
	 -------------------------------------------------------------------------------- -- precisão alterada para 4 casas em 24/04/2017
    ,(isnull(nota_fiscal_venda_item_lote.quantidade,nota_fiscal_venda_item.quantidade) * 
		   (Convert(decimal(12,4),nota_fiscal_venda_item.valor_unitario))) + 
	(convert(decimal(12,4),
			isnull(nota_fiscal_venda_item_lote.quantidade,nota_fiscal_venda_item.quantidade) * 
		   (Convert(decimal(12,4),nota_fiscal_venda_item.valor_unitario)) / 		   
	isnull(nullif((select sum(isnull(nlote.quantidade,nitem.quantidade) * 
		   (Convert(decimal(12,4),nitem.valor_unitario))) 
	 from nota_fiscal_venda_item nitem 
	 left join nota_fiscal_venda_item_lote nlote on nitem.nf_numero = nlote.nfit_nf_numero and nitem.codigo = nlote.nfit_codigo
	 where nitem.nf_numero = nota_fiscal_venda_item.nf_numero),0),1) 
	 * nota_fiscal_venda.valor_desconto_acrescimo
	 * (select case nota_fiscal_venda.id_desconto_acrescimo when 1 then -1 else 1 end))) as V_total_Unit_com_desc_acresc 
	 -------------------------------------------------------------------------------- 
	,CASE nota_fiscal_venda.id_desconto_acrescimo 
		WHEN 2 	THEN (nota_fiscal_venda_item.valor_total + 
						isnull(nota_fiscal_venda_item.valor_desc_acresc_rateio_sintegra, 0)    
						+ isNull(nota_fiscal_venda_item.valor_substituicao_tributaria, 0) 
						+ isNull(nota_fiscal_venda_item.valor_icms_substituicao_reembolso_rateio, 0) 
						+ isNull(nota_fiscal_venda_item.valor_despesa_acessoria_rateio,0) 
						+ isNull(nota_fiscal_venda_item.valor_ipi, 0)) 
						* (isnull(nota_fiscal_venda_item_lote.quantidade,nota_fiscal_venda_item.quantidade) / nota_fiscal_venda_item.quantidade)
				ELSE (nota_fiscal_venda_item.valor_total - 
						isnull(nota_fiscal_venda_item.valor_desc_acresc_rateio_sintegra, 0) 
						+ isNull(nota_fiscal_venda_item.valor_substituicao_tributaria, 0) 
						+ isNull(nota_fiscal_venda_item.valor_icms_substituicao_reembolso_rateio, 0) 
						+ isNull(nota_fiscal_venda_item.valor_despesa_acessoria_rateio,0) 
						+ isNull(nota_fiscal_venda_item.valor_ipi, 0)) 
						* (isnull(nota_fiscal_venda_item_lote.quantidade,nota_fiscal_venda_item.quantidade) / nota_fiscal_venda_item.quantidade) END as valor_total_rel_estrategico  
	,nota_fiscal_venda.valor_frete as VlrFrete 
	,case isnull(nota_fiscal_venda.id_frete,'')
	      when (1) then 'CIF'                  
	      when (2) then 'FOB'                  
	 end as Tipofrete
	,nota_fiscal_venda.quantidade_volume as qtd_total_volumes
	,nota_fiscal_venda.especie_volume as tipo_volumes
	,cidade.nome as Cidade
	,cidade.uf_sigla as UF_Sigla
	,Transp.nome as Transportadora
	,clascli.nome as ClassificacaoCliente
	,claspro.nome as ClassificacaoProduto
	,(select sum(isnull(comissao_vendedor,0)) from comissao_venda_nota_fiscal cns where cns.nf_codigo = nota_fiscal_venda.codigo and cns.comissao_vendedor >=0) as comissoes
	,produto.codigo_fabricante as Prod_cod_fabricante
	,case tipo_nota_fiscal.id_tipo_operacao 
		  when 1 then 'Entrada'
		  when 2 then 'Saída'
		  when 3 then 'Outros'
		  else null end as Operação	
		  ,nfv1.numero_nota as Nota_Referenciada
       ,isnull (nota_fiscal_venda.chave_acesso_nfe_nota_referenciada,nfv1.chave_acesso_nfe)as Chave_Referenciada
       ,nfv1.data as Data
       ,nfv1.valor_total
          ,compra.numero_compra as Nota_Referenciada_Compra
       ,isnull (nota_fiscal_venda.chave_acesso_nfe_nota_referenciada,compra.chave_acesso_nfe)as Chave_Referenciada_Compra
       ,compra.data as Data_Emissao_Compra
       ,compra.valor_total as Valor_total_Compra
       ,nota_fiscal_venda.nome_contato as Contato
from
nota_fiscal_venda join nota_fiscal_venda_item on nota_fiscal_venda_item.nf_numero = nota_fiscal_venda.codigo
					join produto on produto.codigo = nota_fiscal_venda_item.prod_codigo
					join fabricante on fabricante.codigo = produto.fabr_codigo
					join cliente_fornecedor on cliente_fornecedor.codigo = nota_fiscal_venda.clifor_codigo
					join tipo_nota_fiscal on tipo_nota_fiscal.codigo = nota_fiscal_venda.tiponf_codigo
				left join nota_fiscal_venda_item_lote on (nota_fiscal_venda_item.nf_numero = nota_fiscal_venda_item_lote.nfit_nf_numero
        				and nota_fiscal_venda_item.codigo = nota_fiscal_venda_item_lote.nfit_codigo)
				left join vendedor on vendedor.codigo = nota_fiscal_venda.vend_codigo
				left join condicao_pagamento on condicao_pagamento.codigo = nota_fiscal_venda.condpg_codigo
				left join cobranca on cobranca.codigo = nota_fiscal_venda.cob_codigo
				left join cidade on cidade.codigo = cliente_fornecedor.cid_codigo
				left join regiao on regiao.codigo = cliente_fornecedor.regi_codigo
				left join cliente_fornecedor as Transp on Transp.codigo = nota_fiscal_venda.tran_codigo
				left join classificacao_cliente as clascli on clascli.codigo = cliente_fornecedor.clascli_codigo_1
				left join classificacao_produto as claspro on claspro.codigo = produto.claspro_codigo_1
				left join produto_unidade_conversao puc on puc.prod_codigo = nota_fiscal_venda_item.prod_codigo and puc.unidade_convertida = nota_fiscal_venda_item.unidade 
				left join vendedor atendente on atendente.codigo = nota_fiscal_venda.vend_codigo_2
				left join nota_fiscal_venda nfv1 on nfv1.codigo = nota_fiscal_venda.nf_codigo_complementada
                left join compra on compra.codigo = nota_fiscal_venda.compra_codigo_referenciada
where 1=1	
and isnull(nota_fiscal_venda.ind_nota_complemento_icms,0) = 0		 
and nota_fiscal_venda_item.quantidade > 0

	


