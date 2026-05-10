// routes/reservaRoutes.js
import { Router } from 'express';
import {
  obtenerDisponibilidad,
  crearReserva,
  crearReservaManual,
  cambiarEstadoReserva,
  cancelarReserva,
  misReservas,
  reservasDelNegocio,
  calendarioNegocio,
  finanzasNegocio,
} from '../controllers/reservaController.js';
import { proteger, autorizar } from '../middleware/auth.js';

const router = Router();

// Públicas / cliente
router.get('/disponibilidad',  obtenerDisponibilidad);
router.get('/calendario',      calendarioNegocio);

router.post('/',               proteger, crearReserva);
router.get('/mis-reservas',    proteger, misReservas);
router.patch('/:id/cancelar',  proteger, cancelarReserva);
router.patch('/:id/estado',    proteger, autorizar('negocio', 'admin'), cambiarEstadoReserva);

// Panel del negocio
router.get('/panel/negocio',   proteger, autorizar('negocio', 'admin'), reservasDelNegocio);
router.get('/panel/finanzas',  proteger, autorizar('negocio', 'admin'), finanzasNegocio);
router.post('/panel/manual',   proteger, autorizar('negocio', 'admin'), crearReservaManual);

export default router;