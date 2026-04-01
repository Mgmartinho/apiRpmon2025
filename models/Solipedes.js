import pool from "../config/mysqlConnect.js";
import bcrypt from "bcryptjs";
import ProntuarioMovimentacoes from "./ProntuarioMovimentacao.js";

class Solipede {
  /* ======================================================
     LISTAGEM
  ====================================================== */
  /* ======================================================
    LISTAGEM COM FILTRO OPCIONAL
 ====================================================== */
  static async listar(filtros = {}) {
    let sql = "SELECT * FROM solipede WHERE 1=1"; // Remover filtro de status já que deletamos fisicamente
    const params = [];

    if (filtros.alocacao) {
      sql += " AND alocacao = ?";
      params.push(filtros.alocacao);
    }

    const [rows] = await pool.query(sql, params);

    return rows.map((s) => ({
      ...s,
      DataNascimento: s.DataNascimento
        ? s.DataNascimento.toISOString().split("T")[0]
        : null,
    }));
  }


  static async buscarPorNumero(numero) {
    const [rows] = await pool.query(
      "SELECT * FROM solipede WHERE numero = ?",
      [numero]
    );

    if (!rows[0]) return null;

    const solipede = rows[0];

    if (solipede.DataNascimento) {
      solipede.DataNascimento =
        solipede.DataNascimento.toISOString().split("T")[0];
    }

    return solipede;
  }

  /* ======================================================
     CRUD
  ====================================================== */
  static async criar(data) {
    const microchipNormalizado =
      data.microchip !== undefined && data.microchip !== null && String(data.microchip).trim() !== ""
        ? String(data.microchip).trim()
        : null;

    const paletaDireitaNormalizada =
      data.paleta_direita !== undefined && data.paleta_direita !== null && String(data.paleta_direita).trim() !== ""
        ? String(data.paleta_direita).trim()
        : null;

    const sql = `
      INSERT INTO solipede
      (numero, nome, microchip, paleta_direita, DataNascimento, sexo, pelagem, movimentacao,
       alocacao, restricoes, status, origem, esquadrao, baia, cargaHoraria)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    const values = [
      data.numero,
      data.nome,
      microchipNormalizado,
      paletaDireitaNormalizada,
      data.DataNascimento,
      data.sexo,
      data.pelagem,
      data.movimentacao,
      data.alocacao,
      data.restricoes,
      data.status,
      data.origem,
      data.esquadrao,
      data.baia || null,
      data.cargaHoraria || 0,
    ];

    return pool.query(sql, values);
  }

  static async atualizar(numero, data) {
    const fields = Object.keys(data)
      .map((key) => `${key} = ?`)
      .join(", ");

    const values = [...Object.values(data), numero];

    return pool.query(
      `UPDATE solipede SET ${fields} WHERE numero = ?`,
      values
    );
  }

  // ⚠️ ATENÇÃO: Esta função deleta PERMANENTEMENTE sem histórico
  // Use excluirSolipede() para soft delete (recomendado)
  static async excluirPermanente(numero) {
    return pool.query("DELETE FROM solipede WHERE numero = ?", [numero]);
  }

  static async atualizarStatus(numero, status) {
    const [result] = await pool.query(
      `UPDATE solipede SET status = ? WHERE numero = ?`,
      [status, numero]
    );
    return result.affectedRows > 0;
  }

  static async atualizarAlocacao(numero, alocacao, db = pool) {
    const [result] = await db.query(
      `UPDATE solipede SET alocacao = ? WHERE numero = ?`,
      [alocacao, numero]
    );
    return result.affectedRows > 0;
  }

  /* ======================================================
     CARGA HORÁRIA — CONTROLE MENSAL
  ====================================================== */
  static getMesAtual() {
    const hoje = new Date();
    return `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(
      2,
      "0"
    )}`;
  }

  static async adicionarHoras(numero, horas, usuarioId, dataLancamentoInput) {
    // validação defensiva
    if (!numero || !horas) {
      throw new Error("Número e horas são obrigatórios");
    }

    if (!usuarioId) {
      console.warn("⚠️ Lançamento sem usuário identificado");
    }

    // determinar data de lançamento: usar fornecida (YYYY-MM-DD) ou NOW()
    let dataRef;
    if (dataLancamentoInput && typeof dataLancamentoInput === "string") {
      // garantir horário padronizado para evitar timezone
      const parsed = new Date(`${dataLancamentoInput}T00:00:00`);
      if (!isNaN(parsed.getTime())) {
        dataRef = parsed;
      } else {
        console.warn("⚠️ dataLancamento inválida, usando NOW():", dataLancamentoInput);
        dataRef = new Date();
      }
    } else {
      dataRef = new Date();
    }

    const mesAtual = dataRef.getMonth() + 1;
    const anoAtual = dataRef.getFullYear();
    const mesReferencia = `${anoAtual}-${String(mesAtual).padStart(2, "0")}`;

    // 1️⃣ inserir no histórico com usuarioId
    console.log("Inserindo histórico:", { numero, horas, usuarioId, tipo: typeof usuarioId });
    const usuarioIdNumerico = Number(usuarioId) || null;
    console.log("usuarioIdNumerico:", usuarioIdNumerico, "tipo:", typeof usuarioIdNumerico);
    // formatar data para MySQL DATETIME 'YYYY-MM-DD HH:MM:SS'
    const ano = dataRef.getFullYear();
    const mes = String(dataRef.getMonth() + 1).padStart(2, "0");
    const dia = String(dataRef.getDate()).padStart(2, "0");
    const hh = "00";
    const mm = "00";
    const ss = "00";
    const dataLancamentoMySQL = `${ano}-${mes}-${dia} ${hh}:${mm}:${ss}`;

    const params = [numero, Number(horas), dataLancamentoMySQL, mesReferencia, mesAtual, anoAtual, usuarioIdNumerico];
    console.log("Parametros do insert:", params);
    try {
      const result = await pool.query(
        `INSERT INTO historicoHoras 
   (solipedeNumero, horas, dataLancamento, mesReferencia, mes, ano, usuarioId)
   VALUES (?, ?, ?, ?, ?, ?, ?)`,
        params
      );
      console.log("Insert result:", result);
    } catch (insertError) {
      console.error("Erro no insert:", insertError);
      throw insertError;
    }


    // 2️⃣ recalcular total
    const [rows] = await pool.query(
      `SELECT SUM(horas) AS totalHoras
     FROM historicoHoras
     WHERE solipedeNumero = ?`,
      [numero]
    );

    const totalHoras = rows[0].totalHoras || 0;

    // 3️⃣ atualizar solípede
    await pool.query(
      `UPDATE solipede SET cargaHoraria = ? WHERE numero = ?`,
      [totalHoras, numero]
    );

    return totalHoras;
  }

  static async verificarSenhaUsuario(email, senhaFornecida) {
    const [rows] = await pool.query(
      "SELECT id, senha FROM usuarios WHERE email = ?",
      [email]
    );

    if (!rows.length) {
      throw new Error("Usuário não encontrado");
    }

    const usuario = rows[0];
    const senhaValida = await bcrypt.compare(senhaFornecida, usuario.senha);

    if (!senhaValida) {
      throw new Error("Senha incorreta");
    }

    return usuario.id;
  }


  /* ======================================================
     HISTÓRICO
  ====================================================== */
  static async buscarHistorico(numero) {
    const [rows] = await pool.query(
      `SELECT 
      h.id, 
      h.horas, 
      h.dataLancamento, 
      h.mesReferencia, 
      h.mes, 
      h.ano,
      h.usuarioId,
      u.nome as usuarioNome,
      u.email as usuarioEmail
     FROM historicoHoras h
     LEFT JOIN usuarios u ON h.usuarioId = u.id
     WHERE h.solipedeNumero = ?
     ORDER BY h.dataLancamento DESC`,
      [numero]
    );

    console.log("Historico rows:", rows);

    return rows;
  }


  static async buscarHistoricoPorMes(numero, mesReferencia) {
    const [rows] = await pool.query(
      `SELECT 
        h.id, 
        h.horas, 
        h.dataLancamento,
        h.usuarioId,
        u.nome as usuarioNome,
        u.email as usuarioEmail
       FROM historicoHoras h
       LEFT JOIN usuarios u ON h.usuarioId = u.id
       WHERE h.solipedeNumero = ? AND h.mesReferencia = ?
       ORDER BY h.dataLancamento DESC`,
      [numero, mesReferencia]
    );

    return rows;
  }

  /* ======================================================
     INDICADORES ANUAIS POR ESQUADRÃO
  ====================================================== */
  static async indicadoresAnuaisPorEsquadrao(anoAlvo) {
    const ano = Number(anoAlvo) || new Date().getFullYear();

    // Soma de horas por mês e esquadrão no ano informado
    const [agregadoHoras] = await pool.query(
      `SELECT 
         s.esquadrao AS esquadrao,
         COALESCE(h.mes, MONTH(h.dataLancamento)) AS mes,
         COALESCE(h.ano, YEAR(h.dataLancamento)) AS ano,
         SUM(h.horas) AS totalHoras
       FROM historicoHoras h
       INNER JOIN solipede s ON s.numero = h.solipedeNumero
       WHERE COALESCE(h.ano, YEAR(h.dataLancamento)) = ?
       GROUP BY s.esquadrao, COALESCE(h.ano, YEAR(h.dataLancamento)), COALESCE(h.mes, MONTH(h.dataLancamento))
       ORDER BY mes ASC`,
      [ano]
    );

    // Carga horária atual por esquadrão (tabela solipede)
    const [cargaAtualRows] = await pool.query(
      `SELECT esquadrao, SUM(cargaHoraria) AS cargaAtual
         FROM solipede
        GROUP BY esquadrao`
    );

    // Conjunto base de categorias conhecidas
    const categoriasBase = [
      "1 Esquadrao",
      "2 Esquadrao",
      "3 Esquadrao",
      "4 Esquadrao",
      "Equoterapia",
      "Representacao",
    ];

    // Garantir 12 meses com zeros
    const meses = Array.from({ length: 12 }, (_, idx) => {
      const mesNumero = idx + 1;
      const mesStr = `${ano}-${String(mesNumero).padStart(2, "0")}`;
      const linha = { mes: mesStr };
      categoriasBase.forEach((cat) => {
        linha[cat] = 0;
      });
      return linha;
    });

    // Alimentar valores vindos do banco
    agregadoHoras.forEach((row) => {
      const mesIdx = (row.mes || 1) - 1;
      const categoria = row.esquadrao || "Sem Esquadrao";

      // Se surgir categoria nova, adiciona ao dataset
      if (!categoriasBase.includes(categoria)) {
        categoriasBase.push(categoria);
        meses.forEach((linha) => {
          if (linha[categoria] === undefined) linha[categoria] = 0;
        });
      }

      if (meses[mesIdx]) {
        meses[mesIdx][categoria] = (meses[mesIdx][categoria] || 0) + (row.totalHoras || 0);
      }
    });

    return {
      ano,
      categorias: categoriasBase,
      meses,
      cargaAtualPorEsquadrao: cargaAtualRows,
    };
  }

  static async atualizarHistorico(id, horas) {
    // 1️⃣ Atualiza o lançamento
    await pool.query(
      "UPDATE historicoHoras SET horas = ? WHERE id = ?",
      [Number(horas), id]
    );

    // 2️⃣ Descobre qual solípede foi alterado
    const [[registro]] = await pool.query(
      "SELECT solipedeNumero FROM historicoHoras WHERE id = ?",
      [id]
    );

    if (!registro) return 0;

    const numero = registro.solipedeNumero;

    // 3️⃣ Recalcula o total
    const [[soma]] = await pool.query(
      "SELECT SUM(horas) AS totalHoras FROM historicoHoras WHERE solipedeNumero = ?",
      [numero]
    );

    const totalHoras = soma.totalHoras || 0;

    // 4️⃣ Atualiza tabela solipede
    await pool.query(
      "UPDATE solipede SET cargaHoraria = ? WHERE numero = ?",
      [totalHoras, numero]
    );

    return totalHoras;
  }

  /* ======================================================
     MOVIMENTAÇÃO EM LOTE (atualiza ALOCAÇÃO, não altera status)
  ====================================================== */
  static async atualizarMovimentacaoEmLote(numeros, novaAlocacao) {
    console.log("🔄 === INICIO atualizarMovimentacaoEmLote ===");
    console.log("📥 Parâmetros recebidos:");
    console.log("   - numeros:", numeros);
    console.log("   - novaAlocacao:", novaAlocacao);
    console.log("   - tipo novaAlocacao:", typeof novaAlocacao);
    console.log("   - novaAlocacao === null:", novaAlocacao === null);
    console.log("   - novaAlocacao === '':", novaAlocacao === "");
    console.log("   - novaAlocacao === undefined:", novaAlocacao === undefined);
    
    if (!Array.isArray(numeros) || numeros.length === 0) {
      throw new Error("Lista de solípedes vazia");
    }

    // Buscar alocacao atual
    const selectQuery = `SELECT numero, alocacao, status, esquadrao, origem FROM solipede WHERE numero IN (${numeros.map(() => '?').join(',')})`;
    console.log("📋 SELECT Query:", selectQuery);
    console.log("📋 SELECT Params:", numeros);
    
    const [rows] = await pool.query(selectQuery, numeros);
    
    console.log("📋 Dados ANTES do UPDATE:");
    rows.forEach(r => {
      console.log(`   Nº ${r.numero}: alocacao="${r.alocacao}", status="${r.status}", esquadrao="${r.esquadrao}", origem="${r.origem}"`);
    });
    
    // Mapa com dados completos (alocacao anterior)
    const dadosAnteriores = new Map(rows.map((r) => [r.numero, {
      alocacao_anterior: r.alocacao || 'Não definida'
    }]));

    // Determinar valor a ser salvo no campo alocacao
    if (!novaAlocacao || novaAlocacao === "") {
      throw new Error("Nova alocação é obrigatória");
    }
    
    console.log("✅ novaAlocacao tem valor - vai SALVAR:", novaAlocacao);
    
    const updateQuery = `UPDATE solipede SET alocacao = ? WHERE numero IN (${numeros.map(() => '?').join(',')})`;
    const updateParams = [novaAlocacao, ...numeros];
    
    console.log("🔧 UPDATE Query:", updateQuery);
    console.log("🔧 UPDATE Params:", updateParams);
    console.log("🔧 Valor que será salvo no campo alocacao:", novaAlocacao);
    
    try {
      const [result] = await pool.query(updateQuery, updateParams);
      console.log("✅ UPDATE executado!");
      console.log("   - affectedRows:", result.affectedRows);
      console.log("   - changedRows:", result.changedRows);
      console.log("   - info:", result.info);
      
      // Verificar depois do UPDATE
      const [rowsDepois] = await pool.query(selectQuery, numeros);
      console.log("📋 Dados DEPOIS do UPDATE:");
      rowsDepois.forEach(r => {
        console.log(`   Nº ${r.numero}: alocacao="${r.alocacao}", status="${r.status}", esquadrao="${r.esquadrao}", origem="${r.origem}"`);
      });
      
    } catch (err) {
      console.error("❌ ERRO no UPDATE:", err);
      throw err;
    }

    console.log("🔄 === FIM atualizarMovimentacaoEmLote ===\n");
    return dadosAnteriores; // mapa numero -> {alocacao_anterior}
  }

  static async registrarMovimentacoesProntuario(numeros, dadosAnteriores, novaAlocacao, dataMovimentacao, observacaoCustom, usuarioId) {
    console.log("📝 === registrarMovimentacoesProntuario ===");
    console.log("   - numeros:", numeros);
    console.log("   - dadosAnteriores size:", dadosAnteriores.size);
    console.log("   - dadosAnteriores:", Array.from(dadosAnteriores.entries()));
    console.log("   - novaAlocacao:", novaAlocacao);
    console.log("   - dataMovimentacao (recebida):", dataMovimentacao);
    console.log("   - tipo dataMovimentacao:", typeof dataMovimentacao);
    console.log("   - observacaoCustom:", observacaoCustom);
    console.log("   - usuarioId:", usuarioId);
    
    // Formatar a data para MySQL (YYYY-MM-DD HH:MM:SS)
    // Se vier apenas YYYY-MM-DD, adiciona 00:00:00
    let dataFormatada = dataMovimentacao;
    if (dataMovimentacao && dataMovimentacao.length === 10) {
      dataFormatada = `${dataMovimentacao} 00:00:00`;
      console.log("   - dataFormatada para MySQL:", dataFormatada);
    }
    
    const connection = await pool.getConnection();

    try {

      for (const numero of numeros) {
        // Normaliza tipo para garantir compatibilidade (string vs number)
        const dados = dadosAnteriores.get(numero)
          || dadosAnteriores.get(Number(numero))
          || dadosAnteriores.get(String(numero));
        console.log(`\n   📌 Processando nº ${numero}:`, dados);

        if (!dados) {
          console.warn(`   ⚠️ Nenhum dado anterior encontrado para nº ${numero}`);
          continue;
        }

        const alocacaoAnterior = dados.alocacao_anterior || null;
        const alocacaoNova = novaAlocacao;
        const motivoFinal = observacaoCustom ? observacaoCustom.trim() : null;

        console.log(`   - alocacaoAnterior: "${alocacaoAnterior}"`);
        console.log(`   - alocacaoNova: "${alocacaoNova}"`);
        console.log(`   📄 Motivo: ${motivoFinal}`);

        try {
          await connection.beginTransaction();

          const [resultProntuario] = await connection.query(
            `INSERT INTO prontuario_geral (numero_solipede, tipo, usuarioId, data_criacao, data_atualizacao)
             VALUES (?, 'Movimentação', ?, ?, ?)`,
            [numero, usuarioId, dataFormatada, dataFormatada]
          );

          // Usa o mesmo fluxo do lançamento individual para garantir
          // que tipo_movimentacao, origem, destino_final etc. sejam gravados corretamente
          await ProntuarioMovimentacoes.criar({
            prontuario_id: resultProntuario.insertId,
            usuario_id: usuarioId,
            tipo_movimentacao: "Movimentacao",
            motivo: motivoFinal,
            origem: alocacaoAnterior,
            destino: alocacaoNova,
            data_movimentacao: dataFormatada,
            status_conclusao: "em_andamento",
          }, connection);

          await connection.commit();
          console.log(`   ✅ Movimentação registrada! prontuario_id: ${resultProntuario.insertId}`);
        } catch (e) {
          await connection.rollback();
          console.error(`   ❌ Erro ao registrar movimentação no prontuário (${numero}):`, e);
          throw e;
        }
      }
    } finally {
      connection.release();
    }
    console.log("📝 === FIM registrarMovimentacoesProntuario ===\n");
  }

  static async listarFerrageamentosPublico() {
    const sql = `
      SELECT 
        f.id,
        f.solipede_numero,
        f.data_ferrageamento,
        f.prazo_validade,
        f.proximo_ferrageamento,
        f.tamanho_ferradura,
        f.responsavel,
        f.observacoes,
        s.nome as solipede_nome
      FROM ferrageamentos f
      LEFT JOIN solipede s ON f.solipede_numero = s.numero
      ORDER BY f.data_ferrageamento DESC
    `;

    console.log("🔧 Query listarFerrageamentosPublico");
    const [rows] = await pool.query(sql);
    console.log("🔧 Ferrageamentos retornados:", rows.length);
    return rows;
  }

  static async buscarHistoricoComUsuario(numero) {
    const sql = `
    SELECT 
      h.id,
      h.horas,
      h.dataLancamento,
      h.mesReferencia,
      h.mes,
      h.ano,
      h.usuarioId,
      u.nome AS usuarioNome,
      u.email AS usuarioEmail
    FROM historicoHoras h
    LEFT JOIN usuarios u ON h.usuarioId = u.id
    WHERE h.solipedeNumero = ?
    ORDER BY h.dataLancamento DESC
  `;

    const [rows] = await pool.query(sql, [numero]);
    return rows;
  }

  static async buscarUsuarioPorId(id) {
    const [[row]] = await pool.query(
      "SELECT id, email FROM usuarios WHERE id = ?",
      [id]
    );
    return row;
  }

  /* ======================================================
     EXCLUSÃO - ARQUIVA DADOS E REMOVE DA TABELA PRINCIPAL
  ====================================================== */
  static async excluirSolipede(numero, motivoExclusao, observacao, usuarioId, senha) {
    const connection = await pool.getConnection();
    const tableExists = async (tableName) => {
      const [rows] = await connection.query("SHOW TABLES LIKE ?", [tableName]);
      return rows.length > 0;
    };
    const getTableColumns = async (tableName) => {
      if (!tableName) return new Set();
      const [rows] = await connection.query(`SHOW COLUMNS FROM ${tableName}`);
      return new Set(rows.map((row) => row.Field));
    };
    const pickQualifiedField = (alias, columns, candidates) => {
      for (const field of candidates) {
        if (columns.has(field)) return `${alias}.${field}`;
      }
      return null;
    };
    const pickExistingTable = async (...tableNames) => {
      for (const tableName of tableNames) {
        if (await tableExists(tableName)) return tableName;
      }
      return null;
    };
    
    try {
      await connection.beginTransaction();
      console.log(`🗑️ Iniciando exclusão do solípede ${numero}...`);

      // 1. Buscar dados do solípede
      const [solipedes] = await connection.query(
        "SELECT * FROM solipede WHERE numero = ?",
        [numero]
      );

      if (!solipedes || solipedes.length === 0) {
        throw new Error("Solípede não encontrado");
      }

      const solipede = solipedes[0];
      console.log(`✅ Solípede encontrado: ${solipede.nome}`);

      // 2. Validar senha do usuário
      console.log(`🔍 Buscando usuário com ID: ${usuarioId}`);
      const [usuarios] = await connection.query(
        "SELECT id, senha, nome FROM usuarios WHERE id = ?",
        [usuarioId]
      );

      console.log(`📊 Usuários encontrados: ${usuarios.length}`);
      if (usuarios.length > 0) {
        console.log(`👤 Usuário: ${usuarios[0].nome} (ID: ${usuarios[0].id})`);
      }

      if (!usuarios || usuarios.length === 0) {
        throw new Error("Usuário não encontrado");
      }

      console.log(`🔐 Validando senha...`);
      const senhaValida = await bcrypt.compare(senha, usuarios[0].senha);
      console.log(`🔑 Senha válida: ${senhaValida}`);
      
      if (!senhaValida) {
        throw new Error("Senha incorreta");
      }
      console.log(`✅ Senha validada para usuário ${usuarioId}`);

      const tabelaDietas = await pickExistingTable("prontuario_dietas", "prontuario_dieta");
      const tabelaSuplementacoes = await pickExistingTable("prontuario_suplementacoes", "prontuario_suplementacao");
      const tabelaMovimentacoes = await pickExistingTable("prontuario_movimentacoes", "prontuario_movimentacao");

      const hasProntuarioGeral = await tableExists("prontuario_geral");
      const hasProntuarioTratamentos = await tableExists("prontuario_tratamentos");
      const hasProntuarioRestricoes = await tableExists("prontuario_restricoes");
      const hasSolipedesExcluidos = await tableExists("solipedes_excluidos");
      const hasProntuarioExcluido = await tableExists("prontuario_excluido");

      const hasFerrageamentos = await tableExists("ferrageamentos");
      const hasFerrageamentosExcluidos = await tableExists("ferrageamentos_excluidos");
      const hasHistoricoHoras = await tableExists("historicohoras");
      const hasHistoricoHorasExcluidos = await tableExists("historicohoras_excluidos");
      const hasHistoricoMov = await tableExists("historico_movimentacao");
      const hasHistoricoMovExcluidos = await tableExists("historico_movimentacao_excluidos");

      if (!hasSolipedesExcluidos) {
        throw new Error("Tabela solipedes_excluidos não encontrada");
      }

      // 3. Copiar solípede para tabela de excluídos
      const insertSolipedeSql = `
        INSERT INTO solipedes_excluidos (
          numero, nome, sexo, pelagem, raca, DataNascimento,
          origem, status, esquadrao, movimentacao, alocacao,
          motivo_exclusao, observacao, usuario_exclusao_id, data_exclusao
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())
      `;

      const [resultSolipede] = await connection.query(insertSolipedeSql, [
        solipede.numero,
        solipede.nome,
        solipede.sexo,
        solipede.pelagem,
        solipede.raca,
        solipede.DataNascimento,
        solipede.origem,
        solipede.status,
        solipede.esquadrao,
        solipede.movimentacao,
        solipede.alocacao,
        motivoExclusao,
        observacao || null,
        usuarioId,
      ]);

      const solipedeExcluidoId = resultSolipede.insertId;
      console.log(`✅ Solípede copiado para solipedes_excluidos (ID: ${solipedeExcluidoId})`);

      // 4. Copiar todos os prontuários do novo modelo para prontuario_excluido
      let prontuarios = [];
      if (hasProntuarioGeral) {
        if (!hasProntuarioExcluido) {
          throw new Error("Tabela prontuario_excluido não encontrada");
        }

        const colunasTratamentos = hasProntuarioTratamentos
          ? await getTableColumns("prontuario_tratamentos")
          : new Set();
        const colunasRestricoes = hasProntuarioRestricoes
          ? await getTableColumns("prontuario_restricoes")
          : new Set();
        const colunasDietas = tabelaDietas
          ? await getTableColumns(tabelaDietas)
          : new Set();
        const colunasSuplementacoes = tabelaSuplementacoes
          ? await getTableColumns(tabelaSuplementacoes)
          : new Set();
        const colunasMovimentacoes = tabelaMovimentacoes
          ? await getTableColumns(tabelaMovimentacoes)
          : new Set();

        const campoObsTratamento = pickQualifiedField("pt", colunasTratamentos, ["observacao_clinica", "observacao", "descricao"]);
        const campoObsRestricao = pickQualifiedField("pr", colunasRestricoes, ["restricao", "observacao", "descricao"]);
        const campoObsDieta = pickQualifiedField("pd", colunasDietas, ["descricao", "observacao", "observacoes", "recomendacoes"]);
        const campoObsSuplementacao = pickQualifiedField("ps", colunasSuplementacoes, ["descricao", "observacao", "observacoes", "recomendacoes", "produto"]);
        const campoObsMovimentacao = pickQualifiedField("pm", colunasMovimentacoes, ["motivo", "observacao", "observacoes", "descricao"]);

        const campoRecTratamento = pickQualifiedField("pt", colunasTratamentos, ["prescricao", "recomendacoes", "descricao"]);
        const campoRecRestricao = pickQualifiedField("pr", colunasRestricoes, ["recomendacoes", "observacao", "descricao"]);

        const campoDataValRestricao = pickQualifiedField("pr", colunasRestricoes, ["data_validade", "validade"]);
        const campoDataValDieta = pickQualifiedField("pd", colunasDietas, ["data_fim", "data_validade", "validade"]);
        const campoDataValSuplementacao = pickQualifiedField("ps", colunasSuplementacoes, ["data_fim", "data_validade", "validade"]);

        const campoStatusTratamento = pickQualifiedField("pt", colunasTratamentos, ["status_conclusao", "status"]);
        const campoStatusRestricao = pickQualifiedField("pr", colunasRestricoes, ["status_conclusao", "status"]);
        const campoStatusDieta = pickQualifiedField("pd", colunasDietas, ["status_conclusao", "status"]);
        const campoStatusSuplementacao = pickQualifiedField("ps", colunasSuplementacoes, ["status_conclusao", "status"]);
        const campoStatusMovimentacao = pickQualifiedField("pm", colunasMovimentacoes, ["status_conclusao", "status"]);

        const campoDataMov = pickQualifiedField("pm", colunasMovimentacoes, ["data_movimentacao", "data_lancamento", "created_at"]);
        const campoDestinoMov = pickQualifiedField("pm", colunasMovimentacoes, ["destino", "destino_final", "destinoFinal", "alocacao_final"]);
        const campoDataConclusaoTratamento = pickQualifiedField("pt", colunasTratamentos, ["data_conclusao"]);
        const campoUsuarioConclusaoTratamento = pickQualifiedField("pt", colunasTratamentos, ["usuario_conclusao_id"]);
        const campoFoiResponsavelBaixa = pickQualifiedField("pt", colunasTratamentos, ["foi_responsavel_pela_baixa"]);
        const campoPrecisaBaixar = pickQualifiedField("pt", colunasTratamentos, ["precisa_baixar"]);

        const selectObservacoes = [
          campoObsTratamento,
          campoObsRestricao,
          campoObsDieta,
          campoObsSuplementacao,
          campoObsMovimentacao,
        ].filter(Boolean);

        const selectRecomendacoes = [
          campoRecTratamento,
          campoRecRestricao,
        ].filter(Boolean);

        const selectDataValidade = [
          campoDataValRestricao,
          campoDataValDieta,
          campoDataValSuplementacao,
        ].filter(Boolean);

        const selectStatusConclusao = [
          campoStatusTratamento,
          campoStatusRestricao,
          campoStatusDieta,
          campoStatusSuplementacao,
          campoStatusMovimentacao,
        ].filter(Boolean);

        const coalesceOrNull = (fields) =>
          fields.length > 0 ? `COALESCE(${fields.join(", ")})` : "NULL";

        const [rows] = await connection.query(
          `SELECT
            pg.numero_solipede,
            pg.tipo,
            ${coalesceOrNull(selectObservacoes)} AS observacao,
            ${coalesceOrNull(selectRecomendacoes)} AS recomendacoes,
            pg.data_criacao,
            pg.data_atualizacao,
            pg.usuarioId,
            NULL AS status_baixa,
            NULL AS data_liberacao,
            NULL AS usuario_liberacao_id,
            NULL AS tipo_baixa,
            ${campoDataMov || "NULL"} AS data_lancamento,
            ${coalesceOrNull(selectDataValidade)} AS data_validade,
            ${coalesceOrNull(selectStatusConclusao)} AS status_conclusao,
            ${campoDataConclusaoTratamento || "NULL"} AS data_conclusao,
            ${campoUsuarioConclusaoTratamento || "NULL"} AS usuario_conclusao_id,
            NULL AS status_anterior,
            NULL AS status_novo,
            NULL AS usuario_atualizacao_id,
            ${campoFoiResponsavelBaixa || "NULL"} AS foi_responsavel_pela_baixa,
            ${campoPrecisaBaixar || "NULL"} AS precisa_baixar,
            NULL AS alocacao_anterior,
            ${campoDestinoMov || "NULL"} AS alocacao_nova,
            NULL AS origem,
            ${campoDestinoMov || "NULL"} AS destino,
            pg.id AS prontuario_geral_id
          FROM prontuario_geral pg
          ${hasProntuarioTratamentos ? "LEFT JOIN prontuario_tratamentos pt ON pt.prontuario_id = pg.id" : ""}
          ${hasProntuarioRestricoes ? "LEFT JOIN prontuario_restricoes pr ON pr.prontuario_id = pg.id" : ""}
          ${tabelaDietas ? `LEFT JOIN ${tabelaDietas} pd ON pd.prontuario_id = pg.id` : ""}
          ${tabelaSuplementacoes ? `LEFT JOIN ${tabelaSuplementacoes} ps ON ps.prontuario_id = pg.id` : ""}
          ${tabelaMovimentacoes ? `LEFT JOIN ${tabelaMovimentacoes} pm ON pm.prontuario_id = pg.id` : ""}
          WHERE pg.numero_solipede = ?`,
          [numero]
        );

        prontuarios = rows;
      }

      if (prontuarios.length > 0) {
        console.log(`📋 Copiando ${prontuarios.length} prontuários...`);
        
        for (const pront of prontuarios) {
          const insertProntuarioSql = `
            INSERT INTO prontuario_excluido (
              numero_solipede, tipo, observacao, recomendacoes, data_criacao,
              data_atualizacao, usuarioId, status_baixa, data_liberacao,
              usuario_liberacao_id, tipo_baixa, data_lancamento, data_validade,
              status_conclusao, data_conclusao, usuario_conclusao_id,
              status_anterior, status_novo, usuario_atualizacao_id,
              foi_responsavel_pela_baixa, precisa_baixar, alocacao_anterior,
              alocacao_nova, origem, destino, solipede_excluido_id, data_arquivamento
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())
          `;

          await connection.query(insertProntuarioSql, [
            pront.numero_solipede,
            pront.tipo,
            pront.observacao,
            pront.recomendacoes,
            pront.data_criacao,
            pront.data_atualizacao,
            pront.usuarioId,
            pront.status_baixa,
            pront.data_liberacao,
            pront.usuario_liberacao_id,
            pront.tipo_baixa,
            pront.data_lancamento,
            pront.data_validade,
            pront.status_conclusao,
            pront.data_conclusao,
            pront.usuario_conclusao_id,
            pront.status_anterior,
            pront.status_novo,
            pront.usuario_atualizacao_id,
            pront.foi_responsavel_pela_baixa,
            pront.precisa_baixar,
            pront.alocacao_anterior,
            pront.alocacao_nova,
            pront.origem,
            pront.destino,
            solipedeExcluidoId
          ]);
        }
        console.log(`✅ ${prontuarios.length} prontuários copiados para prontuario_excluido`);
      } else {
        console.log(`ℹ️  Nenhum prontuário encontrado para este solípede`);
      }

      // 5. Copiar ferrageamentos para ferrageamentos_excluidos
      const [ferrageamentos] = hasFerrageamentos
        ? await connection.query("SELECT * FROM ferrageamentos WHERE solipede_numero = ?", [numero])
        : [[]];

      if (ferrageamentos.length > 0 && hasFerrageamentosExcluidos) {
        console.log(`🔧 Copiando ${ferrageamentos.length} ferrageamentos...`);
        
        for (const ferr of ferrageamentos) {
          const insertFerrSql = `
            INSERT INTO ferrageamentos_excluidos (
              solipede_numero, data_ferrageamento, prazo_validade,
              tamanho_ferradura, proximo_ferrageamento, responsavel,
              observacoes, created_at, updated_at, solipede_excluido_id, data_arquivamento
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())
          `;

          await connection.query(insertFerrSql, [
            ferr.solipede_numero,
            ferr.data_ferrageamento,
            ferr.prazo_validade,
            ferr.tamanho_ferradura,
            ferr.proximo_ferrageamento,
            ferr.responsavel,
            ferr.observacoes,
            ferr.created_at,
            ferr.updated_at,
            solipedeExcluidoId
          ]);
        }
        console.log(`✅ ${ferrageamentos.length} ferrageamentos copiados`);
      } else if (ferrageamentos.length > 0) {
        console.warn("⚠️ Tabela ferrageamentos_excluidos não encontrada; mantendo ferrageamentos na tabela original.");
      }

      // 6. Copiar histórico de horas para historicohoras_excluidos
      const [historicoHoras] = hasHistoricoHoras
        ? await connection.query("SELECT * FROM historicohoras WHERE solipedeNumero = ?", [numero])
        : [[]];

      if (historicoHoras.length > 0 && hasHistoricoHorasExcluidos) {
        console.log(`⏱️ Copiando ${historicoHoras.length} registros de histórico de horas...`);
        
        for (const hora of historicoHoras) {
          const insertHoraSql = `
            INSERT INTO historicohoras_excluidos (
              solipedeNumero, horas, dataLancamento, mesReferencia,
              mes, ano, usuarioId, solipede_excluido_id, data_arquivamento
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW())
          `;

          await connection.query(insertHoraSql, [
            hora.solipedeNumero,
            hora.horas,
            hora.dataLancamento,
            hora.mesReferencia,
            hora.mes,
            hora.ano,
            hora.usuarioId,
            solipedeExcluidoId
          ]);
        }
        console.log(`✅ ${historicoHoras.length} registros de horas copiados`);
      } else if (historicoHoras.length > 0) {
        console.warn("⚠️ Tabela historicohoras_excluidos não encontrada; mantendo histórico de horas na tabela original.");
      }

      // 7. Copiar histórico de movimentação para historico_movimentacao_excluidos
      const [historicoMov] = hasHistoricoMov
        ? await connection.query("SELECT * FROM historico_movimentacao WHERE numero = ?", [numero])
        : [[]];

      if (historicoMov.length > 0 && hasHistoricoMovExcluidos) {
        console.log(`🚚 Copiando ${historicoMov.length} movimentações...`);
        
        for (const mov of historicoMov) {
          const insertMovSql = `
            INSERT INTO historico_movimentacao_excluidos (
              numero, dataMovimentacao, esquadraoOrigem, esquadraoDestino,
              usuarioId, solipede_excluido_id, data_arquivamento
            ) VALUES (?, ?, ?, ?, ?, ?, NOW())
          `;

          await connection.query(insertMovSql, [
            mov.numero,
            mov.dataMovimentacao,
            mov.esquadraoOrigem,
            mov.esquadraoDestino,
            mov.usuarioId,
            solipedeExcluidoId
          ]);
        }
        console.log(`✅ ${historicoMov.length} movimentações copiadas`);
      } else if (historicoMov.length > 0) {
        console.warn("⚠️ Tabela historico_movimentacao_excluidos não encontrada; mantendo histórico de movimentação na tabela original.");
      }

      // 8. Deletar prontuários do novo modelo
      if (prontuarios.length > 0) {
        if (hasProntuarioTratamentos) {
          await connection.query(
            `DELETE pt FROM prontuario_tratamentos pt
             INNER JOIN prontuario_geral pg ON pg.id = pt.prontuario_id
             WHERE pg.numero_solipede = ?`,
            [numero]
          );
        }
        if (hasProntuarioRestricoes) {
          await connection.query(
            `DELETE pr FROM prontuario_restricoes pr
             INNER JOIN prontuario_geral pg ON pg.id = pr.prontuario_id
             WHERE pg.numero_solipede = ?`,
            [numero]
          );
        }
        if (tabelaDietas) {
          await connection.query(
            `DELETE pd FROM ${tabelaDietas} pd
             INNER JOIN prontuario_geral pg ON pg.id = pd.prontuario_id
             WHERE pg.numero_solipede = ?`,
            [numero]
          );
        }
        if (tabelaSuplementacoes) {
          await connection.query(
            `DELETE ps FROM ${tabelaSuplementacoes} ps
             INNER JOIN prontuario_geral pg ON pg.id = ps.prontuario_id
             WHERE pg.numero_solipede = ?`,
            [numero]
          );
        }
        if (tabelaMovimentacoes) {
          await connection.query(
            `DELETE pm FROM ${tabelaMovimentacoes} pm
             INNER JOIN prontuario_geral pg ON pg.id = pm.prontuario_id
             WHERE pg.numero_solipede = ?`,
            [numero]
          );
        }
        await connection.query("DELETE FROM prontuario_geral WHERE numero_solipede = ?", [numero]);
        console.log(`🗑️ ${prontuarios.length} prontuários deletados do novo modelo`);
      }

      // 9. Deletar ferrageamentos da tabela original
      if (ferrageamentos.length > 0 && hasFerrageamentosExcluidos) {
        await connection.query("DELETE FROM ferrageamentos WHERE solipede_numero = ?", [numero]);
        console.log(`🗑️ ${ferrageamentos.length} ferrageamentos deletados da tabela original`);
      }

      // 10. Deletar histórico de horas da tabela original
      if (historicoHoras.length > 0 && hasHistoricoHorasExcluidos) {
        await connection.query("DELETE FROM historicohoras WHERE solipedeNumero = ?", [numero]);
        console.log(`🗑️ ${historicoHoras.length} registros de horas deletados da tabela original`);
      }

      // 11. Deletar histórico de movimentação da tabela original
      if (historicoMov.length > 0 && hasHistoricoMovExcluidos) {
        await connection.query("DELETE FROM historico_movimentacao WHERE numero = ?", [numero]);
        console.log(`🗑️ ${historicoMov.length} movimentações deletadas da tabela original`);
      }

      // 12. Deletar solípede da tabela original
      await connection.query("DELETE FROM solipede WHERE numero = ?", [numero]);
      console.log(`🗑️ Solípede ${numero} deletado da tabela principal`);

      await connection.commit();
      console.log(`✅ Exclusão concluída com sucesso!`);
      
      return { 
        success: true, 
        message: "Solípede excluído com sucesso",
        arquivados: {
          solipede: 1,
          prontuarios: prontuarios.length,
          ferrageamentos: ferrageamentos.length,
          historicoHoras: historicoHoras.length,
          movimentacoes: historicoMov.length
        }
      };
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }

  static async listarExcluidos() {
    // Buscar da tabela solipedes_excluidos (arquivamento)
    const sql = `
      SELECT 
        se.*,
        u.nome AS usuario_nome,
        u.email AS usuario_email
      FROM solipedes_excluidos se
      LEFT JOIN usuarios u ON se.usuario_exclusao_id = u.id
      ORDER BY se.data_exclusao DESC
    `;

    console.log("🔍 Executando query listarExcluidos...");
    const [rows] = await pool.query(sql);
    console.log(`📊 Total de excluídos encontrados: ${rows.length}`);
    
    if (rows.length > 0) {
      console.log("Primeiro excluído:", {
        numero: rows[0].numero,
        nome: rows[0].nome,
        status: rows[0].status,
        data_exclusao: rows[0].data_exclusao
      });
    }
    
    return rows.map((s) => ({
      ...s,
      DataNascimento: s.DataNascimento
        ? s.DataNascimento.toISOString().split("T")[0]
        : null,
    }));
  }

  // Buscar prontuários arquivados de um solípede excluído
  static async listarProntuarioExcluido(numero) {
    const sql = `
      SELECT 
        p.*,
        u1.nome AS usuario_nome,
        u1.email AS usuario_email,
        u2.nome AS usuario_liberacao_nome,
        u3.nome AS usuario_conclusao_nome,
        u4.nome AS usuario_atualizacao_nome
      FROM prontuario_excluido p
      LEFT JOIN usuarios u1 ON p.usuarioId = u1.id
      LEFT JOIN usuarios u2 ON p.usuario_liberacao_id = u2.id
      LEFT JOIN usuarios u3 ON p.usuario_conclusao_id = u3.id
      LEFT JOIN usuarios u4 ON p.usuario_atualizacao_id = u4.id
      WHERE p.numero_solipede = ?
      ORDER BY p.data_criacao DESC
    `;

    console.log(`📋 Buscando prontuários arquivados do solípede ${numero}...`);
    const [rows] = await pool.query(sql, [numero]);
    console.log(`✅ ${rows.length} prontuários arquivados encontrados`);
    
    return rows;
  }

  // Buscar ferrageamentos arquivados de um solípede excluído
  static async listarFerrageamentosExcluidos(numero) {
    const sql = `
      SELECT * FROM ferrageamentos_excluidos
      WHERE solipede_numero = ?
      ORDER BY data_ferrageamento DESC
    `;

    console.log(`🔧 Buscando ferrageamentos arquivados do solípede ${numero}...`);
    const [rows] = await pool.query(sql, [numero]);
    console.log(`✅ ${rows.length} ferrageamentos arquivados encontrados`);
    
    return rows;
  }

  static async atualizarStatus(numero, novoStatus, usuarioId) {
    const sql = `
      UPDATE solipede 
      SET status = ?, 
          usuario_atualizacao_id = ?,
          data_atualizacao = CURRENT_TIMESTAMP
      WHERE numero = ?
    `;
    const [resultado] = await pool.query(sql, [novoStatus, usuarioId, numero]);
    
    if (resultado.affectedRows === 0) {
      throw new Error(`Solípede ${numero} não encontrado`);
    }
    
    return resultado;
  }

}

export default Solipede;
