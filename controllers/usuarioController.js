// controllers/usuarioController.js
import User from '../models/User.js';

// ─── RF03: Ver perfil ────────────────────────────────────────
export const obtenerPerfil = async (req, res) => {
  res.json({ ok: true, usuario: req.usuario });
};

// ─── Obtener datos propios (con foto) ───────────────────────
export const obtenerYo = async (req, res, next) => {
  try {
    const user = await User.findById(req.usuario._id).select('-password');
    res.json({ ok: true, usuario: user });
  } catch (error) { next(error); }
};

// ─── RF03: Editar perfil (nombre, telefono, bio, foto) ──────
export const editarPerfil = async (req, res, next) => {
  try {
    const { nombre, telefono, bio, foto } = req.body;

    const usuario = await User.findByIdAndUpdate(
      req.usuario._id,
      { nombre, telefono, bio, foto },
      { new: true, runValidators: true }
    ).select('-password');

    res.json({ ok: true, mensaje: 'Perfil actualizado.', usuario });
  } catch (error) {
    next(error);
  }
};

// ─── Alias para el frontend (/usuarios/perfil) ───────────────
export const actualizarPerfil = editarPerfil;

// ─── Cambiar contraseña ──────────────────────────────────────
export const cambiarPassword = async (req, res, next) => {
  try {
    const { passwordActual, passwordNueva } = req.body;

    const usuario = await User.findById(req.usuario._id).select('+password');
    if (!(await usuario.compararPassword(passwordActual))) {
      return res.status(400).json({ ok: false, mensaje: 'Contraseña actual incorrecta.' });
    }

    usuario.password = passwordNueva;
    await usuario.save();

    res.json({ ok: true, mensaje: 'Contraseña actualizada correctamente.' });
  } catch (error) {
    next(error);
  }
};

// ─── ADMIN: Listar todos los usuarios ────────────────────────
export const listarUsuarios = async (req, res, next) => {
  try {
    const usuarios = await User.find().sort({ createdAt: -1 });
    res.json({ ok: true, total: usuarios.length, usuarios });
  } catch (error) {
    next(error);
  }
};