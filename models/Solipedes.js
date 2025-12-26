import pool from "../config/mysqlConnect.js";
import bcrypt from "bcryptjs";

class Solipede {
  /* ======================================================
     LISTAGEM
  ====================================================== */
  /* ======================================================
    LISTAGEM COM FILTRO OPCIONAL
 ====================================================== */
  static async listar(filtros = {}) {
    let sql = "SELECT * FROM solipede";
    const params = [];

    if (filtros.alocacao) {
      sql += " WHERE alocacao = ?";
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
    const sql = `
      INSERT INTO solipede
      (numero, nome, DataNascimento, sexo, pelagem, movimentacao,
       alocacao, restricoes, status, origem, esquadrao, cargaHoraria)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    const values = [
      data.numero,
      data.nome,
      data.DataNascimento,
      data.sexo,
      data.pelagem,
      data.movimentacao,
      data.alocacao,
      data.restricoes,
      data.status,
      data.origem,
      data.esquadrao,
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

  static async excluir(numero) {
    return pool.query("DELETE FROM solipede WHERE numero = ?", [numero]);
  }

  static async atualizarStatus(numero, status) {
    const [result] = await pool.query(
      `UPDATE solipede SET status = ? WHERE numero = ?`,
      [status, numero]
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

  static async adicionarHoras(numero, horas, usuarioId) {
    // validação defensiva
    if (!numero || !horas) {
      throw new Error("Número e horas são obrigatórios");
    }

    if (!usuarioId) {
      console.warn("⚠️ Lançamento sem usuário identificado");
    }

    const hoje = new Date();
    const mesAtual = hoje.getMonth() + 1;
    const anoAtual = hoje.getFullYear();
    const mesReferencia = `${anoAtual}-${String(mesAtual).padStart(2, "0")}`;

    // 1️⃣ inserir no histórico com usuarioId
    console.log("Inserindo histórico:", { numero, horas, usuarioId, tipo: typeof usuarioId });
    const usuarioIdNumerico = Number(usuarioId) || null;
    console.log("usuarioIdNumerico:", usuarioIdNumerico, "tipo:", typeof usuarioIdNumerico);
    const params = [numero, Number(horas), mesReferencia, mesAtual, anoAtual, usuarioIdNumerico];
    console.log("Parametros do insert:", params);
    try {
      const result = await pool.query(
        `INSERT INTO historicoHoras 
   (solipedeNumero, horas, dataLancamento, mesReferencia, mes, ano, usuarioId)
   VALUES (?, ?, NOW(), ?, ?, ?, ?)`,
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
     MOVIMENTAÇÃO EM LOTE (apenas movimentacao, não altera status)
  ====================================================== */
  static async atualizarMovimentacaoEmLote(numeros, novaMovimentacao) {
    console.log("🔄 === INICIO atualizarMovimentacaoEmLote ===");
    console.log("📥 Parâmetros recebidos:");
    console.log("   - numeros:", numeros);
    console.log("   - novaMovimentacao:", novaMovimentacao);
    console.log("   - tipo novaMovimentacao:", typeof novaMovimentacao);
    console.log("   - novaMovimentacao === null:", novaMovimentacao === null);
    console.log("   - novaMovimentacao === '':", novaMovimentacao === "");
    console.log("   - novaMovimentacao === undefined:", novaMovimentacao === undefined);
    
    if (!Array.isArray(numeros) || numeros.length === 0) {
      throw new Error("Lista de solípedes vazia");
    }

    // Buscar movimentacao e alocacao atual
    const selectQuery = `SELECT numero, movimentacao, alocacao, status, esquadrao, origem FROM solipede WHERE numero IN (${numeros.map(() => '?').join(',')})`;
    console.log("📋 SELECT Query:", selectQuery);
    console.log("📋 SELECT Params:", numeros);
    
    const [rows] = await pool.query(selectQuery, numeros);
    
    console.log("📋 Dados ANTES do UPDATE:");
    rows.forEach(r => {
      console.log(`   Nº ${r.numero}: movimentacao="${r.movimentacao}", alocacao="${r.alocacao}", status="${r.status}", esquadrao="${r.esquadrao}", origem="${r.origem}"`);
    });
    
    // Mapa com dados completos (movimentacao e alocacao)
    const dadosAnteriores = new Map(rows.map((r) => [r.numero, {
      movimentacao: r.movimentacao || null,
      alocacao: r.alocacao || 'Não informada'
    }]));

    // Determinar valor a ser salvo
    // Se for null, undefined ou string vazia → limpa (null)
    // Caso contrário → usa o valor fornecido
    let valorMovimentacao;
    if (novaMovimentacao === null || novaMovimentacao === undefined || novaMovimentacao === "") {
      valorMovimentacao = null;
      console.log("⚠️ novaMovimentacao está vazia/null - vai LIMPAR o campo no banco");
    } else {
      valorMovimentacao = novaMovimentacao;
      console.log("✅ novaMovimentacao tem valor - vai SALVAR:", valorMovimentacao);
    }
    
    const updateQuery = `UPDATE solipede SET movimentacao = ? WHERE numero IN (${numeros.map(() => '?').join(',')})`;
    const updateParams = [valorMovimentacao, ...numeros];
    
    console.log("🔧 UPDATE Query:", updateQuery);
    console.log("🔧 UPDATE Params:", updateParams);
    console.log("🔧 Valor que será salvo no campo movimentacao:", valorMovimentacao);
    
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
        console.log(`   Nº ${r.numero}: movimentacao="${r.movimentacao}", alocacao="${r.alocacao}", status="${r.status}", esquadrao="${r.esquadrao}", origem="${r.origem}"`);
      });
      
    } catch (err) {
      console.error("❌ ERRO no UPDATE:", err);
      throw err;
    }

    console.log("🔄 === FIM atualizarMovimentacaoEmLote ===\n");
    return dadosAnteriores; // mapa numero -> {movimentacao, alocacao}
  }

  static async registrarMovimentacoesProntuario(numeros, dadosAnteriores, novaMovimentacao, observacaoCustom, usuarioId) {
    console.log("📝 === registrarMovimentacoesProntuario ===");
    console.log("   - numeros:", numeros);
    console.log("   - dadosAnteriores size:", dadosAnteriores.size);
    console.log("   - novaMovimentacao:", novaMovimentacao);
    console.log("   - observacaoCustom:", observacaoCustom);
    
    for (const numero of numeros) {
      const dados = dadosAnteriores.get(numero);
      console.log(`   📌 Processando nº ${numero}:`, dados);
      
      if (!dados) {
        console.warn(`   ⚠️ Nenhum dado anterior encontrado para nº ${numero}`);
        continue;
      }
      
      const movAnterior = dados.movimentacao || 'Sem movimentação';
      const alocacao = dados.alocacao;
      const destino = novaMovimentacao || '(removido)';
      
      console.log(`   - movAnterior: "${movAnterior}"`);
      console.log(`   - alocacao: "${alocacao}"`);
      console.log(`   - destino: "${destino}"`);
      
      // Monta observação: Alocação + Movimentação (com quebras de linha)
      let observacaoCompleta = `Alocação: ${alocacao}\n\nMovimentação: ${movAnterior} → ${destino}`;
      if (observacaoCustom) {
        observacaoCompleta += `\n\nDetalhes: ${observacaoCustom}`;
      }
      
      console.log(`   📄 Observação completa:\n${observacaoCompleta}`);
      
      try {
        await this.salvarProntuario({
          numero_solipede: numero,
          tipo: 'Movimentação',
          observacao: observacaoCompleta,
          recomendacoes: null,
          usuario_id: usuarioId || null,
        });
      } catch (e) {
        console.error(`Erro ao registrar movimentação no prontuário (${numero}):`, e.message);
      }
    }
  }

  /* ======================================================
     PRONTUÁRIO
  ====================================================== */
  static async salvarProntuario(dados) {
    const sql = `
      INSERT INTO prontuario (
        numero_solipede, tipo, observacao, recomendacoes, usuarioId, 
        data_criacao, status_baixa, tipo_baixa, data_lancamento, data_validade
      )
      VALUES (?, ?, ?, ?, ?, NOW(), ?, ?, ?, ?)
    `;

    console.log("💾 Model salvarProntuario - dados recebidos:", dados);

    const [resultado] = await pool.query(sql, [
      dados.numero_solipede,
      dados.tipo,
      dados.observacao,
      dados.recomendacoes,
      dados.usuario_id || null,
      dados.status_baixa || null,
      dados.tipo_baixa || null,
      dados.data_lancamento || null,
      dados.data_validade || null
    ]);

    console.log("💾 INSERT executado, insertId:", resultado.insertId);
    return resultado.insertId;
  }

  static async listarProntuario(numero) {
    const sql = `
      SELECT 
        p.id, 
        p.numero_solipede, 
        p.tipo, 
        p.observacao, 
        p.recomendacoes, 
        p.data_criacao,
        p.usuarioId,
        u.id as usuario_id_check,
        u.nome as usuario_nome,
        u.re as usuario_registro,
        u.perfil as usuario_perfil,
        u.email as usuario_email
      FROM prontuario p
      LEFT JOIN usuarios u ON p.usuarioId = u.id
      WHERE p.numero_solipede = ?
      ORDER BY p.data_criacao DESC
    `;

    console.log("📖 Query listarProntuario para número:", numero);
    const [rows] = await pool.query(sql, [numero]);
    console.log("📖 Rows retornadas:", JSON.stringify(rows, null, 2));
    return rows;
  }

  static async atualizarProntuario(id, dados) {
    const sql = `
      UPDATE prontuario
      SET tipo = ?, observacao = ?, recomendacoes = ?
      WHERE id = ?
    `;

    await pool.query(sql, [dados.tipo, dados.observacao, dados.recomendacoes, id]);
  }

  static async deletarProntuario(id) {
    const sql = `DELETE FROM prontuario WHERE id = ?`;
    await pool.query(sql, [id]);
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
     EXCLUSÃO (SOFT DELETE) - MOVE PARA HISTÓRICO
  ====================================================== */
  static async excluirSolipede(numero, motivoExclusao, usuarioId, senha) {
    const connection = await pool.getConnection();
    
    try {
      await connection.beginTransaction();

      // 1. Buscar dados do solípede
      const [solipedes] = await connection.query(
        "SELECT * FROM solipede WHERE numero = ?",
        [numero]
      );

      if (!solipedes || solipedes.length === 0) {
        throw new Error("Solípede não encontrado");
      }

      const solipede = solipedes[0];

      // 2. Validar senha do usuário
      const [usuarios] = await connection.query(
        "SELECT senha FROM usuarios WHERE id = ?",
        [usuarioId]
      );

      if (!usuarios || usuarios.length === 0) {
        throw new Error("Usuário não encontrado");
      }

      const senhaValida = await bcrypt.compare(senha, usuarios[0].senha);
      if (!senhaValida) {
        throw new Error("Senha incorreta");
      }

      // 3. Inserir na tabela de excluídos
      const insertSql = `
        INSERT INTO solipedes_excluidos (
          numero, nome, sexo, pelagem, raca, DataNascimento,
          origem, status, esquadrao, movimentacao, alocacao,
          motivo_exclusao, usuario_exclusao_id
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `;

      await connection.query(insertSql, [
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
        usuarioId,
      ]);

      // 4. Deletar da tabela principal (CASCADE deleta prontuário e histórico)
      await connection.query("DELETE FROM solipede WHERE numero = ?", [numero]);

      await connection.commit();
      return { success: true, message: "Solípede excluído com sucesso" };
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }

  static async listarExcluidos() {
    const sql = `
      SELECT 
        se.*,
        u.nome AS usuario_nome,
        u.email AS usuario_email
      FROM solipedes_excluidos se
      LEFT JOIN usuarios u ON se.usuario_exclusao_id = u.id
      ORDER BY se.data_exclusao DESC
    `;

    const [rows] = await pool.query(sql);
    
    return rows.map((s) => ({
      ...s,
      DataNascimento: s.DataNascimento
        ? s.DataNascimento.toISOString().split("T")[0]
        : null,
    }));
  }

}

export default Solipede;
