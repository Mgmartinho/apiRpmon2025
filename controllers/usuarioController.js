import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import Usuario from "../models/Usuario.js";
import { handleControllerError } from "../utils/apiError.js";

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
      return handleControllerError(res, err, 'autenticação');
    }
  }

  static async criar(req, res) {
    try {
      const { nome, registro, email, senha, perfil } = req.body;

      // Validações
      if (!nome || !registro || !email || !senha) {
        return res.status(400).json({ error: "Nome, registro, email e senha são obrigatórios" });
      }

      // Verifica se email já existe
      const usuarioExistente = await Usuario.buscarPorEmail(email);
      if (usuarioExistente) {
        return res.status(400).json({ error: "Este email já está registrado" });
      }

      // Hash da senha
      const senhaHash = await bcrypt.hash(senha, 10);

      // Define perfil padrão como "Pendente de Aprovacao" se não especificado
      const perfilUsuario = perfil || "Pendente de Aprovacao";

      // Cria o usuário no banco
      await Usuario.criar({
        nome,
        re: registro,
        email,
        senha: senhaHash,
        perfil: perfilUsuario,
      });

      res.status(201).json({ 
        message: "Usuário criado com sucesso",
        perfil: perfilUsuario
      });
    } catch (err) {
      return handleControllerError(res, err, 'criação de usuário');
    }
  }

  static async listarTodos(req, res) {
    try {
      const usuarios = await Usuario.listarTodos();
      res.json(usuarios);
    } catch (err) {
      return handleControllerError(res, err, 'listagem de usuários');
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
      return handleControllerError(res, err, 'busca de usuário');
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
      return handleControllerError(res, err, 'atualização de dados do usuário');
    }
  }

  static async atualizarPerfil(req, res) {
    try {
      const { id } = req.params;
      const { perfil } = req.body;

      console.log("\n🔄 === ATUALIZAR PERFIL ===");
      console.log("   - Usuario ID:", id);
      console.log("   - Perfil recebido:", perfil);
      console.log("   - Tipo:", typeof perfil);
      console.log("   - Length:", perfil?.length);

      if (!perfil) {
        console.log("❌ Perfil não fornecido");
        return res.status(400).json({ error: "Perfil é obrigatório" });
      }

      const perfisValidos = [
        "Desenvolvedor",
        "Veterinario Admin",
        "Veterinario",
        "Enfermeiro Veterinario",
        "Coordenador Operacional",
        "Ferrador",
        "Pagador de cavalo",
        "Lancador de Carga Horaria",
        "Observacao Comportamental",
        "Consulta"
      ];

      console.log("   - Perfis válidos:", perfisValidos);
      console.log("   - Perfil está na lista?", perfisValidos.includes(perfil));

      if (!perfisValidos.includes(perfil)) {
        console.log("❌ Perfil inválido:", perfil);
        console.log("   - Comparações:");
        perfisValidos.forEach(p => {
          console.log(`     "${p}" === "${perfil}": ${p === perfil}`);
        });
        return res.status(400).json({ error: `Perfil inválido: "${perfil}"` });
      }

      console.log("✅ Perfil válido, atualizando no banco...");
      await Usuario.atualizarPerfil(id, perfil);

      console.log("✅ Perfil atualizado com sucesso!");
      res.json({ message: "Perfil atualizado com sucesso" });
    } catch (err) {
      return handleControllerError(res, err, 'atualização de perfil do usuário');
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
      return handleControllerError(res, err, 'alteração de senha');
    }
  }

  static async alterarSenhaAdmin(req, res) {
    try {
      const { id } = req.params;
      const { novaSenha } = req.body;

      // Verifica se usuário logado tem permissão (Desenvolvedor ou Veterinario Admin)
      const perfisAutorizados = ["Desenvolvedor", "Veterinario Admin"];
      if (!perfisAutorizados.includes(req.usuario.perfil)) {
        return res.status(403).json({ error: "Apenas Desenvolvedor ou Veterinário Admin podem alterar senhas de outros usuários" });
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
      return handleControllerError(res, err, 'alteração de senha admin');
    }
  }

  static async listarVeterinarios(req, res) {
    try {
      const veterinarios = await Usuario.listarVeterinarios();
      res.json(veterinarios);
    } catch (err) {
      return handleControllerError(res, err, 'listagem de veterinários');
    }
  }
}

export default UsuarioController;
