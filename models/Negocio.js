// models/Negocio.js
import mongoose from 'mongoose';

const horarioSchema = new mongoose.Schema({
  dia: {
    type: String,
    enum: ['lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado', 'domingo'],
    required: true,
  },
  abierto:    { type: Boolean, default: true },
  horaInicio: { type: String, default: '09:00' },
  horaFin:    { type: String, default: '18:00' },
});

const negocioSchema = new mongoose.Schema(
  {
    propietario: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    nombre: {
      type: String,
      required: [true, 'El nombre del negocio es requerido'],
      trim: true,
    },
    descripcion: {
      type: String,
      trim: true,
      maxlength: [500, 'Descripción máximo 500 caracteres'],
    },
    categoria: {
      type: String,
      enum: ['cancha', 'salon', 'spa', 'consultorio', 'estudio', 'otro'],
      default: 'otro',
    },
    direccion:    { type: String, trim: true },
    telefono:     { type: String, trim: true },
    correo:       { type: String, trim: true },
    logo:         { type: String },
    activo:       { type: Boolean, default: true },
    duracionSlot: { type: Number, default: 60, min: 15 },
    horarios: {
      type: [horarioSchema],
      default: () => [
        { dia: 'lunes',     abierto: true,  horaInicio: '09:00', horaFin: '18:00' },
        { dia: 'martes',    abierto: true,  horaInicio: '09:00', horaFin: '18:00' },
        { dia: 'miercoles', abierto: true,  horaInicio: '09:00', horaFin: '18:00' },
        { dia: 'jueves',    abierto: true,  horaInicio: '09:00', horaFin: '18:00' },
        { dia: 'viernes',   abierto: true,  horaInicio: '09:00', horaFin: '18:00' },
        { dia: 'sabado',    abierto: false, horaInicio: '09:00', horaFin: '13:00' },
        { dia: 'domingo',   abierto: false, horaInicio: '09:00', horaFin: '13:00' },
      ],
    },

    // ── Campos admin ──────────────────────────────────────────
    estado:           { type: String, enum: ['activo', 'suspendido', 'baneado'], default: 'activo' },
    verificado:       { type: Boolean, default: false },
    motivoSuspension: { type: String, default: '' },
    suspendidoHasta:  { type: Date },

    // ── Solicitud de cambio pendiente ─────────────────────────
    cambiosPendientes: {
      datos:     { type: mongoose.Schema.Types.Mixed, default: null }, // { nombre, descripcion, telefono }
      estado:    { type: String, enum: ['pendiente', 'aprobado', 'rechazado'], default: null },
      motivoRechazo: { type: String, default: '' },
      fechaSolicitud: { type: Date },
    },
  },
  { timestamps: true }
);

const Negocio = mongoose.model('Negocio', negocioSchema);
export default Negocio;