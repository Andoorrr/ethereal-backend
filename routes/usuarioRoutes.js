// routes/usuarioRoutes.js
import { Router } from 'express';
import { obtenerPerfil, editarPerfil, cambiarPassword, listarUsuarios } from '../controllers/usuarioController.js';
import { obtenerYo, actualizarPerfil } from '../controllers/usuarioController.js';
import { proteger, autorizar } from '../middleware/auth.js';

const router = Router();

router.use(proteger); // todas las rutas requieren autenticación

router.get('/perfil',            obtenerPerfil);
router.get('/yo',      proteger, obtenerYo);
router.put('/perfil',  proteger, actualizarPerfil);
router.put('/perfil',            editarPerfil);
router.put('/perfil/password',   cambiarPassword);
router.get('/',                  autorizar('admin'), listarUsuarios);

export default router;