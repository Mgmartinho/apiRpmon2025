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

  static async registrarMovimentacoesProntuario(numeros, dadosAnteriores, novaAlocacao, observacaoCustom, usuarioId) {
    console.log("📝 === registrarMovimentacoesProntuario ===");
    console.log("   - numeros:", numeros);
    console.log("   - dadosAnteriores size:", dadosAnteriores.size);
    console.log("   - dadosAnteriores:", Array.from(dadosAnteriores.entries()));
    console.log("   - novaAlocacao:", novaAlocacao);
    console.log("   - observacaoCustom:", observacaoCustom);
    console.log("   - usuarioId:", usuarioId);
    
    for (const numero of numeros) {
      const dados = dadosAnteriores.get(numero);
      console.log(`\n   📌 Processando nº ${numero}:`, dados);
      
      if (!dados) {
        console.warn(`   ⚠️ Nenhum dado anterior encontrado para nº ${numero}`);
        continue;
      }
      
      const alocacaoAnterior = dados.alocacao_anterior || 'Não definida';
      const alocacaoNova = novaAlocacao;
      
      console.log(`   - alocacaoAnterior: "${alocacaoAnterior}"`);
      console.log(`   - alocacaoNova: "${alocacaoNova}"`);
      
      // Monta observação: Alteração de Alocação (com quebras de linha)
      let observacaoCompleta = `Alocação alterada de "${alocacaoAnterior}" para "${alocacaoNova}"`;
      if (observacaoCustom) {
        observacaoCompleta += `\n\nDetalhes: ${observacaoCustom}`;
      }
      
      console.log(`   📄 Observação completa:\n${observacaoCompleta}`);
      
      try {
        console.log(`   🔄 Executando INSERT no prontuário...`);
        const [result] = await pool.query(
          `INSERT INTO prontuario (numero_solipede, tipo, observacao, usuarioId, data_criacao, alocacao_anterior, alocacao_nova, origem, destino)
           VALUES (?, 'Movimentação', ?, ?, NOW(), ?, ?, ?, ?)`,
          [numero, observacaoCompleta, usuarioId, alocacaoAnterior, alocacaoNova, alocacaoAnterior, alocacaoNova]
        );
        console.log(`   ✅ Prontuário inserido! insertId: ${result.insertId}, affectedRows: ${result.affectedRows}`);
        
        // Verifica se realmente foi inserido
        const [verificacao] = await pool.query(
          `SELECT * FROM prontuario WHERE id = ?`,
          [result.insertId]
        );
        console.log(`   🔍 Verificação do registro inserido:`, verificacao[0]);
        
      } catch (e) {
        console.error(`   ❌ Erro ao registrar movimentação no prontuário (${numero}):`, e);
        console.error(`   ❌ SQL Error code:`, e.code);
        console.error(`   ❌ SQL Error message:`, e.sqlMessage);
        throw e; // Re-throw para não silenciar o erro
      }
    }
    console.log("📝 === FIM registrarMovimentacoesProntuario ===\n");
  }

  /* ======================================================
     PRONTUÁRIO
  ====================================================== */
  static async salvarProntuario(dados) {
    const sql = `
      INSERT INTO prontuario (
        numero_solipede, tipo, observacao, recomendacoes, usuarioId, 
        data_criacao, status_baixa, tipo_baixa, data_lancamento, data_validade, foi_responsavel_pela_baixa, precisa_baixar
      )
      VALUES (?, ?, ?, ?, ?, NOW(), ?, ?, ?, ?, ?, ?)
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
      dados.data_validade || null,
      dados.foi_responsavel_pela_baixa || 0,
      dados.precisa_baixar || null
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
        p.data_atualizacao,
        p.data_validade,
        p.data_lancamento,
        p.status_baixa,
        p.data_liberacao,
        p.usuario_liberacao_id,
        p.tipo_baixa,
        p.status_conclusao,
        p.data_conclusao,
        p.usuario_conclusao_id,
        p.foi_responsavel_pela_baixa,
        p.precisa_baixar,
        p.usuarioId,
        u.id as usuario_id_check,
        u.nome as usuario_nome,
        u.re as usuario_registro,
        u.perfil as usuario_perfil,
        u.email as usuario_email,
        uc.nome as usuario_conclusao_nome,
        uc.re as usuario_conclusao_registro,
        ul.nome as usuario_liberacao_nome,
        ul.re as usuario_liberacao_registro
      FROM prontuario p
      LEFT JOIN usuarios u ON p.usuarioId = u.id
      LEFT JOIN usuarios uc ON p.usuario_conclusao_id = uc.id
      LEFT JOIN usuarios ul ON p.usuario_liberacao_id = ul.id
      WHERE p.numero_solipede = ?
      ORDER BY p.data_criacao DESC
    `;

    console.log("📖 Query listarProntuario para número:", numero);
    const [rows] = await pool.query(sql, [numero]);
    console.log("📖 Total de rows retornadas:", rows.length);
    
    // Debug: mostrar campo foi_responsavel_pela_baixa
    rows.forEach((row, index) => {
      if (row.tipo === "Tratamento") {
        console.log(`🔍 Model - Tratamento ${index}:`, {
          id: row.id,
          tipo: row.tipo,
          foi_responsavel_pela_baixa: row.foi_responsavel_pela_baixa,
          typeof_foi: typeof row.foi_responsavel_pela_baixa
        });
      }
    });
    
    return rows;
  }

  // Listar apenas RESTRIÇÕES (para rota pública)
  static async listarProntuarioRestricoes(numero) {
    const sql = `
      SELECT 
        p.id, 
        p.numero_solipede, 
        p.tipo, 
        p.observacao, 
        p.recomendacoes, 
        p.data_criacao,
        p.data_validade
      FROM prontuario p
      WHERE p.numero_solipede = ? 
        AND p.tipo = 'restrições'
        AND (p.status_conclusao IS NULL OR p.status_conclusao != 'concluido')
        AND (p.data_validade IS NULL OR p.data_validade >= CURDATE())
      ORDER BY p.data_criacao DESC
    `;

    console.log("📖 Query listarProntuarioRestricoes para número:", numero);
    const [rows] = await pool.query(sql, [numero]);
    console.log("📖 Restrições ATIVAS retornadas:", rows.length);
    return rows;
  }
  
  static async listarObservacoesGerais(numero) {
    const sql = `
      SELECT 
        p.id, 
        p.numero_solipede, 
        p.tipo, 
        p.observacao, 
        p.recomendacoes, 
        p.data_criacao
      FROM prontuario p
      WHERE p.numero_solipede = ? 
        AND p.tipo = 'Observações Comportamentais'
      ORDER BY p.data_criacao DESC
    `;

    console.log("📝 Query listarObservacoesGerais para número:", numero);
    const [rows] = await pool.query(sql, [numero]);
    console.log("📝 Observações Comportamentais retornadas:", rows.length);
    return rows;
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

  static async atualizarProntuario(id, dados) {
    // Construir UPDATE dinâmico apenas para campos fornecidos
    const campos = [];
    const valores = [];

    if (dados.observacao !== undefined) {
      campos.push('observacao = ?');
      valores.push(dados.observacao);
    }

    if (dados.recomendacoes !== undefined) {
      campos.push('recomendacoes = ?');
      // Tratar string vazia como null
      valores.push(dados.recomendacoes && dados.recomendacoes.trim() !== '' ? dados.recomendacoes : null);
    }

    // Apenas atualizar data_validade se for explicitamente fornecido
    if (dados.data_validade !== undefined) {
      campos.push('data_validade = ?');
      // Tratar string vazia como null
      valores.push(dados.data_validade && dados.data_validade.trim() !== '' ? dados.data_validade : null);
    }

    if (campos.length === 0) {
      throw new Error('Nenhum campo para atualizar');
    }

    valores.push(id);
    
    const sql = `
      UPDATE prontuario
      SET ${campos.join(', ')}
      WHERE id = ?
    `;

    console.log('📝 UPDATE dinâmico:', sql);
    console.log('📝 Valores:', valores);

    await pool.query(sql, valores);
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
