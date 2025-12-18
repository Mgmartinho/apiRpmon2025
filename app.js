import express from "express";
import cors from "cors";
import manipuladorDeErros from "./middlewares/manipuladorDeErros.js";
import routes from "./routes/index.js";

const app = express();

app.use(cors({
  origin: "http://localhost:3001", // frontend
  methods: ["GET", "POST", "PUT", "DELETE"],
  allowedHeaders: ["Content-Type", "Authorization"]
}));

app.use(express.json());
routes(app);
app.use(manipuladorDeErros);
app.use(cors());

export default app;
