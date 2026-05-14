// backend/config/passport.js
import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import User from '../models/User.js';
import bcrypt from 'bcryptjs';

passport.use(new GoogleStrategy({
  clientID:     process.env.GOOGLE_CLIENT_ID,
  clientSecret: process.env.GOOGLE_CLIENT_SECRET,
  callbackURL:  process.env.GOOGLE_CALLBACK_URL ?? 'http://localhost:3001/api/auth/google/callback',
}, async (accessToken, refreshToken, profile, done) => {
  try {
    const correo = profile.emails?.[0]?.value;
    const foto   = profile.photos?.[0]?.value;
    const nombre = profile.displayName;

    if (!correo) return done(null, false, { message: 'No se pudo obtener el correo de Google.' });

    // Buscar usuario existente por googleId o correo
    let usuario = await User.findOne({ $or: [{ googleId: profile.id }, { correo }] });

    if (!usuario) {
      // Generar password random hasheado (requerido por schema)
      const salt            = await bcrypt.genSalt(10);
      const passwordRandom  = await bcrypt.hash(Math.random().toString(36).slice(-12), salt);

      usuario = await User.create({
        nombre,
        correo,
        foto:      foto ?? '',
        password:  passwordRandom,
        rol:       'cliente',
        googleId:  profile.id,
        activo:    true,
      });
    } else {
      // Vincular googleId
      if (!usuario.googleId) {
        usuario.googleId = profile.id;
        if (!usuario.foto && foto) usuario.foto = foto;
        await usuario.save();
      }
    }

    if (usuario.baneado) return done(null, false, { message: 'Cuenta baneada.' });

    return done(null, usuario);
  } catch (err) {
    return done(err, false);
  }
}));

export default passport;