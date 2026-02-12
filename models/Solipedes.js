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
           VALUES (?, 'Movimentação', ?, ?, ?, ?, ?, ?, ?)`,
          [numero, observacaoCompleta, usuarioId, dataFormatada, alocacaoAnterior, alocacaoNova, alocacaoAnterior, alocacaoNova]
        );
        console.log(`   ✅ Prontuário inserido! insertId: ${result.insertId}, affectedRows: ${result.affectedRows}`);
        console.log(`   📅 Data usada (formatada): ${dataFormatada}`);
        
        // Verifica se realmente foi inserido
        const [verificacao] = await pool.query(
          `SELECT id, numero_solipede, tipo, data_criacao, DATE_FORMAT(data_criacao, '%Y-%m-%d %H:%i:%s') as data_formatada FROM prontuario WHERE id = ?`,
          [result.insertId]
        );
        console.log(`   🔍 Verificação do registro inserido:`, verificacao[0]);
        console.log(`   🔍 data_criacao salvo no banco: ${verificacao[0]?.data_criacao}`);
        console.log(`   🔍 data_criacao formatado: ${verificacao[0]?.data_formatada}`);
        
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
        numero_solipede, tipo, observacao, diagnosticos, recomendacoes, usuarioId,
        data_criacao, status_baixa, tipo_baixa, data_lancamento, data_validade, foi_responsavel_pela_baixa, precisa_baixar, origem, destino
      )
      VALUES (?, ?, ?, ?, ?, ?, NOW(), ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    console.log("💾 Model salvarProntuario - dados recebidos:", dados);

    const [resultado] = await pool.query(sql, [
      dados.numero_solipede,
      dados.tipo,
      dados.observacao,
      dados.diagnosticos || null,
      dados.recomendacoes,
      dados.usuario_id || null,
      dados.status_baixa || null,
      dados.tipo_baixa || null,
      dados.data_lancamento || null,
      dados.data_validade || null,
      dados.foi_responsavel_pela_baixa || 0,
      dados.precisa_baixar || null,
      dados.origem || null,
      dados.destino || null
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
        p.diagnosticos,
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
          p.origem,
          p.destino,
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
     EXCLUSÃO - ARQUIVA DADOS E REMOVE DA TABELA PRINCIPAL
  ====================================================== */
  static async excluirSolipede(numero, motivoExclusao, observacao, usuarioId, senha) {
    const connection = await pool.getConnection();
    
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

      // 4. Copiar todos os prontuários para prontuario_excluido
      const [prontuarios] = await connection.query(
        "SELECT * FROM prontuario WHERE numero_solipede = ?",
        [numero]
      );

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
      const [ferrageamentos] = await connection.query(
        "SELECT * FROM ferrageamentos WHERE solipede_numero = ?",
        [numero]
      );

      if (ferrageamentos.length > 0) {
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
      }

      // 6. Copiar histórico de horas para historicohoras_excluidos
      const [historicoHoras] = await connection.query(
        "SELECT * FROM historicohoras WHERE solipedeNumero = ?",
        [numero]
      );

      if (historicoHoras.length > 0) {
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
      }

      // 7. Copiar histórico de movimentação para historico_movimentacao_excluidos
      const [historicoMov] = await connection.query(
        "SELECT * FROM historico_movimentacao WHERE numero = ?",
        [numero]
      );

      if (historicoMov.length > 0) {
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
      }

      // 8. Deletar prontuários da tabela original
      if (prontuarios.length > 0) {
        await connection.query("DELETE FROM prontuario WHERE numero_solipede = ?", [numero]);
        console.log(`🗑️ ${prontuarios.length} prontuários deletados da tabela original`);
      }

      // 9. Deletar ferrageamentos da tabela original
      if (ferrageamentos.length > 0) {
        await connection.query("DELETE FROM ferrageamentos WHERE solipede_numero = ?", [numero]);
        console.log(`🗑️ ${ferrageamentos.length} ferrageamentos deletados da tabela original`);
      }

      // 10. Deletar histórico de horas da tabela original
      if (historicoHoras.length > 0) {
        await connection.query("DELETE FROM historicohoras WHERE solipedeNumero = ?", [numero]);
        console.log(`🗑️ ${historicoHoras.length} registros de horas deletados da tabela original`);
      }

      // 11. Deletar histórico de movimentação da tabela original
      if (historicoMov.length > 0) {
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
