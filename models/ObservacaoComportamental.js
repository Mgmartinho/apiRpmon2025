import pool from "../config/mysqlConnect.js";

class ObservacaoComportamental {
  static async _tabelaExiste(nomeTabela) {
    const [rows] = await pool.query("SHOW TABLES LIKE ?", [nomeTabela]);
    return rows.length > 0;
  }

  static async _obterColunas(nomeTabela) {
    const [rows] = await pool.query(`SHOW COLUMNS FROM ${nomeTabela}`);
    return new Set(rows.map((row) => row.Field));
  }

  static _escolherPrimeiraColuna(colunas, candidatas) {
    return candidatas.find((campo) => colunas.has(campo)) || null;
  }

  static async _listarNumerosLegado() {
    const existeProntuarioGeral = await this._tabelaExiste("prontuario_geral");
    if (!existeProntuarioGeral) return [];

    const colunas = await this._obterColunas("prontuario_geral");
    const campoObservacao = this._escolherPrimeiraColuna(colunas, ["observacao", "descricao", "diagnosticos"]);

    if (!campoObservacao || !colunas.has("numero_solipede") || !colunas.has("tipo")) {
      return [];
    }

    const [rows] = await pool.query(
      `SELECT DISTINCT pg.numero_solipede
       FROM prontuario_geral pg
       WHERE pg.tipo IN ('Observações Comportamentais', 'Observacao Comportamental', 'Observação Geral', 'Observacao Geral')
         AND ${campoObservacao} IS NOT NULL
         AND TRIM(${campoObservacao}) <> ''
       ORDER BY pg.numero_solipede`
    );

    return rows.map((row) => row.numero_solipede);
  }

  static async _listarLegadoPorSolipede(numeroSolipede) {
    const existeProntuarioGeral = await this._tabelaExiste("prontuario_geral");
    if (!existeProntuarioGeral) return [];

    const colunas = await this._obterColunas("prontuario_geral");
    const campoObservacao = this._escolherPrimeiraColuna(colunas, ["observacao", "descricao", "diagnosticos"]);
    const campoRecomendacoes = this._escolherPrimeiraColuna(colunas, ["recomendacoes", "prescricao"]);
    const campoUsuario = this._escolherPrimeiraColuna(colunas, ["usuarioId", "usuario_id"]);
    const campoDataCriacao = this._escolherPrimeiraColuna(colunas, ["data_criacao", "data_lancamento", "created_at"]);
    const campoDataAtualizacao = this._escolherPrimeiraColuna(colunas, ["data_atualizacao", "updated_at"]);

    if (!campoObservacao || !colunas.has("numero_solipede") || !colunas.has("tipo")) {
      return [];
    }

    const usuarioJoin = campoUsuario ? `LEFT JOIN usuarios u ON pg.${campoUsuario} = u.id` : "";

    const [rows] = await pool.query(
      `SELECT
        CONCAT('legacy-', pg.id) AS id,
        pg.numero_solipede,
        pg.${campoObservacao} AS observacao,
        ${campoRecomendacoes ? `pg.${campoRecomendacoes}` : "NULL"} AS recomendacoes,
        ${campoDataCriacao ? `pg.${campoDataCriacao}` : "NULL"} AS data_lancamento,
        ${campoDataCriacao ? `pg.${campoDataCriacao}` : "NULL"} AS data_criacao,
        ${campoDataAtualizacao ? `pg.${campoDataAtualizacao}` : "NULL"} AS data_atualizacao,
        COALESCE(NULLIF(pg.tipo, ''), 'Observações Comportamentais') AS tipo,
        ${campoUsuario ? "u.nome" : "NULL"} AS usuario_nome,
        ${campoUsuario ? "u.re" : "NULL"} AS usuario_re,
        NULL AS usuario_atualizacao_nome,
        NULL AS usuario_atualizacao_re,
        1 AS somente_leitura
      FROM prontuario_geral pg
      ${usuarioJoin}
      WHERE pg.numero_solipede = ?
        AND pg.tipo IN ('Observações Comportamentais', 'Observacao Comportamental', 'Observação Geral', 'Observacao Geral')
        AND pg.${campoObservacao} IS NOT NULL
        AND TRIM(pg.${campoObservacao}) <> ''
      ORDER BY ${campoDataCriacao ? `pg.${campoDataCriacao}` : "pg.id"} DESC`,
      [numeroSolipede]
    );

    return rows;
  }

  static async listarSolipedesComObservacoes() {
    const [novasRows] = await pool.query(
      `SELECT DISTINCT numero_solipede
       FROM observacoes_comportamentais
       ORDER BY numero_solipede`
    );

    const legadoRows = await this._listarNumerosLegado();

    const numeros = new Set();
    novasRows.forEach((row) => numeros.add(row.numero_solipede));
    legadoRows.forEach((numero) => numeros.add(numero));

    return Array.from(numeros).sort((a, b) => Number(a) - Number(b));
  }

  static async listarPorSolipede(numeroSolipede) {
    const [novasRows] = await pool.query(
      `SELECT
        oc.id,
        oc.numero_solipede,
        oc.observacao,
        oc.recomendacoes,
        oc.data_lancamento,
        oc.data_lancamento AS data_criacao,
        oc.data_atualizacao,
        'Observações Comportamentais' AS tipo,
        u.nome AS usuario_nome,
        u.re AS usuario_re,
        ua.nome AS usuario_atualizacao_nome,
        ua.re AS usuario_atualizacao_re,
        0 AS somente_leitura
      FROM observacoes_comportamentais oc
      LEFT JOIN usuarios u ON oc.usuario_id = u.id
      LEFT JOIN usuarios ua ON oc.usuario_atualizacao = ua.id
      WHERE oc.numero_solipede = ?
      ORDER BY oc.data_lancamento DESC`,
      [numeroSolipede]
    );

    const legadoRows = await this._listarLegadoPorSolipede(numeroSolipede);

    return [...novasRows, ...legadoRows].sort((a, b) => {
      const dataA = new Date(a?.data_lancamento || a?.data_criacao || 0).getTime();
      const dataB = new Date(b?.data_lancamento || b?.data_criacao || 0).getTime();
      return dataB - dataA;
    });
  }

  static async criar({ numero_solipede, observacao, recomendacoes, usuario_id }) {
    const [result] = await pool.query(
      `INSERT INTO observacoes_comportamentais
       (numero_solipede, observacao, recomendacoes, usuario_id)
       VALUES (?, ?, ?, ?)`,
      [numero_solipede, observacao, recomendacoes || null, usuario_id]
    );

    return result.insertId;
  }

  static async buscarPorId(id) {
    const [rows] = await pool.query(
      `SELECT id, numero_solipede, observacao, recomendacoes, usuario_id, data_lancamento, usuario_atualizacao, data_atualizacao
       FROM observacoes_comportamentais
       WHERE id = ?`,
      [id]
    );

    return rows[0] || null;
  }

  static async atualizar(id, { observacao, recomendacoes, usuario_atualizacao }) {
    const [result] = await pool.query(
      `UPDATE observacoes_comportamentais
       SET observacao = ?,
           recomendacoes = ?,
           usuario_atualizacao = ?,
           data_atualizacao = NOW()
       WHERE id = ?`,
      [observacao, recomendacoes || null, usuario_atualizacao || null, id]
    );

    return result.affectedRows > 0;
  }

  static async deletar(id) {
    const [result] = await pool.query(
      `DELETE FROM observacoes_comportamentais WHERE id = ?`,
      [id]
    );

    return result.affectedRows > 0;
  }
}

export default ObservacaoComportamental;
