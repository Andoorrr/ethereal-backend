// backend/utils/cronJobs.js
import cron from 'node-cron';
import Negocio from '../models/Negocio.js';
import { crearNotificacion } from './notificacionHelper.js';

/**
 * Cron que corre cada hora.
 * Reactiva negocios suspendidos cuya fecha de suspensión ya venció.
 */
export const iniciarCronJobs = () => {

  // Cada hora en punto → '0 * * * *'
  // Para pruebas cada minuto → '* * * * *'
  cron.schedule('0 * * * *', async () => {
    try {
      const ahora = new Date();

      // Buscar negocios suspendidos con fecha vencida
      const vencidos = await Negocio.find({
        estado:          'suspendido',
        suspendidoHasta: { $lte: ahora },
      }).populate('propietario', '_id nombre');

      if (vencidos.length === 0) return;

      console.log(`[CRON] Reactivando ${vencidos.length} negocio(s) con suspensión vencida...`);

      for (const negocio of vencidos) {
        // Reactivar
        await Negocio.findByIdAndUpdate(negocio._id, {
          estado:           'activo',
          motivoSuspension: '',
          suspendidoHasta:  null,
        });

        // Notificar al propietario
        if (negocio.propietario?._id) {
          await crearNotificacion({
            usuarioId: negocio.propietario._id,
            tipo:    'sistema',
            titulo:  '¡Tu negocio ha sido reactivado!',
            mensaje: `El período de suspensión de "${negocio.nombre}" ha finalizado. Ya puedes operar con normalidad.`,
            link:    '/panel',
          });
        }

        console.log(`[CRON] Negocio reactivado: ${negocio.nombre}`);
      }

    } catch (err) {
      console.error('[CRON] Error en reactivación automática:', err.message);
    }
  });

  console.log('[CRON] Jobs iniciados — reactivación automática cada hora.');
};