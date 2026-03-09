import pool from "../config/mysqlConnect.js";

class ProntuarioRestricoes {

  static async listarSolipedesComRestricao() {
    const [rows] = await pool.query(
      `SELECT DISTINCT p.numero_solipede
       FROM prontuario_restricoes pr
       INNER JOIN prontuario p ON pr.prontuario_id = p.id
       WHERE (pr.status_conclusao IS NULL OR pr.status_conclusao <> 'concluido')
         AND (p.status_conclusao IS NULL OR p.status_conclusao <> 'concluido')
       ORDER BY p.numero_solipede`
    );

    return rows.map((row) => row.numero_solipede);
  }
  
  static async listarPorProntuario(prontuarioId) {
    const [rows] = await pool.query(
      `SELECT 
        pr.*,
        p.numero_solipede,
        p.tipo as prontuario_tipo,
        u.nome as usuario_nome,
        u.re as usuario_registro,
        s.nome as solipede_nome,
        uc.nome as usuario_conclusao_nome,
        uc.re as usuario_conclusao_registro
       FROM prontuario_restricoes pr
       INNER JOIN prontuario p ON pr.prontuario_id = p.id
       LEFT JOIN usuarios u ON pr.usuario_id = u.id
       LEFT JOIN solipede s ON p.numero_solipede = s.numero
       LEFT JOIN usuarios uc ON pr.usuario_conclusao_id = uc.id
       WHERE pr.prontuario_id = ?
       ORDER BY pr.data_criacao DESC`,
      [prontuarioId]
    );
    return rows;
  }

  static async buscarPorId(id) {
    const [rows] = await pool.query(
      `SELECT 
        pr.*,
        p.numero_solipede,
        u.nome as usuario_nome,
        s.nome as solipede_nome,
        uc.nome as usuario_conclusao_nome,
        uc.re as usuario_conclusao_registro
       FROM prontuario_restricoes pr
       INNER JOIN prontuario p ON pr.prontuario_id = p.id
       LEFT JOIN usuarios u ON pr.usuario_id = u.id
       LEFT JOIN solipede s ON p.numero_solipede = s.numero
       LEFT JOIN usuarios uc ON pr.usuario_conclusao_id = uc.id
       WHERE pr.id = ?`,
      [id]
    );
    return rows[0];
  }

  /**
   * Valida se o prontuário existe e pertence a um solípede válido
   */
  static async validarProntuario(prontuarioId) {
    const [rows] = await pool.query(
      `SELECT p.id, p.numero_solipede, s.nome as solipede_nome
       FROM prontuario p
       LEFT JOIN solipede s ON p.numero_solipede = s.numero
       WHERE p.id = ?`,
      [prontuarioId]
    );
    return rows[0];
  }

  /**
   * Valida se o usuário existe e está ativo
   */
  static async validarUsuario(usuarioId) {
    const [rows] = await pool.query(
      `SELECT id, nome, email FROM usuarios WHERE id = ? AND ativo = TRUE`,
      [usuarioId]
    );
    return rows[0];
  }

  static async criar(dados) {
    const {
      prontuario_id,
      usuario_id,
      restricao,
      recomendacoes,
      data_validade,
      status_conclusao
    } = dados;

    console.log("🚫 Validando dados da restrição...");
    
    // Validar campos obrigatórios
    if (!restricao || !restricao.trim()) {
      throw new Error("Campo 'restricao' é obrigatório");
    }

    // Validar se prontuário existe
    const prontuarioValido = await this.validarProntuario(prontuario_id);
    if (!prontuarioValido) {
      throw new Error(`Prontuário ${prontuario_id} não encontrado`);
    }

    // Validar se usuário existe e está ativo
    const usuarioValido = await this.validarUsuario(usuario_id);
    if (!usuarioValido) {
      throw new Error(`Usuário ${usuario_id} não encontrado ou inativo`);
    }

    console.log("✅ Validações passadas! Inserindo restrição...");

    // Inserir restrição com os campos corretos do banco
    const [result] = await pool.query(
      `INSERT INTO prontuario_restricoes
       (prontuario_id, usuario_id, restricao, recomendacoes, status_conclusao, data_validade)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [
        prontuario_id,
        usuario_id,
        restricao.trim(),
        recomendacoes || null,
        status_conclusao || null,
        data_validade || null
      ]
    );

    console.log("✅ Restrição inserida com sucesso! ID:", result.insertId);
    return result.insertId;
  }

  static async excluir(id) {
    const [result] = await pool.query(
      `DELETE FROM prontuario_restricoes WHERE id = ?`,
      [id]
    );
    return result.affectedRows > 0;
  }

  static async atualizarParcial(id, dados) {
    const camposPermitidos = ["restricao", "recomendacoes", "data_validade", "status_conclusao"];
    const camposParaAtualizar = [];
    const valores = [];

    for (const campo of camposPermitidos) {
      if (Object.prototype.hasOwnProperty.call(dados, campo)) {
        camposParaAtualizar.push(`${campo} = ?`);
        valores.push(dados[campo]);
      }
    }

    if (camposParaAtualizar.length === 0) {
      throw new Error("Nenhum campo válido para atualização");
    }

    valores.push(id);

    const [result] = await pool.query(
      `UPDATE prontuario_restricoes
       SET ${camposParaAtualizar.join(", ")}
       WHERE id = ?`,
      valores
    );

    if (result.affectedRows === 0) {
      return null;
    }

    return this.buscarPorId(id);
  }

  static async concluirRestricao(restricaoId, usuarioId) {
    const [result] = await pool.query(
      `UPDATE prontuario_restricoes
       SET status_conclusao = 'concluido',
           data_conclusao = NOW(),
           usuario_conclusao_id = ?
       WHERE id = ? AND (status_conclusao IS NULL OR status_conclusao = 'em_andamento')`,
      [usuarioId, restricaoId]
    );

    return result.affectedRows > 0;
  }
}

export default ProntuarioRestricoes;
