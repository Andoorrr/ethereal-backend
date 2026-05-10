// backend/models/Reserva.js
import mongoose from 'mongoose';

const ReservaSchema = new mongoose.Schema({
  cliente:   { type: mongoose.Schema.Types.ObjectId, ref: 'User',    required: true },
  negocio:   { type: mongoose.Schema.Types.ObjectId, ref: 'Negocio', required: true },
  local:     { type: mongoose.Schema.Types.ObjectId, ref: 'Local',   default: null },

  // Rango de fechas (nuevo sistema)
  fechaInicio: { type: Date, required: true },
  fechaFin:    { type: Date },   // opcional — igual a fechaInicio para slots

  // Campos legacy para reservas por slot
  fecha:      { type: Date },
  horaInicio: { type: String, default: '' },
  horaFin:    { type: String, default: '' },

  notas:               { type: String, default: '' },
  estado:              { type: String, enum: ['pendiente','confirmada','cancelada','completada'], default: 'pendiente' },
  notificacionEnviada: { type: Boolean, default: false },
}, { timestamps: true });

// Índice para evitar reservas duplicadas en el mismo rango
ReservaSchema.index({ negocio: 1, local: 1, fechaInicio: 1, fechaFin: 1 });

export default mongoose.model('Reserva', ReservaSchema);