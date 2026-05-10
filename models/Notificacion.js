// backend/models/Notificacion.js
import mongoose from 'mongoose';

const NotificacionSchema = new mongoose.Schema({
  usuario:  { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  tipo:     {
    type: String,
    enum: ['nueva_reserva','reserva_confirmada','reserva_cancelada','reserva_completada',
           'anuncio','reporte','sistema'],
    required: true,
  },
  titulo:   { type: String, required: true },
  mensaje:  { type: String, required: true },
  leida:    { type: Boolean, default: false },
  link:     { type: String, default: '' }, // ruta frontend opcional
}, { timestamps: true });

export default mongoose.model('Notificacion', NotificacionSchema);