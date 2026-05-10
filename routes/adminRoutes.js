// backend/routes/adminRoutes.js
import { Router } from 'express';
import { proteger, autorizar } from '../middleware/auth.js';
import {
  getDashboard,
  getNegocios, cambiarEstadoNegocio, verificarNegocio, getLocalesNegocio, eliminarLocalAdmin,
  getUsuarios, banearUsuario, eliminarUsuario, restablecerPassword, getReservasUsuario,
  getAllReservas, cancelarReservaAdmin,
  getReportes, crearReporte, resolverReporte,
  getAnuncios, crearAnuncio, eliminarAnuncio,
  getSolicitudesCambio, resolverSolicitudCambio,
} from '../controllers/adminController.js';

const router = Router();
const soloAdmin = [proteger, autorizar('admin')];

// Dashboard
router.get('/dashboard',                        ...soloAdmin, getDashboard);

// Negocios
router.get('/negocios',                         ...soloAdmin, getNegocios);
router.patch('/negocios/:id/estado',            ...soloAdmin, cambiarEstadoNegocio);
router.patch('/negocios/:id/verificar',         ...soloAdmin, verificarNegocio);
router.get('/negocios/:id/locales',             ...soloAdmin, getLocalesNegocio);
router.delete('/locales/:id',                   ...soloAdmin, eliminarLocalAdmin);

// Usuarios
router.get('/usuarios',                         ...soloAdmin, getUsuarios);
router.patch('/usuarios/:id/banear',            ...soloAdmin, banearUsuario);
router.delete('/usuarios/:id',                  ...soloAdmin, eliminarUsuario);
router.patch('/usuarios/:id/password',          ...soloAdmin, restablecerPassword);
router.get('/usuarios/:id/reservas',            ...soloAdmin, getReservasUsuario);

// Reservas
router.get('/reservas',                         ...soloAdmin, getAllReservas);
router.patch('/reservas/:id/cancelar',          ...soloAdmin, cancelarReservaAdmin);

// Reportes
router.get('/reportes',                         ...soloAdmin, getReportes);
router.post('/reportes',                        proteger,     crearReporte);
router.patch('/reportes/:id',                   ...soloAdmin, resolverReporte);

// Anuncios
router.get('/anuncios',                         getAnuncios);
router.post('/anuncios',                        ...soloAdmin, crearAnuncio);
router.delete('/anuncios/:id',                  ...soloAdmin, eliminarAnuncio);

// Solicitudes de cambio
router.get('/solicitudes-cambio',               ...soloAdmin, getSolicitudesCambio);
router.patch('/solicitudes-cambio/:id',         ...soloAdmin, resolverSolicitudCambio);

export default router;