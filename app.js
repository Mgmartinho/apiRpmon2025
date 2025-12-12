/* eslint-disable no-unused-vars */
import express from 'express';
import mongoose from 'mongoose';
import manipuladorDeErros from './middlewares/manipuladorDeErros.js';

import conectaNaDatabase from './config/dbConnect.js';

import routes from './routes/index.js';

const db = await conectaNaDatabase();

db.on('error', (erro) => {
    console.error('Erro na conexão com o banco de dados', erro);
})

db.once('open', () => {
    console.log('Conexão com o banco de dados realizada com sucesso');
})

const app = express();
routes(app);

app.use(manipuladorDeErros)

export default app;


// mongodb+srv://admin:<db_password>@livraria.4d43is2.mongodb.net/?appName=Livraria