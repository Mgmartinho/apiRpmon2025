import autor from "../models/Autor.js";
class AutorController {
  static ListarAutores = async (req, res, next) => {
    try {
      const ListaAutor = await autor.find({});
      res.status(200).json(ListaAutor);
    } catch (erro) {
      next(erro)    
    }
  }

   static ListarAutorPorId  = async (req, res,next) => {
    try {
      const id =  req.params.id;

            const autoresResultado = await autor.findById(id);

            if (autoresResultado !== null) {
                res.status(200).send(autoresResultado);
            } else {
                res.status(404).send({ message: "Id do Autor não localizado." });
            }

    } catch (erro) {
     next(erro);
    }
  };

  static  CadastrarAutor = async(req, res,next) => {
    try {
      const NovoAutor = await autor.create(req.body);
      res.status(201).json({ message: "Autor cadastrado com sucesso!", autor: NovoAutor });
    } catch (erro) {
      next(erro)    
    }
  }

  static AtualizarAutor= async (req, res, next) => {
    try {
      const id = req.params.id;
      await autor.findByIdAndUpdate(id, req.body);
      res.status(200).json({ message: "Autor atualizado com sucesso!" });
    } catch (erro) {
      next(erro)    
    }
  }

  static  excluirAutor = async (req, res, next) => {
    try {
      const id = req.params.id;
      await autor.findByIdAndDelete(id);
      res.status(200).json({ message: "Autor removido com sucesso!" });
    } catch (erro) {
      next(erro)    
    }
  }
}

export default AutorController;
