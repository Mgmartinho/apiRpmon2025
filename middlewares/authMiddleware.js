import jwt from "jsonwebtoken";

export default function authMiddleware(req, res, next) {
  const authHeader = req.headers.authorization;

  console.log("\n🔐 AUTH MIDDLEWARE - Verificando token");
  console.log("   Authorization Header:", authHeader ? "✅ Presente" : "❌ Ausente");

  if (!authHeader) {
    console.log("❌ Token não informado");
    return res.status(401).json({ error: "Token não informado" });
  }

  const [, token] = authHeader.split(" ");

  console.log("   Token extraído:", token ? "✅ Sim" : "❌ Não");

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // 🔥 usuário disponível em toda a requisição
    req.usuario = decoded;

    console.log("✅ Token decodificado com sucesso!");
    console.log("   ID:", decoded.id);
    console.log("   Nome:", decoded.nome);
    console.log("   Email:", decoded.email);
    console.log("   Perfil:", decoded.perfil);

    next();
  } catch (error) {
    console.error("❌ Erro ao decodificar token:", error.message);
    return res.status(401).json({ error: "Token inválido ou expirado" });
  }
}
