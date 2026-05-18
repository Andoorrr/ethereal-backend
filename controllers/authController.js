// controllers/authController.js
import jwt    from 'jsonwebtoken';
import User    from '../models/User.js';
import Negocio from '../models/Negocio.js';
import { waMensajeBienvenida } from '../utils/whatsapp.js';

const generarToken = (id) => jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: '7d' });

// ─── Registro ─────────────────────────────────────────────────
export const registrar = async (req, res, next) => {
  try {
    const { nombre, correo, password, telefono, dni, rol } = req.body;
    const existe = await User.findOne({ correo });
    if (existe) return res.status(400).json({ ok: false, mensaje: 'El correo ya está registrado.' });

    const usuario = await User.create({ nombre, correo, password, telefono, dni, rol });

    // ── WhatsApp de bienvenida ────────────────────────────────
    if (telefono) {
      await waMensajeBienvenida({ telefono, nombre, rol: rol || 'cliente' });
    }

    res.status(201).json({
      ok: true,
      mensaje: 'Usuario registrado exitosamente.',
      token:   generarToken(usuario._id),
      usuario: {
        id: usuario._id, nombre: usuario.nombre, correo: usuario.correo,
        rol: usuario.rol, foto: usuario.foto, dni: usuario.dni, telefono: usuario.telefono,
      },
    });
  } catch (error) { next(error); }
};

// ─── Login ────────────────────────────────────────────────────
export const login = async (req, res, next) => {
  try {
    const { correo, password } = req.body;
    if (!correo || !password)
      return res.status(400).json({ ok: false, mensaje: 'Correo y contraseña son requeridos.' });

    const usuario = await User.findOne({ correo }).select('+password');
    if (!usuario || !(await usuario.compararPassword(password)))
      return res.status(401).json({ ok: false, mensaje: 'Credenciales incorrectas.' });

    if (!usuario.activo)
      return res.status(403).json({ ok: false, mensaje: 'Cuenta desactivada. Contacta soporte.' });

    if (usuario.baneado) {
      return res.status(403).json({
        ok: false, bloqueado: true, tipo: 'baneado', entidad: 'usuario',
        motivo:  usuario.motivoBaneo || 'Violación de términos de servicio.',
        mensaje: 'Tu cuenta ha sido baneada.',
      });
    }

    if (usuario.rol === 'negocio') {
      const negocio = await Negocio.findOne({ propietario: usuario._id });
      if (negocio && negocio.estado !== 'activo') {
        return res.status(403).json({
          ok: false, bloqueado: true, tipo: negocio.estado, entidad: 'negocio',
          motivo:          negocio.motivoSuspension || '',
          suspendidoHasta: negocio.suspendidoHasta  || null,
          mensaje:         `Tu negocio está ${negocio.estado}.`,
        });
      }
    }

    res.json({
      ok: true,
      token: generarToken(usuario._id),
      usuario: {
        id: usuario._id, nombre: usuario.nombre, correo: usuario.correo,
        rol: usuario.rol, foto: usuario.foto, dni: usuario.dni, telefono: usuario.telefono,
      },
    });
  } catch (error) { next(error); }
};

export const yo = async (req, res) => {
  res.json({ ok: true, usuario: req.usuario });
};