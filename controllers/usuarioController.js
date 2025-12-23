import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import Usuario from "../models/Usuario.js";

class UsuarioController {
  static async login(req, res) {
    try {
      const { email, senha } = req.body;

      if (!email || !senha)
        return res.status(400).json({ error: "Email e senha são obrigatórios" });

      const usuario = await Usuario.buscarPorEmail(email);
      if (!usuario)
        return res.status(401).json({ error: "Usuário ou senha inválidos" });

      const senhaValida = await bcrypt.compare(senha, usuario.senha);
      if (!senhaValida)
        return res.status(401).json({ error: "Usuário ou senha inválidos" });

      const token = jwt.sign(
        {
          id: usuario.id,
          nome: usuario.nome,
          email: usuario.email,
          perfil: usuario.perfil,
        },
        process.env.JWT_SECRET,
        { expiresIn: "8h" }
      );

      res.json({
        token,
        usuario: {
          id: usuario.id,
          nome: usuario.nome,
          registro: usuario.re,
          email: usuario.email,
          perfil: usuario.perfil,
        },
      });
    } catch (err) {
      console.error("Erro login:", err);
      res.status(500).json({ error: "Erro interno" });
    }
  }

  static async criar(req, res) {
    try {
      const { nome, registro, email, senha, perfil } = req.body;

      // Validações
      if (!nome || !registro || !email || !senha || !perfil) {
        return res.status(400).json({ error: "Todos os campos são obrigatórios" });
      }

      // Verifica se email já existe
      const usuarioExistente = await Usuario.buscarPorEmail(email);
      if (usuarioExistente) {
        return res.status(400).json({ error: "Este email já está registrado" });
      }

      // Hash da senha
      const senhaHash = await bcrypt.hash(senha, 10);

      // Cria o usuário no banco
      await Usuario.criar({
        nome,
        re: registro,
        email,
        senha: senhaHash,
        perfil,
      });

      res.status(201).json({ message: "Usuário criado com sucesso" });
    } catch (err) {
      console.error("Erro ao criar usuário:", err);
      res.status(500).json({ error: "Erro ao criar usuário" });
    }
  }

  static async listarTodos(req, res) {
    try {
      const usuarios = await Usuario.listarTodos();
      res.json(usuarios);
    } catch (err) {
      console.error("Erro ao listar usuários:", err);
      res.status(500).json({ error: "Erro ao listar usuários" });
    }
  }

  static async buscarPorId(req, res) {
    try {
      const { id } = req.params;
      const usuario = await Usuario.buscarPorId(id);
      
      if (!usuario) {
        return res.status(404).json({ error: "Usuário não encontrado" });
      }

      res.json(usuario);
    } catch (err) {
      console.error("Erro ao buscar usuário:", err);
      res.status(500).json({ error: "Erro ao buscar usuário" });
    }
  }

  static async atualizarDados(req, res) {
    try {
      const { id } = req.params;
      const { nome, registro, email } = req.body;

      if (!nome || !registro || !email) {
        return res.status(400).json({ error: "Todos os campos são obrigatórios" });
      }

      await Usuario.atualizarDados(id, { nome, registro, email });

      // Busca o usuário atualizado
      const usuarioAtualizado = await Usuario.buscarPorId(id);

      res.json({
        message: "Dados atualizados com sucesso",
        usuario: usuarioAtualizado,
      });
    } catch (err) {
      console.error("Erro ao atualizar dados:", err);
      res.status(500).json({ error: "Erro ao atualizar dados" });
    }
  }

  static async atualizarPerfil(req, res) {
    try {
      const { id } = req.params;
      const { perfil } = req.body;

      if (!perfil) {
        return res.status(400).json({ error: "Perfil é obrigatório" });
      }

      if (!["CONSULTA", "OPERADOR", "ADMINISTRADOR"].includes(perfil)) {
        return res.status(400).json({ error: "Perfil inválido" });
      }

      await Usuario.atualizarPerfil(id, perfil);

      res.json({ message: "Perfil atualizado com sucesso" });
    } catch (err) {
      console.error("Erro ao atualizar perfil:", err);
      res.status(500).json({ error: "Erro ao atualizar perfil" });
    }
  }

  static async alterarSenha(req, res) {
    try {
      const { senhaAtual, novaSenha } = req.body;
      const usuarioId = req.usuario.id;

      if (!senhaAtual || !novaSenha) {
        return res.status(400).json({ error: "Senha atual e nova senha são obrigatórias" });
      }

      if (novaSenha.length < 6) {
        return res.status(400).json({ error: "A nova senha deve ter no mínimo 6 caracteres" });
      }

      // Busca o usuário com senha
      const usuario = await Usuario.buscarPorEmail(req.usuario.email);
      if (!usuario) {
        return res.status(404).json({ error: "Usuário não encontrado" });
      }

      // Verifica senha atual
      const senhaValida = await bcrypt.compare(senhaAtual, usuario.senha);
      if (!senhaValida) {
        return res.status(401).json({ error: "Senha atual incorreta" });
      }

      // Hash da nova senha
      const novaSenhaHash = await bcrypt.hash(novaSenha, 10);

      // Atualiza senha
      await Usuario.atualizarSenha(usuarioId, novaSenhaHash);

      res.json({ message: "Senha alterada com sucesso" });
    } catch (err) {
      console.error("Erro ao alterar senha:", err);
      res.status(500).json({ error: "Erro ao alterar senha" });
    }
  }

  static async alterarSenhaAdmin(req, res) {
    try {
      const { id } = req.params;
      const { novaSenha } = req.body;

      // Verifica se usuário logado é ADMINISTRADOR
      if (req.usuario.perfil !== "ADMINISTRADOR") {
        return res.status(403).json({ error: "Apenas administradores podem alterar senhas de outros usuários" });
      }

      if (!novaSenha) {
        return res.status(400).json({ error: "Nova senha é obrigatória" });
      }

      if (novaSenha.length < 6) {
        return res.status(400).json({ error: "A nova senha deve ter no mínimo 6 caracteres" });
      }

      // Hash da nova senha
      const novaSenhaHash = await bcrypt.hash(novaSenha, 10);

      // Atualiza senha
      await Usuario.atualizarSenha(id, novaSenhaHash);

      res.json({ message: "Senha alterada com sucesso" });
    } catch (err) {
      console.error("Erro ao alterar senha:", err);
      res.status(500).json({ error: "Erro ao alterar senha" });
    }
  }
}

export default UsuarioController;
