import pool from "../config/mysqlConnect.js";

class Prontuario {
  static async listarTodos() {
    console.log("═".repeat(80));
    console.log("🗄️  MODEL: Prontuario.listarTodos()");
    console.log("📊 Executando query com JOINS (usuarios + solipede)...");
    console.log("═".repeat(80));
    
    const [rows] = await pool.query(
      `
      SELECT 
        p.id,
        p.tipo,
        p.observacao,
        p.recomendacoes,
        p.usuarioId,
        p.data_criacao,
        p.numero_solipede,
        p.status_baixa,
        p.data_liberacao,
        p.usuario_liberacao_id,
        p.tipo_baixa,
        p.data_lancamento,
        p.data_validade,
        p.status_conclusao,
        p.data_conclusao,
        p.usuario_conclusao_id,
        DATE_FORMAT(p.data_criacao, '%d/%m/%Y') AS data,
        DATE_FORMAT(p.data_criacao, '%H:%i') AS hora,
        u.nome as usuario_nome,
        u.re as usuario_registro,
        u.perfil as usuario_perfil,
        u.email as usuario_email,
        ul.nome as usuario_liberacao_nome,
        ul.re as usuario_liberacao_registro,
        uc.nome as usuario_conclusao_nome,
        uc.re as usuario_conclusao_registro,
        s.nome as solipede_nome,
        s.esquadrao as solipede_esquadrao
      FROM prontuario p
      LEFT JOIN usuarios u ON p.usuarioId = u.id
      LEFT JOIN usuarios ul ON p.usuario_liberacao_id = ul.id
      LEFT JOIN usuarios uc ON p.usuario_conclusao_id = uc.id
      LEFT JOIN solipede s ON p.numero_solipede = s.numero
      ORDER BY p.data_criacao DESC
      `
    );

    console.log(`✅ Query executada com sucesso - Total: ${rows.length} registros`);
    if (rows.length > 0) {
      console.log(`📦 Campos do primeiro registro:`, Object.keys(rows[0]));
    }
    console.log("═".repeat(80));
    console.log("\n");
    return rows;
  }

  static async listarPorSolipede(numero) {
    console.log("═".repeat(80));
    console.log("🗄️  MODEL: Prontuario.listarPorSolipede()");
    console.log(`📊 Buscando prontuarios do solipede: ${numero}`);
    console.log("═".repeat(80));
    
    const [rows] = await pool.query(
      `
      SELECT 
        p.id,
        p.tipo,
        p.observacao,
        p.recomendacoes,
        p.usuarioId,
        p.data_criacao,
        p.data_atualizacao,
        p.usuario_atualizacao_id,
        p.status_anterior,
        p.status_novo,
        p.status_baixa,
        p.data_liberacao,
        p.usuario_liberacao_id,
        p.tipo_baixa,
        p.data_lancamento,
        p.data_validade,
        p.status_conclusao,
        p.data_conclusao,
        p.usuario_conclusao_id,
        DATE_FORMAT(p.data_criacao, '%d/%m/%Y') AS data,
        DATE_FORMAT(p.data_criacao, '%H:%i') AS hora,
        u.nome as usuario_nome,
        u.re as usuario_registro,
        u.perfil as usuario_perfil,
        u.email as usuario_email,
        ua.nome as usuario_atualizacao_nome,
        ua.re as usuario_atualizacao_registro,
        ul.nome as usuario_liberacao_nome,
        ul.re as usuario_liberacao_registro,
        uc.nome as usuario_conclusao_nome,
        uc.re as usuario_conclusao_registro
      FROM prontuario p
      LEFT JOIN usuarios u ON p.usuarioId = u.id
      LEFT JOIN usuarios ua ON p.usuario_atualizacao_id = ua.id
      LEFT JOIN usuarios ul ON p.usuario_liberacao_id = ul.id
      LEFT JOIN usuarios uc ON p.usuario_conclusao_id = uc.id
      WHERE p.numero_solipede = ?
      ORDER BY p.data_criacao DESC
      `,
      [numero]
    );

    console.log(`✅ Query executada - Total: ${rows.length} registros para solipede ${numero}`);
    console.log("═".repeat(80));
    console.log("\n");
    return rows;
  }

  static async contarBaixasPendentes(numero) {
    const [rows] = await pool.query(
      `
      SELECT COUNT(*) as total
      FROM prontuario
      WHERE numero_solipede = ?
        AND tipo = 'Baixa'
        AND status_baixa = 'pendente'
      `,
      [numero]
    );

    return rows[0].total;
  }

  static async liberarBaixa(prontuarioId, usuarioId) {
    const [result] = await pool.query(
      `
      UPDATE prontuario
      SET status_baixa = 'liberada',
          data_liberacao = NOW(),
          usuario_liberacao_id = ?
      WHERE id = ? AND tipo = 'Baixa' AND status_baixa = 'pendente'
      `,
      [usuarioId, prontuarioId]
    );

    return result.affectedRows > 0;
  }

  static async contarTratamentosEmAndamento(numeroSolipede) {
    const [rows] = await pool.query(
      `
      SELECT COUNT(*) as total
      FROM prontuario
      WHERE numero_solipede = ?
        AND tipo = 'Tratamento'
        AND (status_conclusao IS NULL OR status_conclusao = 'em_andamento')
      `,
      [numeroSolipede]
    );

    return rows[0].total;
  }

  static async concluirTratamento(prontuarioId, usuarioId) {
    const [result] = await pool.query(
      `
      UPDATE prontuario
      SET status_conclusao = 'concluido',
          data_conclusao = NOW(),
          usuario_conclusao_id = ?
      WHERE id = ? AND status_conclusao = 'em_andamento'
      `,
      [usuarioId, prontuarioId]
    );

    return result.affectedRows > 0;
  }

  static async concluirRegistro(prontuarioId, usuarioId) {
    const [result] = await pool.query(
      `
      UPDATE prontuario
      SET status_conclusao = 'concluido',
          data_conclusao = NOW(),
          usuario_conclusao_id = ?
      WHERE id = ? AND (status_conclusao IS NULL OR status_conclusao = 'em_andamento')
      `,
      [usuarioId, prontuarioId]
    );

    return result.affectedRows > 0;
  }

  static async atualizarComAuditoria(prontuarioId, dados, usuarioId) {
    const campos = [];
    const valores = [];

    if (dados.observacao !== undefined) {
      campos.push('observacao = ?');
      valores.push(dados.observacao);
    }

    if (dados.recomendacoes !== undefined) {
      campos.push('recomendacoes = ?');
      valores.push(dados.recomendacoes);
    }

    if (dados.data_validade !== undefined) {
      campos.push('data_validade = ?');
      valores.push(dados.data_validade);
    }

    // Adicionar campos de auditoria
    campos.push('data_atualizacao = NOW()');
    campos.push('usuario_atualizacao_id = ?');
    valores.push(usuarioId);

    valores.push(prontuarioId);

    const [result] = await pool.query(
      `UPDATE prontuario SET ${campos.join(', ')} WHERE id = ?`,
      valores
    );

    return result.affectedRows > 0;
  }
}

export default Prontuario;
