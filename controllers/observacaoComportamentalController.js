import bcrypt from "bcryptjs";
import pool from "../config/mysqlConnect.js";
import ObservacaoComportamental from "../models/ObservacaoComportamental.js";
import { handleControllerError } from "../utils/apiError.js";

class ObservacaoComportamentalController {
  static async validarSenhaUsuario(usuarioLogado, senha) {
    const [usuarios] = await pool.query(
      "SELECT id, senha FROM usuarios WHERE id = ?",
      [usuarioLogado.id]
    );

    if (!usuarios || usuarios.length === 0) {
      const erro = new Error("Usuário não encontrado");
      erro.status = 401;
      throw erro;
    }

    const senhaValida = await bcrypt.compare(senha, usuarios[0].senha);
    if (!senhaValida) {
      const erro = new Error("Senha inválida");
      erro.status = 401;
      throw erro;
    }
  }

  static async listarSolipedesComObservacoes(req, res) {
    try {
      const numeros = await ObservacaoComportamental.listarSolipedesComObservacoes();
      return res.status(200).json(numeros);
    } catch (error) {
      return handleControllerError(res, error, "listagem de solípedes com observações");
    }
  }

  static async listarPorSolipede(req, res) {
    try {
      const { numero } = req.params;

      if (!numero) {
        return res.status(400).json({ error: "Número do solípede é obrigatório" });
      }

      const observacoes = await ObservacaoComportamental.listarPorSolipede(numero);
      return res.status(200).json(observacoes);
    } catch (error) {
      return handleControllerError(res, error, "busca de observações comportamentais");
    }
  }

  static async criar(req, res) {
    try {
      const { numero_solipede, observacao, recomendacoes, senha } = req.body;
      const usuario = req.usuario;

      if (!numero_solipede || !observacao) {
        return res.status(400).json({
          error: "Número do solípede e observação são obrigatórios",
        });
      }

      if (!usuario || !usuario.id) {
        return res.status(401).json({ error: "Usuário não autenticado" });
      }

      if (!senha) {
        return res.status(400).json({ error: "Senha é obrigatória" });
      }

      await ObservacaoComportamentalController.validarSenhaUsuario(usuario, senha);

      const id = await ObservacaoComportamental.criar({
        numero_solipede,
        observacao: observacao.trim(),
        recomendacoes: recomendacoes?.trim() || null,
        usuario_id: usuario.id,
      });

      return res.status(201).json({
        success: true,
        id,
        message: "Observação comportamental criada com sucesso",
      });
    } catch (error) {
      return handleControllerError(res, error, "criação de observação comportamental");
    }
  }

  static async atualizar(req, res) {
    try {
      const { id } = req.params;
      const { observacao, recomendacoes } = req.body;
      const usuario = req.usuario;

      if (!observacao || !observacao.trim()) {
        return res.status(400).json({ error: "Observação é obrigatória" });
      }

      if (!usuario || !usuario.id) {
        return res.status(401).json({ error: "Usuário não autenticado" });
      }

      const existe = await ObservacaoComportamental.buscarPorId(id);
      if (!existe) {
        return res.status(404).json({ error: "Observação não encontrada" });
      }

      await ObservacaoComportamental.atualizar(id, {
        observacao: observacao.trim(),
        recomendacoes: recomendacoes?.trim() || null,
        usuario_atualizacao: usuario.id,
      });

      return res.status(200).json({
        success: true,
        message: "Observação comportamental atualizada com sucesso",
      });
    } catch (error) {
      return handleControllerError(res, error, "atualização de observação comportamental");
    }
  }

  static async deletar(req, res) {
    try {
      const { id } = req.params;

      const existe = await ObservacaoComportamental.buscarPorId(id);
      if (!existe) {
        return res.status(404).json({ error: "Observação não encontrada" });
      }

      const removido = await ObservacaoComportamental.deletar(id);

      return res.status(200).json({
        success: removido,
        message: "Observação comportamental excluída com sucesso",
      });
    } catch (error) {
      return handleControllerError(res, error, "exclusão de observação comportamental");
    }
  }
}

export default ObservacaoComportamentalController;
