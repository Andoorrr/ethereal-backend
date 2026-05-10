// backend/routes/localRoutes.js
import { Router } from 'express';
import {
  listarLocales, obtenerLocal, crearLocal,
  actualizarLocal, desactivarLocal, misLocales, eliminarLocal,
} from '../controllers/localController.js';
import { proteger, autorizar } from '../middleware/auth.js';

const router = Router();

// Públicas
router.get('/',                  listarLocales);
router.get('/panel/mis-locales', proteger, autorizar('negocio', 'admin'), misLocales);
router.get('/:id',               obtenerLocal);

// Protegidas
router.post('/',                 proteger, autorizar('negocio', 'admin'), crearLocal);
router.put('/:id',               proteger, autorizar('negocio', 'admin'), actualizarLocal);
router.patch('/:id/desactivar',  proteger, autorizar('negocio', 'admin'), desactivarLocal);
router.delete('/:id',            proteger, autorizar('negocio', 'admin'), eliminarLocal);

export default router;