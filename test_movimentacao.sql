-- Script para testar se os campos origem e destino foram adicionados corretamente

-- Verificar estrutura da tabela prontuario
DESCRIBE prontuario;

-- Verificar registros de movimentação existentes
SELECT 
    id, 
    numero_solipede, 
    tipo, 
    observacao, 
    alocacao_anterior, 
    alocacao_nova, 
    origem, 
    destino,
    data_criacao
FROM prontuario 
WHERE tipo = 'Movimentação'
ORDER BY data_criacao DESC
LIMIT 10;
