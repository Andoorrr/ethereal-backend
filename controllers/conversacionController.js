// backend/controllers/conversacionController.js
import Conversacion from '../models/Conversacion.js';
import Negocio      from '../models/Negocio.js';
import { crearNotificacion } from '../utils/notificacionHelper.js';

// ─── Cliente: obtener o crear conversación con un negocio ─────
export const obtenerOCrearConversacion = async (req, res, next) => {
  try {
    const { negocioId } = req.body;
    const clienteId = req.usuario._id;

    const negocio = await Negocio.findById(negocioId);
    if (!negocio) return res.status(404).json({ ok: false, mensaje: 'Negocio no encontrado.' });

    // No permitir que el propietario chate consigo mismo
    if (negocio.propietario.toString() === clienteId.toString()) {
      return res.status(403).json({ ok: false, mensaje: 'No puedes chatear con tu propio negocio.' });
    }

    // Buscar conversación existente o crear nueva
    let conv = await Conversacion.findOne({ cliente: clienteId, negocio: negocioId })
      .populate('cliente', 'nombre foto')
      .populate('negocio', 'nombre propietario')
      .populate('mensajes.autor', 'nombre foto');

    if (!conv) {
      conv = await Conversacion.create({ cliente: clienteId, negocio: negocioId, mensajes: [] });
      conv = await Conversacion.findById(conv._id)
        .populate('cliente', 'nombre foto')
        .populate('negocio', 'nombre propietario')
        .populate('mensajes.autor', 'nombre foto');
    }

    res.json({ ok: true, conversacion: conv });
  } catch (error) { next(error); }
};

// ─── Enviar mensaje ───────────────────────────────────────────
export const enviarMensaje = async (req, res, next) => {
  try {
    const { contenido } = req.body;
    if (!contenido?.trim()) return res.status(400).json({ ok: false, mensaje: 'El mensaje no puede estar vacío.' });

    const conv = await Conversacion.findById(req.params.id);
    if (!conv) return res.status(404).json({ ok: false, mensaje: 'Conversación no encontrada.' });

    // Determinar rol del autor
    const negocio = await Negocio.findById(conv.negocio);
    const esPropietario = negocio?.propietario?.toString() === req.usuario._id.toString();
    const esCliente     = conv.cliente.toString() === req.usuario._id.toString();

    if (!esPropietario && !esCliente) {
      return res.status(403).json({ ok: false, mensaje: 'No tienes acceso a esta conversación.' });
    }

    const rolAutor = esPropietario ? 'negocio' : 'cliente';

    const nuevoMensaje = {
      autor:     req.usuario._id,
      rolAutor,
      contenido: contenido.trim(),
    };

    conv.mensajes.push(nuevoMensaje);
    conv.ultimoMensaje = new Date();
    await conv.save();

    const convPopulada = await Conversacion.findById(conv._id)
      .populate('cliente', 'nombre foto')
      .populate('negocio', 'nombre propietario')
      .populate('mensajes.autor', 'nombre foto');

    const msgGuardado = convPopulada.mensajes[convPopulada.mensajes.length - 1];

    // ── Socket.IO ────────────────────────────────────────────
    const io = req.app.get('io');
    if (io) {
      io.to(`chat:${conv._id}`).emit('chat:mensaje', {
        conversacionId: conv._id.toString(),
        mensaje:        msgGuardado,
      });
    }

    // ── Notificación in-app al destinatario ──────────────────
    const destinatarioId = esPropietario ? conv.cliente : negocio.propietario;
    await crearNotificacion({
      usuarioId: destinatarioId,
      tipo:    'sistema',
      titulo:  `Nuevo mensaje de ${req.usuario.nombre}`,
      mensaje: contenido.length > 60 ? contenido.slice(0, 60) + '...' : contenido,
      link:    esPropietario ? '/panel' : `/negocio/${conv.negocio}`,
    });

    res.json({ ok: true, mensaje: msgGuardado });
  } catch (error) { next(error); }
};

// ─── Marcar mensajes como leídos ─────────────────────────────
export const marcarLeidos = async (req, res, next) => {
  try {
    const conv = await Conversacion.findById(req.params.id);
    if (!conv) return res.status(404).json({ ok: false, mensaje: 'Conversación no encontrada.' });

    const negocio = await Negocio.findById(conv.negocio);
    const esPropietario = negocio?.propietario?.toString() === req.usuario._id.toString();

    // Marcar como leídos solo los mensajes del otro
    conv.mensajes.forEach(m => {
      if (esPropietario && m.rolAutor === 'cliente')  m.leido = true;
      if (!esPropietario && m.rolAutor === 'negocio') m.leido = true;
    });
    await conv.save();

    res.json({ ok: true });
  } catch (error) { next(error); }
};

// ─── Propietario: listar todas sus conversaciones ─────────────
export const misConversaciones = async (req, res, next) => {
  try {
    const negocio = await Negocio.findOne({ propietario: req.usuario._id });
    if (!negocio) return res.status(404).json({ ok: false, mensaje: 'No tienes un negocio.' });

    const conversaciones = await Conversacion.find({ negocio: negocio._id, estado: 'activo' })
      .populate('cliente', 'nombre foto correo')
      .sort({ ultimoMensaje: -1 })
      .lean();

    // Contar no leídos por conversación
    const resultado = conversaciones.map(c => ({
      ...c,
      noLeidos: c.mensajes.filter(m => m.rolAutor === 'cliente' && !m.leido).length,
      ultimoMsg: c.mensajes[c.mensajes.length - 1] ?? null,
      mensajes:  undefined, // No enviar todos los mensajes en el listado
    }));

    res.json({ ok: true, conversaciones: resultado });
  } catch (error) { next(error); }
};

// ─── Obtener conversación completa ────────────────────────────
export const getConversacion = async (req, res, next) => {
  try {
    const conv = await Conversacion.findById(req.params.id)
      .populate('cliente', 'nombre foto')
      .populate('negocio', 'nombre propietario')
      .populate('mensajes.autor', 'nombre foto');

    if (!conv) return res.status(404).json({ ok: false, mensaje: 'Conversación no encontrada.' });

    const negocio = await Negocio.findById(conv.negocio);
    const esPropietario = negocio?.propietario?.toString() === req.usuario._id.toString();
    const esCliente     = conv.cliente._id.toString() === req.usuario._id.toString();

    if (!esPropietario && !esCliente) {
      return res.status(403).json({ ok: false, mensaje: 'No tienes acceso.' });
    }

    res.json({ ok: true, conversacion: conv });
  } catch (error) { next(error); }
};