// backend/controllers/adminController.js
import User    from '../models/User.js';
import Negocio from '../models/Negocio.js';
import Local   from '../models/Local.js';
import Reserva from '../models/Reserva.js';
import Reporte from '../models/Reporte.js';
import Anuncio from '../models/Anuncio.js';
import { crearNotificacion } from '../utils/notificacionHelper.js';

// ── DASHBOARD MÉTRICAS ────────────────────────────────────────
export const getDashboard = async (req, res, next) => {
  try {
    const [totalNegocios, totalUsuarios, totalReservas, totalLocales, reportesPendientes] =
      await Promise.all([
        Negocio.countDocuments(),
        User.countDocuments({ rol: 'cliente' }),
        Reserva.countDocuments(),
        Local.countDocuments({ activo: true }),
        Reporte.countDocuments({ estado: 'pendiente' }),
      ]);

    const reservas = await Reserva.find().populate('negocio','precioPorSlot');
    const PRECIO   = 50;
    const ingresosBrutos = reservas
      .filter(r => r.estado === 'confirmada' || r.estado === 'completada')
      .length * PRECIO;
    const comisionPlataforma = ingresosBrutos * 0.03;

    const canceladas  = reservas.filter(r => r.estado === 'cancelada').length;
    const tasaCancelacion = totalReservas > 0 ? Math.round((canceladas / totalReservas) * 100) : 0;

    const hace6Meses = new Date();
    hace6Meses.setMonth(hace6Meses.getMonth() - 6);
    const nuevosUsuarios = await User.aggregate([
      { $match: { createdAt: { $gte: hace6Meses } } },
      { $group: { _id: { year: { $year: '$createdAt' }, month: { $month: '$createdAt' } }, count: { $sum: 1 } } },
      { $sort: { '_id.year': 1, '_id.month': 1 } },
    ]);

    const negociosMasActivos = await Reserva.aggregate([
      { $match: { estado: { $ne: 'cancelada' } } },
      { $group: { _id: '$negocio', totalReservas: { $sum: 1 } } },
      { $sort: { totalReservas: -1 } },
      { $limit: 5 },
      { $lookup: { from: 'negocios', localField: '_id', foreignField: '_id', as: 'negocio' } },
      { $unwind: '$negocio' },
      { $project: { nombre: '$negocio.nombre', categoria: '$negocio.categoria', totalReservas: 1 } },
    ]);

    res.json({
      ok: true,
      metricas: {
        totalNegocios, totalUsuarios, totalReservas, totalLocales,
        reportesPendientes, ingresosBrutos, comisionPlataforma,
        tasaCancelacion, nuevosUsuarios, negociosMasActivos,
      },
    });
  } catch (error) { next(error); }
};

// ── NEGOCIOS ──────────────────────────────────────────────────
export const getNegocios = async (req, res, next) => {
  try {
    const { estado, busqueda } = req.query;
    const filtro = {};
    if (estado) filtro.estado = estado;
    if (busqueda) filtro.nombre = { $regex: busqueda, $options: 'i' };

    const negocios = await Negocio.find(filtro)
      .populate('propietario', 'nombre correo')
      .sort({ createdAt: -1 });

    const negociosConStats = await Promise.all(negocios.map(async n => {
      const [locales, reservas] = await Promise.all([
        Local.countDocuments({ negocio: n._id }),
        Reserva.countDocuments({ negocio: n._id }),
      ]);
      return { ...n.toObject(), totalLocales: locales, totalReservas: reservas };
    }));

    res.json({ ok: true, total: negociosConStats.length, negocios: negociosConStats });
  } catch (error) { next(error); }
};

export const cambiarEstadoNegocio = async (req, res, next) => {
  try {
    const { estado, motivo, suspendidoHasta } = req.body;
    const negocio = await Negocio.findByIdAndUpdate(
      req.params.id,
      { estado, motivoSuspension: motivo || '', suspendidoHasta: suspendidoHasta || null },
      { new: true }
    );
    if (!negocio) return res.status(404).json({ ok: false, mensaje: 'Negocio no encontrado.' });

    const msgs = {
      activo:     { titulo: 'Tu negocio ha sido reactivado', mensaje: 'El equipo de Ethereal ha reactivado tu negocio. Ya puedes operar con normalidad.' },
      suspendido: { titulo: 'Tu negocio ha sido suspendido', mensaje: `Tu negocio fue suspendido temporalmente${motivo ? `: ${motivo}` : ''}. Contacta soporte para más info.` },
      baneado:    { titulo: 'Tu negocio ha sido baneado', mensaje: `Tu negocio fue baneado permanentemente${motivo ? `: ${motivo}` : ''}. Contacta soporte si crees que es un error.` },
    };
    const msg = msgs[estado];
    if (msg) {
      await crearNotificacion({
        usuarioId: negocio.propietario,
        tipo: 'sistema', titulo: msg.titulo, mensaje: msg.mensaje, link: '/panel',
      });
    }

    res.json({ ok: true, mensaje: `Negocio ${estado}.`, negocio });
  } catch (error) { next(error); }
};

export const verificarNegocio = async (req, res, next) => {
  try {
    const negocio = await Negocio.findByIdAndUpdate(
      req.params.id,
      { verificado: req.body.verificado ?? true },
      { new: true }
    );
    res.json({ ok: true, mensaje: `Negocio ${negocio.verificado ? 'verificado' : 'desverificado'}.`, negocio });
  } catch (error) { next(error); }
};

export const eliminarLocalAdmin = async (req, res, next) => {
  try {
    const local = await Local.findById(req.params.id).populate('negocio', 'nombre propietario');
    if (local?.negocio?.propietario) {
      await crearNotificacion({
        usuarioId: local.negocio.propietario,
        tipo: 'sistema',
        titulo: 'Local eliminado por administración',
        mensaje: `El local "${local.nombre}" fue eliminado por el equipo de Ethereal por incumplimiento de políticas.`,
        link: '/panel',
      });
    }
    await Local.findByIdAndDelete(req.params.id);
    res.json({ ok: true, mensaje: 'Local eliminado por administrador.' });
  } catch (error) { next(error); }
};

export const getLocalesNegocio = async (req, res, next) => {
  try {
    const locales = await Local.find({ negocio: req.params.id }).sort({ createdAt: -1 });
    res.json({ ok: true, locales });
  } catch (error) { next(error); }
};

// ── USUARIOS ──────────────────────────────────────────────────
export const getUsuarios = async (req, res, next) => {
  try {
    const { rol, busqueda, baneado } = req.query;
    const filtro = {};
    if (rol)     filtro.rol = rol;
    if (baneado) filtro.baneado = baneado === 'true';
    if (busqueda) filtro.$or = [
      { nombre: { $regex: busqueda, $options: 'i' } },
      { correo:  { $regex: busqueda, $options: 'i' } },
    ];
    const usuarios = await User.find(filtro).select('-password').sort({ createdAt: -1 });
    res.json({ ok: true, total: usuarios.length, usuarios });
  } catch (error) { next(error); }
};

export const banearUsuario = async (req, res, next) => {
  try {
    const { baneado, motivo } = req.body;
    const usuario = await User.findByIdAndUpdate(
      req.params.id,
      { baneado, motivoBaneo: motivo || '' },
      { new: true }
    ).select('-password');

    await crearNotificacion({
      usuarioId: req.params.id,
      tipo: 'sistema',
      titulo:  baneado ? 'Tu cuenta ha sido baneada' : 'Tu cuenta ha sido reactivada',
      mensaje: baneado
        ? `Tu cuenta fue baneada${motivo ? `: ${motivo}` : ''}. Contacta soporte si crees que es un error.`
        : 'El equipo de Ethereal ha reactivado tu cuenta. Ya puedes acceder normalmente.',
      link: '/mi-cuenta',
    });

    res.json({ ok: true, mensaje: `Usuario ${baneado ? 'baneado' : 'desbaneado'}.`, usuario });
  } catch (error) { next(error); }
};

export const eliminarUsuario = async (req, res, next) => {
  try {
    const usuario = await User.findById(req.params.id);
    if (!usuario) return res.status(404).json({ ok: false, mensaje: 'Usuario no encontrado.' });
    if (usuario.rol === 'admin') return res.status(403).json({ ok: false, mensaje: 'No puedes eliminar a un administrador.' });

    await User.findByIdAndDelete(req.params.id);
    res.json({ ok: true, mensaje: 'Usuario eliminado correctamente.' });
  } catch (error) { next(error); }
};

export const restablecerPassword = async (req, res, next) => {
  try {
    const { nuevaPassword } = req.body;
    const usuario = await User.findById(req.params.id);
    if (!usuario) return res.status(404).json({ ok: false, mensaje: 'Usuario no encontrado.' });
    usuario.password = nuevaPassword;
    await usuario.save();
    res.json({ ok: true, mensaje: 'Contraseña restablecida.' });
  } catch (error) { next(error); }
};

export const getReservasUsuario = async (req, res, next) => {
  try {
    const reservas = await Reserva.find({ cliente: req.params.id })
      .populate('negocio', 'nombre')
      .populate('local', 'nombre')
      .sort({ createdAt: -1 });
    res.json({ ok: true, reservas });
  } catch (error) { next(error); }
};

// ── RESERVAS ──────────────────────────────────────────────────
export const getAllReservas = async (req, res, next) => {
  try {
    const { estado } = req.query;
    const filtro = {};
    if (estado) filtro.estado = estado;

    const reservas = await Reserva.find(filtro)
      .populate('cliente', 'nombre correo')
      .populate('negocio', 'nombre categoria')
      .populate('local',   'nombre')
      .sort({ createdAt: -1 })
      .limit(200);

    res.json({ ok: true, total: reservas.length, reservas });
  } catch (error) { next(error); }
};

export const cancelarReservaAdmin = async (req, res, next) => {
  try {
    const reserva = await Reserva.findById(req.params.id)
      .populate('cliente', '_id nombre')
      .populate('negocio', 'nombre propietario');

    await Reserva.updateOne({ _id: req.params.id }, { $set: { estado: 'cancelada' } });

    if (reserva?.cliente) {
      await crearNotificacion({
        usuarioId: reserva.cliente._id,
        tipo: 'reserva_cancelada',
        titulo: 'Reserva cancelada por administración',
        mensaje: `Tu reserva en ${reserva.negocio?.nombre ?? 'el negocio'} fue cancelada por el equipo de Ethereal.`,
        link: '/mi-cuenta',
      });
    }
    if (reserva?.negocio?.propietario) {
      await crearNotificacion({
        usuarioId: reserva.negocio.propietario,
        tipo: 'reserva_cancelada',
        titulo: 'Reserva cancelada por administración',
        mensaje: `Una reserva en tu negocio fue cancelada por el equipo de Ethereal.`,
        link: '/panel',
      });
    }

    res.json({ ok: true, mensaje: 'Reserva cancelada por administrador.' });
  } catch (error) { next(error); }
};

// ── REPORTES ──────────────────────────────────────────────────
export const getReportes = async (req, res, next) => {
  try {
    const { estado } = req.query;
    const filtro = estado ? { estado } : {};
    const reportes = await Reporte.find(filtro)
      .populate('reportador', 'nombre correo rol')
      .populate('reportado',  'nombre correo rol')
      .populate('negocio',    'nombre')
      .sort({ createdAt: -1 });
    res.json({ ok: true, total: reportes.length, reportes });
  } catch (error) { next(error); }
};

export const crearReporte = async (req, res, next) => {
  try {
    const { tipo, reportadoId, negocioId, motivo, descripcion } = req.body;
    const reporte = await Reporte.create({
      tipo, reportador: req.usuario._id,
      reportado: reportadoId, negocio: negocioId,
      motivo, descripcion,
    });
    res.status(201).json({ ok: true, reporte });
  } catch (error) { next(error); }
};

export const resolverReporte = async (req, res, next) => {
  try {
    const { estado, accionAdmin } = req.body;
    const reporte = await Reporte.findByIdAndUpdate(
      req.params.id, { estado, accionAdmin }, { new: true }
    );
    res.json({ ok: true, reporte });
  } catch (error) { next(error); }
};

// ── ANUNCIOS ──────────────────────────────────────────────────
export const getAnuncios = async (req, res, next) => {
  try {
    const anuncios = await Anuncio.find().populate('autor','nombre').sort({ createdAt: -1 });
    res.json({ ok: true, anuncios });
  } catch (error) { next(error); }
};

export const crearAnuncio = async (req, res, next) => {
  try {
    const { titulo, contenido, tipo } = req.body;
    const anuncio = await Anuncio.create({ titulo, contenido, tipo, autor: req.usuario._id });
    res.status(201).json({ ok: true, anuncio });
  } catch (error) { next(error); }
};

export const eliminarAnuncio = async (req, res, next) => {
  try {
    await Anuncio.findByIdAndDelete(req.params.id);
    res.json({ ok: true, mensaje: 'Anuncio eliminado.' });
  } catch (error) { next(error); }
};

// ── SOLICITUDES DE CAMBIO ─────────────────────────────────────
export const getSolicitudesCambio = async (req, res, next) => {
  try {
    const negocios = await Negocio.find({ 'cambiosPendientes.estado': 'pendiente' })
      .populate('propietario', 'nombre correo')
      .select('nombre categoria cambiosPendientes propietario');
    res.json({ ok: true, solicitudes: negocios });
  } catch (error) { next(error); }
};

export const resolverSolicitudCambio = async (req, res, next) => {
  try {
    const { accion, motivoRechazo } = req.body;
    const negocio = await Negocio.findById(req.params.id);
    if (!negocio) return res.status(404).json({ ok: false, mensaje: 'Negocio no encontrado.' });

    if (accion === 'aprobar') {
      const cambios = negocio.cambiosPendientes?.datos ?? {};
      Object.assign(negocio, cambios);
      negocio.cambiosPendientes = { datos: null, estado: 'aprobado', fechaSolicitud: null };
      await negocio.save();
      await crearNotificacion({
        usuarioId: negocio.propietario,
        tipo: 'sistema',
        titulo: '¡Cambios aprobados!',
        mensaje: `Los cambios solicitados para tu negocio "${negocio.nombre}" han sido aprobados y aplicados.`,
        link: '/panel',
      });
    } else {
      negocio.cambiosPendientes = {
        datos: null, estado: 'rechazado',
        motivoRechazo: motivoRechazo || 'No cumple con nuestras políticas.',
        fechaSolicitud: null,
      };
      await negocio.save();
      await crearNotificacion({
        usuarioId: negocio.propietario,
        tipo: 'sistema',
        titulo: 'Solicitud de cambio rechazada',
        mensaje: `Tu solicitud de cambios fue rechazada. Motivo: ${motivoRechazo || 'No cumple con nuestras políticas.'}`,
        link: '/panel',
      });
    }

    res.json({ ok: true, mensaje: `Solicitud ${accion === 'aprobar' ? 'aprobada' : 'rechazada'}.` });
  } catch (error) { next(error); }
};