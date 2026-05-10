// backend/routes/negocioRoutes.js
import { Router } from 'express';
import {
  crearNegocio, listarNegocios, obtenerNegocio,
  actualizarNegocio, miNegocio, solicitarCambio,
} from '../controllers/negocioController.js';
import { proteger, autorizar } from '../middleware/auth.js';

const router = Router();

// ⚠️ Rutas específicas ANTES de /:id
router.get('/panel/mi-negocio',    proteger, autorizar('negocio', 'admin'), miNegocio);
router.post('/panel/solicitar-cambio', proteger, autorizar('negocio'), solicitarCambio);

// Públicas
router.get('/',    listarNegocios);
router.get('/:id', obtenerNegocio);

// Protegidas
router.post('/',    proteger, autorizar('negocio', 'admin'), crearNegocio);
router.put('/:id',  proteger, autorizar('negocio', 'admin'), actualizarNegocio);

export default router;