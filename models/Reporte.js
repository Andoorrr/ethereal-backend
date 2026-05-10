// backend/models/Reporte.js
import mongoose from 'mongoose';

const ReporteSchema = new mongoose.Schema({
  tipo:        { type: String, enum: ['cliente_reporta_negocio','negocio_reporta_cliente'], required: true },
  reportador:  { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  reportado:   { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  negocio:     { type: mongoose.Schema.Types.ObjectId, ref: 'Negocio' },
  motivo:      { type: String, required: true },
  descripcion: { type: String, default: '' },
  estado:      { type: String, enum: ['pendiente','revisado','resuelto','desestimado'], default: 'pendiente' },
  accionAdmin: { type: String, default: '' },
}, { timestamps: true });

export default mongoose.model('Reporte', ReporteSchema);