/* eslint-disable no-unused-vars */

function manipuladorDeErros(erro, req, res, next) {
    if (!erro) return next();

    if (erro.name === 'CastError') {
        res.status(400).send({ message: 'Um ou mais dados fornecidos estão incorretos.' });
    } else if (erro.name === 'ValidationError') {
        const mensagensErro = Object.values(erro.errors || {})
            .map((e) => e.message)
            .join('; ');
        res.status(400).send({ message: `Os seguintes erros foram encontrados: ${mensagensErro}` });
    } else {
        res.status(500).send({ message: 'Erro Interno de SERVIDOR' });
    }
}

export default manipuladorDeErros;


