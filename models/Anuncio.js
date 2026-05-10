// backend/models/Anuncio.js
import mongoose from 'mongoose';

const AnuncioSchema = new mongoose.Schema({
  titulo:      { type: String, required: true },
  contenido:   { type: String, required: true },
  tipo:        { type: String, enum: ['todos','negocios','clientes'], default: 'todos' },
  publicado:   { type: Boolean, default: true },
  autor:       { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

export default mongoose.model('Anuncio', AnuncioSchema);