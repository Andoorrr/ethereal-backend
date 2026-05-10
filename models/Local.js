// backend/models/Local.js
import mongoose from 'mongoose';

const LocalSchema = new mongoose.Schema({
  negocio:     { type: mongoose.Schema.Types.ObjectId, ref: 'Negocio', required: true },
  nombre:      { type: String, required: true, trim: true },
  descripcion: { type: String, default: '' },
  categoria:   { type: String, default: 'otro' },
  precio:      { type: Number, default: 50 },
  capacidad:   { type: Number, default: 1 },
  imagenes:     [{ type: String }],
  servicios:    [{ type: String }],
  direccion:    { type: String, default: '' },
  tipoAlquiler: { type: String, enum: ['hospedaje', 'local', 'servicio'], default: 'servicio' },
  activo:       { type: Boolean, default: true },
}, { timestamps: true });

export default mongoose.model('Local', LocalSchema);