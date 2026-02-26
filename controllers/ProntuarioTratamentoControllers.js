import ProntuarioTratamentos from "../models/ProntuarioTratamento.js";

export const listar = async (req, res) => {
  try {
    const { prontuarioId } = req.params;
    const dados = await ProntuarioTratamentos.listarPorProntuario(prontuarioId);
    res.json(dados);
  } catch (error) {
    res.status(500).json({ erro: error.message });
  }
};

export const criar = async (req, res) => {
  try {
    const id = await ProntuarioTratamentos.criar(req.body);
    res.status(201).json({ id });
  } catch (error) {
    res.status(500).json({ erro: error.message });
  }
};

export const atualizarStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, usuario_id } = req.body;

    const sucesso = await ProntuarioTratamentos.atualizarStatus(id, status, usuario_id);

    if (!sucesso) return res.status(404).json({ erro: "Não encontrado" });

    res.json({ mensagem: "Status atualizado" });
  } catch (error) {
    res.status(500).json({ erro: error.message });
  }
};

export const excluir = async (req, res) => {
  try {
    const { id } = req.params;
    const sucesso = await ProntuarioTratamentos.excluir(id);

    if (!sucesso) return res.status(404).json({ erro: "Não encontrado" });

    res.json({ mensagem: "Tratamento removido" });
  } catch (error) {
    res.status(500).json({ erro: error.message });
  }
};