import ProntuarioSuplementacoes from "../models/ProntuarioSuplementacoes.js";

export const listar = async (req, res) => {
  try {
    const { prontuarioId } = req.params;
    const dados = await ProntuarioSuplementacoes.listarPorProntuario(prontuarioId);
    res.json(dados);
  } catch (error) {
    res.status(500).json({ erro: error.message });
  }
};

export const criar = async (req, res) => {
  try {
    const id = await ProntuarioSuplementacoes.criar(req.body);
    res.status(201).json({ id });
  } catch (error) {
    res.status(500).json({ erro: error.message });
  }
};

export const excluir = async (req, res) => {
  try {
    const { id } = req.params;
    const sucesso = await ProntuarioSuplementacoes.excluir(id);
    if (!sucesso) return res.status(404).json({ erro: "Não encontrado" });

    res.json({ mensagem: "Suplementação removida" });
  } catch (error) {
    res.status(500).json({ erro: error.message });
  }
};