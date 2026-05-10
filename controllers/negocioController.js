// backend/controllers/negocioController.js
import Negocio from '../models/Negocio.js';
import { crearNotificacion } from '../utils/notificacionHelper.js';

// ─── Registrar negocio ────────────────────────────────────────
export const crearNegocio = async (req, res, next) => {
  try {
    const existente = await Negocio.findOne({ propietario: req.usuario._id });
    if (existente) return res.status(400).json({ ok: false, mensaje: 'Ya tienes un negocio registrado.' });
    const negocio = await Negocio.create({ ...req.body, propietario: req.usuario._id });
    res.status(201).json({ ok: true, mensaje: 'Negocio creado exitosamente.', negocio });
  } catch (error) { next(error); }
};

// ─── Listar negocios (público) ────────────────────────────────
export const listarNegocios = async (req, res, next) => {
  try {
    const { categoria, limite } = req.query;
    const filtro = { estado: 'activo' };
    if (categoria) filtro.categoria = categoria;
    const negocios = await Negocio.find(filtro)
      .select('-horarios')
      .populate('propietario', 'nombre correo')
      .limit(limite ? Number(limite) : 100);
    res.json({ ok: true, total: negocios.length, negocios });
  } catch (error) { next(error); }
};

// ─── Obtener negocio por ID (público) ────────────────────────
export const obtenerNegocio = async (req, res, next) => {
  try {
    const negocio = await Negocio.findById(req.params.id).populate('propietario', 'nombre correo');
    if (!negocio) return res.status(404).json({ ok: false, mensaje: 'Negocio no encontrado.' });
    res.json({ ok: true, negocio });
  } catch (error) { next(error); }
};

// ─── Actualizar negocio ───────────────────────────────────────
export const actualizarNegocio = async (req, res, next) => {
  try {
    const negocio = await Negocio.findOne({ _id: req.params.id, propietario: req.usuario._id });
    if (!negocio) return res.status(404).json({ ok: false, mensaje: 'Negocio no encontrado o sin permiso.' });
    Object.assign(negocio, req.body);
    await negocio.save();
    res.json({ ok: true, mensaje: 'Negocio actualizado.', negocio });
  } catch (error) { next(error); }
};

// ─── Mi negocio (panel negocio) ───────────────────────────────
export const miNegocio = async (req, res, next) => {
  try {
    const negocio = await Negocio.findOne({ propietario: req.usuario._id });
    if (!negocio) return res.status(404).json({ ok: false, mensaje: 'No tienes un negocio registrado.' });
    res.json({ ok: true, negocio });
  } catch (error) { next(error); }
};

// ─── Solicitar cambio de información (requiere aprobación) ────
export const solicitarCambio = async (req, res, next) => {
  try {
    const { nombre, descripcion, telefono } = req.body;
    const negocio = await Negocio.findOne({ propietario: req.usuario._id });
    if (!negocio) return res.status(404).json({ ok: false, mensaje: 'Negocio no encontrado.' });

    // Verificar si ya hay una solicitud pendiente
    if (negocio.cambiosPendientes?.estado === 'pendiente') {
      return res.status(400).json({
        ok: false,
        mensaje: 'Ya tienes una solicitud de cambio pendiente. Espera a que sea revisada.',
      });
    }

    negocio.cambiosPendientes = {
      datos:          { nombre, descripcion, telefono },
      estado:         'pendiente',
      motivoRechazo:  '',
      fechaSolicitud: new Date(),
    };
    await negocio.save();

    res.json({ ok: true, mensaje: 'Solicitud enviada. El administrador la revisará pronto.', negocio });
  } catch (error) { next(error); }
};