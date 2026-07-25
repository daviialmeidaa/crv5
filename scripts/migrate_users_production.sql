-- Script de migração para Produção: Atualização do modelo de permissões (RBAC)
-- Este script irá preparar a tabela 'users' para o novo formato, migrando os perfis atuais.

-- 1. Adiciona a nova coluna 'role' (por padrão todo mundo recebe CR1 temporariamente caso algo falhe)
ALTER TABLE public.users 
ADD COLUMN IF NOT EXISTS role character varying(20) DEFAULT 'CR1';

-- 2. Migra quem era Admin no sistema antigo para o novo perfil ADMIN supremo
UPDATE public.users 
SET role = 'ADMIN' 
WHERE is_admin = true;

-- 3. Garante que quem não era admin no sistema antigo, receba o perfil base de Contas a Receber
UPDATE public.users 
SET role = 'CR1' 
WHERE is_admin = false OR is_admin IS NULL;

-- 4. Agora que os dados foram migrados com sucesso, removemos a coluna antiga que não será mais usada
ALTER TABLE public.users 
DROP COLUMN IF EXISTS is_admin;

-- (Opcional) Confirmação visual rápida no terminal/pgAdmin:
-- SELECT id, nome, email, role FROM public.users;
