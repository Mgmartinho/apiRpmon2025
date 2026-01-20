import Prontuario from "../models/Prontuario.js";
import Solipede from "../models/Solipedes.js";
import bcrypt from "bcryptjs";

class ProntuarioController {
  static async listarTodos(req, res, next) {
    console.log("\n");
    console.log("═".repeat(80));
    console.log("🎯 CONTROLLER: ProntuarioController.listarTodos()");
    console.log("📍 Rota chamada: /gestaoFVR/prontuario/todos");
    console.log("═".repeat(80));
    console.log("\n");
    try {
      console.log("🔍 Executando Prontuario.listarTodos() no banco...");
      const dados = await Prontuario.listarTodos();
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
      const dados = await Prontuario.listarPorSolipede(numero_solipede);
      console.log(`✅ Total de registros encontrados: ${dados.length}\n`);
      res.status(200).json(dados);
    } catch (err) {
      next(err);
    }
  }

  static async contarBaixasPendentes(req, res, next) {
    try {
      const { numero_solipede } = req.params;
      const total = await Prontuario.contarBaixasPendentes(numero_solipede);
      res.status(200).json({ total });
    } catch (err) {
      next(err);
    }
  }

  static async liberarBaixa(req, res, next) {
    try {
      const { id } = req.params;
      const usuarioId = req.user?.id || req.usuario?.id;

      if (!usuarioId) {
        return res.status(401).json({ error: "Usuário não autenticado" });
      }

      // Buscar número do solípede através do prontuário
      const pool = (await import("../config/mysqlConnect.js")).default;
      const [rows] = await pool.query(
        "SELECT numero_solipede FROM prontuario WHERE id = ? AND tipo = 'Baixa'",
        [id]
      );

      if (!rows || rows.length === 0) {
        return res.status(404).json({ error: "Registro de baixa não encontrado" });
      }

      const numeroSolipede = rows[0].numero_solipede;

      // Liberar a baixa
      const liberado = await Prontuario.liberarBaixa(id, usuarioId);

      if (!liberado) {
        return res.status(400).json({ error: "Não foi possível liberar a baixa" });
      }

      // Verificar se ainda existem baixas pendentes
      const baixasPendentes = await Prontuario.contarBaixasPendentes(numeroSolipede);

      // Se não há mais baixas pendentes, voltar status para Ativo
      if (baixasPendentes === 0) {
        await Solipede.atualizarStatus(numeroSolipede, "Ativo");
      }

      res.status(200).json({ 
        success: true, 
        message: "Baixa liberada com sucesso",
        baixasPendentes 
      });
    } catch (err) {
      next(err);
    }
  }

  static async contarTratamentosEmAndamento(req, res, next) {
    try {
      const { numero } = req.params;
      const total = await Prontuario.contarTratamentosEmAndamento(numero);
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

      // Buscar senha do usuário logado para validar
      const pool = (await import("../config/mysqlConnect.js")).default;
      const [usuarios] = await pool.query(
        "SELECT id, nome, re, senha FROM usuarios WHERE id = ?",
        [usuarioLogado.id]
      );

      if (!usuarios || usuarios.length === 0) {
        console.log(`❌ Usuário não encontrado no banco: ${usuarioLogado.id}`);
        return res.status(401).json({ error: "Usuário não encontrado" });
      }

      const usuario = usuarios[0];
      console.log(`✅ Validando senha para: ${usuario.nome}`);
      
      const senhaValida = await bcrypt.compare(senha, usuario.senha);

      if (!senhaValida) {
        console.log("❌ Senha inválida");
        return res.status(401).json({ error: "Senha inválida" });
      }

      console.log("✅ Senha válida");

      // Buscar o número do solípede antes de concluir
      const [tratamentos] = await pool.query(
        "SELECT numero_solipede FROM prontuario WHERE id = ?",
        [id]
      );

      if (!tratamentos || tratamentos.length === 0) {
        console.log(`❌ Tratamento não encontrado - ID: ${id}`);
        return res.status(404).json({ error: "Tratamento não encontrado" });
      }

      const numeroSolipede = tratamentos[0].numero_solipede;
      console.log(`🐴 Solípede: ${numeroSolipede}`);

      // Verificar se este tratamento foi responsável por baixar o solípede
      const [tratamentoInfo] = await pool.query(
        "SELECT foi_responsavel_pela_baixa FROM prontuario WHERE id = ?",
        [id]
      );

      const foiResponsavelPelaBaixa = tratamentoInfo && tratamentoInfo.length > 0 && tratamentoInfo[0].foi_responsavel_pela_baixa === 1;
      console.log(`📋 Tratamento ${id} foi responsável pela baixa? ${foiResponsavelPelaBaixa ? 'SIM' : 'NÃO'}`);

      // Concluir o tratamento
      const concluido = await Prontuario.concluirTratamento(id, usuario.id);

      if (!concluido) {
        console.log(`⚠️ Tratamento ${id} já estava concluído anteriormente`);
        return res.status(409).json({ 
          error: "Tratamento já foi concluído anteriormente",
          code: "ALREADY_CONCLUDED"
        });
      }

      console.log(`✅ Tratamento ${id} concluído por ${usuario.nome}`);

      // Verificar quantos tratamentos QUE BAIXARAM ainda estão em andamento
      const [tratamentosComBaixaAtivos] = await pool.query(
        `SELECT COUNT(*) as total FROM prontuario 
         WHERE numero_solipede = ? 
         AND tipo = 'Tratamento' 
         AND foi_responsavel_pela_baixa = 1
         AND (status_conclusao IS NULL OR status_conclusao = 'em_andamento')`,
        [numeroSolipede]
      );
      
      const tratamentosQueBaixaramRestantes = tratamentosComBaixaAtivos[0].total;
      console.log(`📊 Tratamentos que baixaram o solípede e ainda estão ativos: ${tratamentosQueBaixaramRestantes}`);

      // Buscar o status atual do solípede
      const Solipede = (await import("../models/Solipedes.js")).default;
      const [solipedes] = await pool.query(
        "SELECT status FROM solipede WHERE numero = ?",
        [numeroSolipede]
      );

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
      const { senha } = req.body;
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

      // Buscar senha do usuário logado para validar
      const pool = (await import("../config/mysqlConnect.js")).default;
      const [usuarios] = await pool.query(
        "SELECT id, nome, re, senha FROM usuarios WHERE id = ?",
        [usuarioLogado.id]
      );

      if (!usuarios || usuarios.length === 0) {
        console.log(`❌ Usuário não encontrado no banco: ${usuarioLogado.id}`);
        return res.status(401).json({ error: "Usuário não encontrado" });
      }

      const usuario = usuarios[0];
      console.log(`✅ Validando senha para: ${usuario.nome}`);
      
      const senhaValida = await bcrypt.compare(senha, usuario.senha);

      if (!senhaValida) {
        console.log("❌ Senha inválida");
        return res.status(401).json({ error: "Senha inválida" });
      }

      console.log("✅ Senha válida");

      // Concluir o registro
      const concluido = await Prontuario.concluirRegistro(id, usuario.id);

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

      // Buscar senha do usuário logado para validar
      const pool = (await import("../config/mysqlConnect.js")).default;
      const [usuarios] = await pool.query(
        "SELECT id, nome, re, senha FROM usuarios WHERE id = ?",
        [usuarioLogado.id]
      );

      if (!usuarios || usuarios.length === 0) {
        console.log(`❌ Usuário não encontrado no banco: ${usuarioLogado.id}`);
        return res.status(401).json({ error: "Usuário não encontrado" });
      }

      const usuario = usuarios[0];
      console.log(`✅ Validando senha para: ${usuario.nome}`);
      
      const senhaValida = await bcrypt.compare(senha, usuario.senha);

      if (!senhaValida) {
        console.log("❌ Senha inválida");
        return res.status(401).json({ error: "Senha inválida" });
      }

      console.log("✅ Senha válida");

      // Buscar informações do registro antes de excluir
      const [registros] = await pool.query(
        "SELECT numero_solipede, tipo, precisa_baixar FROM prontuario WHERE id = ?",
        [id]
      );

      if (!registros || registros.length === 0) {
        console.log(`❌ Registro ${id} não encontrado`);
        return res.status(404).json({ error: "Registro não encontrado" });
      }

      const registro = registros[0];
      const numeroSolipede = registro.numero_solipede;
      const tipo = registro.tipo;
      const precisaBaixar = registro.precisa_baixar;

      console.log(`📋 Registro a ser excluído: Tipo=${tipo}, Solípede=${numeroSolipede}, PrecisaBaixar=${precisaBaixar}`);

      // Excluir o registro
      const excluido = await Prontuario.excluir(id);

      if (!excluido) {
        console.log(`❌ Erro ao excluir registro ${id}`);
        return res.status(500).json({ error: "Erro ao excluir registro" });
      }

      console.log(`✅ Registro ${id} excluído por ${usuario.nome}`);

      // Se era um tratamento que baixou o solípede, verificar se deve voltar para Ativo
      if (tipo === "Tratamento" && precisaBaixar === "sim") {
        const [tratamentosComBaixaAtivos] = await pool.query(
          `SELECT COUNT(*) as total FROM prontuario 
           WHERE numero_solipede = ? 
           AND tipo = 'Tratamento' 
           AND precisa_baixar = 'sim'
           AND (status_conclusao IS NULL OR status_conclusao = 'em_andamento')`,
          [numeroSolipede]
        );
        
        const tratamentosQueBaixaramRestantes = tratamentosComBaixaAtivos[0].total;
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
}

export default ProntuarioController;
