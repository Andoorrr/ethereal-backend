// backend/controllers/ticketController.js
import Ticket from '../models/Ticket.js';
import { crearNotificacion } from '../utils/notificacionHelper.js';

// ── Usuario: crear ticket ─────────────────────────────────────
export const crearTicket = async (req, res, next) => {
  try {
    const { titulo, tipo, mensaje, negocioId } = req.body;
    if (!titulo || !mensaje)
      return res.status(400).json({ ok: false, mensaje: 'Título y mensaje son requeridos.' });

    const ticket = await Ticket.create({
      titulo,
      tipo:    tipo || 'consulta',
      usuario: req.usuario._id,
      negocio: negocioId || null,
      mensajes: [{
        autor:     req.usuario._id,
        rolAutor:  'usuario',
        contenido: mensaje,
      }],
    });

    await crearNotificacion({
      usuarioId: req.usuario._id,
      tipo:    'sistema',
      titulo:  `Ticket ${ticket.codigo} creado`,
      mensaje: 'Tu ticket fue recibido. Nuestro equipo te responderá pronto.',
      link:    '/mis-tickets',
    });

    const populated = await ticket.populate('usuario', 'nombre correo foto');
    res.status(201).json({ ok: true, ticket: populated });
  } catch (error) { next(error); }
};

// ── Usuario: mis tickets ──────────────────────────────────────
export const misTickets = async (req, res, next) => {
  try {
    const tickets = await Ticket.find({ usuario: req.usuario._id })
      .select('-mensajes')
      .sort({ updatedAt: -1 });
    res.json({ ok: true, tickets });
  } catch (error) { next(error); }
};

// ── Obtener ticket por ID (usuario o admin) ───────────────────
export const getTicket = async (req, res, next) => {
  try {
    const filtro = req.usuario.rol === 'admin'
      ? { _id: req.params.id }
      : { _id: req.params.id, usuario: req.usuario._id };

    const ticket = await Ticket.findOne(filtro)
      .populate('usuario', 'nombre correo foto rol')
      .populate('negocio', 'nombre')
      .populate('mensajes.autor', 'nombre foto rol');

    if (!ticket) return res.status(404).json({ ok: false, mensaje: 'Ticket no encontrado.' });
    res.json({ ok: true, ticket });
  } catch (error) { next(error); }
};

// ── Responder ticket (usuario o admin) ───────────────────────
export const responderTicket = async (req, res, next) => {
  try {
    const { contenido } = req.body;
    if (!contenido?.trim())
      return res.status(400).json({ ok: false, mensaje: 'El mensaje no puede estar vacío.' });

    const filtro = req.usuario.rol === 'admin'
      ? { _id: req.params.id }
      : { _id: req.params.id, usuario: req.usuario._id, estado: { $nin: ['cerrado', 'resuelto'] } };

    const ticket = await Ticket.findOne(filtro);
    if (!ticket) return res.status(404).json({ ok: false, mensaje: 'Ticket no encontrado o cerrado.' });

    const rolAutor = req.usuario.rol === 'admin' ? 'admin' : 'usuario';

    ticket.mensajes.push({ autor: req.usuario._id, rolAutor, contenido });

    if (rolAutor === 'admin' && ticket.estado === 'abierto') ticket.estado = 'en_proceso';

    await ticket.save();

    if (rolAutor === 'admin') {
      await crearNotificacion({
        usuarioId: ticket.usuario,
        tipo:    'sistema',
        titulo:  `Respuesta en ticket ${ticket.codigo}`,
        mensaje: 'El equipo de Ethereal respondió tu ticket.',
        link:    '/mis-tickets',
      });
    }

    const populated = await Ticket.findById(ticket._id)
      .populate('usuario', 'nombre correo foto rol')
      .populate('negocio', 'nombre')
      .populate('mensajes.autor', 'nombre foto rol');

    // ── EMITIR EVENTO SOCKET.IO ──────────────────────────────
    const io = req.app.get('io');
    if (io) {
      const nuevoMensaje = populated.mensajes[populated.mensajes.length - 1];
      io.to(`ticket:${ticket._id}`).emit('ticket:mensaje', {
        ticketId:    ticket._id.toString(),
        mensaje:     nuevoMensaje,
        estado:      populated.estado,
        codigo:      populated.codigo,
      });
    }

    res.json({ ok: true, ticket: populated });
  } catch (error) { next(error); }
};

// ── Usuario: cerrar su ticket ─────────────────────────────────
export const cerrarTicket = async (req, res, next) => {
  try {
    const ticket = await Ticket.findOneAndUpdate(
      { _id: req.params.id, usuario: req.usuario._id },
      { estado: 'cerrado' },
      { new: true }
    );
    if (!ticket) return res.status(404).json({ ok: false, mensaje: 'Ticket no encontrado.' });

    // Emitir cambio de estado
    const io = req.app.get('io');
    if (io) {
      io.to(`ticket:${ticket._id}`).emit('ticket:estado', {
        ticketId: ticket._id.toString(),
        estado:   ticket.estado,
      });
    }

    res.json({ ok: true, mensaje: 'Ticket cerrado.', ticket });
  } catch (error) { next(error); }
};

// ── Admin: todos los tickets ──────────────────────────────────
export const getAllTickets = async (req, res, next) => {
  try {
    const { estado, tipo } = req.query;
    const filtro = {};
    if (estado) filtro.estado = estado;
    if (tipo)   filtro.tipo   = tipo;

    const tickets = await Ticket.find(filtro)
      .populate('usuario', 'nombre correo foto')
      .populate('negocio', 'nombre')
      .select('-mensajes')
      .sort({ updatedAt: -1 });

    res.json({ ok: true, total: tickets.length, tickets });
  } catch (error) { next(error); }
};

// ── Admin: crear ticket desde reporte ────────────────────────
export const crearTicketDesdeReporte = async (req, res, next) => {
  try {
    const { reporteId } = req.body;
    const Reporte = (await import('../models/Reporte.js')).default;

    const reporte = await Reporte.findById(reporteId)
      .populate('reportador', '_id nombre correo')
      .populate('reportado',  '_id nombre correo')
      .populate('negocio',    'nombre');

    if (!reporte) return res.status(404).json({ ok: false, mensaje: 'Reporte no encontrado.' });

    const tipoMap = {
      'cliente_reporta_negocio': 'reporte_negocio',
      'negocio_reporta_cliente': 'reporte_cliente',
    };

    const nombreNegocio = reporte.negocio?.nombre ? ` sobre ${reporte.negocio.nombre}` : '';
    const titulo = `Reporte${nombreNegocio}: ${reporte.motivo}`;
    const mensajeInicial = `Hemos recibido tu reporte y hemos abierto este ticket para darte seguimiento.\n\n**Motivo:** ${reporte.motivo}${reporte.descripcion ? `\n**Descripción:** ${reporte.descripcion}` : ''}\n\nNuestro equipo revisará el caso y te informará los pasos a seguir.`;

    const ticket = await Ticket.create({
      titulo,
      tipo:    tipoMap[reporte.tipo] ?? 'otro',
      usuario: reporte.reportador._id,
      negocio: reporte.negocio?._id ?? null,
      mensajes: [{
        autor:     req.usuario._id,
        rolAutor:  'admin',
        contenido: mensajeInicial,
      }],
    });

    await Reporte.findByIdAndUpdate(reporteId, { estado: 'revisado', accionAdmin: `Ticket creado: ${ticket.codigo}` });

    await crearNotificacion({
      usuarioId: reporte.reportador._id,
      tipo:    'sistema',
      titulo:  `Ticket ${ticket.codigo} abierto para tu reporte`,
      mensaje: `Hemos abierto un ticket para dar seguimiento a tu reporte. Puedes ver la respuesta en Mis Tickets.`,
      link:    '/mis-tickets',
    });

    const populated = await ticket.populate('usuario', 'nombre correo');
    res.status(201).json({ ok: true, ticket: populated });
  } catch (error) { next(error); }
};

// ── Admin: cambiar estado del ticket ─────────────────────────
export const cambiarEstadoTicket = async (req, res, next) => {
  try {
    const { estado } = req.body;
    const ticket = await Ticket.findByIdAndUpdate(
      req.params.id, { estado }, { new: true }
    ).populate('usuario', '_id nombre');

    if (ticket?.usuario) {
      const msgs = {
        resuelto: `Tu ticket ${ticket.codigo} fue marcado como resuelto. ¡Gracias por contactarnos!`,
        cerrado:  `Tu ticket ${ticket.codigo} fue cerrado por el equipo de soporte.`,
        en_proceso: `Tu ticket ${ticket.codigo} está siendo revisado por nuestro equipo.`,
      };
      if (msgs[estado]) {
        await crearNotificacion({
          usuarioId: ticket.usuario._id,
          tipo:    'sistema',
          titulo:  `Ticket ${ticket.codigo} actualizado`,
          mensaje: msgs[estado],
          link:    '/mis-tickets',
        });
      }
    }

    // Emitir cambio de estado vía socket
    const io = req.app.get('io');
    if (io) {
      io.to(`ticket:${ticket._id}`).emit('ticket:estado', {
        ticketId: ticket._id.toString(),
        estado:   ticket.estado,
      });
    }

    res.json({ ok: true, ticket });
  } catch (error) { next(error); }
};