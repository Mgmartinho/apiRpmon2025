-- Migration: Adicionar campos de conclusão para prontuario_restricoes
-- Data: 2026-03-04
-- Descrição: Adiciona campos para rastrear quem concluiu a restrição e quando

-- Verificar se os campos já existem antes de adicionar
ALTER TABLE prontuario_restricoes 
ADD COLUMN IF NOT EXISTS usuario_conclusao_id INT NULL COMMENT 'ID do usuário que concluiu a restrição',
ADD COLUMN IF NOT EXISTS data_conclusao TIMESTAMP NULL COMMENT 'Data e hora da conclusão';

-- Adicionar foreign key para usuario_conclusao_id
ALTER TABLE prontuario_restricoes 
ADD CONSTRAINT fk_restricoes_usuario_conclusao 
FOREIGN KEY (usuario_conclusao_id) REFERENCES usuarios(id) 
ON DELETE SET NULL;

-- Criar índice para melhorar performance de consultas
CREATE INDEX IF NOT EXISTS idx_restricoes_status_conclusao ON prontuario_restricoes(status_conclusao);
CREATE INDEX IF NOT EXISTS idx_restricoes_usuario_conclusao ON prontuario_restricoes(usuario_conclusao_id);
CREATE INDEX IF NOT EXISTS idx_restricoes_data_conclusao ON prontuario_restricoes(data_conclusao);

-- Verificar a estrutura da tabela
DESCRIBE prontuario_restricoes;
