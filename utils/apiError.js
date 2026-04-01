/**
 * Utilitário central de tratamento de erros da API.
 *
 * Padrões cobertos:
 *  - AppError: erros de negócio lançados intencionalmente com status/code definidos
 *  - MySQL: erros do driver mysql2 classificados por errno/code
 *  - Genérico: qualquer outro Error não mapeado → 500
 *
 * Formato padronizado de resposta JSON:
 *  { error, code, categoria, detalhes? }
 *
 * O campo `code` é lido pelo frontend em extractApiErrorInfo() via
 *  errorOrResponse?.code || errorOrResponse?.errorCode || errorOrResponse?.errno
 */

// ──────────────────────────────────────────────────────────────────────────────
// Mapa de códigos MySQL → { code, categoria, status, message }
// ──────────────────────────────────────────────────────────────────────────────
const MYSQL_ERROR_MAP = {
  1062: { code: 'DUPLICATE_ENTRY',    categoria: 'database',   status: 409, message: 'Registro duplicado. Já existe um dado com essas informações.' },
  1451: { code: 'FK_DELETE_BLOQUEADO',categoria: 'database',   status: 409, message: 'Não é possível excluir: existem registros vinculados a este dado.' },
  1452: { code: 'FK_INSERT_INVALIDO', categoria: 'database',   status: 422, message: 'Referência inválida. O dado vinculado não existe no sistema.' },
  1406: { code: 'CAMPO_MUITO_LONGO',  categoria: 'validation', status: 400, message: 'Um ou mais campos excedem o tamanho máximo permitido.' },
  1048: { code: 'CAMPO_NULO',         categoria: 'validation', status: 400, message: 'Um campo obrigatório está sem valor.' },
  1054: { code: 'COLUNA_DESCONHECIDA',categoria: 'server',     status: 500, message: 'Erro interno: coluna desconhecida na consulta.' },
  1064: { code: 'SQL_SYNTAX',         categoria: 'server',     status: 500, message: 'Erro interno de sintaxe na consulta ao banco de dados.' },
  1146: { code: 'TABELA_NAO_EXISTE',  categoria: 'server',     status: 500, message: 'Erro interno: tabela não encontrada no banco de dados.' },
  1213: { code: 'DEADLOCK',           categoria: 'database',   status: 503, message: 'Conflito de acesso simultâneo ao banco. Tente novamente.' },
  1205: { code: 'LOCK_TIMEOUT',       categoria: 'database',   status: 503, message: 'Tempo limite de acesso ao banco excedido. Tente novamente.' },
};

// Mapeamento de string code → errno para drivers que expõem apenas o código textual
const MYSQL_CODE_TO_ERRNO = {
  ER_DUP_ENTRY:           1062,
  ER_ROW_IS_REFERENCED_2: 1451,
  ER_NO_REFERENCED_ROW_2: 1452,
  ER_DATA_TOO_LONG:       1406,
  ER_BAD_NULL_ERROR:      1048,
  ER_BAD_FIELD_ERROR:     1054,
  ER_PARSE_ERROR:         1064,
  ER_NO_SUCH_TABLE:       1146,
  ER_LOCK_DEADLOCK:       1213,
  ER_LOCK_WAIT_TIMEOUT:   1205,
};

// ──────────────────────────────────────────────────────────────────────────────
// AppError — erros lançados intencionalmente no código
// ──────────────────────────────────────────────────────────────────────────────
export class AppError extends Error {
  /**
   * @param {string} mensagem   - Mensagem legível para o usuário
   * @param {number} status     - Código HTTP (400, 401, 404, 409, 422, 500…)
   * @param {string} code       - Código de erro semântico (ex: 'SOLIPEDE_NAO_ENCONTRADO')
   * @param {string} categoria  - 'validation'|'auth'|'request'|'database'|'server'
   */
  constructor(mensagem, status = 500, code = 'INTERNAL_ERROR', categoria = 'server') {
    super(mensagem);
    this.name = 'AppError';
    this.status = status;
    this.code = code;
    this.categoria = categoria;
  }
}

// ──────────────────────────────────────────────────────────────────────────────
// classifyMysqlError — classifica um erro do mysql2 pelo errno ou code string
// ──────────────────────────────────────────────────────────────────────────────
export function classifyMysqlError(error) {
  if (!error) return null;
  const errno = error.errno ?? MYSQL_CODE_TO_ERRNO[error.code];
  return (errno && MYSQL_ERROR_MAP[errno]) ? { ...MYSQL_ERROR_MAP[errno] } : null;
}

// ──────────────────────────────────────────────────────────────────────────────
// handleControllerError — resposta padronizada para catch blocks em controllers
//   que respondem diretamente (sem next(err))
// ──────────────────────────────────────────────────────────────────────────────
export function handleControllerError(res, error, contexto = 'operação') {
  // 1. AppError lançado intencionalmente
  if (error instanceof AppError) {
    return res.status(error.status).json({
      error: error.message,
      code: error.code,
      categoria: error.categoria,
    });
  }

  // 2. Erro MySQL identificável
  const mysql = classifyMysqlError(error);
  if (mysql) {
    const detalhes = process.env.NODE_ENV !== 'production'
      ? (error.sqlMessage || error.message)
      : undefined;
    return res.status(mysql.status).json({
      error: mysql.message,
      code: mysql.code,
      categoria: mysql.categoria,
      ...(detalhes && { detalhes }),
    });
  }

  // 3. Erro com status HTTP explícito (ex: new Error(); err.status = 401)
  if (error.status) {
    return res.status(error.status).json({
      error: error.message,
      code: 'APP_ERROR',
      categoria: error.status < 500 ? 'request' : 'server',
    });
  }

  // 4. Erro genérico inesperado
  console.error(`❌ Erro inesperado em [${contexto}]:`, error);
  return res.status(500).json({
    error: `Erro interno ao processar ${contexto}`,
    code: 'INTERNAL_ERROR',
    categoria: 'server',
    ...(process.env.NODE_ENV !== 'production' && { detalhes: error.message }),
  });
}
