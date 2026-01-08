import HistoricoAlteracoes from "../models/HistoricoAlteracoes.js";

class HistoricoAlteracoesController {
  // Listar histórico de um solípede
  static async listarPorSolipede(req, res, next) {
    try {
      const { numero } = req.params;
      const historico = await HistoricoAlteracoes.listarPorRegistro('solipede', numero);
      
      res.json(historico);
    } catch (err) {
      next(err);
    }
  }

  // Listar histórico de um prontuário
  static async listarPorProntuario(req, res, next) {
    try {
      const { id } = req.params;
      const historico = await HistoricoAlteracoes.listarPorRegistro('prontuario', id);
      
      res.json(historico);
    } catch (err) {
      next(err);
    }
  }

  // Listar todas as alterações recentes
  static async listarRecentes(req, res, next) {
    try {
      const limite = parseInt(req.query.limite) || 100;
      const tabela = req.query.tabela;

      let historico;
      if (tabela) {
        historico = await HistoricoAlteracoes.listarPorTabela(tabela, limite);
      } else {
        // Se não especificar tabela, buscar de todas
        const sql = `
          SELECT 
            ha.*,
            u.nome AS usuario_nome,
            u.email AS usuario_email
          FROM historico_alteracoes ha
          LEFT JOIN usuarios u ON ha.usuario_id = u.id
          ORDER BY ha.data_alteracao DESC
          LIMIT ?
        `;
        const pool = (await import("../config/mysqlConnect.js")).default;
        const [rows] = await pool.query(sql, [limite]);
        historico = rows;
      }
      
      res.json(historico);
    } catch (err) {
      next(err);
    }
  }
}

export default HistoricoAlteracoesController;
