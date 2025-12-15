import mongoose from "mongoose";

export const autorSchema = new mongoose.Schema(
  {
    id: { type: String },
    nome: {
       type: String, required: [true, 'O nome do autor é obrigatório.' ] 
      
      },
    nacionalidade: { type: String }
  },
  { versionKey: false }
);

const autor = mongoose.model("Autor", autorSchema);

export default autor;
