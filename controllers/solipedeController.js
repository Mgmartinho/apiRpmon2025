import Solipede from "../models/Solipedes.js";
import pool from "../config/mysqlConnect.js";

class SolipedeController {

  // ===== CRUD =====
static async listar(req, res, next) {
  try {
    console.log('📋 Requisição para listar solípedes recebida');
    console.log('   Origin:', req.get('origin'));
    console.log('   Query:', req.query);
    
    const { alocacao } = req.query;

    const dados = await Solipede.listar({
      alocacao
    });

    console.log(`✅ ${dados.length} solípedes encontrados`);
    res.status(200).json(dados);
  } catch (err) {
    console.error('❌ Erro ao listar solípedes:', err.message);
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
      const atualizandoBaia = Object.prototype.hasOwnProperty.call(req.body, "baia");

      if (atualizandoBaia) {
        const usuario = req.usuario;
        const perfisAutorizadosBaia = [
          "Pagador de cavalo",
          "Pagador de cavalos",
          "Veterinario",
          "Veterinario Admin",
          "Desenvolvedor",
        ];

        if (!usuario || !usuario.perfil) {
          return res.status(401).json({ error: "Usuário não autenticado" });
        }

        if (!perfisAutorizadosBaia.includes(usuario.perfil)) {
          return res.status(403).json({
            error: "Sem permissão para editar a baia do solípede",
          });
        }

        if (req.body.baia !== null && req.body.baia !== undefined) {
          const baiaNormalizada = String(req.body.baia).trim();
          req.body.baia = baiaNormalizada === "" ? null : baiaNormalizada;
        }
      }

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

  // Atualizar apenas status do solípede
  static async atualizarStatus(req, res, next) {
    try {
      const { numero } = req.params;
      const { status } = req.body;
      const usuario = req.usuario;

      console.log("🔄 Alteração de status detectada");
      console.log("   Solípede:", numero, "| Novo status:", status);
      console.log("   Usuário:", usuario.nome, "(ID:", usuario.id, ")");

      if (!status) {
        return res.status(400).json({ error: "Status é obrigatório" });
      }

      if (!usuario || !usuario.id) {
        return res.status(401).json({ error: "Usuário não autenticado" });
      }

      // Validar status permitido
      const statusPermitidos = ["Operante", "Baixado", "Em Tratamento", "Descanso"];
      if (!statusPermitidos.includes(status)) {
        return res.status(400).json({ error: "Status inválido" });
      }

      // Buscar status anterior
      const solipedeAnterior = await Solipede.buscarPorNumero(numero);
      if (!solipedeAnterior) {
        return res.status(404).json({ error: "Solípede não encontrado" });
      }

      const statusAnterior = solipedeAnterior.status;

      // Atualizar status com auditoria
      await Solipede.atualizarStatus(numero, status, usuario.id);
      
      console.log("✅ Status atualizado com sucesso");
      res.json({ 
        success: true, 
        message: `Status alterado de "${statusAnterior}" para "${status}" com sucesso`,
        statusAnterior,
        statusNovo: status,
        dataAtualizacao: new Date(),
        usuario: usuario.nome
      });
    } catch (err) {
      console.error("❌ Erro ao atualizar status:", err);
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
    const { numero, horas, senha, usuarioId, dataLancamento } = req.body;

    console.log("🔥 RECEBIDO adicionarHoras:", { numero, horas, senha, usuarioId, dataLancamento });
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

    // 2️⃣ lançar horas COM ID DO BODY e data opcional
    console.log("Lançando horas com usuarioId:", usuarioId, "dataLancamento:", dataLancamento || "(NOW)");
    const totalHoras = await Solipede.adicionarHoras(
      numero,
      Number(horas),
      usuarioId,
      dataLancamento // pode ser undefined
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

  // ===== Movimentação em lote (atualiza ALOCAÇÃO, não altera status) =====
  static async movimentacaoEmLote(req, res) {
    try {
      console.log("\n🎯 === CONTROLLER movimentacaoEmLote CHAMADO ===");
      console.log("📦 req.body completo:", req.body);
      
      const { numeros, novaAlocacao, dataMovimentacao, observacao, senha } = req.body;
      const usuario = req.usuario;

      console.log("📥 Dados extraídos do body:");
      console.log("   - numeros:", numeros);
      console.log("   - novaAlocacao:", novaAlocacao);
      console.log("   - tipo novaAlocacao:", typeof novaAlocacao);
      console.log("   - dataMovimentacao:", dataMovimentacao);
      console.log("   - observacao:", observacao);
      console.log("   - senha:", senha ? "****" : "não informada");
      console.log("   - usuario:", usuario);

      if (!usuario || !usuario.email || !usuario.id) {
        console.log("❌ Usuário não autenticado");
        return res.status(401).json({ error: "Usuário não autenticado" });
      }
      if (!Array.isArray(numeros) || numeros.length === 0) {
        console.log("❌ Seleção de solípedes vazia");
        return res.status(400).json({ error: "Seleção de solípedes vazia" });
      }
      if (!novaAlocacao || novaAlocacao === "") {
        console.log("❌ Nova alocação é obrigatória");
        return res.status(400).json({ error: "Nova alocação é obrigatória" });
      }
      if (!senha) {
        console.log("❌ Senha é obrigatória");
        return res.status(400).json({ error: "Senha é obrigatória" });
      }

      console.log("✅ Validações passaram, verificando senha...");
      await Solipede.verificarSenhaUsuario(usuario.email, senha);
      console.log("✅ Senha validada!");

      console.log("🔄 Chamando atualizarMovimentacaoEmLote...");
      const dadosAnteriores = await Solipede.atualizarMovimentacaoEmLote(
        numeros,
        novaAlocacao
      );
      console.log("✅ atualizarMovimentacaoEmLote retornou:", dadosAnteriores);
      
      console.log("📝 Chamando registrarMovimentacoesProntuario...");
      console.log("   - numeros:", numeros);
      console.log("   - dadosAnteriores size:", dadosAnteriores.size);
      console.log("   - novaAlocacao:", novaAlocacao);
      console.log("   - dataMovimentacao:", dataMovimentacao);
      console.log("   - observacao:", observacao);
      console.log("   - usuario.id:", usuario.id);
      
      await Solipede.registrarMovimentacoesProntuario(
        numeros,
        dadosAnteriores,
        novaAlocacao,
        dataMovimentacao,
        observacao,
        usuario.id
      );
      
      console.log("✅ registrarMovimentacoesProntuario concluído!");

      console.log("✅ Movimentação concluída com sucesso!");
      console.log("🎯 === FIM CONTROLLER ===\n");
      return res.status(200).json({ success: true, count: numeros.length });
    } catch (err) {
      console.error("❌ ERRO no controller:", err);
      console.error("   Stack:", err.stack);
      if (err.message === "Senha incorreta") {
        return res.status(401).json({ error: "Senha incorreta" });
      }
      return res.status(500).json({ error: err.message });
    }
  }

  // ===== Prontuário =====
  static async salvarProntuario(req, res) {
    try {
      let {
        numero_solipede,
        tipo,
        observacao,
        diagnosticos,
        recomendacoes,
        tipo_baixa,
        data_lancamento,
        data_validade,
        precisa_baixar,
        senha,
        origem,
        destino,
      } = req.body;
      const usuarioId = req.usuario?.id;

      console.log("\n📝 CONTROLLER: salvarProntuario");
      console.log("   Dados do body:", { numero_solipede, tipo, observacao: observacao?.substring(0, 30) + "...", diagnosticos: diagnosticos?.substring(0, 30) + "...", tipo_baixa, data_validade, precisa_baixar, origem, destino, senha: senha ? "****" : "não fornecida" });
      console.log("   req.usuario completo:", req.usuario);
      console.log("   usuarioId extraído:", usuarioId, "Tipo:", typeof usuarioId);

      if (!numero_solipede || !observacao) {
        console.log("❌ Validação falhou - faltam dados obrigatórios");
        return res.status(400).json({ error: "Número do solípede e observação são obrigatórios" });
      }

      if (!usuarioId) {
        console.log("⚠️ AVISO: usuarioId não foi encontrado!");
        return res.status(401).json({ error: "Usuário não autenticado" });
      }

      // 🔐 VALIDAR SENHA (se fornecida)
      if (senha) {
        console.log("🔐 Validando senha do usuário...");
        const usuario = req.usuario;
        
        if (!usuario || !usuario.email) {
          return res.status(401).json({ error: "Usuário não autenticado" });
        }

        try {
          const Solipede = (await import("../models/Solipedes.js")).default;
          await Solipede.verificarSenhaUsuario(usuario.email, senha);
          console.log("✅ Senha validada com sucesso");
        } catch (error) {
          console.log("❌ Senha inválida:", error.message);
          return res.status(401).json({ error: "Senha inválida" });
        }
      }

      // 🩺 LÓGICA MELHORADA PARA TRATAMENTOS
      let deveBaixarSolipede = false;
      let foiResponsavelPelaBaixa = 0;

      console.log("   🔍 Verificando se é tratamento:", { tipo, precisa_baixar });

      if (tipo === "Tratamento" && precisa_baixar === "sim") {
        console.log("   🩺 Tratamento precisa baixar o solípede (precisa_baixar='sim')");
        deveBaixarSolipede = true;
        foiResponsavelPelaBaixa = 1; // Este tratamento É responsável pela baixa
      } else if (tipo === "Tratamento" && precisa_baixar === "nao") {
        console.log("   ℹ️ Tratamento NÃO precisa baixar o solípede (precisa_baixar='nao')");
        deveBaixarSolipede = false;
        foiResponsavelPelaBaixa = 0; // Este tratamento NÃO é responsável pela baixa
      } else if (tipo === "Tratamento") {
        console.log("   ⚠️ ATENÇÃO: Tratamento sem informação de precisa_baixar (será marcado como 0)");
        foiResponsavelPelaBaixa = 0;
      }

      console.log("   📊 Resultado da análise:", { deveBaixarSolipede, foiResponsavelPelaBaixa });
      console.log("   Salvando prontuário com usuarioId:", usuarioId);

      const resultado = await Solipede.salvarProntuario({
        numero_solipede,
        tipo: tipo || "Observação Geral",
        observacao,
        diagnosticos: diagnosticos || null,
        recomendacoes: recomendacoes || null,
        usuario_id: usuarioId || null,
        tipo_baixa: tipo_baixa || null,
        data_lancamento: data_lancamento || null,
        data_validade: data_validade || null,
        foi_responsavel_pela_baixa: foiResponsavelPelaBaixa,
        precisa_baixar: tipo === "Tratamento" ? precisa_baixar : null, // Salvar valor original
        status_baixa: tipo === "Baixa" ? "pendente" : null,
        origem: origem || null,
        destino: destino || null,
      });

      // Se for tipo "Baixa", atualizar status do solípede
      if (tipo === "Baixa") {
        const novoStatusBaixa = tipo_baixa === "Baixa Eterna" 
          ? "Baixado - Baixa Eterna" 
          : "Baixado";
        
        await Solipede.atualizarStatus(numero_solipede, novoStatusBaixa, usuarioId);
        console.log(`✅ Status do solípede ${numero_solipede} atualizado para: ${novoStatusBaixa}`);
      }
      
      // Se for tratamento que precisa baixar, atualizar status do solípede
      if (tipo === "Tratamento" && deveBaixarSolipede) {
        console.log(`   🔄 Baixando solípede ${numero_solipede}...`);
        console.log(`   UsuarioId: ${usuarioId}`);
        
        try {
          await Solipede.atualizarStatus(numero_solipede, "Baixado", usuarioId);
          console.log(`   ✅ Solípede ${numero_solipede} baixado com sucesso!`);
        } catch (errorStatus) {
          console.error(`   ❌ Erro ao baixar solípede:`, errorStatus);
          throw errorStatus;
        }
      } else if (tipo === "Tratamento" && !deveBaixarSolipede) {
        console.log("   ℹ️ Tratamento não irá baixar o solípede (precisa_baixar='nao')");
      }

      console.log("✅ Prontuário salvo com sucesso! ID:", resultado);
      
      // Verificar o registro salvo
      if (tipo === "Tratamento") {
        console.log("🔍 Verificando registro de tratamento salvo...");
        const [registroSalvo] = await pool.query(
          "SELECT id, tipo, foi_responsavel_pela_baixa FROM prontuario WHERE id = ?",
          [resultado]
        );
        console.log("📝 Registro salvo no banco:", registroSalvo[0]);
      }

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
      console.log("📖 Prontuários retornados:", prontuarios.length, "registros");
      
      // Debug: verificar campos foi_responsavel_pela_baixa E precisa_baixar nos tratamentos
      prontuarios.forEach((p, index) => {
        if (p.tipo === "Tratamento") {
          console.log(`🩺 Controller - Tratamento ${index}:`, {
            id: p.id,
            tipo: p.tipo,
            foi_responsavel_pela_baixa: p.foi_responsavel_pela_baixa,
            precisa_baixar: p.precisa_baixar,
            typeof_precisa: typeof p.precisa_baixar,
            observacao: p.observacao?.substring(0, 50)
          });
        }
      });
      
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
  
  // Rota pública - observações gerais (exceto restrições)
  static async listarObservacoesGerais(req, res) {
    try {
      const { numero } = req.params;
      console.log("📝 Listando OBSERVAÇÕES GERAIS para número:", numero);
      const observacoes = await Solipede.listarObservacoesGerais(numero);
      console.log("📝 Observações retornadas:", observacoes.length);
      res.status(200).json(observacoes);
    } catch (err) {
      console.error("Erro ao listar observações:", err);
      res.status(500).json({ error: "Erro ao listar observações" });
    }
  }
  
  // Rota pública - ferrageamentos
  static async listarFerrageamentosPublico(req, res) {
    try {
      console.log("🔧 Listando FERRAGEAMENTOS públicos");
      const ferrageamentos = await Solipede.listarFerrageamentosPublico();
      console.log("🔧 Ferrageamentos retornados:", ferrageamentos.length);
      res.status(200).json(ferrageamentos);
    } catch (err) {
      console.error("Erro ao listar ferrageamentos:", err);
      res.status(500).json({ error: "Erro ao listar ferrageamentos" });
    }
  }

  static async atualizarProntuario(req, res) {
    try {
      const { id } = req.params;
      const {
        observacao,
        diagnosticos,
        recomendacoes,
        data_validade,
        precisa_baixar,
        foi_responsavel_pela_baixa,
        tipo_baixa,
        data_lancamento,
        status_baixa,
        data_liberacao,
        usuario_liberacao_id,
        origem,
        destino,
        alocacao_anterior,
        alocacao_nova,
      } = req.body;
      const usuarioId = req.usuario?.id;

      console.log("═".repeat(60));
      console.log("✏️  ATUALIZANDO PRONTUÁRIO");
      console.log("ID:", id);
      console.log("Usuário ID:", usuarioId);
      console.log("Dados recebidos:", JSON.stringify(req.body, null, 2));
      console.log("═".repeat(60));

      if (!usuarioId) {
        return res.status(401).json({ error: "Usuário não autenticado" });
      }

      if (!observacao) {
        return res.status(400).json({ error: "Observação é obrigatória" });
      }

      // Usar função de auditoria do modelo Prontuario
      const Prontuario = (await import("../models/Prontuario.js")).default;
      await Prontuario.atualizarComAuditoria(
        id,
        {
          observacao,
          diagnosticos,
          recomendacoes,
          data_validade,
          precisa_baixar,
          foi_responsavel_pela_baixa,
          tipo_baixa,
          data_lancamento,
          status_baixa,
          data_liberacao,
          usuario_liberacao_id,
          origem,
          destino,
          alocacao_anterior,
          alocacao_nova,
        },
        usuarioId
      );
      
      res.status(200).json({ success: true, message: "Prontuário atualizado com sucesso" });
    } catch (err) {
      console.error("❌ Erro ao atualizar prontuário:", err);
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
      const { numero, motivoExclusao, observacao, senha } = req.body;
      const usuario = req.usuario;

      console.log("🗑️ Exclusão solicitada:", { numero, motivoExclusao, observacao, usuarioId: usuario?.id });

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
        observacao,
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

  // Buscar prontuário arquivado de solípede excluído
  static async obterProntuarioExcluido(req, res) {
    try {
      const { numero } = req.params;
      const prontuarios = await Solipede.listarProntuarioExcluido(numero);
      res.status(200).json(prontuarios);
    } catch (err) {
      console.error("Erro ao buscar prontuário arquivado:", err);
      res.status(500).json({ error: "Erro ao buscar prontuário arquivado" });
    }
  }

  // Buscar dados do solípede excluído
  static async obterSolipedeExcluido(req, res) {
    try {
      const { numero } = req.params;
      const [solipedes] = await pool.query(
        "SELECT * FROM solipedes_excluidos WHERE numero = ?",
        [numero]
      );
      
      if (solipedes.length === 0) {
        return res.status(404).json({ error: "Solípede excluído não encontrado" });
      }
      
      res.status(200).json(solipedes[0]);
    } catch (err) {
      console.error("Erro ao buscar solípede excluído:", err);
      res.status(500).json({ error: "Erro ao buscar solípede excluído" });
    }
  }

  // Buscar ferrageamentos arquivados de solípede excluído
  static async obterFerrageamentosExcluidos(req, res) {
    try {
      const { numero } = req.params;
      const ferrageamentos = await Solipede.listarFerrageamentosExcluidos(numero);
      res.status(200).json(ferrageamentos);
    } catch (err) {
      console.error("Erro ao buscar ferrageamentos arquivados:", err);
      res.status(500).json({ error: "Erro ao buscar ferrageamentos arquivados" });
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
