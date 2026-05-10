// app.js — Plataforma de Reservas y Alquileres en Tiempo Real
import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import passport from './config/passport.js';

import connectDB from './config/db.js';
import errorHandler from './middleware/errorHandler.js';

import authRoutes    from './routes/authRoutes.js';
import usuarioRoutes from './routes/usuarioRoutes.js';
import negocioRoutes from './routes/negocioRoutes.js';
import reservaRoutes from './routes/reservaRoutes.js';
import uploadRoutes  from './routes/uploadRoutes.js';
import localRoutes   from './routes/localRoutes.js';
import adminRoutes   from './routes/adminRoutes.js';
import notifRoutes   from './routes/notificacionRoutes.js';
import ticketRoutes  from './routes/ticketRoutes.js';

import { iniciarRecordatorios } from './utils/recordatorios.js';
import { iniciarCronJobs }      from './utils/cronJobs.js';

// ─── Conexión a la base de datos ─────────────────────────────
connectDB();

const app = express();

// ─── Middlewares globales ────────────────────────────────────
app.use(cors({
  origin: [
    'http://localhost:5173',
    '*',
    'http://localhost:3000',
    'https://graceful-travesseiro-ff631e.netlify.app/',
  ],
  credentials: false,
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ─── Passport (Google OAuth) ─────────────────────────────────
app.use(passport.initialize());

// ─── Health check ────────────────────────────────────────────
app.get('/api/health', (req, res) => {
  res.json({
    ok: true,
    mensaje: 'Servidor de Reservas activo ✅',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
  });
});

// ─── Rutas principales ───────────────────────────────────────
app.use('/api/auth',           authRoutes);
app.use('/api/usuarios',       usuarioRoutes);
app.use('/api/negocios',       negocioRoutes);
app.use('/api/reservas',       reservaRoutes);
app.use('/api/upload',         uploadRoutes);
app.use('/api/locales',        localRoutes);
app.use('/api/admin',          adminRoutes);
app.use('/api/notificaciones', notifRoutes);
app.use('/api/tickets',        ticketRoutes);

// ─── Ruta no encontrada ──────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({ ok: false, mensaje: `Ruta '${req.originalUrl}' no encontrada.` });
});

// ─── Manejador de errores ────────────────────────────────────
app.use(errorHandler);

// ─── Inicio del servidor ─────────────────────────────────────
const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`\n🚀 Servidor corriendo en http://localhost:${PORT}`);
  console.log(`📡 Entorno: ${process.env.NODE_ENV || 'development'}\n`);
  iniciarRecordatorios();
  iniciarCronJobs();
});