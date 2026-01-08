-- Migration: Add auditoria fields to prontuario table
-- Data: 2026-01-06

-- Adicionar campo status_anterior
ALTER TABLE prontuario 
ADD COLUMN IF NOT EXISTS status_anterior VARCHAR(50) NULL COMMENT 'Status anterior do solípede antes da mudança';

-- Adicionar campo status_novo
ALTER TABLE prontuario 
ADD COLUMN IF NOT EXISTS status_novo VARCHAR(50) NULL COMMENT 'Novo status do solípede após a mudança';

-- Adicionar campo data_atualizacao
ALTER TABLE prontuario 
ADD COLUMN IF NOT EXISTS data_atualizacao DATETIME NULL COMMENT 'Data/hora da última atualização do registro';

-- Adicionar campo usuario_atualizacao_id
ALTER TABLE prontuario 
ADD COLUMN IF NOT EXISTS usuario_atualizacao_id INT NULL COMMENT 'ID do usuário que fez a última atualização';

-- Adicionar foreign key se não existir
-- Primeiro verificar se a constraint já existe
SET @exists = (SELECT COUNT(*) FROM information_schema.KEY_COLUMN_USAGE 
               WHERE TABLE_SCHEMA = 'dashboardrpmon' 
               AND TABLE_NAME = 'prontuario' 
               AND COLUMN_NAME = 'usuario_atualizacao_id' 
               AND REFERENCED_TABLE_NAME = 'usuarios');

SET @sql = IF(@exists = 0, 
  'ALTER TABLE prontuario ADD FOREIGN KEY (usuario_atualizacao_id) REFERENCES usuarios(id)', 
  'SELECT "Foreign key já existe" AS mensagem');

PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;
