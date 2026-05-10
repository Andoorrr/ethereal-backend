// backend/models/Ticket.js
import mongoose from 'mongoose';

const MensajeSchema = new mongoose.Schema({
  autor:     { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  rolAutor:  { type: String, enum: ['usuario','admin'], required: true },
  contenido: { type: String, required: true },
  leido:     { type: Boolean, default: false },
}, { timestamps: true });

const TicketSchema = new mongoose.Schema({
  codigo:    { type: String, unique: true }, // TKT-00001
  titulo:    { type: String, required: true },
  tipo:      {
    type: String,
    enum: ['reporte_negocio','reporte_cliente','consulta','problema_tecnico','otro'],
    default: 'consulta',
  },
  estado:    {
    type: String,
    enum: ['abierto','en_proceso','resuelto','cerrado'],
    default: 'abierto',
  },
  prioridad: { type: String, enum: ['baja','media','alta'], default: 'media' },
  usuario:   { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  negocio:   { type: mongoose.Schema.Types.ObjectId, ref: 'Negocio' },
  mensajes:  [MensajeSchema],
}, { timestamps: true });

// Auto-generar código TKT-XXXXX
TicketSchema.pre('save', async function(next) {
  if (this.isNew) {
    const count = await mongoose.model('Ticket').countDocuments();
    this.codigo = `TKT-${String(count + 1).padStart(5, '0')}`;
  }
  next();
});

export default mongoose.model('Ticket', TicketSchema);