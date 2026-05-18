// backend/utils/whatsapp.js
import twilio from 'twilio';

const client = twilio(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN
);

const FROM = process.env.TWILIO_WHATSAPP_FROM ?? 'whatsapp:+14155238886';

/**
 * Formatea un número de teléfono al formato WhatsApp de Twilio.
 * Acepta: '+51987654321', '987654321', '51987654321'
 */
const formatearNumero = (tel) => {
  if (!tel) return null;
  const limpio = tel.toString().replace(/\s/g, '');
  const numero = limpio.startsWith('+') ? limpio : `+${limpio.startsWith('51') ? limpio : '51' + limpio}`;
  return `whatsapp:${numero}`;
};

/**
 * Función base para enviar un mensaje WhatsApp.
 * Retorna silenciosamente si el número no existe o hay error.
 */
const enviar = async (telefono, mensaje) => {
  const to = formatearNumero(telefono);
  if (!to) return;
  try {
    await client.messages.create({ from: FROM, to, body: mensaje });
    console.log(`📱 WhatsApp enviado a ${to}`);
  } catch (err) {
    console.warn(`⚠️ WhatsApp no enviado a ${to}:`, err.message);
  }
};

/**
 * Formatea una fecha al español peruano.
 */
const formatFecha = (fecha) =>
  new Date(fecha).toLocaleDateString('es-PE', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  });

// ─────────────────────────────────────────────────────────────
// RESERVAS
// ─────────────────────────────────────────────────────────────

/** Reserva creada — al CLIENTE */
export const waMensajeReservaCliente = async ({ telefono, nombre, negocioNombre, localNombre, fechaInicio, fechaFin, horaInicio, horaFin, codigo, precio }) => {
  const esRango  = !horaInicio;
  const periodo  = esRango
    ? `📅 Entrada: *${formatFecha(fechaInicio)}*\n📅 Salida:  *${formatFecha(fechaFin)}*`
    : `📅 Fecha:   *${formatFecha(fechaInicio)}*\n🕐 Horario: *${horaInicio} – ${horaFin}*`;

  const msg = `✅ *Reserva registrada — Ethereal Concierge*

Hola ${nombre} 👋

Tu reserva fue creada exitosamente.

🔖 Código: *${codigo}*
📍 Negocio: ${negocioNombre}${localNombre ? `\n🏠 Local: ${localNombre}` : ''}
${periodo}
💰 Total: S/${precio}

⏳ Estado: Pendiente de confirmación

El negocio confirmará tu reserva pronto.
Revisa el estado en *Mis Reservas*.

_Ethereal Concierge · No respondas este mensaje_`;

  await enviar(telefono, msg);
};

/** Reserva creada — al NEGOCIO */
export const waMensajeReservaNegocio = async ({ telefono, negocioNombre, clienteNombre, clienteTelefono, localNombre, fechaInicio, fechaFin, horaInicio, horaFin, codigo, precio }) => {
  const esRango = !horaInicio;
  const periodo = esRango
    ? `📅 Entrada: *${formatFecha(fechaInicio)}*\n📅 Salida:  *${formatFecha(fechaFin)}*`
    : `📅 Fecha:   *${formatFecha(fechaInicio)}*\n🕐 Horario: *${horaInicio} – ${horaFin}*`;

  const msg = `🔔 *Nueva reserva recibida — Ethereal*

Tienes una nueva reserva en *${negocioNombre}*.

🔖 Código: *${codigo}*
👤 Cliente: ${clienteNombre}
📞 Teléfono: ${clienteTelefono || 'No registrado'}${localNombre ? `\n🏠 Local: ${localNombre}` : ''}
${periodo}
💰 Monto: S/${precio}

👉 Ingresa a tu panel para confirmar.

_Ethereal Concierge_`;

  await enviar(telefono, msg);
};

/** Reserva confirmada por el negocio — al CLIENTE */
export const waMensajeReservaConfirmada = async ({ telefono, nombre, negocioNombre, localNombre, fechaInicio, horaInicio, horaFin, codigo }) => {
  const periodo = horaInicio
    ? `📅 ${formatFecha(fechaInicio)} · ${horaInicio} – ${horaFin}`
    : `📅 ${formatFecha(fechaInicio)}`;

  const msg = `🎉 *Reserva confirmada — Ethereal*

Hola ${nombre}! El negocio confirmó tu reserva.

🔖 ${codigo}
📍 ${negocioNombre}${localNombre ? ` · ${localNombre}` : ''}
${periodo}

📌 Preséntate 10 minutos antes.
Cualquier consulta desde *Mis Tickets*.

_Ethereal Concierge_`;

  await enviar(telefono, msg);
};

/** Reserva completada — al CLIENTE (pide reseña) */
export const waMensajeReservaCompletada = async ({ telefono, nombre, negocioNombre, codigo }) => {
  const msg = `✅ *Servicio completado — Ethereal*

Hola ${nombre}! Tu visita a *${negocioNombre}* fue registrada.

🔖 ${codigo}

⭐ ¿Cómo estuvo tu experiencia?
Deja tu reseña en *Mis Reservas* y ayuda
a otros clientes a elegir mejor.

¡Gracias por usar Ethereal! 🙏

_Ethereal Concierge_`;

  await enviar(telefono, msg);
};

/** Reserva cancelada por el NEGOCIO — al CLIENTE */
export const waMensajeCanceladaPorNegocio = async ({ telefono, nombre, negocioNombre, localNombre, fechaInicio, horaInicio, codigo }) => {
  const periodo = horaInicio
    ? `${formatFecha(fechaInicio)} · ${horaInicio}`
    : formatFecha(fechaInicio);

  const msg = `❌ *Reserva cancelada — Ethereal*

Hola ${nombre}, lamentamos informarte que
tu reserva fue cancelada por el negocio.

🔖 ${codigo}
📍 ${negocioNombre}${localNombre ? ` · ${localNombre}` : ''}
📅 ${periodo}

Si tienes dudas, abre un ticket desde
*Mis Tickets* y te ayudamos.

_Ethereal Concierge_`;

  await enviar(telefono, msg);
};

/** Reserva cancelada por el CLIENTE — al NEGOCIO */
export const waMensajeCanceladaPorCliente = async ({ telefono, negocioNombre, clienteNombre, localNombre, fechaInicio, horaInicio, codigo }) => {
  const periodo = horaInicio
    ? `${formatFecha(fechaInicio)} · ${horaInicio}`
    : formatFecha(fechaInicio);

  const msg = `⚠️ *Reserva cancelada — Ethereal*

Una reserva en *${negocioNombre}* fue cancelada por el cliente.

🔖 ${codigo}
👤 Cliente: ${clienteNombre}${localNombre ? `\n🏠 ${localNombre}` : ''}
📅 ${periodo}

El slot quedó liberado en tu calendario.

_Ethereal Concierge_`;

  await enviar(telefono, msg);
};

/** Reserva cancelada por el ADMIN — al CLIENTE */
export const waMensajeCanceladaPorAdmin = async ({ telefono, nombre, negocioNombre, fechaInicio, horaInicio, codigo }) => {
  const periodo = horaInicio
    ? `${formatFecha(fechaInicio)} · ${horaInicio}`
    : formatFecha(fechaInicio);

  const msg = `❌ *Reserva cancelada — Ethereal Concierge*

Hola ${nombre}, tu reserva fue cancelada
por el equipo de administración de Ethereal.

🔖 ${codigo}
📍 ${negocioNombre}
📅 ${periodo}

Para más información contáctanos desde
*Mis Tickets*.

_Equipo Ethereal Concierge_`;

  await enviar(telefono, msg);
};

/** Reserva cancelada por el ADMIN — al NEGOCIO */
export const waMensajeCanceladaPorAdminNegocio = async ({ telefono, negocioNombre, clienteNombre, fechaInicio, horaInicio, codigo }) => {
  const periodo = horaInicio
    ? `${formatFecha(fechaInicio)} · ${horaInicio}`
    : formatFecha(fechaInicio);

  const msg = `⚠️ *Reserva cancelada por administración*

Una reserva en *${negocioNombre}* fue cancelada
por el equipo de Ethereal.

🔖 ${codigo}
👤 Cliente: ${clienteNombre}
📅 ${periodo}

Ingresa a tu panel para ver más detalles.

_Equipo Ethereal Concierge_`;

  await enviar(telefono, msg);
};

/** Recordatorio 24h antes — al CLIENTE */
export const waMensajeRecordatorioCliente = async ({ telefono, nombre, negocioNombre, localNombre, direccion, fechaInicio, horaInicio, horaFin, codigo }) => {
  const periodo = horaInicio
    ? `🕐 *${horaInicio} – ${horaFin}*`
    : '';

  const msg = `⏰ *Recordatorio de reserva — Ethereal*

Hola ${nombre}! Tu reserva es *mañana*.

🔖 ${codigo}
📍 ${negocioNombre}${localNombre ? ` · ${localNombre}` : ''}
📅 *${formatFecha(fechaInicio)}*
${periodo}
${direccion ? `📌 ${direccion}` : ''}

Preséntate 10 minutos antes.
¿Necesitas cancelar? Hazlo desde
*Mis Reservas* con anticipación.

_Ethereal Concierge_`;

  await enviar(telefono, msg);
};

/** Recordatorio 24h antes — al NEGOCIO */
export const waMensajeRecordatorioNegocio = async ({ telefono, negocioNombre, clienteNombre, localNombre, fechaInicio, horaInicio, horaFin, codigo }) => {
  const periodo = horaInicio ? `${horaInicio} – ${horaFin}` : '';

  const msg = `📋 *Reserva para mañana — Ethereal*

Recordatorio para *${negocioNombre}*.

🔖 ${codigo}
👤 ${clienteNombre}${localNombre ? `\n🏠 ${localNombre}` : ''}
📅 ${formatFecha(fechaInicio)}${periodo ? `\n🕐 ${periodo}` : ''}

Revisa tu panel para más detalles.

_Ethereal Concierge_`;

  await enviar(telefono, msg);
};

// ─────────────────────────────────────────────────────────────
// CUENTA Y NEGOCIO
// ─────────────────────────────────────────────────────────────

/** Bienvenida al registrarse */
export const waMensajeBienvenida = async ({ telefono, nombre, rol }) => {
  const esNegocio = rol === 'negocio';
  const msg = `🌿 *Bienvenido/a a Ethereal Concierge*

Hola ${nombre}! 👋

Tu cuenta fue creada exitosamente.

${esNegocio
  ? '🏢 Como propietario de negocio, ya puedes configurar tu perfil y publicar tus locales.\n\n👉 Ingresa a tu *Panel de Negocio* para comenzar.'
  : '🔍 Explora miles de espacios disponibles para reservar al instante.\n\n👉 Visita *Descubrir* y haz tu primera reserva.'
}

_Equipo Ethereal Concierge_`;

  await enviar(telefono, msg);
};

/** Negocio verificado */
export const waMensajeNegocioVerificado = async ({ telefono, nombre, negocioNombre }) => {
  const msg = `🎉 *¡Tu negocio fue verificado!*

Hola ${nombre}!

*${negocioNombre}* ahora tiene el badge
de verificación ✓ en Ethereal.

Esto significa:
• Mayor visibilidad en búsquedas
• Badge verde en tu perfil público
• Mayor confianza de los clientes

👉 Ingresa a tu panel y empieza
a recibir reservas.

_Equipo Ethereal Concierge_`;

  await enviar(telefono, msg);
};

/** Negocio suspendido */
export const waMensajeNegocioSuspendido = async ({ telefono, nombre, negocioNombre, motivo, suspendidoHasta }) => {
  const hasta = suspendidoHasta ? `\n📅 Hasta: ${formatFecha(suspendidoHasta)}` : '';

  const msg = `⚠️ *Tu negocio fue suspendido*

Hola ${nombre},

*${negocioNombre}* fue suspendido temporalmente
por el equipo de Ethereal.

📋 Motivo: ${motivo || 'Incumplimiento de políticas'}${hasta}

Para apelar esta decisión, abre un ticket
desde tu cuenta en *Mis Tickets*.

_Equipo Ethereal Concierge_`;

  await enviar(telefono, msg);
};

/** Negocio baneado */
export const waMensajeNegocioBaneado = async ({ telefono, nombre, negocioNombre, motivo }) => {
  const msg = `🚫 *Tu negocio fue baneado*

Hola ${nombre},

*${negocioNombre}* fue baneado permanentemente
de la plataforma Ethereal.

📋 Motivo: ${motivo || 'Violación grave de términos de servicio'}

Si crees que es un error, contacta a
soporte en *Mis Tickets*.

_Equipo Ethereal Concierge_`;

  await enviar(telefono, msg);
};

/** Solicitud de cambio aprobada */
export const waMensajeCambiosAprobados = async ({ telefono, nombre, negocioNombre }) => {
  const msg = `✅ *Cambios aprobados — Ethereal*

Hola ${nombre}!

Los cambios que solicitaste para
*${negocioNombre}* fueron aprobados
y ya están aplicados en tu perfil.

👉 Revisa tu panel para verificarlos.

_Equipo Ethereal Concierge_`;

  await enviar(telefono, msg);
};

/** Solicitud de cambio rechazada */
export const waMensajeCambiosRechazados = async ({ telefono, nombre, negocioNombre, motivo }) => {
  const msg = `❌ *Solicitud rechazada — Ethereal*

Hola ${nombre},

Tu solicitud de cambios para
*${negocioNombre}* fue rechazada.

📋 Motivo: ${motivo || 'No cumple con nuestras políticas'}

Puedes realizar una nueva solicitud
corrigiendo los datos indicados.

_Equipo Ethereal Concierge_`;

  await enviar(telefono, msg);
};

// ─────────────────────────────────────────────────────────────
// SOPORTE (TICKETS)
// ─────────────────────────────────────────────────────────────

/** Ticket abierto — al USUARIO */
export const waMensajeTicketAbierto = async ({ telefono, nombre, codigo, titulo }) => {
  const msg = `🎫 *Ticket de soporte abierto — Ethereal*

Hola ${nombre},

Recibimos tu ticket de soporte.

🔖 Código: *${codigo}*
📝 Asunto: ${titulo}

Nuestro equipo te responderá pronto.
Puedes ver el estado en *Mis Tickets*.

_Equipo Ethereal Concierge_`;

  await enviar(telefono, msg);
};

/** Admin responde ticket — al USUARIO */
export const waMensajeRespuestaTicket = async ({ telefono, nombre, codigo, titulo }) => {
  const msg = `💬 *Nueva respuesta en tu ticket*

Hola ${nombre}!

El equipo de soporte respondió
tu ticket *${codigo}*.

📝 ${titulo}

👉 Ingresa a *Mis Tickets* para
ver la respuesta y continuar
la conversación.

_Equipo Ethereal Concierge_`;

  await enviar(telefono, msg);
};

/** Ticket resuelto — al USUARIO */
export const waMensajeTicketResuelto = async ({ telefono, nombre, codigo }) => {
  const msg = `✅ *Ticket resuelto — Ethereal*

Hola ${nombre}!

Tu ticket *${codigo}* fue marcado
como resuelto por nuestro equipo.

Si el problema persiste, puedes abrir
un nuevo ticket desde *Mis Tickets*.

¡Gracias por contactarnos! 🙏

_Equipo Ethereal Concierge_`;

  await enviar(telefono, msg);
};