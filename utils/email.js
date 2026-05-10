// utils/email.js
import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST,
  port: Number(process.env.EMAIL_PORT),
  secure: false,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

/**
 * Envía un email de confirmación de reserva al cliente
 */
export const enviarConfirmacionReserva = async ({ correo, nombre, negocioNombre, fecha, horaInicio, horaFin }) => {
  const fechaFormateada = new Date(fecha).toLocaleDateString('es-PE', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
  });

  await transporter.sendMail({
    from: process.env.EMAIL_FROM,
    to: correo,
    subject: `✅ Reserva confirmada en ${negocioNombre}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 500px; margin: auto; padding: 24px; border: 1px solid #e0e0e0; border-radius: 8px;">
        <h2 style="color: #2563eb;">¡Reserva Confirmada!</h2>
        <p>Hola <strong>${nombre}</strong>,</p>
        <p>Tu reserva en <strong>${negocioNombre}</strong> ha sido confirmada:</p>
        <table style="width:100%; border-collapse: collapse; margin: 16px 0;">
          <tr><td style="padding: 8px; background:#f3f4f6;"><strong>Fecha</strong></td><td style="padding:8px;">${fechaFormateada}</td></tr>
          <tr><td style="padding: 8px; background:#f3f4f6;"><strong>Hora</strong></td><td style="padding:8px;">${horaInicio} – ${horaFin}</td></tr>
        </table>
        <p style="color:#6b7280; font-size: 13px;">Si necesitas cancelar tu reserva, ingresa a la plataforma con anticipación.</p>
        <hr style="border:none; border-top: 1px solid #e5e7eb; margin: 20px 0;">
        <p style="color:#9ca3af; font-size: 12px;">Plataforma de Reservas — No respondas a este correo.</p>
      </div>
    `,
  });
};

/**
 * Envía un recordatorio 24h antes de la reserva
 */
export const enviarRecordatorioReserva = async ({ correo, nombre, negocioNombre, fecha, horaInicio }) => {
  const fechaFormateada = new Date(fecha).toLocaleDateString('es-PE', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
  });

  await transporter.sendMail({
    from: process.env.EMAIL_FROM,
    to: correo,
    subject: `🔔 Recordatorio: Tienes una reserva mañana en ${negocioNombre}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 500px; margin: auto; padding: 24px; border: 1px solid #e0e0e0; border-radius: 8px;">
        <h2 style="color: #f59e0b;">Recordatorio de Reserva</h2>
        <p>Hola <strong>${nombre}</strong>, te recordamos tu reserva de mañana:</p>
        <p><strong>${negocioNombre}</strong> — ${fechaFormateada} a las <strong>${horaInicio}</strong></p>
        <p style="color:#6b7280; font-size: 13px;">¡Te esperamos!</p>
      </div>
    `,
  });
};