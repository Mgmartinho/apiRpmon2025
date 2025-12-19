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
}

export default UsuarioController;
