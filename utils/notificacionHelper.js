// backend/utils/notificacionHelper.js
// Función standalone sin dependencias circulares
import Notificacion from '../models/Notificacion.js';

export const crearNotificacion = async ({ usuarioId, tipo, titulo, mensaje, link = '' }) => {
  try {
    await Notificacion.create({ usuario: usuarioId, tipo, titulo, mensaje, link });
  } catch (err) {
    console.error('⚠️ Error creando notificación:', err.message);
  }
};