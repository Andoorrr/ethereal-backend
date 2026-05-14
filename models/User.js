// models/User.js
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const userSchema = new mongoose.Schema(
  {
    nombre: {
      type: String,
      required: [true, 'El nombre es requerido'],
      trim: true,
      maxlength: [100, 'Nombre máximo 100 caracteres'],
    },
    correo: {
      type: String,
      required: [true, 'El correo es requerido'],
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, 'Correo inválido'],
    },
    password: {
      type: String,
      required: [true, 'La contraseña es requerida'],
      minlength: [6, 'Mínimo 6 caracteres'],
      select: false,
    },
    dni: {
      type: String,
      trim: true,
      match: [/^\d{8}$/, 'El DNI debe tener 8 dígitos'],
      default: '',
    },
    telefono: { type: String, trim: true, default: '' },
    bio:      { type: String, default: '', maxlength: [500, 'Bio máximo 500 caracteres'] },
    foto:     { type: String, default: '' },
    rol: {
      type: String,
      enum: ['cliente', 'negocio', 'admin'],
      default: 'cliente',
    },
    activo:  { type: Boolean, default: true },

    // ── Campos admin ──────────────────────────────────────────
    baneado:     { type: Boolean, default: false },
    motivoBaneo: { type: String,  default: '' },

    // ── Google OAuth ──────────────────────────────────────────
    googleId: { type: String, default: null },

    resetPasswordToken:   String,
    resetPasswordExpires: Date,
  },
  { timestamps: true }
);

userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

userSchema.methods.compararPassword = async function (passwordIngresada) {
  return await bcrypt.compare(passwordIngresada, this.password);
};

const User = mongoose.model('User', userSchema);
export default User;