import NovoProntuario from "../models/NovoProntuario.js";
import ProntuarioTratamentos from "../models/ProntuarioTratamento.js";
import ProntuarioRestricoes from "../models/ProntuarioRestricoes.js";
import ProntuarioDietas from "../models/ProntuarioDietas.js";
import ProntuarioSuplementacoes from "../models/ProntuarioSuplementacoes.js";
import ProntuarioMovimentacoes from "../models/ProntuarioMovimentacao.js";
import ProntuarioVacinacao from "../models/ProntuarioVacinacao.js";
import Solipede from "../models/Solipedes.js";
import bcrypt from "bcryptjs";

class ProntuarioController {
  static normalizarTipo(tipo) {
    return String(tipo || "")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .trim();
  }

  static ehTipo(tipoAtual, tipoEsperado) {
    return this.normalizarTipo(tipoAtual) === this.normalizarTipo(tipoEsperado);
  }

  static async validarSenhaUsuario(usuarioLogado, senha) {
    const pool = (await import("../config/mysqlConnect.js")).default;
    const [usuarios] = await pool.query(
      "SELECT id, nome, re, senha FROM usuarios WHERE id = ?",
      [usuarioLogado.id]
    );

    if (!usuarios || usuarios.length === 0) {
      throw new Error("Usuário não encontrado");
    }

    const usuario = usuarios[0];
    const senhaValida = await bcrypt.compare(senha, usuario.senha);

    if (!senhaValida) {
      const erro = new Error("Senha inválida");
      erro.status = 401;
      throw erro;
    }

    return usuario;
  }

  static async listarTodos(req, res, next) {
    console.log("\n");
    console.log("═".repeat(80));
    console.log("🎯 CONTROLLER: ProntuarioController.listarTodos()");
    console.log("📍 Rota chamada: /gestaoFVR/prontuario/todos");
    console.log("═".repeat(80));
    console.log("\n");
    try {
      console.log("🔍 Executando NovoProntuario.listarTodos() no banco...");
      const dados = await NovoProntuario.listarTodos();
      console.log(`✅ Total de registros encontrados: ${dados.length}`);
      if (dados.length > 0) {
        console.log("📦 Exemplo do primeiro registro:", JSON.stringify(dados[0], null, 2));
      }
      
      // Desabilitar completamente o cache
      res.set({
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0',
        'Surrogate-Control': 'no-store'
      });
      
      // Remover etag para forçar resposta completa
      res.removeHeader('ETag');
      
      console.log(`🚀 Enviando ${dados.length} registros para o frontend\n`);
      res.status(200).json(dados);
    } catch (err) {
      console.error("❌ ERRO ao listar todos os prontuários:", err);
      next(err);
    }
  }

  static async listarPorSolipede(req, res, next) {
    console.log("\n");
    console.log("═".repeat(80));
    console.log("📋 CONTROLLER: ProntuarioController.listarPorSolipede()");
    console.log(`📍 Rota chamada: /gestaoFVR/prontuario/${req.params.numero_solipede}`);
    console.log("═".repeat(80));
    console.log("\n");
    try {
      const { numero_solipede } = req.params;
      console.log(`🔍 Buscando prontuários do solípede: ${numero_solipede}`);
      const dados = await NovoProntuario.listarPorSolipede(numero_solipede);
      console.log(`✅ Total de registros encontrados: ${dados.length}\n`);
      res.status(200).json(dados);
    } catch (err) {
      next(err);
    }
  }

  static async contarBaixasPendentes(req, res, next) {
    try {
      const { numero_solipede } = req.params;
      const dados = await NovoProntuario.listarPorSolipede(numero_solipede);
      const total = dados.filter((registro) => registro.tipo === "Tratamento" && registro.tratamento_precisa_baixar === "sim" && (!registro.status_conclusao || registro.status_conclusao === "em_andamento")).length;
      res.status(200).json({ total });
    } catch (err) {
      next(err);
    }
  }

  static async liberarBaixa(req, res, next) {
    try {
      return res.status(410).json({
        error: "Fluxo de baixa legado descontinuado no novo modelo de prontuário"
      });
    } catch (err) {
      next(err);
    }
  }

  static async contarTratamentosEmAndamento(req, res, next) {
    try {
      const { numero } = req.params;
      const dados = await NovoProntuario.listarPorSolipede(numero);
      const total = dados.filter((registro) => registro.tipo === "Tratamento" && (registro.status_conclusao === null || registro.status_conclusao === undefined || registro.status_conclusao === "" || registro.status_conclusao === "em_andamento")).length;
      res.status(200).json({ total });
    } catch (err) {
      next(err);
    }
  }

  static async concluirTratamento(req, res, next) {
    try {
      const { id } = req.params;
      const { senha } = req.body;
      const usuarioLogado = req.usuario; // Pega do token JWT via authMiddleware

      console.log(`🔐 Tentativa de conclusão - ID: ${id}, Usuário: ${usuarioLogado?.nome} (${usuarioLogado?.email})`);

      if (!senha) {
        console.log("❌ Senha não fornecida");
        return res.status(400).json({ error: "Senha é obrigatória" });
      }

      if (!usuarioLogado || !usuarioLogado.id) {
        console.log("❌ Usuário não autenticado");
        return res.status(401).json({ error: "Usuário não autenticado" });
      }

      const usuario = await ProntuarioController.validarSenhaUsuario(usuarioLogado, senha);
      const registro = await NovoProntuario.buscarPorId(id);

      if (!registro || registro.tipo !== "Tratamento" || !registro.tratamento_id) {
        console.log(`❌ Tratamento não encontrado - ID: ${id}`);
        return res.status(404).json({ error: "Tratamento não encontrado" });
      }

      const numeroSolipede = registro.numero_solipede;
      console.log(`🐴 Solípede: ${numeroSolipede}`);

      const foiResponsavelPelaBaixa = registro.foi_responsavel_pela_baixa === 1;
      console.log(`📋 Tratamento ${id} foi responsável pela baixa? ${foiResponsavelPelaBaixa ? 'SIM' : 'NÃO'}`);

      // Concluir o tratamento
      const concluido = await ProntuarioTratamentos.atualizarStatus(registro.tratamento_id, "concluido", usuario.id);

      if (!concluido) {
        console.log(`⚠️ Tratamento ${id} já estava concluído anteriormente`);
        return res.status(409).json({ 
          error: "Tratamento já foi concluído anteriormente",
          code: "ALREADY_CONCLUDED"
        });
      }

      console.log(`✅ Tratamento ${id} concluído por ${usuario.nome}`);

      // Verificar quantos tratamentos QUE BAIXARAM ainda estão em andamento
      const registrosSolipede = await NovoProntuario.listarPorSolipede(numeroSolipede);
      const tratamentosQueBaixaramRestantes = registrosSolipede.filter((item) => item.tipo === "Tratamento" && item.foi_responsavel_pela_baixa === 1 && (!item.status_conclusao || item.status_conclusao === "em_andamento")).length;
      console.log(`📊 Tratamentos que baixaram o solípede e ainda estão ativos: ${tratamentosQueBaixaramRestantes}`);

      // Buscar o status atual do solípede
      const pool = (await import("../config/mysqlConnect.js")).default;
      const [solipedes] = await pool.query("SELECT status FROM solipede WHERE numero = ?", [numeroSolipede]);

      let statusAlterado = false;
      if (solipedes && solipedes.length > 0) {
        const statusAtual = solipedes[0].status;
        console.log(`🔍 Status atual do solípede: ${statusAtual}`);

        // LÓGICA MELHORADA: Só retorna para Ativo se:
        // 1. Este tratamento foi responsável por baixar (foi_responsavel_pela_baixa=1)
        // 2. E não há mais NENHUM tratamento com foi_responsavel_pela_baixa=1 ativo
        if (statusAtual === "Baixado" && foiResponsavelPelaBaixa && tratamentosQueBaixaramRestantes === 0) {
          console.log(`🔄 Este tratamento baixou e não há mais tratamentos que baixaram. Alterando status para Ativo`);
          await Solipede.atualizarStatus(numeroSolipede, "Ativo");
          statusAlterado = true;
        } else if (statusAtual === "Baixado" && !foiResponsavelPelaBaixa) {
          console.log(`ℹ️ Este tratamento NÃO baixou o solípede. Status permanece inalterado.`);
        } else if (statusAtual === "Baixado" && tratamentosQueBaixaramRestantes > 0) {
          console.log(`⚠️ Solípede continua Baixado - ainda há ${tratamentosQueBaixaramRestantes} tratamento(s) que baixaram o solípede`);
        }
      }

      // Retornar dados do usuário que concluiu
      res.status(200).json({
        success: true,
        message: tratamentosQueBaixaramRestantes > 0 
          ? `Tratamento concluído. Ainda há ${tratamentosQueBaixaramRestantes} tratamento(s) que baixaram o solípede em andamento.`
          : statusAlterado 
            ? "Tratamento concluído e status do solípede alterado para Ativo" 
            : "Tratamento concluído com sucesso",
        usuario_conclusao: {
          id: usuario.id,
          nome: usuario.nome,
          re: usuario.re
        },
        tratamentosRestantes: tratamentosQueBaixaramRestantes,
        statusAlterado
      });
    } catch (err) {
      console.error("❌ Erro ao concluir tratamento:", err);
      next(err);
    }
  }

  static async concluirRegistro(req, res, next) {
    try {
      const { id } = req.params;
      const { senha, movimentacao_retorno, movimentacao_nova_alocacao } = req.body;
      const usuarioLogado = req.usuario; // Pega do token JWT via authMiddleware

      console.log(`🔐 Tentativa de conclusão de registro - ID: ${id}, Usuário: ${usuarioLogado?.nome} (${usuarioLogado?.email})`);

      if (!senha) {
        console.log("❌ Senha não fornecida");
        return res.status(400).json({ error: "Senha é obrigatória" });
      }

      if (!usuarioLogado || !usuarioLogado.id) {
        console.log("❌ Usuário não autenticado");
        return res.status(401).json({ error: "Usuário não autenticado" });
      }

      const usuario = await ProntuarioController.validarSenhaUsuario(usuarioLogado, senha);
      const registro = await NovoProntuario.buscarPorId(id);

      if (!registro) {
        return res.status(404).json({ error: "Registro não encontrado" });
      }

      let concluido = false;

      if (ProntuarioController.ehTipo(registro.tipo, "Tratamento") && registro.tratamento_id) {
        concluido = await ProntuarioTratamentos.atualizarStatus(registro.tratamento_id, "concluido", usuario.id);
      } else if (ProntuarioController.ehTipo(registro.tipo, "Restrições") && registro.restricao_id) {
        concluido = await ProntuarioRestricoes.concluirRestricao(registro.restricao_id, usuario.id);
      } else if (ProntuarioController.ehTipo(registro.tipo, "Dieta") && registro.dieta_id) {
        concluido = !!(await ProntuarioDietas.atualizarParcial(registro.dieta_id, { status_conclusao: "concluido" }));
      } else if (ProntuarioController.ehTipo(registro.tipo, "Suplementação") && registro.suplementacao_id) {
        concluido = !!(await ProntuarioSuplementacoes.atualizarParcial(registro.suplementacao_id, { status_conclusao: "concluido" }));
      } else if (ProntuarioController.ehTipo(registro.tipo, "Movimentação") && registro.movimentacao_id) {
        const movimentacao = await ProntuarioMovimentacoes.buscarPorId(registro.movimentacao_id);

        if (!movimentacao) {
          return res.status(404).json({ error: "Movimentação não encontrada" });
        }

        const retornoNormalizado = String(movimentacao_retorno || "")
          .normalize("NFD")
          .replace(/[\u0300-\u036f]/g, "")
          .toLowerCase()
          .trim();

        let alocacaoFinal = null;
        if (retornoNormalizado === "origem") {
          alocacaoFinal = movimentacao.origem || null;
        } else if (retornoNormalizado === "outra") {
          alocacaoFinal = String(movimentacao_nova_alocacao || "").trim() || null;
        }

        if (!alocacaoFinal) {
          return res.status(400).json({
            error: "Informe a alocação final da movimentação (origem ou nova alocação)."
          });
        }

        concluido = !!(await ProntuarioMovimentacoes.atualizarParcial(registro.movimentacao_id, {
          status_conclusao: "concluido",
          destino_final: alocacaoFinal,
          usuario_conclusao_id: usuario.id,
          usuario_atualizacao: usuario.id,
        }));

        if (concluido) {
          await Solipede.atualizarAlocacao(registro.numero_solipede, alocacaoFinal);
        }
      } else if (ProntuarioController.ehTipo(registro.tipo, "Vacinação") && registro.vacinacao_id) {
        concluido = !!(await ProntuarioVacinacao.atualizarParcial(registro.vacinacao_id, { 
          status_conclusao: "concluido",
          usuario_atualizacao: usuario.id,
        }));
      }

      if (!concluido) {
        console.log(`⚠️ Registro ${id} já estava concluído anteriormente`);
        return res.status(409).json({ 
          error: "Registro já foi concluído anteriormente",
          code: "ALREADY_CONCLUDED"
        });
      }

      console.log(`✅ Registro ${id} concluído por ${usuario.nome}`);

      // Retornar dados do usuário que concluiu
      res.status(200).json({
        success: true,
        message: "Registro concluído com sucesso",
        usuario_conclusao: {
          id: usuario.id,
          nome: usuario.nome,
          re: usuario.re
        }
      });
    } catch (err) {
      console.error("❌ Erro ao concluir registro:", err);
      next(err);
    }
  }

  static async excluirRegistro(req, res, next) {
    try {
      const { id } = req.params;
      const { senha } = req.body;
      const usuarioLogado = req.usuario; // Pega do token JWT via authMiddleware

      console.log(`🗑️ Tentativa de exclusão de registro - ID: ${id}, Usuário: ${usuarioLogado?.nome} (${usuarioLogado?.email})`);

      if (!senha) {
        console.log("❌ Senha não fornecida");
        return res.status(400).json({ error: "Senha é obrigatória" });
      }

      if (!usuarioLogado || !usuarioLogado.id) {
        console.log("❌ Usuário não autenticado");
        return res.status(401).json({ error: "Usuário não autenticado" });
      }

      const usuario = await ProntuarioController.validarSenhaUsuario(usuarioLogado, senha);
      const registro = await NovoProntuario.buscarPorId(id);

      if (!registro) {
        console.log(`❌ Registro ${id} não encontrado`);
        return res.status(404).json({ error: "Registro não encontrado" });
      }

      const numeroSolipede = registro.numero_solipede;
      const tipo = registro.tipo;
      const precisaBaixar = registro.tratamento_precisa_baixar;

      console.log(`📋 Registro a ser excluído: Tipo=${tipo}, Solípede=${numeroSolipede}, PrecisaBaixar=${precisaBaixar}`);

      let excluido = false;

      if (ProntuarioController.ehTipo(tipo, "Tratamento") && registro.tratamento_id) {
        excluido = await ProntuarioTratamentos.excluir(registro.tratamento_id);
      } else if (ProntuarioController.ehTipo(tipo, "Restrições") && registro.restricao_id) {
        excluido = await ProntuarioRestricoes.excluir(registro.restricao_id);
      } else if (ProntuarioController.ehTipo(tipo, "Dieta") && registro.dieta_id) {
        excluido = await ProntuarioDietas.excluir(registro.dieta_id);
      } else if (ProntuarioController.ehTipo(tipo, "Suplementação") && registro.suplementacao_id) {
        excluido = await ProntuarioSuplementacoes.excluir(registro.suplementacao_id);
      } else if (ProntuarioController.ehTipo(tipo, "Movimentação") && registro.movimentacao_id) {
        excluido = await ProntuarioMovimentacoes.excluir(registro.movimentacao_id);
      }

      if (!excluido) {
        console.log(`❌ Erro ao excluir registro ${id}`);
        return res.status(500).json({ error: "Erro ao excluir registro" });
      }

      await NovoProntuario.excluirProntuarioGeral(id);

      console.log(`✅ Registro ${id} excluído por ${usuario.nome}`);

      // Se era um tratamento que baixou o solípede, verificar se deve voltar para Ativo
      if (tipo === "Tratamento" && precisaBaixar === "sim") {
        const registrosSolipede = await NovoProntuario.listarPorSolipede(numeroSolipede);
        const tratamentosQueBaixaramRestantes = registrosSolipede.filter((item) => item.tipo === "Tratamento" && item.tratamento_precisa_baixar === "sim" && (!item.status_conclusao || item.status_conclusao === "em_andamento")).length;
        console.log(`📊 Tratamentos que baixam o solípede restantes: ${tratamentosQueBaixaramRestantes}`);

        // Se não há mais tratamentos que baixaram, retornar status para Ativo
        if (tratamentosQueBaixaramRestantes === 0) {
          const Solipede = (await import("../models/Solipedes.js")).default;
          await Solipede.atualizarStatus(numeroSolipede, "Ativo");
          console.log(`🔄 Status do solípede ${numeroSolipede} alterado para Ativo`);
        }
      }

      res.status(200).json({
        success: true,
        message: "Registro excluído com sucesso",
        usuario_exclusao: {
          id: usuario.id,
          nome: usuario.nome,
          re: usuario.re
        }
      });
    } catch (err) {
      console.error("❌ Erro ao excluir registro:", err);
      next(err);
    }
  }

  static async atualizarRegistro(req, res, next) {
    try {
      const { id } = req.params;
      const usuarioLogadoId = req.usuario?.id;
      const registro = await NovoProntuario.buscarPorId(id);
      const body = req.body || {};

      if (!registro) {
        return res.status(404).json({ error: "Registro não encontrado" });
      }

      let atualizado = null;

      if (ProntuarioController.ehTipo(registro.tipo, "Tratamento") && registro.tratamento_id) {
        atualizado = await ProntuarioTratamentos.atualizarParcial(registro.tratamento_id, {
          diagnostico: body.diagnosticos,
          observacao_clinica: body.observacao,
          prescricao: body.recomendacoes,
          usuario_atualizacao: usuarioLogadoId,
        });
      } else if (ProntuarioController.ehTipo(registro.tipo, "Restrições") && registro.restricao_id) {
        const payload = {
          restricao: body.observacao,
          recomendacoes: body.recomendacoes,
          data_validade: body.data_validade,
          usuario_atualizacao: usuarioLogadoId,
        };

        if (Object.prototype.hasOwnProperty.call(body, "status_conclusao")) {
          payload.status_conclusao = body.status_conclusao;
        }

        atualizado = await ProntuarioRestricoes.atualizarParcial(registro.restricao_id, {
          ...payload,
        });
      } else if (ProntuarioController.ehTipo(registro.tipo, "Dieta") && registro.dieta_id) {
        const payload = {
          descricao: body.observacao,
          data_fim: body.data_validade,
          usuario_atualizacao: usuarioLogadoId,
        };

        if (Object.prototype.hasOwnProperty.call(body, "status_conclusao")) {
          payload.status_conclusao = body.status_conclusao;
        }

        atualizado = await ProntuarioDietas.atualizarParcial(registro.dieta_id, {
          ...payload,
        });
      } else if (ProntuarioController.ehTipo(registro.tipo, "Suplementação") && registro.suplementacao_id) {
        const payload = {
          produto: body.produto,
          dose: body.dose,
          frequencia: body.frequencia,
          descricao: body.observacao,
          data_fim: body.data_validade,
          usuario_atualizacao: usuarioLogadoId,
        };

        if (Object.prototype.hasOwnProperty.call(body, "status_conclusao")) {
          payload.status_conclusao = body.status_conclusao;
        }

        atualizado = await ProntuarioSuplementacoes.atualizarParcial(registro.suplementacao_id, {
          ...payload,
        });
      } else if (ProntuarioController.ehTipo(registro.tipo, "Movimentação") && registro.movimentacao_id) {
        const payload = {
          motivo: body.observacao,
          destino: body.destino,
          data_movimentacao: body.data_movimentacao,
          usuario_atualizacao: usuarioLogadoId,
        };

        if (Object.prototype.hasOwnProperty.call(body, "status_conclusao")) {
          payload.status_conclusao = body.status_conclusao;
        }

        atualizado = await ProntuarioMovimentacoes.atualizarParcial(registro.movimentacao_id, {
          ...payload,
        });
      }

      if (!atualizado) {
        return res.status(400).json({ error: "Tipo de registro sem suporte para atualização no novo modelo" });
      }

      return res.status(200).json({ success: true, message: "Prontuário atualizado com sucesso" });
    } catch (err) {
      next(err);
    }
  }
}

export default ProntuarioController;
