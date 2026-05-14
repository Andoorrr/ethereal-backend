// app.js — Plataforma de Reservas con Socket.IO
import 'dotenv/config';
import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
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
import { configurarSocket }     from './utils/socket.js';

connectDB();

const app    = express();
const server = http.createServer(app);

const ORIGENES_PERMITIDOS = [
  'http://localhost:5173',
  'http://localhost:3000',
  'https://poetic-taiyaki-c75cc3.netlify.app',
  'https://graceful-travesseiro-ff631e.netlify.app',
];

// ─── Socket.IO ───────────────────────────────────────────────
const io = new Server(server, {
  cors: { origin: ORIGENES_PERMITIDOS, credentials: true },
});
configurarSocket(io);
app.set('io', io); // disponible en controllers vía req.app.get('io')

// ─── Middlewares ─────────────────────────────────────────────
app.use(cors({ origin: ORIGENES_PERMITIDOS, credentials: true }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(passport.initialize());

app.get('/api/health', (req, res) => {
  res.json({ ok: true, mensaje: 'Servidor de Reservas activo ✅', version: '1.1.0', timestamp: new Date().toISOString() });
});

app.use('/api/auth',           authRoutes);
app.use('/api/usuarios',       usuarioRoutes);
app.use('/api/negocios',       negocioRoutes);
app.use('/api/reservas',       reservaRoutes);
app.use('/api/upload',         uploadRoutes);
app.use('/api/locales',        localRoutes);
app.use('/api/admin',          adminRoutes);
app.use('/api/notificaciones', notifRoutes);
app.use('/api/tickets',        ticketRoutes);

app.use((req, res) => {
  res.status(404).json({ ok: false, mensaje: `Ruta '${req.originalUrl}' no encontrada.` });
});

app.use(errorHandler);

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`\n🚀 Servidor corriendo en http://localhost:${PORT}`);
  console.log(`📡 Socket.IO activo`);
  console.log(`🌐 Entorno: ${process.env.NODE_ENV || 'development'}\n`);
  iniciarRecordatorios();
  iniciarCronJobs();
});