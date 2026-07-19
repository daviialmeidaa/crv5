-- ===================================================================
-- CLASSIFICAÇÃO: clascli_codigo_1 = 11 | clascli_codigo_2 = 12 (Total: 15 clientes)
-- ===================================================================

-- 1. VALIDAÇÃO ANTES DO UPDATE
SELECT codigo, nome, clascli_codigo_1, clascli_codigo_2
FROM SGC.dbo.cliente_fornecedor
WHERE codigo IN (5, 132, 138, 183, 206, 260, 292, 334, 339, 350, 408, 469, 491, 613, 629);

-- 2. EXECUÇÃO DO UPDATE
UPDATE SGC.dbo.cliente_fornecedor
SET clascli_codigo_1 = 11, clascli_codigo_2 = 12
WHERE codigo IN (5, 132, 138, 183, 206, 260, 292, 334, 339, 350, 408, 469, 491, 613, 629);


-- ===================================================================
-- CLASSIFICAÇÃO: clascli_codigo_1 = 11 | clascli_codigo_2 = 13 (Total: 24 clientes)
-- ===================================================================

-- 1. VALIDAÇÃO ANTES DO UPDATE
SELECT codigo, nome, clascli_codigo_1, clascli_codigo_2
FROM SGC.dbo.cliente_fornecedor
WHERE codigo IN (106, 130, 139, 148, 151, 158, 160, 164, 177, 189, 217, 223, 226, 230, 262, 282, 319, 329, 330, 351, 356, 398, 429, 439);

-- 2. EXECUÇÃO DO UPDATE
UPDATE SGC.dbo.cliente_fornecedor
SET clascli_codigo_1 = 11, clascli_codigo_2 = 13
WHERE codigo IN (106, 130, 139, 148, 151, 158, 160, 164, 177, 189, 217, 223, 226, 230, 262, 282, 319, 329, 330, 351, 356, 398, 429, 439);


-- ===================================================================
-- CLASSIFICAÇÃO: clascli_codigo_1 = 11 | clascli_codigo_2 = 14 (Total: 38 clientes)
-- ===================================================================

-- 1. VALIDAÇÃO ANTES DO UPDATE
SELECT codigo, nome, clascli_codigo_1, clascli_codigo_2
FROM SGC.dbo.cliente_fornecedor
WHERE codigo IN (108, 121, 131, 137, 141, 146, 152, 153, 154, 172, 179, 182, 193, 228, 229, 270, 278, 289, 298, 303, 305, 306, 313, 314, 333, 354, 360, 370, 381, 382, 384, 385, 430, 442, 454, 476, 574, 641);

-- 2. EXECUÇÃO DO UPDATE
UPDATE SGC.dbo.cliente_fornecedor
SET clascli_codigo_1 = 11, clascli_codigo_2 = 14
WHERE codigo IN (108, 121, 131, 137, 141, 146, 152, 153, 154, 172, 179, 182, 193, 228, 229, 270, 278, 289, 298, 303, 305, 306, 313, 314, 333, 354, 360, 370, 381, 382, 384, 385, 430, 442, 454, 476, 574, 641);


-- ===================================================================
-- CLASSIFICAÇÃO: clascli_codigo_1 = 10 | clascli_codigo_2 = 10 (Total: 1 clientes)
-- ===================================================================

-- 1. VALIDAÇÃO ANTES DO UPDATE
SELECT codigo, nome, clascli_codigo_1, clascli_codigo_2
FROM SGC.dbo.cliente_fornecedor
WHERE codigo IN (300);

-- 2. EXECUÇÃO DO UPDATE
UPDATE SGC.dbo.cliente_fornecedor
SET clascli_codigo_1 = 10, clascli_codigo_2 = 10
WHERE codigo IN (300);


