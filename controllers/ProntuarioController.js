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

  static async concluirTratamento(req, res, next) {
    try {
      const { id } = req.params;
      const { email, senha } = req.body;

      console.log(`🔐 Tentativa de conclusão - ID: ${id}, Email: ${email}`);

      if (!email || !senha) {
        console.log("❌ Email ou senha não fornecidos");
        return res.status(400).json({ error: "Email e senha são obrigatórios" });
      }

      // Buscar e validar o usuário
      const pool = (await import("../config/mysqlConnect.js")).default;
      const [usuarios] = await pool.query(
        "SELECT id, nome, re, senha FROM usuarios WHERE email = ?",
        [email]
      );

      if (!usuarios || usuarios.length === 0) {
        console.log(`❌ Usuário não encontrado: ${email}`);
        return res.status(401).json({ error: "Credenciais inválidas" });
      }

      const usuario = usuarios[0];
      console.log(`✅ Usuário encontrado: ${usuario.nome}`);
      
      const senhaValida = await bcrypt.compare(senha, usuario.senha);

      if (!senhaValida) {
        console.log("❌ Senha inválida");
        return res.status(401).json({ error: "Credenciais inválidas" });
      }

      console.log("✅ Senha válida");

      // Concluir o tratamento
      const concluido = await Prontuario.concluirTratamento(id, usuario.id);

      if (!concluido) {
        console.log(`❌ Não foi possível concluir - ID: ${id}`);
        return res.status(400).json({ error: "Tratamento já foi concluído ou não encontrado" });
      }

      console.log(`✅ Tratamento ${id} concluído por ${usuario.nome}`);

      // Retornar dados do usuário que concluiu
      res.status(200).json({
        success: true,
        message: "Tratamento concluído com sucesso",
        usuario_conclusao: {
          id: usuario.id,
          nome: usuario.nome,
          re: usuario.re
        }
      });
    } catch (err) {
      console.error("❌ Erro ao concluir tratamento:", err);
      next(err);
    }
  }
}

export default ProntuarioController;
