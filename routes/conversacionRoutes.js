// backend/routes/conversacionRoutes.js
import express from 'express';
import { proteger, autorizar } from '../middleware/auth.js';
import {
  obtenerOCrearConversacion,
  enviarMensaje,
  marcarLeidos,
  misConversaciones,
  getConversacion,
} from '../controllers/conversacionController.js';

const router = express.Router();

// Cliente — obtener o crear conversación con un negocio
router.post('/',        proteger, obtenerOCrearConversacion);

// Propietario — ver todas sus conversaciones
router.get('/mis-chats', proteger, autorizar('negocio'), misConversaciones);

// Ambos — ver una conversación completa
router.get('/:id',       proteger, getConversacion);

// Ambos — enviar mensaje
router.post('/:id/mensaje', proteger, enviarMensaje);

// Ambos — marcar mensajes como leídos
router.patch('/:id/leidos', proteger, marcarLeidos);

export default router;