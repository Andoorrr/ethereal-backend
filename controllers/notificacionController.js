// backend/controllers/notificacionController.js
import Notificacion from '../models/Notificacion.js';

// ── Crear notificación (re-exportado desde helper para compatibilidad) ──
export const crearNotificacion = async ({ usuarioId, tipo, titulo, mensaje, link = '' }) => {
  try {
    await Notificacion.create({ usuario: usuarioId, tipo, titulo, mensaje, link });
  } catch (err) {
    console.error('⚠️ Error creando notificación:', err.message);
  }
};

// ── GET /api/notificaciones — mis notificaciones ──────────────
export const misNotificaciones = async (req, res, next) => {
  try {
    const notificaciones = await Notificacion.find({ usuario: req.usuario._id })
      .sort({ createdAt: -1 })
      .limit(30);
    const noLeidas = notificaciones.filter(n => !n.leida).length;
    res.json({ ok: true, notificaciones, noLeidas });
  } catch (error) { next(error); }
};

// ── PATCH /api/notificaciones/:id/leer ────────────────────────
export const marcarLeida = async (req, res, next) => {
  try {
    await Notificacion.findOneAndUpdate(
      { _id: req.params.id, usuario: req.usuario._id },
      { leida: true }
    );
    res.json({ ok: true });
  } catch (error) { next(error); }
};

// ── PATCH /api/notificaciones/leer-todas ──────────────────────
export const marcarTodasLeidas = async (req, res, next) => {
  try {
    await Notificacion.updateMany({ usuario: req.usuario._id, leida: false }, { leida: true });
    res.json({ ok: true });
  } catch (error) { next(error); }
};

// ── DELETE /api/notificaciones/:id ───────────────────────────
export const eliminarNotificacion = async (req, res, next) => {
  try {
    await Notificacion.findOneAndDelete({ _id: req.params.id, usuario: req.usuario._id });
    res.json({ ok: true });
  } catch (error) { next(error); }
};