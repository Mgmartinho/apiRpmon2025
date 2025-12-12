import autor from "../models/Autor.js";
import livro from "../models/Livros.js";

class LivroController {
    static ListarLivro = async (req, res, next) => {
        try {
            const ListaLivros = await livro.find({});
            res.status(200).json(ListaLivros);
        } catch (erro) {
            next(erro)
        }
    }

    static ListarLivroPorId = async (req, res, next) => {
        try {
            const id = req.params.id;
            const LivroEncontrado = await livro.findById(id);
            res.status(200).json(LivroEncontrado);
        } catch (erro) {
            next(erro)
        }
    }

    static CadastrarLivro = async (req, res, next) => {
        const novoLivro = req.body;
        try {
            const autorEncontrado = await autor.findById(novoLivro.autor);
            const livroCompleto = { ...novoLivro, autor: { ...autorEncontrado._doc } };
            const livroCriado = await livro.create(livroCompleto);
            res.status(201).json({ message: "Livro Cadastrado com Sucesso!", livro: livroCriado });

        } catch (erro) {
            next(erro)
        }
    }

    static atualizarLivro = async (req, res, next) => {
        try {
            const id = req.params.id;
            await livro.findByIdAndUpdate(id, req.body);
            res.status(200).json({ message: "Livro Atualizado com Sucesso!" });
        } catch (erro) {
            next(erro)
        }
    }
    static excluirLivro = async (req, res, next) => {
        try {
            const id = req.params.id;
            await livro.findByIdAndDelete(id);
            res.status(200).json({ message: "Livro removido com Sucesso!" });
        } catch (erro) {
            next(erro)
        }
    }

    static listarLivroPorEditor = async (req, res, next) => {
        const editora = req.query.editora;
        try {
            const livrosPorEditora = await livro.find({ editora: editora });
            res.status(200).json(livrosPorEditora);
        } catch (erro) {
            next(erro)

        }
    }


}

export default LivroController;