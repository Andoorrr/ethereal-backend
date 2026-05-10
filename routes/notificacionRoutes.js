// backend/routes/notificacionRoutes.js
import { Router } from 'express';
import { proteger } from '../middleware/auth.js';
import {
  misNotificaciones,
  marcarLeida,
  marcarTodasLeidas,
  eliminarNotificacion,
} from '../controllers/notificacionController.js';

const router = Router();

router.get('/',                  proteger, misNotificaciones);
router.patch('/leer-todas',      proteger, marcarTodasLeidas);
router.patch('/:id/leer',        proteger, marcarLeida);
router.delete('/:id',            proteger, eliminarNotificacion);

export default router;