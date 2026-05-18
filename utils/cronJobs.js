// backend/utils/cronJobs.js
import cron    from 'node-cron';
import Reserva from '../models/Reserva.js';
import Negocio from '../models/Negocio.js';
import User    from '../models/User.js';
import {
  waMensajeRecordatorioCliente,
  waMensajeRecordatorioNegocio,
} from './whatsapp.js';

/**
 * Cron que corre todos los días a las 9:00 AM (hora Perú UTC-5).
 * Busca reservas para el día siguiente y envía recordatorios
 * por WhatsApp al cliente y al negocio.
 */
export const iniciarCronJobs = () => {
  // Corre a las 14:00 UTC = 9:00 AM Perú
  cron.schedule('0 14 * * *', async () => {
    console.log('⏰ [CronJob] Enviando recordatorios de reservas para mañana...');

    try {
      const manana     = new Date();
      manana.setDate(manana.getDate() + 1);
      manana.setUTCHours(0, 0, 0, 0);

      const pasadoManana = new Date(manana);
      pasadoManana.setUTCHours(23, 59, 59, 999);

      const reservas = await Reserva.find({
        fechaInicio: { $gte: manana, $lte: pasadoManana },
        estado:      { $in: ['confirmada', 'pendiente'] },
      })
        .populate('cliente', 'nombre telefono')
        .populate('negocio', 'nombre direccion propietario')
        .populate('local',   'nombre');

      console.log(`📋 [CronJob] ${reservas.length} reserva(s) para mañana.`);

      for (const reserva of reservas) {
        const codigo     = reserva._id.toString().slice(-8).toUpperCase();
        const localNombre = reserva.local?.nombre ?? '';

        // ── WhatsApp al CLIENTE ───────────────────────────────
        if (reserva.cliente?.telefono) {
          await waMensajeRecordatorioCliente({
            telefono:     reserva.cliente.telefono,
            nombre:       reserva.cliente.nombre,
            negocioNombre: reserva.negocio?.nombre ?? '',
            localNombre,
            direccion:    reserva.negocio?.direccion ?? '',
            fechaInicio:  reserva.fechaInicio,
            horaInicio:   reserva.horaInicio,
            horaFin:      reserva.horaFin,
            codigo,
          });
        }

        // ── WhatsApp al NEGOCIO ───────────────────────────────
        if (reserva.negocio?.propietario) {
          const propietario = await User.findById(reserva.negocio.propietario).select('telefono');
          if (propietario?.telefono) {
            await waMensajeRecordatorioNegocio({
              telefono:      propietario.telefono,
              negocioNombre: reserva.negocio.nombre,
              clienteNombre: reserva.cliente?.nombre ?? '',
              localNombre,
              fechaInicio:   reserva.fechaInicio,
              horaInicio:    reserva.horaInicio,
              horaFin:       reserva.horaFin,
              codigo,
            });
          }
        }
      }

      console.log('✅ [CronJob] Recordatorios enviados correctamente.');
    } catch (error) {
      console.error('❌ [CronJob] Error enviando recordatorios:', error.message);
    }
  }, {
    timezone: 'America/Lima',
  });

  console.log('⏰ CronJob de recordatorios iniciado (9:00 AM hora Lima)');
};