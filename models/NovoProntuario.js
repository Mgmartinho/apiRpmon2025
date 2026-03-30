import pool from "../config/mysqlConnect.js";

class NovoProntuario {
  static async _resolverNomeTabela(db, plural, singular) {
    const [pluralRows] = await db.query(`SHOW TABLES LIKE ?`, [plural]);
    if (pluralRows.length > 0) {
      return plural;
    }

    const [singularRows] = await db.query(`SHOW TABLES LIKE ?`, [singular]);
    if (singularRows.length > 0) {
      return singular;
    }

    throw new Error(`Tabela não encontrada (${plural}/${singular})`);
  }

  static async _resolverTabelasRelacionadas(db = pool) {
    const [dietas, suplementacoes, movimentacoes, vacinacoes, vermifugacoes, aiemormo, cirurgias] = await Promise.all([
      this._resolverNomeTabela(db, "prontuario_dietas", "prontuario_dieta"),
      this._resolverNomeTabela(db, "prontuario_suplementacoes", "prontuario_suplementacao"),
      this._resolverNomeTabela(db, "prontuario_movimentacoes", "prontuario_movimentacao"),
      this._resolverNomeTabela(db, "prontuario_vacinacoes", "prontuario_vacinacao"),
      this._resolverNomeTabela(db, "prontuario_vermifugacoes", "prontuario_vermifugacao"),
      this._resolverNomeTabela(db, "prontuario_aiemormos", "prontuario_aiemormo"),
      this._resolverNomeTabela(db, "prontuario_cirurgias", "prontuario_cirurgia"),
    ]);

    const [dietasCols, suplementacoesCols, movimentacoesCols, restricoesCols, vacinacoesCols, vermifugacoesCols, aiemormoCols, cirurgiasCols] = await Promise.all([
      this._obterColunasTabela(dietas, db),
      this._obterColunasTabela(suplementacoes, db),
      this._obterColunasTabela(movimentacoes, db),
      this._obterColunasTabela("prontuario_restricoes", db),
      this._obterColunasTabela(vacinacoes, db),
      this._obterColunasTabela(vermifugacoes, db),
      this._obterColunasTabela(aiemormo, db),
      this._obterColunasTabela(cirurgias, db),
    ]);

    return {
      dietas,
      suplementacoes,
      movimentacoes,
      vacinacoes,
      vermifugacoes,
      aiemormo,
      cirurgias,
      dietasCols,
      suplementacoesCols,
      movimentacoesCols,
      restricoesCols,
      vacinacoesCols,
      vermifugacoesCols,
      aiemormoCols,
      cirurgiasCols,
    };
  }

  static async _obterColunasTabela(tabela, db = pool) {
    const [rows] = await db.query(`SHOW COLUMNS FROM ${tabela}`);
    return new Set(rows.map((row) => row.Field));
  }

  /**
   * Lista TODOS os registros do prontuario_geral com os dados gerais
   * e, quando existir, os status das tabelas complementares.
   */
  static async listarTodos() {
    console.log("═".repeat(80));
    console.log("🗄️  MODEL: NovoProntuario.listarTodos() — dados gerais do prontuario_geral");
    console.log("═".repeat(80));

    const {
      dietas,
      suplementacoes,
      movimentacoes,
      vacinacoes,
      vermifugacoes,
      aiemormo,
      cirurgias,
      dietasCols,
      suplementacoesCols,
      movimentacoesCols,
      restricoesCols,
      vacinacoesCols,
      vermifugacoesCols,
      aiemormoCols,
      cirurgiasCols,
    } = await this._resolverTabelasRelacionadas();

    const restricaoUsuarioAtualizacaoExpr = restricoesCols.has("usuario_atualizacao") ? "pr.usuario_atualizacao" : "NULL";
    const restricaoDataAtualizacaoExpr = restricoesCols.has("data_atualizacao") ? "pr.data_atualizacao" : "NULL";
    const restricaoUsuarioAtualizacaoNomeExpr = restricoesCols.has("usuario_atualizacao") ? "prua.nome" : "NULL";
    const restricaoUsuarioAtualizacaoRegistroExpr = restricoesCols.has("usuario_atualizacao") ? "prua.re" : "NULL";

    const dietaUsuarioAtualizacaoExpr = dietasCols.has("usuario_atualizacao") ? "pd.usuario_atualizacao" : "NULL";
    const dietaDataAtualizacaoExpr = dietasCols.has("data_atualizacao") ? "pd.data_atualizacao" : "NULL";
    const dietaUsuarioAtualizacaoNomeExpr = dietasCols.has("usuario_atualizacao") ? "pdua.nome" : "NULL";
    const dietaUsuarioAtualizacaoRegistroExpr = dietasCols.has("usuario_atualizacao") ? "pdua.re" : "NULL";

    const suplementacaoUsuarioAtualizacaoExpr = suplementacoesCols.has("usuario_atualizacao") ? "ps.usuario_atualizacao" : "NULL";
    const suplementacaoDataAtualizacaoExpr = suplementacoesCols.has("data_atualizacao") ? "ps.data_atualizacao" : "NULL";
    const suplementacaoUsuarioAtualizacaoNomeExpr = suplementacoesCols.has("usuario_atualizacao") ? "psua.nome" : "NULL";
    const suplementacaoUsuarioAtualizacaoRegistroExpr = suplementacoesCols.has("usuario_atualizacao") ? "psua.re" : "NULL";

    const movimentacaoUsuarioAtualizacaoExpr = movimentacoesCols.has("usuario_atualizacao") ? "pm.usuario_atualizacao" : "NULL";
    const movimentacaoDataAtualizacaoExpr = movimentacoesCols.has("data_atualizacao") ? "pm.data_atualizacao" : "NULL";
    const movimentacaoUsuarioAtualizacaoNomeExpr = movimentacoesCols.has("usuario_atualizacao") ? "pmua.nome" : "NULL";
    const movimentacaoUsuarioAtualizacaoRegistroExpr = movimentacoesCols.has("usuario_atualizacao") ? "pmua.re" : "NULL";
    const movimentacaoOrigemExpr = movimentacoesCols.has("origem") ? "pm.origem" : "NULL";
    const movimentacaoDestinoFinalExpr = movimentacoesCols.has("destino_final")
      ? "pm.destino_final"
      : movimentacoesCols.has("destinoFinal")
        ? "pm.destinoFinal"
        : movimentacoesCols.has("alocacao_final")
          ? "pm.alocacao_final"
          : "NULL";

    const vacinacaoUsuarioAtualizacaoExpr = vacinacoesCols.has("usuario_atualizacao") ? "pv.usuario_atualizacao" : "NULL";
    const vacinacaoDataAtualizacaoExpr = vacinacoesCols.has("data_atualizacao") ? "pv.data_atualizacao" : "NULL";
    const vacinacaoUsuarioAtualizacaoNomeExpr = vacinacoesCols.has("usuario_atualizacao") ? "pvua.nome" : "NULL";
    const vacinacaoUsuarioAtualizacaoRegistroExpr = vacinacoesCols.has("usuario_atualizacao") ? "pvua.re" : "NULL";

    const vermifugacaoUsuarioAtualizacaoExpr = vermifugacoesCols.has("usuario_atualizacao") ? "pver.usuario_atualizacao" : "NULL";
    const vermifugacaoDataAtualizacaoExpr = vermifugacoesCols.has("data_atualizacao") ? "pver.data_atualizacao" : "NULL";
    const vermifugacaoUsuarioAtualizacaoNomeExpr = vermifugacoesCols.has("usuario_atualizacao") ? "pverua.nome" : "NULL";
    const vermifugacaoUsuarioAtualizacaoRegistroExpr = vermifugacoesCols.has("usuario_atualizacao") ? "pverua.re" : "NULL";
    const aiemormoStatusExpr = aiemormoCols.has("status_conclusao")
      ? "paie.status_conclusao"
      : aiemormoCols.has("status")
        ? "paie.status"
        : "NULL";
    const cirurgiaStatusExpr = cirurgiasCols.has("status_conclusao")
      ? "pc.status_conclusao"
      : cirurgiasCols.has("status")
        ? "pc.status"
        : "NULL";

    const [rows] = await pool.query(
      `SELECT
        pg.id,
        pg.numero_solipede,
        pg.tipo,
        pg.usuarioId,
        pg.data_criacao,
        pg.data_atualizacao,
        DATE_FORMAT(pg.data_criacao, '%d/%m/%Y') AS data,
        DATE_FORMAT(pg.data_criacao, '%H:%i')    AS hora,

        -- Usuário criador
        u.nome   AS usuario_nome,
        u.re     AS usuario_registro,
        u.perfil AS usuario_perfil,
        u.email  AS usuario_email,

        -- Solípede
        s.nome      AS solipede_nome,
        s.esquadrao AS solipede_esquadrao,
        s.baia      AS solipede_baia,

        -- Tratamento
        pt.id                        AS tratamento_id,
        pt.diagnostico,
        pt.observacao_clinica,
        pt.prescricao,
        pt.precisa_baixar            AS tratamento_precisa_baixar,
        pt.foi_responsavel_pela_baixa,
        pt.status_conclusao          AS tratamento_status,
        pt.data_conclusao            AS tratamento_data_conclusao,
        ptuc.nome                    AS tratamento_usuario_conclusao_nome,
        ptuc.re                      AS tratamento_usuario_conclusao_registro,
        pt.usuario_atualizacao,
        pt.data_atualizacao          AS tratamento_data_atualizacao,
        ptua.nome                    AS tratamento_usuario_atualizacao_nome,
        ptua.re                      AS tratamento_usuario_atualizacao_registro,
        pt.usuario_id,
        pt.data_criacao               AS tratamento_data_criacao,

        -- Restrições
        pr.id                        AS restricao_id,
        pr.restricao,
        pr.recomendacoes,
        pr.data_validade             AS restricao_data_validade,
        pr.status_conclusao          AS restricao_status,
        pr.usuario_id                AS restricao_usuario_id,
        ${restricaoUsuarioAtualizacaoExpr} AS restricao_usuario_atualizacao,
        ${restricaoDataAtualizacaoExpr} AS restricao_data_atualizacao,
        ${restricaoUsuarioAtualizacaoNomeExpr} AS restricao_usuario_atualizacao_nome,
        ${restricaoUsuarioAtualizacaoRegistroExpr} AS restricao_usuario_atualizacao_registro,

        -- Dietas
        pd.id                        AS dieta_id,
        pd.tipo_dieta,
        pd.descricao,
        pd.data_fim,
        pd.status_conclusao          AS dieta_status,
        pd.usuario_id                AS dieta_usuario_id,
        pdu.nome                     AS dieta_usuario_nome,
        pdu.re                       AS dieta_usuario_registro,
        ${dietaUsuarioAtualizacaoExpr} AS dieta_usuario_atualizacao,
        ${dietaDataAtualizacaoExpr} AS dieta_data_atualizacao,
        ${dietaUsuarioAtualizacaoNomeExpr} AS dieta_usuario_atualizacao_nome,
        ${dietaUsuarioAtualizacaoRegistroExpr} AS dieta_usuario_atualizacao_registro,

        -- Suplementações
        ps.id                        AS suplementacao_id,
        ps.produto,
        ps.dose,
        ps.frequencia,
        ps.observacoes,
        ps.status_conclusao          AS suplementacao_status,
        ps.usuario_id                AS suplementacao_usuario_id,
        psu.nome                     AS suplementacao_usuario_nome,
        psu.re                       AS suplementacao_usuario_registro,
        ${suplementacaoUsuarioAtualizacaoExpr} AS suplementacao_usuario_atualizacao,
        ${suplementacaoDataAtualizacaoExpr} AS suplementacao_data_atualizacao,
        ${suplementacaoUsuarioAtualizacaoNomeExpr} AS suplementacao_usuario_atualizacao_nome,
        ${suplementacaoUsuarioAtualizacaoRegistroExpr} AS suplementacao_usuario_atualizacao_registro,

        -- Movimentações
        pm.id                        AS movimentacao_id,
        pm.motivo,
        ${movimentacaoOrigemExpr}    AS movimentacao_origem,
        pm.destino,
        ${movimentacaoDestinoFinalExpr} AS movimentacao_destino_final,
        pm.data_movimentacao,
        pm.status_conclusao          AS movimentacao_status,
        pm.usuario_id                AS movimentacao_usuario_id,
        pmu.nome                     AS movimentacao_usuario_nome,
        pmu.re                       AS movimentacao_usuario_registro,
        ${movimentacaoUsuarioAtualizacaoExpr} AS movimentacao_usuario_atualizacao,
        ${movimentacaoDataAtualizacaoExpr} AS movimentacao_data_atualizacao,
        ${movimentacaoUsuarioAtualizacaoNomeExpr} AS movimentacao_usuario_atualizacao_nome,
        ${movimentacaoUsuarioAtualizacaoRegistroExpr} AS movimentacao_usuario_atualizacao_registro,

        -- Vacinações
        pv.id                        AS vacinacao_id,
        pv.produto,
        pv.partida,
        pv.fabricacao,
        pv.lote,
        pv.dose,
        pv.data_inicio,
        pv.data_validade,
        pv.descricao,
        pv.data_fim,
        pv.status_conclusao          AS vacinacao_status,
        pv.usuario_id                AS vacinacao_usuario_id,
        pvu.nome                     AS vacinacao_usuario_nome,
        pvu.re                       AS vacinacao_usuario_registro,
        ${vacinacaoUsuarioAtualizacaoExpr} AS vacinacao_usuario_atualizacao,
        ${vacinacaoDataAtualizacaoExpr} AS vacinacao_data_atualizacao,
        ${vacinacaoUsuarioAtualizacaoNomeExpr} AS vacinacao_usuario_atualizacao_nome,
        ${vacinacaoUsuarioAtualizacaoRegistroExpr} AS vacinacao_usuario_atualizacao_registro,

        -- Vermifugações
        pver.id                      AS vermifugacao_id,
        pver.status_conclusao        AS vermifugacao_status,
        ${vermifugacaoUsuarioAtualizacaoExpr} AS vermifugacao_usuario_atualizacao,
        ${vermifugacaoDataAtualizacaoExpr} AS vermifugacao_data_atualizacao,
        ${vermifugacaoUsuarioAtualizacaoNomeExpr} AS vermifugacao_usuario_atualizacao_nome,
        ${vermifugacaoUsuarioAtualizacaoRegistroExpr} AS vermifugacao_usuario_atualizacao_registro,

        -- AIE & Mormo
        paie.id                      AS aiemormo_id,
        ${aiemormoStatusExpr}        AS aiemormo_status,

        -- Cirurgias
        pc.id                        AS cirurgia_id,
        ${cirurgiaStatusExpr}        AS cirurgia_status,

        COALESCE(
          pt.status_conclusao,
          pr.status_conclusao,
          pd.status_conclusao,
          ps.status_conclusao,
          pm.status_conclusao,
          pv.status_conclusao,
          pver.status_conclusao,
          ${cirurgiaStatusExpr},
          ${aiemormoStatusExpr}
        ) AS status_conclusao

      FROM prontuario_geral pg
      LEFT JOIN usuarios u              ON pg.usuarioId = u.id
      LEFT JOIN solipede s              ON pg.numero_solipede = s.numero
      LEFT JOIN prontuario_tratamentos pt ON pt.prontuario_id = pg.id
      LEFT JOIN usuarios ptuc           ON pt.usuario_conclusao_id = ptuc.id
      LEFT JOIN usuarios ptua           ON pt.usuario_atualizacao = ptua.id
      LEFT JOIN prontuario_restricoes pr ON pr.prontuario_id = pg.id
      ${restricoesCols.has("usuario_atualizacao") ? "LEFT JOIN usuarios prua           ON pr.usuario_atualizacao = prua.id" : ""}
      LEFT JOIN \`${dietas}\` pd        ON pd.prontuario_id = pg.id
      LEFT JOIN usuarios pdu            ON pd.usuario_id = pdu.id
      ${dietasCols.has("usuario_atualizacao") ? "LEFT JOIN usuarios pdua           ON pd.usuario_atualizacao = pdua.id" : ""}
      LEFT JOIN \`${suplementacoes}\` ps ON ps.prontuario_id = pg.id
      LEFT JOIN usuarios psu            ON ps.usuario_id = psu.id
      ${suplementacoesCols.has("usuario_atualizacao") ? "LEFT JOIN usuarios psua           ON ps.usuario_atualizacao = psua.id" : ""}
      LEFT JOIN \`${movimentacoes}\` pm ON pm.prontuario_id = pg.id
      LEFT JOIN usuarios pmu            ON pm.usuario_id = pmu.id
      ${movimentacoesCols.has("usuario_atualizacao") ? "LEFT JOIN usuarios pmua           ON pm.usuario_atualizacao = pmua.id" : ""}
      LEFT JOIN \`${vacinacoes}\` pv ON pv.prontuario_id = pg.id
      LEFT JOIN usuarios pvu            ON pv.usuario_id = pvu.id
      ${vacinacoesCols.has("usuario_atualizacao") ? "LEFT JOIN usuarios pvua           ON pv.usuario_atualizacao = pvua.id" : ""}
      LEFT JOIN \`${vermifugacoes}\` pver ON pver.prontuario_id = pg.id
      LEFT JOIN usuarios pveru           ON pver.usuario_id = pveru.id
      ${vermifugacoesCols.has("usuario_atualizacao") ? "LEFT JOIN usuarios pverua          ON pver.usuario_atualizacao = pverua.id" : ""}
      LEFT JOIN \`${aiemormo}\` paie ON paie.prontuario_id = pg.id
      LEFT JOIN \`${cirurgias}\` pc ON pc.prontuario_id = pg.id
      ORDER BY pg.data_criacao DESC`
    );

    console.log(`✅ Total: ${rows.length} registros`);
    console.log("═".repeat(80));
    return rows;
  }

  /**
    * Lista todos os registros do prontuario_geral de um solipede específico.
   */
  static async listarPorSolipede(numero) {
    console.log("═".repeat(80));
    console.log("🗄️  MODEL: NovoProntuario.listarPorSolipede()");
    console.log(`📊 Buscando prontuario_geral do solipede: ${numero}`);
    console.log("═".repeat(80));

    const {
      dietas,
      suplementacoes,
      movimentacoes,
      vacinacoes,
      vermifugacoes,
      aiemormo,
      cirurgias,
      dietasCols,
      suplementacoesCols,
      movimentacoesCols,
      restricoesCols,
      vacinacoesCols,
      vermifugacoesCols,
      aiemormoCols,
      cirurgiasCols,
    } = await this._resolverTabelasRelacionadas();

    const restricaoUsuarioAtualizacaoExpr = restricoesCols.has("usuario_atualizacao") ? "pr.usuario_atualizacao" : "NULL";
    const restricaoDataAtualizacaoExpr = restricoesCols.has("data_atualizacao") ? "pr.data_atualizacao" : "NULL";
    const restricaoUsuarioAtualizacaoNomeExpr = restricoesCols.has("usuario_atualizacao") ? "prua.nome" : "NULL";
    const restricaoUsuarioAtualizacaoRegistroExpr = restricoesCols.has("usuario_atualizacao") ? "prua.re" : "NULL";

    const dietaUsuarioAtualizacaoExpr = dietasCols.has("usuario_atualizacao") ? "pd.usuario_atualizacao" : "NULL";
    const dietaDataAtualizacaoExpr = dietasCols.has("data_atualizacao") ? "pd.data_atualizacao" : "NULL";
    const dietaUsuarioAtualizacaoNomeExpr = dietasCols.has("usuario_atualizacao") ? "pdua.nome" : "NULL";
    const dietaUsuarioAtualizacaoRegistroExpr = dietasCols.has("usuario_atualizacao") ? "pdua.re" : "NULL";

    const suplementacaoUsuarioAtualizacaoExpr = suplementacoesCols.has("usuario_atualizacao") ? "ps.usuario_atualizacao" : "NULL";
    const suplementacaoDataAtualizacaoExpr = suplementacoesCols.has("data_atualizacao") ? "ps.data_atualizacao" : "NULL";
    const suplementacaoUsuarioAtualizacaoNomeExpr = suplementacoesCols.has("usuario_atualizacao") ? "psua.nome" : "NULL";
    const suplementacaoUsuarioAtualizacaoRegistroExpr = suplementacoesCols.has("usuario_atualizacao") ? "psua.re" : "NULL";

    const movimentacaoUsuarioAtualizacaoExpr = movimentacoesCols.has("usuario_atualizacao") ? "pm.usuario_atualizacao" : "NULL";
    const movimentacaoDataAtualizacaoExpr = movimentacoesCols.has("data_atualizacao") ? "pm.data_atualizacao" : "NULL";
    const movimentacaoUsuarioAtualizacaoNomeExpr = movimentacoesCols.has("usuario_atualizacao") ? "pmua.nome" : "NULL";
    const movimentacaoUsuarioAtualizacaoRegistroExpr = movimentacoesCols.has("usuario_atualizacao") ? "pmua.re" : "NULL";
    const movimentacaoOrigemExpr = movimentacoesCols.has("origem") ? "pm.origem" : "NULL";
    const movimentacaoDestinoFinalExpr = movimentacoesCols.has("destino_final")
      ? "pm.destino_final"
      : movimentacoesCols.has("destinoFinal")
        ? "pm.destinoFinal"
        : movimentacoesCols.has("alocacao_final")
          ? "pm.alocacao_final"
          : "NULL";

    const vacinacaoUsuarioAtualizacaoExpr = vacinacoesCols.has("usuario_atualizacao") ? "pv.usuario_atualizacao" : "NULL";
    const vacinacaoDataAtualizacaoExpr = vacinacoesCols.has("data_atualizacao") ? "pv.data_atualizacao" : "NULL";
    const vacinacaoUsuarioAtualizacaoNomeExpr = vacinacoesCols.has("usuario_atualizacao") ? "pvua.nome" : "NULL";
    const vacinacaoUsuarioAtualizacaoRegistroExpr = vacinacoesCols.has("usuario_atualizacao") ? "pvua.re" : "NULL";

    const vermifugacaoUsuarioAtualizacaoExpr = vermifugacoesCols.has("usuario_atualizacao") ? "pver.usuario_atualizacao" : "NULL";
    const vermifugacaoDataAtualizacaoExpr = vermifugacoesCols.has("data_atualizacao") ? "pver.data_atualizacao" : "NULL";
    const vermifugacaoUsuarioAtualizacaoNomeExpr = vermifugacoesCols.has("usuario_atualizacao") ? "pverua.nome" : "NULL";
    const vermifugacaoUsuarioAtualizacaoRegistroExpr = vermifugacoesCols.has("usuario_atualizacao") ? "pverua.re" : "NULL";
    const aiemormoStatusExpr = aiemormoCols.has("status_conclusao")
      ? "paie.status_conclusao"
      : aiemormoCols.has("status")
        ? "paie.status"
        : "NULL";
    const cirurgiaStatusExpr = cirurgiasCols.has("status_conclusao")
      ? "pc.status_conclusao"
      : cirurgiasCols.has("status")
        ? "pc.status"
        : "NULL";

    const [rows] = await pool.query(
      `SELECT
        pg.id,
        pg.numero_solipede,
        pg.tipo,
        pg.usuarioId,
        pg.data_criacao,
        pg.data_atualizacao,
        DATE_FORMAT(pg.data_criacao, '%d/%m/%Y') AS data,
        DATE_FORMAT(pg.data_criacao, '%H:%i')    AS hora,

        -- Usuário criador
        u.nome   AS usuario_nome,
        u.re     AS usuario_registro,
        u.perfil AS usuario_perfil,
        u.email  AS usuario_email,

        -- Solípede
        s.nome      AS solipede_nome,
        s.esquadrao AS solipede_esquadrao,
        s.baia      AS solipede_baia,

        -- Tratamento
        pt.id                        AS tratamento_id,
        pt.diagnostico,
        pt.observacao_clinica,
        pt.prescricao,
        pt.precisa_baixar            AS tratamento_precisa_baixar,
        pt.foi_responsavel_pela_baixa,
        pt.status_conclusao          AS tratamento_status,
        pt.data_conclusao            AS tratamento_data_conclusao,
        ptuc.nome                    AS tratamento_usuario_conclusao_nome,
        ptuc.re                      AS tratamento_usuario_conclusao_registro,
        pt.usuario_atualizacao,
        pt.data_atualizacao          AS tratamento_data_atualizacao,
        ptua.nome                    AS tratamento_usuario_atualizacao_nome,
        ptua.re                      AS tratamento_usuario_atualizacao_registro,
        pt.usuario_id,
        pt.data_criacao               AS tratamento_data_criacao,

        -- Restrições
        pr.id                        AS restricao_id,
        pr.restricao,
        pr.recomendacoes,
        pr.data_validade             AS restricao_data_validade,
        pr.status_conclusao          AS restricao_status,
        pr.usuario_id                AS restricao_usuario_id,
        ${restricaoUsuarioAtualizacaoExpr} AS restricao_usuario_atualizacao,
        ${restricaoDataAtualizacaoExpr} AS restricao_data_atualizacao,
        ${restricaoUsuarioAtualizacaoNomeExpr} AS restricao_usuario_atualizacao_nome,
        ${restricaoUsuarioAtualizacaoRegistroExpr} AS restricao_usuario_atualizacao_registro,

        -- Dietas
        pd.id                        AS dieta_id,
        pd.tipo_dieta,
        pd.descricao,
        pd.data_fim,
        pd.status_conclusao          AS dieta_status,
        pd.usuario_id                AS dieta_usuario_id,
        pdu.nome                     AS dieta_usuario_nome,
        pdu.re                       AS dieta_usuario_registro,
        ${dietaUsuarioAtualizacaoExpr} AS dieta_usuario_atualizacao,
        ${dietaDataAtualizacaoExpr} AS dieta_data_atualizacao,
        ${dietaUsuarioAtualizacaoNomeExpr} AS dieta_usuario_atualizacao_nome,
        ${dietaUsuarioAtualizacaoRegistroExpr} AS dieta_usuario_atualizacao_registro,

        -- Suplementações
        ps.id                        AS suplementacao_id,
        ps.produto,
        ps.dose,
        ps.frequencia,
        ps.observacoes,
        ps.status_conclusao          AS suplementacao_status,
        ps.usuario_id                AS suplementacao_usuario_id,
        psu.nome                     AS suplementacao_usuario_nome,
        psu.re                       AS suplementacao_usuario_registro,
        ${suplementacaoUsuarioAtualizacaoExpr} AS suplementacao_usuario_atualizacao,
        ${suplementacaoDataAtualizacaoExpr} AS suplementacao_data_atualizacao,
        ${suplementacaoUsuarioAtualizacaoNomeExpr} AS suplementacao_usuario_atualizacao_nome,
        ${suplementacaoUsuarioAtualizacaoRegistroExpr} AS suplementacao_usuario_atualizacao_registro,

        -- Movimentações
        pm.id                        AS movimentacao_id,
        pm.motivo,
        ${movimentacaoOrigemExpr}    AS movimentacao_origem,
        pm.destino,
        ${movimentacaoDestinoFinalExpr} AS movimentacao_destino_final,
        pm.data_movimentacao,
        pm.status_conclusao          AS movimentacao_status,
        pm.usuario_id                AS movimentacao_usuario_id,
        pmu.nome                     AS movimentacao_usuario_nome,
        pmu.re                       AS movimentacao_usuario_registro,
        ${movimentacaoUsuarioAtualizacaoExpr} AS movimentacao_usuario_atualizacao,
        ${movimentacaoDataAtualizacaoExpr} AS movimentacao_data_atualizacao,
        ${movimentacaoUsuarioAtualizacaoNomeExpr} AS movimentacao_usuario_atualizacao_nome,
        ${movimentacaoUsuarioAtualizacaoRegistroExpr} AS movimentacao_usuario_atualizacao_registro,

        -- Vacinações
        pv.id                        AS vacinacao_id,
        pv.produto,
        pv.partida,
        pv.fabricacao,
        pv.lote,
        pv.dose,
        pv.data_inicio,
        pv.data_validade,
        pv.descricao,
        pv.data_fim,
        pv.status_conclusao          AS vacinacao_status,
        pv.usuario_id                AS vacinacao_usuario_id,
        pvu.nome                     AS vacinacao_usuario_nome,
        pvu.re                       AS vacinacao_usuario_registro,
        ${vacinacaoUsuarioAtualizacaoExpr} AS vacinacao_usuario_atualizacao,
        ${vacinacaoDataAtualizacaoExpr} AS vacinacao_data_atualizacao,
        ${vacinacaoUsuarioAtualizacaoNomeExpr} AS vacinacao_usuario_atualizacao_nome,
        ${vacinacaoUsuarioAtualizacaoRegistroExpr} AS vacinacao_usuario_atualizacao_registro,

        -- Vermifugações
        pver.id                      AS vermifugacao_id,
        pver.status_conclusao        AS vermifugacao_status,
        ${vermifugacaoUsuarioAtualizacaoExpr} AS vermifugacao_usuario_atualizacao,
        ${vermifugacaoDataAtualizacaoExpr} AS vermifugacao_data_atualizacao,
        ${vermifugacaoUsuarioAtualizacaoNomeExpr} AS vermifugacao_usuario_atualizacao_nome,
        ${vermifugacaoUsuarioAtualizacaoRegistroExpr} AS vermifugacao_usuario_atualizacao_registro,

        -- AIE & Mormo
        paie.id                      AS aiemormo_id,
        ${aiemormoStatusExpr}        AS aiemormo_status,

        -- Cirurgias
        pc.id                        AS cirurgia_id,
        ${cirurgiaStatusExpr}        AS cirurgia_status,

        COALESCE(
          pt.status_conclusao,
          pr.status_conclusao,
          pd.status_conclusao,
          ps.status_conclusao,
          pm.status_conclusao,
          pv.status_conclusao,
          pver.status_conclusao,
          ${cirurgiaStatusExpr},
          ${aiemormoStatusExpr}
        ) AS status_conclusao

      FROM prontuario_geral pg
      LEFT JOIN usuarios u              ON pg.usuarioId = u.id
      LEFT JOIN solipede s              ON pg.numero_solipede = s.numero
      LEFT JOIN prontuario_tratamentos pt ON pt.prontuario_id = pg.id
      LEFT JOIN usuarios ptuc           ON pt.usuario_conclusao_id = ptuc.id
      LEFT JOIN usuarios ptua           ON pt.usuario_atualizacao = ptua.id
      LEFT JOIN prontuario_restricoes pr ON pr.prontuario_id = pg.id
      ${restricoesCols.has("usuario_atualizacao") ? "LEFT JOIN usuarios prua           ON pr.usuario_atualizacao = prua.id" : ""}
      LEFT JOIN \`${dietas}\` pd        ON pd.prontuario_id = pg.id
      LEFT JOIN usuarios pdu            ON pd.usuario_id = pdu.id
      ${dietasCols.has("usuario_atualizacao") ? "LEFT JOIN usuarios pdua           ON pd.usuario_atualizacao = pdua.id" : ""}
      LEFT JOIN \`${suplementacoes}\` ps ON ps.prontuario_id = pg.id
      LEFT JOIN usuarios psu            ON ps.usuario_id = psu.id
      ${suplementacoesCols.has("usuario_atualizacao") ? "LEFT JOIN usuarios psua           ON ps.usuario_atualizacao = psua.id" : ""}
      LEFT JOIN \`${movimentacoes}\` pm ON pm.prontuario_id = pg.id
      LEFT JOIN usuarios pmu            ON pm.usuario_id = pmu.id
      ${movimentacoesCols.has("usuario_atualizacao") ? "LEFT JOIN usuarios pmua           ON pm.usuario_atualizacao = pmua.id" : ""}
      LEFT JOIN \`${vacinacoes}\` pv ON pv.prontuario_id = pg.id
      LEFT JOIN usuarios pvu            ON pv.usuario_id = pvu.id
      ${vacinacoesCols.has("usuario_atualizacao") ? "LEFT JOIN usuarios pvua           ON pv.usuario_atualizacao = pvua.id" : ""}
      LEFT JOIN \`${vermifugacoes}\` pver ON pver.prontuario_id = pg.id
      LEFT JOIN usuarios pveru           ON pver.usuario_id = pveru.id
      ${vermifugacoesCols.has("usuario_atualizacao") ? "LEFT JOIN usuarios pverua          ON pver.usuario_atualizacao = pverua.id" : ""}
      LEFT JOIN \`${aiemormo}\` paie ON paie.prontuario_id = pg.id
      LEFT JOIN \`${cirurgias}\` pc ON pc.prontuario_id = pg.id
      WHERE pg.numero_solipede = ?
      ORDER BY pg.data_criacao DESC`,
      [numero]
    );

    console.log(`✅ Total: ${rows.length} registros para solipede ${numero}`);
    console.log("═".repeat(80));
    return rows;
  }

  static async buscarPorId(id) {
    const { dietas, suplementacoes, movimentacoes, vacinacoes, vermifugacoes, aiemormo, cirurgias, aiemormoCols, cirurgiasCols } = await this._resolverTabelasRelacionadas();
    const aiemormoStatusExpr = aiemormoCols.has("status_conclusao")
      ? "paie.status_conclusao"
      : aiemormoCols.has("status")
        ? "paie.status"
        : "NULL";
    const cirurgiaStatusExpr = cirurgiasCols.has("status_conclusao")
      ? "pc.status_conclusao"
      : cirurgiasCols.has("status")
        ? "pc.status"
        : "NULL";

    const [rows] = await pool.query(
      `SELECT
        pg.id,
        pg.numero_solipede,
        pg.tipo,
        pg.usuarioId,
        pt.id AS tratamento_id,
        pt.precisa_baixar AS tratamento_precisa_baixar,
        pt.foi_responsavel_pela_baixa,
        pt.status_conclusao AS tratamento_status,
        pr.id AS restricao_id,
        pr.status_conclusao AS restricao_status,
        pd.id AS dieta_id,
        pd.status_conclusao AS dieta_status,
        ps.id AS suplementacao_id,
        ps.status_conclusao AS suplementacao_status,
        pm.id AS movimentacao_id,
        pm.status_conclusao AS movimentacao_status,
        pv.id AS vacinacao_id,
        pv.status_conclusao AS vacinacao_status,
        pver.id AS vermifugacao_id,
        pver.status_conclusao AS vermifugacao_status,
        pc.id AS cirurgia_id,
        ${cirurgiaStatusExpr} AS cirurgia_status,
        paie.id AS aiemormo_id,
        ${aiemormoStatusExpr} AS aiemormo_status,
        COALESCE(
          pt.status_conclusao,
          pr.status_conclusao,
          pd.status_conclusao,
          ps.status_conclusao,
          pm.status_conclusao,
          pv.status_conclusao,
          pver.status_conclusao,
          ${cirurgiaStatusExpr},
          ${aiemormoStatusExpr}
        ) AS status_conclusao
      FROM prontuario_geral pg
      LEFT JOIN prontuario_tratamentos pt ON pt.prontuario_id = pg.id
      LEFT JOIN prontuario_restricoes pr ON pr.prontuario_id = pg.id
      LEFT JOIN \`${dietas}\` pd ON pd.prontuario_id = pg.id
      LEFT JOIN \`${suplementacoes}\` ps ON ps.prontuario_id = pg.id
      LEFT JOIN \`${movimentacoes}\` pm ON pm.prontuario_id = pg.id
      LEFT JOIN \`${vacinacoes}\` pv ON pv.prontuario_id = pg.id
      LEFT JOIN \`${vermifugacoes}\` pver ON pver.prontuario_id = pg.id
      LEFT JOIN \`${cirurgias}\` pc ON pc.prontuario_id = pg.id
      LEFT JOIN \`${aiemormo}\` paie ON paie.prontuario_id = pg.id
      WHERE pg.id = ?`,
      [id]
    );

    return rows[0] || null;
  }

  static async excluirProntuarioGeral(id, db = pool) {
    const [result] = await db.query(
      `DELETE FROM prontuario_geral WHERE id = ?`,
      [id]
    );

    return result.affectedRows > 0;
  }

}

export default NovoProntuario;

