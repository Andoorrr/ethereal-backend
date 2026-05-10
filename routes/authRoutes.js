// backend/routes/authRoutes.js — versión con Google OAuth
import { Router } from 'express';
import jwt from 'jsonwebtoken';
import passport from '../config/passport.js';
import { registrar, login } from '../controllers/authController.js';
import { proteger } from '../middleware/auth.js';
import User from '../models/User.js';

const router = Router();

const generarToken = (usuario) =>
  jwt.sign(
    { id: usuario._id, rol: usuario.rol },
    process.env.JWT_SECRET,
    { expiresIn: '7d' }
  );

// ── Rutas normales ────────────────────────────────────────────
router.post('/registro',  registrar);
router.post('/registrar', registrar); // alias por compatibilidad
router.post('/login',     login);

// ── Obtener usuario autenticado ───────────────────────────────
router.get('/yo', proteger, async (req, res) => {
  try {
    const usuario = await User.findById(req.usuario.id).select('-password');
    if (!usuario) return res.status(404).json({ ok: false, mensaje: 'Usuario no encontrado.' });
    res.json({ ok: true, usuario });
  } catch (err) {
    res.status(500).json({ ok: false, mensaje: 'Error del servidor.' });
  }
});

// ── Google OAuth ──────────────────────────────────────────────
// 1. Inicia el flujo de Google
router.get('/google',
  passport.authenticate('google', { scope: ['profile', 'email'], session: false })
);

// 2. Google redirige aquí con el código
router.get('/google/callback',
  passport.authenticate('google', { session: false, failureRedirect: `${process.env.FRONTEND_URL}/login?error=google` }),
  (req, res) => {
    const usuario = req.user;
    const token   = generarToken(usuario);

    // Redirigir al frontend con el token en la URL
    const destino = usuario.rol === 'admin'   ? '/admin-panel'
                  : usuario.rol === 'negocio' ? '/panel'
                  : '/mi-cuenta';

    res.redirect(
      `${process.env.FRONTEND_URL}/auth/google/success?token=${token}&destino=${destino}`
    );
  }
);

export default router;