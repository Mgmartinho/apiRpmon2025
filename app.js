import express from "express";
import cors from "cors";
import manipuladorDeErros from "./middlewares/manipuladorDeErros.js";
import routes from "./routes/index.js";

const app = express();

// Desabilitar etag globalmente
app.set('etag', false);

// Configuração dinâmica de CORS
const allowedOrigins = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(',').map(origin => origin.trim()).filter(Boolean)
  : ['http://localhost:3001'];

const corsOptions = {
  origin: function(origin, callback) {
    // Permite requisições sem origin (Postman, curl, requests locais)
    if (!origin) {
      return callback(null, true);
    }

    // Verifica whitelist configurada
    if (allowedOrigins.includes(origin)) {
      console.log('✅ CORS permitido (whitelist):', origin);
      return callback(null, true);
    }

    // Permite qualquer requisição da rede local 10.37.20.x
    if (/^https?:\/\/10\.37\.20\.\d{1,3}(:\d{1,5})?$/.test(origin)) {
      console.log('✅ CORS permitido (rede interna):', origin);
      return callback(null, true);
    }

    // Permite localhost
    if (/^https?:\/\/(localhost|127\.0\.0\.1)(:\d{1,5})?$/.test(origin)) {
      console.log('✅ CORS permitido (localhost):', origin);
      return callback(null, true);
    }

    console.warn('⛔ CORS bloqueado para origem:', origin);
    return callback(new Error('Not allowed by CORS'));
  },
  methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
  credentials: true,
  optionsSuccessStatus: 204,
};

app.use(cors(corsOptions));
app.options('*', cors(corsOptions));

console.log('✅ CORS configurado com whitelist de origens');
console.log('📋 Origens permitidas configuradas:', allowedOrigins);

app.use(express.json());

// Health check endpoint para Docker/Kubernetes
app.get('/healthz', (req, res) => {
  res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
});

routes(app);
app.use(manipuladorDeErros);

export default app;
