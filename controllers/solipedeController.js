import Solipede from "../models/Solipedes.js";
import pool from "../config/mysqlConnect.js";

class SolipedeController {

  // ===== CRUD =====
static async listar(req, res, next) {
  try {
    const { alocacao } = req.query;

    const dados = await Solipede.listar({
      alocacao
    });

    res.status(200).json(dados);
  } catch (err) {
    next(err);
  }
}

  static async obterPorNumero(req, res, next) {
    try {
      const { numero } = req.params;
      const dado = await Solipede.buscarPorNumero(numero);
      if (!dado) return res.status(404).json({ message: "Não encontrado" });
      res.status(200).json(dado);
    } catch (err) {
      next(err);
    }
  }

  static async criar(req, res, next) {
    try {
      await Solipede.criar(req.body);
      res.status(201).json({ message: "Criado com sucesso" });
    } catch (err) {
      next(err);
    }
  }

  static async atualizar(req, res, next) {
    try {
      const { numero } = req.params;
      const { senha, usuarioId, esquadrao, esquadraoOrigem } = req.body;

      // Se está tentando alterar esquadrão, validar senha
      if (esquadrao && senha && usuarioId) {
        console.log("🔄 Movimentação de esquadrão detectada");
        console.log("   Dados:", { numero, esquadrao, esquadraoOrigem, usuarioId });
        
        const usuario = req.usuario;
        if (!usuario || !usuario.email) {
          return res.status(401).json({ error: "Usuário não autenticado" });
        }

        if (usuario.id !== usuarioId) {
          return res.status(403).json({ error: "ID do usuário não corresponde" });
        }

        // Validar senha
        await Solipede.verificarSenhaUsuario(usuario.email, senha);
        console.log("✅ Senha validada");
        
        // Atualizar apenas o esquadrão
        const [updateResult] = await pool.query(
          "UPDATE solipede SET esquadrao = ? WHERE numero = ?",
          [esquadrao, numero]
        );
        console.log("✅ Esquadrão atualizado:", updateResult);

        // Registrar histórico de movimentação
        try {
          const [insertResult] = await pool.query(
            `INSERT INTO historico_movimentacao 
             (numero, esquadraoOrigem, esquadraoDestino, usuarioId, dataMovimentacao) 
             VALUES (?, ?, ?, ?, NOW())`,
            [numero, esquadraoOrigem, esquadrao, usuarioId]
          );
          console.log("✅ Histórico registrado:", insertResult);
        } catch (err) {
          console.error("❌ Erro ao registrar histórico:", err);
          console.error("   Detalhes:", err.message);
          console.error("   SQL State:", err.sqlState);
          console.error("   SQL Message:", err.sqlMessage);
        }

        console.log(`✅ Solípede ${numero} movimentado para ${esquadrao}`);
        return res.status(200).json({ message: "Movimentação realizada com sucesso" });
      }

      // Atualização normal sem validação de senha
      await Solipede.atualizar(numero, req.body);
      res.status(200).json({ message: "Atualizado com sucesso" });
    } catch (err) {
      if (err.message === "Senha incorreta") {
        return res.status(401).json({ error: "Senha incorreta" });
      }
      next(err);
    }
  }

  // ⚠️ ATENÇÃO: Esta função deleta PERMANENTEMENTE sem histórico
  // Use excluirSolipede() para soft delete (recomendado)
  static async excluirPermanente(req, res, next) {
    try {
      const { numero } = req.params;
      await Solipede.excluirPermanente(numero);
      res.status(200).json({ message: "Removido permanentemente" });
    } catch (err) {
      next(err);
    }
  }
static async adicionarHoras(req, res) {
  try {
    const { numero, horas, senha, usuarioId } = req.body;

    console.log("🔥 RECEBIDO adicionarHoras:", { numero, horas, senha, usuarioId });
    console.log("Tipo usuarioId:", typeof usuarioId, "Valor:", usuarioId);
    console.log("Usuario do token:", req.usuario);

    if (!numero || horas === undefined || !senha || !usuarioId) {
      console.log("❌ Validação falhou:", { numero: !!numero, horas: horas !== undefined, senha: !!senha, usuarioId: !!usuarioId });
      return res.status(400).json({
        error: "Número, horas, senha e usuarioId são obrigatórios",
      });
    }

    // 🔐 usuário vindo DO TOKEN
    const usuario = req.usuario;

    if (!usuario || !usuario.email || !usuario.id) {
      console.log("Usuario inválido:", usuario);
      return res.status(401).json({ error: "Usuário não autenticado" });
    }

    // Verificar se o usuarioId do body é o mesmo do token
    console.log("Comparando usuario.id:", usuario.id, "tipo:", typeof usuario.id, "com usuarioId:", usuarioId, "tipo:", typeof usuarioId);
    if (usuario.id !== usuarioId) {
      console.log("❌ usuario.id !== usuarioId");
      return res.status(403).json({ error: "ID do usuário não corresponde" });
    }
    console.log("✅ usuario.id === usuarioId");

    // 1️⃣ validar senha do usuário LOGADO
    console.log("Validando senha para email:", usuario.email);
    await Solipede.verificarSenhaUsuario(
      usuario.email,
      senha
    );
    console.log("Senha validada com sucesso");

    // 2️⃣ lançar horas COM ID DO BODY
    console.log("Lançando horas com usuarioId:", usuarioId);
    const totalHoras = await Solipede.adicionarHoras(
      numero,
      Number(horas),
      usuarioId
    );

    console.log("Horas lançadas, total:", totalHoras);

    return res.status(200).json({
      success: true,
      totalHoras,
      message: "Lançamento realizado com sucesso",
    });
  } catch (err) {
    console.error("Erro ao adicionar horas:", err);

    if (err.message === "Senha incorreta") {
      return res.status(401).json({ error: "Senha incorreta" });
    }

    return res.status(500).json({ error: err.message });
  }
}

  // ===== Histórico =====
  static async historicoHoras(req, res) {
  try {
    const { numero } = req.params;

    // Buscar histórico com nome do usuário
    const historico = await Solipede.buscarHistorico(numero);

    res.status(200).json(historico);
  } catch (err) {
    console.error("Erro histórico:", err);
    res.status(500).json({ error: "Erro ao buscar histórico" });
  }
}


  static async historicoMensal(req, res) {
    try {
      const { numero } = req.params;
      const [rows] = await Solipede.buscarHistoricoPorMes(numero);
      res.status(200).json(rows);
    } catch (err) {
      console.error("Erro histórico mensal:", err);
      res.status(500).json({ error: "Erro ao buscar histórico mensal" });
    }
  }

  // ===== Indicadores anuais por esquadrão (publico) =====
  static async indicadoresAnuais(req, res) {
    try {
      const { ano } = req.query;
      const resultado = await Solipede.indicadoresAnuaisPorEsquadrao(ano);
      return res.status(200).json(resultado);
    } catch (err) {
      console.error("Erro indicadores anuais:", err);
      return res.status(500).json({ error: "Erro ao buscar indicadores anuais" });
    }
  }

  static async atualizarHistorico(req, res) {
    try {
      const { id } = req.params;
      const { horas } = req.body;

      if (horas === undefined || horas === null) {
        return res.status(400).json({ error: "Horas são obrigatórias" });
      }

      const totalHoras = await Solipede.atualizarHistorico(id, horas);
      res.status(200).json({ success: true, totalHoras });
    } catch (err) {
      console.error("Erro atualizar histórico:", err);
      res.status(500).json({ error: "Erro ao atualizar histórico" });
    }
  }

  // ===== Movimentação em lote (apenas movimentacao, não altera status) =====
  static async movimentacaoEmLote(req, res) {
    try {
      console.log("\n🎯 === CONTROLLER movimentacaoEmLote CHAMADO ===");
      console.log("📦 req.body completo:", req.body);
      
      const { numeros, novaMovimentacao, observacao, senha } = req.body;
      const usuario = req.usuario;

      console.log("📥 Dados extraídos do body:");
      console.log("   - numeros:", numeros);
      console.log("   - novaMovimentacao:", novaMovimentacao);
      console.log("   - tipo novaMovimentacao:", typeof novaMovimentacao);
      console.log("   - novaMovimentacao === null:", novaMovimentacao === null);
      console.log("   - novaMovimentacao === '':", novaMovimentacao === "");
      console.log("   - length:", novaMovimentacao?.length);
      console.log("   - observacao:", observacao);
      console.log("   - senha:", senha ? "****" : "não informada");
      console.log("   - usuario:", usuario);

      if (!usuario || !usuario.email || !usuario.id) {
        return res.status(401).json({ error: "Usuário não autenticado" });
      }
      if (!Array.isArray(numeros) || numeros.length === 0) {
        return res.status(400).json({ error: "Seleção de solípedes vazia" });
      }
      if (!senha) {
        return res.status(400).json({ error: "Senha é obrigatória" });
      }

      console.log("✅ Validações passaram, verificando senha...");
      await Solipede.verificarSenhaUsuario(usuario.email, senha);
      console.log("✅ Senha validada!");

      console.log("🔄 Chamando atualizarMovimentacaoEmLote...");
      const dadosAnteriores = await Solipede.atualizarMovimentacaoEmLote(
        numeros,
        novaMovimentacao
      );
      
      console.log("📝 Chamando registrarMovimentacoesProntuario...");
      await Solipede.registrarMovimentacoesProntuario(
        numeros,
        dadosAnteriores,
        novaMovimentacao,
        observacao,
        usuario.id
      );

      console.log("✅ Movimentação concluída com sucesso!");
      console.log("🎯 === FIM CONTROLLER ===\n");
      return res.status(200).json({ success: true, count: numeros.length });
    } catch (err) {
      console.error("❌ ERRO no controller:", err);
      if (err.message === "Senha incorreta") {
        return res.status(401).json({ error: "Senha incorreta" });
      }
      return res.status(500).json({ error: err.message });
    }
  }

  // ===== Prontuário =====
  static async salvarProntuario(req, res) {
    try {
      const { numero_solipede, tipo, observacao, recomendacoes, tipo_baixa, data_lancamento, data_validade } = req.body;
      const usuarioId = req.usuario?.id;

      console.log("\n📝 CONTROLLER: salvarProntuario");
      console.log("   Dados do body:", { numero_solipede, tipo, observacao: observacao?.substring(0, 30) + "...", tipo_baixa });
      console.log("   req.usuario completo:", req.usuario);
      console.log("   usuarioId extraído:", usuarioId, "Tipo:", typeof usuarioId);

      if (!numero_solipede || !observacao) {
        console.log("❌ Validação falhou - faltam dados obrigatórios");
        return res.status(400).json({ error: "Número do solípede e observação são obrigatórios" });
      }

      if (!usuarioId) {
        console.log("⚠️ AVISO: usuarioId não foi encontrado!");
      }

      console.log("   Salvando prontuário com usuarioId:", usuarioId);

      const resultado = await Solipede.salvarProntuario({
        numero_solipede,
        tipo: tipo || "Observação Geral",
        observacao,
        recomendacoes: recomendacoes || null,
        usuario_id: usuarioId || null,
        tipo_baixa: tipo_baixa || null,
        data_lancamento: data_lancamento || null,
        data_validade: data_validade || null,
        // Se for tipo "Baixa", marca como pendente
        status_baixa: tipo === "Baixa" ? "pendente" : null
      });

      // Se for tipo "Baixa", atualizar status do solípede
      if (tipo === "Baixa") {
        const novoStatus = tipo_baixa === "Baixa Eterna" 
          ? "Baixado - Baixa Eterna" 
          : "Baixado";
        
        await Solipede.atualizarStatus(numero_solipede, novoStatus);
        console.log(`✅ Status do solípede ${numero_solipede} atualizado para: ${novoStatus}`);
      }

      console.log("✅ Prontuário salvo com sucesso! ID:", resultado);

      res.status(201).json({ 
        success: true, 
        id: resultado,
        usuario_id: usuarioId,
        message: "Prontuário salvo com sucesso" 
      });
    } catch (err) {
      console.error("❌ Erro ao salvar prontuário:", err);
      res.status(500).json({ error: "Erro ao salvar prontuário" });
    }
  }

  static async listarProntuario(req, res) {
    try {
      const { numero } = req.params;
      console.log("📖 Listando prontuário para número:", numero);
      const prontuarios = await Solipede.listarProntuario(numero);
      console.log("📖 Prontuários retornados:", prontuarios);
      res.status(200).json(prontuarios);
    } catch (err) {
      console.error("Erro ao listar prontuário:", err);
      res.status(500).json({ error: "Erro ao listar prontuário" });
    }
  }

  // Rota pública - apenas restrições
  static async listarProntuarioRestricoes(req, res) {
    try {
      const { numero } = req.params;
      console.log("📖 Listando RESTRIÇÕES para número:", numero);
      const restricoes = await Solipede.listarProntuarioRestricoes(numero);
      console.log("📖 Restrições retornadas:", restricoes.length);
      res.status(200).json(restricoes);
    } catch (err) {
      console.error("Erro ao listar restrições:", err);
      res.status(500).json({ error: "Erro ao listar restrições" });
    }
  }

  static async atualizarProntuario(req, res) {
    try {
      const { id } = req.params;
      const { observacao, recomendacoes, tipo } = req.body;

      if (!observacao) {
        return res.status(400).json({ error: "Observação é obrigatória" });
      }

      await Solipede.atualizarProntuario(id, { observacao, recomendacoes, tipo });
      res.status(200).json({ success: true, message: "Prontuário atualizado com sucesso" });
    } catch (err) {
      console.error("Erro ao atualizar prontuário:", err);
      res.status(500).json({ error: "Erro ao atualizar prontuário" });
    }
  }

  static async deletarProntuario(req, res) {
    try {
      const { id } = req.params;
      await Solipede.deletarProntuario(id);
      res.status(200).json({ success: true, message: "Prontuário deletado com sucesso" });
    } catch (err) {
      console.error("Erro ao deletar prontuário:", err);
      res.status(500).json({ error: "Erro ao deletar prontuário" });
    }
  }

  /* ======================================================
     EXCLUSÃO (SOFT DELETE) - MOVE PARA HISTÓRICO
  ====================================================== */
  static async excluirSolipede(req, res) {
    try {
      const { numero, motivoExclusao, senha } = req.body;
      const usuario = req.usuario;

      console.log("🗑️ Exclusão solicitada:", { numero, motivoExclusao, usuarioId: usuario?.id });

      if (!numero || !motivoExclusao || !senha) {
        return res.status(400).json({
          error: "Número, motivo de exclusão e senha são obrigatórios",
        });
      }

      if (!usuario || !usuario.id) {
        return res.status(401).json({ error: "Usuário não autenticado" });
      }

      const resultado = await Solipede.excluirSolipede(
        numero,
        motivoExclusao,
        usuario.id,
        senha
      );

      console.log("✅ Solípede excluído com sucesso:", numero);
      res.status(200).json(resultado);
    } catch (err) {
      console.error("❌ Erro ao excluir solípede:", err);
      
      if (err.message === "Senha incorreta") {
        return res.status(401).json({ error: "Senha incorreta" });
      }
      
      if (err.message === "Solípede não encontrado" || err.message === "Usuário não encontrado") {
        return res.status(404).json({ error: err.message });
      }
      
      res.status(500).json({ error: "Erro ao excluir solípede" });
    }
  }

  static async listarExcluidos(req, res) {
    try {
      const excluidos = await Solipede.listarExcluidos();
      res.status(200).json(excluidos);
    } catch (err) {
      console.error("Erro ao listar excluídos:", err);
      res.status(500).json({ error: "Erro ao listar excluídos" });
    }
  }

  // ===== Histórico de Movimentação =====
  static async historicoMovimentacao(req, res) {
    try {
      const { numero } = req.params;
      
      const [rows] = await pool.query(
        `SELECT 
          hm.id,
          hm.dataMovimentacao,
          hm.esquadraoOrigem,
          hm.esquadraoDestino,
          u.nome as usuarioNome
         FROM historico_movimentacao hm
         LEFT JOIN usuarios u ON hm.usuarioId = u.id
         WHERE hm.numero = ?
         ORDER BY hm.dataMovimentacao DESC`,
        [numero]
      );

      res.status(200).json(rows);
    } catch (err) {
      console.error("Erro ao buscar histórico de movimentação:", err);
      // Se a tabela não existe, retornar array vazio
      res.status(200).json([]);
    }
  }

  // ===== Horas do Mês Atual (otimizado) =====
  static async horasMesAtual(req, res) {
    try {
      const hoje = new Date();
      const mesAtual = hoje.getMonth() + 1;
      const anoAtual = hoje.getFullYear();

      console.log(`📅 Buscando horas para: Mês ${mesAtual}, Ano ${anoAtual}`);

      // Primeiro, vamos verificar quantos registros existem no histórico para o mês atual
      const [totalRegistros] = await pool.query(
        `SELECT COUNT(*) as total FROM historicoHoras WHERE mes = ? AND ano = ?`,
        [mesAtual, anoAtual]
      );
      console.log(`📊 Total de registros no histórico para ${mesAtual}/${anoAtual}: ${totalRegistros[0].total}`);

      const [rows] = await pool.query(
        `SELECT 
          s.numero,
          COALESCE(SUM(hh.horas), 0) as horasMesAtual
         FROM solipede s
         LEFT JOIN historicoHoras hh ON s.numero = hh.solipedeNumero
           AND hh.mes = ?
           AND hh.ano = ?
         WHERE s.alocacao = 'RPMon'
         GROUP BY s.numero`,
        [mesAtual, anoAtual]
      );

      console.log(`✅ ${rows.length} solípedes encontrados`);

      // Transformar em objeto { numero: horas }
      const resultado = {};
      rows.forEach(row => {
        resultado[row.numero] = parseFloat(row.horasMesAtual) || 0;
      });

      // Contar quantos têm horas > 0
      const comHoras = Object.values(resultado).filter(h => h > 0).length;
      console.log(`📊 Solípedes com horas > 0: ${comHoras}/${rows.length}`);
      console.log(`📊 Exemplo de dados:`, Object.entries(resultado).slice(0, 5));

      res.status(200).json(resultado);
    } catch (err) {
      console.error("Erro ao buscar horas do mês atual:", err);
      res.status(500).json({ error: "Erro ao buscar horas do mês atual" });
    }
  }
}

export default SolipedeController;
