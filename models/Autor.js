import mongoose from "mongoose";

export const autorSchema = new mongoose.Schema(
  {
    nome: { type: String, required: true },
    nacionalidade: { type: String }
  },
  { versionKey: false }
);

const autor = mongoose.model("Autor", autorSchema);

export default autor;
