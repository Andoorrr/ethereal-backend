// backend/routes/ticketRoutes.js
import { Router } from 'express';
import { proteger, autorizar } from '../middleware/auth.js';
import {
  crearTicket, misTickets, getTicket,
  responderTicket, cerrarTicket,
  getAllTickets, cambiarEstadoTicket,
  crearTicketDesdeReporte,
} from '../controllers/ticketController.js';

const router = Router();

// ⚠️ Rutas específicas ANTES de /:id para evitar conflictos
router.get('/mis-tickets',          proteger, misTickets);
router.post('/desde-reporte',       proteger, autorizar('admin'), crearTicketDesdeReporte);

// Usuario
router.post('/',                    proteger, crearTicket);
router.get('/:id',                  proteger, getTicket);
router.post('/:id/responder',       proteger, responderTicket);
router.patch('/:id/cerrar',         proteger, cerrarTicket);

// Admin
router.get('/',                     proteger, autorizar('admin'), getAllTickets);
router.patch('/:id/estado',         proteger, autorizar('admin'), cambiarEstadoTicket);

export default router;