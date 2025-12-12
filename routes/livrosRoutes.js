import express from 'express';

import LivroController from '../controllers/livroController.js'; 

const routes = express.Router();
routes.get('/livros', LivroController.ListarLivro);
routes.get('/livros/busca', LivroController.listarLivroPorEditor);
routes.get('/livros/:id', LivroController.ListarLivroPorId);
routes.post('/livros', LivroController.CadastrarLivro);
routes.put('/livros/:id', LivroController.atualizarLivro);  
routes.delete('/livros/:id', LivroController.excluirLivro);

export default routes;