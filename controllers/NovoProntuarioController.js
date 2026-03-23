import NovoProntuario from "../models/NovoProntuario.js";

/**
 * Lista todos os registros de prontuario_geral de um solipede específico,
 * incluindo dados completos de todas as sub-tabelas (tratamentos, restricoes,
 * dietas, suplementacoes, movimentacoes).
 *
 * GET /gestaoFVR/prontuario/novo-modelo/:numero
 */
export const listarPorSolipede = async (req, res) => {
  try {
    const { numero } = req.params;

    console.log("═".repeat(80));
    console.log("🎯 CONTROLLER: NovoProntuario.listarPorSolipede");
    console.log(`   numero_solipede: ${numero}`);
    console.log("═".repeat(80));

    if (!numero) {
      return res.status(400).json({ erro: "número do solipede é obrigatório" });
    }

    const dados = await NovoProntuario.listarPorSolipede(numero);

    console.log(`✅ Retornando ${dados.length} registro(s) para solipede ${numero}`);
    res.json(dados);
  } catch (error) {
    console.error("❌ Erro ao listar prontuario_geral por solipede:", error);
    res.status(500).json({ erro: "Erro ao buscar prontuários: " + error.message });
  }
};

/**
 * Lista TODOS os registros de prontuario_geral (todos os solipedes),
 * com dados completos de todas as sub-tabelas.
 *
 * GET /gestaoFVR/prontuario/novo-modelo
 */
export const listarTodos = async (req, res) => {
  try {
    console.log("═".repeat(80));
    console.log("🎯 CONTROLLER: NovoProntuario.listarTodos");
    console.log("═".repeat(80));

    const dados = await NovoProntuario.listarTodos();

    console.log(`✅ Retornando ${dados.length} registro(s)`);
    res.json(dados);
  } catch (error) {
    console.error("❌ Erro ao listar todos os prontuario_geral:", error);
    res.status(500).json({ erro: "Erro ao buscar prontuários: " + error.message });
  }
};
