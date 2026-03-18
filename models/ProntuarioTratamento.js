import pool from "../config/mysqlConnect.js";

class ProntuarioTratamentos {

  static async listarPorProntuario(prontuarioId) {
    const [rows] = await pool.query(
      `SELECT 
        pt.*,
        p.numero_solipede,
        p.tipo as prontuario_tipo,
        u.nome as usuario_nome,
        u.re as usuario_registro,
        uc.nome as usuario_conclusao_nome,
        uc.re as usuario_conclusao_registro,
        s.nome as solipede_nome
       FROM prontuario_tratamentos pt
      INNER JOIN prontuario_geral p ON pt.prontuario_id = p.id
       LEFT JOIN usuarios u ON pt.usuario_id = u.id
       LEFT JOIN usuarios uc ON pt.usuario_conclusao_id = uc.id
       LEFT JOIN solipede s ON p.numero_solipede = s.numero
       WHERE pt.prontuario_id = ?
       ORDER BY pt.data_criacao DESC`,
      [prontuarioId]
    );
    return rows;
  }

  static async buscarPorId(id) {
    const [rows] = await pool.query(
      `SELECT 
        pt.*,
        p.numero_solipede,
        u.nome as usuario_nome,
        s.nome as solipede_nome
       FROM prontuario_tratamentos pt
      INNER JOIN prontuario_geral p ON pt.prontuario_id = p.id
       LEFT JOIN usuarios u ON pt.usuario_id = u.id
       LEFT JOIN solipede s ON p.numero_solipede = s.numero
       WHERE pt.id = ?`,
      [id]
    );
    return rows[0];
  }

  /**
   * Valida se o prontuário existe e pertence a um solípede válido
   */
  static async validarProntuario(prontuarioId, db = pool) {
    const [rows] = await db.query(
      `SELECT p.id, p.numero_solipede, s.nome as solipede_nome
      FROM prontuario_geral p
       LEFT JOIN solipede s ON p.numero_solipede = s.numero
       WHERE p.id = ?`,
      [prontuarioId]
    );
    return rows[0];
  }

  /**
   * Valida se o usuário existe e está ativo
   */
  static async validarUsuario(usuarioId, db = pool) {
    const [rows] = await db.query(
      `SELECT id, nome, email FROM usuarios WHERE id = ? AND ativo = TRUE`,
      [usuarioId]
    );
    return rows[0];
  }

static async criar(dados, db = pool) {
  const {
    prontuario_id,
    diagnostico,
    observacao_clinica,
    prescricao,
    usuario_id,
    precisa_baixar,
    foi_responsavel_pela_baixa
  } = dados;

  // 🔒 VALIDAÇÕES
  console.log("🔍 Validando dados do tratamento...");
  
  // Validar campos obrigatórios
  if (!prontuario_id || !usuario_id) {
    throw new Error("prontuario_id e usuario_id são obrigatórios");
  }

  if (!diagnostico || !observacao_clinica) {
    throw new Error("Diagnóstico e observação clínica são obrigatórios");
  }

  // Validar se prontuário existe
  const prontuarioValido = await this.validarProntuario(prontuario_id, db);
  if (!prontuarioValido) {
    throw new Error("Prontuário não encontrado");
  }
  console.log("✅ Prontuário válido:", prontuarioValido);

  // Validar se usuário existe
  const usuarioValido = await this.validarUsuario(usuario_id, db);
  if (!usuarioValido) {
    throw new Error("Usuário não encontrado ou inativo");
  }
  console.log("✅ Usuário válido:", usuarioValido);

  // Inserir tratamento
  const [result] = await db.query(
    `INSERT INTO prontuario_tratamentos
     (prontuario_id, diagnostico, observacao_clinica, prescricao, usuario_id, precisa_baixar, foi_responsavel_pela_baixa, status_conclusao)
     VALUES (?, ?, ?, ?, ?, ?, ?, 'em_andamento')`,
    [
      prontuario_id,
      diagnostico || null,
      observacao_clinica,
      prescricao || null,
      usuario_id,
      precisa_baixar || 'nao',
      foi_responsavel_pela_baixa || 0
    ]
  );

  console.log("✅ Tratamento criado com ID:", result.insertId);
  return result.insertId;
  }

  /**
   * Atualiza o status de conclusão do tratamento
   */
  static async atualizarStatus(id, status_conclusao, usuario_conclusao_id) {
    const [result] = await pool.query(
      `UPDATE prontuario_tratamentos
       SET status_conclusao = ?,
           data_conclusao = CASE WHEN ? = 'concluido' THEN NOW() ELSE NULL END,
           usuario_conclusao_id = ?
       WHERE id = ?`,
      [status_conclusao, status_conclusao, usuario_conclusao_id, id]
    );

    return result.affectedRows > 0;
  }

  static async excluir(id) {
    const [result] = await pool.query(
      `DELETE FROM prontuario_tratamentos WHERE id = ?`,
      [id]
    );
    return result.affectedRows > 0;
  }
}

export default ProntuarioTratamentos;