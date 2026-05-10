// utils/recordatorios.js
// RF10: Tarea programada que envía recordatorios 24h antes de la reserva
import cron from 'node-cron';
import Reserva from '../models/Reserva.js';
import User from '../models/User.js';
import Negocio from '../models/Negocio.js';
import { enviarRecordatorioReserva } from './email.js';

export const iniciarRecordatorios = () => {
  // Se ejecuta cada día a las 9:00 AM
  cron.schedule('0 9 * * *', async () => {
    console.log('🔔 Ejecutando tarea de recordatorios...');

    try {
      const manana = new Date();
      manana.setDate(manana.getDate() + 1);
      manana.setUTCHours(0, 0, 0, 0);
      const finManana = new Date(manana);
      finManana.setUTCHours(23, 59, 59, 999);

      const reservas = await Reserva.find({
        fecha: { $gte: manana, $lte: finManana },
        estado: 'confirmada',
        recordatorioEnviado: false,
      })
        .populate('cliente', 'nombre correo')
        .populate('negocio', 'nombre');

      for (const reserva of reservas) {
        try {
          await enviarRecordatorioReserva({
            correo: reserva.cliente.correo,
            nombre: reserva.cliente.nombre,
            negocioNombre: reserva.negocio.nombre,
            fecha: reserva.fecha,
            horaInicio: reserva.horaInicio,
          });
          await Reserva.findByIdAndUpdate(reserva._id, { recordatorioEnviado: true });
          console.log(`  ✅ Recordatorio enviado a ${reserva.cliente.correo}`);
        } catch (err) {
          console.error(`  ⚠️ Error enviando recordatorio a ${reserva.cliente.correo}:`, err.message);
        }
      }

      console.log(`🔔 Recordatorios procesados: ${reservas.length}`);
    } catch (error) {
      console.error('❌ Error en tarea de recordatorios:', error.message);
    }
  });

  console.log('⏰ Tarea de recordatorios programada (diaria 9:00 AM)');
};