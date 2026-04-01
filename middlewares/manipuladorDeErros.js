/* eslint-disable no-unused-vars */
import { classifyMysqlError } from '../utils/apiError.js';

function manipuladorDeErros(erro, req, res, next) {
    if (!erro) return next();

    // AppError lançado intencionalmente via throw new AppError(...)
    if (erro.name === 'AppError' && erro.status) {
        return res.status(erro.status).json({
            error: erro.message,
            code: erro.code || 'APP_ERROR',
            categoria: erro.categoria || 'server',
        });
    }

    // Erros do driver MySQL (mysql2)
    const mysql = classifyMysqlError(erro);
    if (mysql) {
        const detalhes = process.env.NODE_ENV !== 'production'
            ? (erro.sqlMessage || erro.message)
            : undefined;
        return res.status(mysql.status).json({
            error: mysql.message,
            code: mysql.code,
            categoria: mysql.categoria,
            ...(detalhes && { detalhes }),
        });
    }

    // Erro com status HTTP explícito (ex: err.status = 401 lançado no authMiddleware)
    if (erro.status) {
        return res.status(erro.status).json({
            error: erro.message,
            code: 'APP_ERROR',
            categoria: erro.status < 500 ? 'request' : 'server',
        });
    }

    // Fallback: erro interno genérico
    console.error('❌ Erro não tratado pelo middleware:', erro);
    return res.status(500).json({
        error: 'Erro interno do servidor',
        code: 'INTERNAL_ERROR',
        categoria: 'server',
        ...(process.env.NODE_ENV !== 'production' && { detalhes: erro.message }),
    });
}

export default manipuladorDeErros;


