import express from "express";
import cors from "cors";
import manipuladorDeErros from "./middlewares/manipuladorDeErros.js";
import routes from "./routes/index.js";

const app = express();

// Desabilitar etag globalmente
app.set('etag', false);

// Configuração dinâmica de CORS
const allowedOrigins = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(',')
  : ['http://localhost:3001'];

// CORS configurado para aceitar qualquer origem (facilita acesso pela rede)
app.use(cors({
  origin: function(origin, callback) {
    // Permite requisições sem origin (como Postman) ou de qualquer origem
    console.log('🌐 Requisição de origem:', origin || 'sem origin');
    callback(null, true);
  },
  methods: ["GET", "POST", "PUT", "DELETE", "PATCH"],
  allowedHeaders: ["Content-Type", "Authorization"],
  credentials: true
}));

console.log('✅ CORS configurado para aceitar todas as origens');
console.log('📋 Origens permitidas configuradas:', allowedOrigins);

app.use(express.json());

// Health check endpoint para Docker/Kubernetes
app.get('/healthz', (req, res) => {
  res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
});

routes(app);
app.use(manipuladorDeErros);

export default app;
