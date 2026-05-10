// middleware/auth.js
import jwt from 'jsonwebtoken';
import User from '../models/User.js';

// Verifica que el token JWT sea válido
export const proteger = async (req, res, next) => {
  try {
    let token;

    if (req.headers.authorization?.startsWith('Bearer ')) {
      token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
      return res.status(401).json({ mensaje: 'No autorizado. Token requerido.' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.usuario = await User.findById(decoded.id).select('-password');

    if (!req.usuario || !req.usuario.activo) {
      return res.status(401).json({ mensaje: 'Usuario no encontrado o inactivo.' });
    }

    // ── Si el usuario está baneado, revocar acceso inmediatamente ──
    if (req.usuario.baneado) {
      return res.status(403).json({
        ok:       false,
        bloqueado: true,
        tipo:     'baneado',
        entidad:  'usuario',
        motivo:   req.usuario.motivoBaneo || 'Cuenta baneada por violación de términos de servicio.',
        mensaje:  'Tu cuenta ha sido baneada. Contacta soporte para más información.',
      });
    }

    next();
  } catch (error) {
    return res.status(401).json({ mensaje: 'Token inválido o expirado.' });
  }
};

// Restringe acceso a roles específicos
export const autorizar = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.usuario.rol)) {
      return res.status(403).json({
        mensaje: `Rol '${req.usuario.rol}' no tiene permiso para esta acción.`,
      });
    }
    next();
  };
};