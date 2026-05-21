// backend/models/Conversacion.js
import mongoose from 'mongoose';

const MensajeSchema = new mongoose.Schema({
  autor:    { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  rolAutor: { type: String, enum: ['cliente', 'negocio'], required: true },
  contenido:{ type: String, required: true, trim: true },
  leido:    { type: Boolean, default: false },
}, { timestamps: true });

const ConversacionSchema = new mongoose.Schema({
  cliente:       { type: mongoose.Schema.Types.ObjectId, ref: 'User',    required: true },
  negocio:       { type: mongoose.Schema.Types.ObjectId, ref: 'Negocio', required: true },
  mensajes:      [MensajeSchema],
  ultimoMensaje: { type: Date, default: Date.now },
  estado:        { type: String, enum: ['activo','cerrado'], default: 'activo' },
}, { timestamps: true });

// Índice para encontrar conversación entre cliente y negocio rápidamente
ConversacionSchema.index({ cliente: 1, negocio: 1 }, { unique: true });

export default mongoose.model('Conversacion', ConversacionSchema);