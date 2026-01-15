-- Adiciona campos de alocação anterior e nova no prontuário para registros de movimentação
-- Execução: node migrations/add_alocacao_fields_prontuario.js

ALTER TABLE prontuario 
ADD COLUMN IF NOT EXISTS alocacao_anterior VARCHAR(100) DEFAULT NULL,
ADD COLUMN IF NOT EXISTS alocacao_nova VARCHAR(100) DEFAULT NULL;

-- Adicionar índice para melhorar performance de consultas
CREATE INDEX IF NOT EXISTS idx_prontuario_tipo ON prontuario(tipo);
CREATE INDEX IF NOT EXISTS idx_prontuario_alocacao_nova ON prontuario(alocacao_nova);
