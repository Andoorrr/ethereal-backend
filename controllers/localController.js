// backend/controllers/localController.js
import Local from '../models/Local.js';
import Negocio from '../models/Negocio.js';

const HOSPEDAJE_CATS = ['casa','departamento','habitacion','hostal','hotel','cabaña'];
const LOCAL_CATS     = ['local','estudio','oficina','edificio','almacen','consultorio'];

function inferirTipo(local) {
  if (local.tipoAlquiler) return local.tipoAlquiler;
  const cat = (local.categoria || '').toLowerCase();
  if (HOSPEDAJE_CATS.includes(cat)) return 'hospedaje';
  if (LOCAL_CATS.includes(cat))     return 'local';
  return 'servicio';
}

// GET /api/locales — todos los locales activos (para Descubrir)
export const listarLocales = async (req, res, next) => {
  try {
    const { categoria, busqueda, tipoAlquiler } = req.query;
    const filtro = { activo: true };
    if (categoria && categoria !== 'todas') filtro.categoria = categoria;
    if (busqueda) filtro.nombre = { $regex: busqueda, $options: 'i' };
    // Si filtra por tipo, incluir también locales cuya categoría implique ese tipo
    if (tipoAlquiler) {
      const catsPorTipo = {
        hospedaje: HOSPEDAJE_CATS,
        local:     LOCAL_CATS,
        servicio:  ['cancha','salon','spa','estudio_fitness','auditorio','otro'],
      };
      filtro.$or = [
        { tipoAlquiler },
        { tipoAlquiler: { $exists: false }, categoria: { $in: catsPorTipo[tipoAlquiler] || [] } },
        { tipoAlquiler: null,               categoria: { $in: catsPorTipo[tipoAlquiler] || [] } },
      ];
      delete filtro.tipoAlquiler; // ya está en $or
    }

    const locales = await Local.find(filtro)
      .populate('negocio', 'nombre direccion telefono horarios duracionSlot')
      .sort({ createdAt: -1 });

    // Asegurar que cada local tenga tipoAlquiler correcto en la respuesta
    const localesConTipo = locales.map(l => {
      const obj = l.toObject();
      obj.tipoAlquiler = inferirTipo(obj);
      return obj;
    });

    res.json({ ok: true, total: localesConTipo.length, locales: localesConTipo });
  } catch (error) {
    next(error);
  }
};

// GET /api/locales/:id — detalle de un local
export const obtenerLocal = async (req, res, next) => {
  try {
    const local = await Local.findById(req.params.id)
      .populate('negocio', 'nombre direccion telefono horarios duracionSlot activo');
    if (!local || !local.activo)
      return res.status(404).json({ ok: false, mensaje: 'Local no encontrado.' });
    res.json({ ok: true, local });
  } catch (error) {
    next(error);
  }
};

// POST /api/locales — negocio crea un local
export const crearLocal = async (req, res, next) => {
  try {
    const negocio = await Negocio.findOne({ propietario: req.usuario._id });
    if (!negocio) return res.status(404).json({ ok: false, mensaje: 'No tienes un negocio registrado.' });

    const { nombre, descripcion, categoria, precio, capacidad, imagenes, servicios, direccion, tipoAlquiler } = req.body;

    if (!nombre) return res.status(400).json({ ok: false, mensaje: 'El nombre del local es requerido.' });

    // Siempre inferir el tipo desde categoría si no viene explícito
    const catFinal  = categoria || negocio.categoria;
    const tipoFinal = tipoAlquiler || inferirTipo({ categoria: catFinal });

    const local = await Local.create({
      negocio:      negocio._id,
      nombre,
      descripcion:  descripcion || '',
      categoria:    catFinal,
      precio:       precio      || 50,
      capacidad:    capacidad   || 1,
      imagenes:     imagenes    || [],
      servicios:    servicios   || [],
      direccion:    direccion   || negocio.direccion || '',
      tipoAlquiler: tipoFinal,
    });

    res.status(201).json({ ok: true, mensaje: 'Local creado exitosamente.', local });
  } catch (error) {
    next(error);
  }
};

// PUT /api/locales/:id — actualizar local
export const actualizarLocal = async (req, res, next) => {
  try {
    const negocio = await Negocio.findOne({ propietario: req.usuario._id });
    const local   = await Local.findOne({ _id: req.params.id, negocio: negocio?._id });
    if (!local) return res.status(404).json({ ok: false, mensaje: 'Local no encontrado.' });

    Object.assign(local, req.body);
    await local.save();
    res.json({ ok: true, mensaje: 'Local actualizado.', local });
  } catch (error) {
    next(error);
  }
};

// DELETE /api/locales/:id — desactivar local
export const desactivarLocal = async (req, res, next) => {
  try {
    const negocio = await Negocio.findOne({ propietario: req.usuario._id });
    const local   = await Local.findOne({ _id: req.params.id, negocio: negocio?._id });
    if (!local) return res.status(404).json({ ok: false, mensaje: 'Local no encontrado.' });

    local.activo = false;
    await local.save();
    res.json({ ok: true, mensaje: 'Local desactivado.' });
  } catch (error) {
    next(error);
  }
};

// GET /api/locales/panel/mis-locales — locales del negocio autenticado
export const misLocales = async (req, res, next) => {
  try {
    const negocio = await Negocio.findOne({ propietario: req.usuario._id });
    if (!negocio) return res.status(404).json({ ok: false, mensaje: 'No tienes un negocio registrado.' });

    // Devuelve TODOS (activos e inactivos) para que el panel muestre el estado
    const locales = await Local.find({ negocio: negocio._id }).sort({ createdAt: -1 });

    const localesConTipo = locales.map(l => {
      const obj = l.toObject();
      obj.tipoAlquiler = inferirTipo(obj);
      return obj;
    });

    res.json({ ok: true, total: localesConTipo.length, locales: localesConTipo });
  } catch (error) {
    next(error);
  }
};

// DELETE /api/locales/:id — eliminar local definitivamente
export const eliminarLocal = async (req, res, next) => {
  try {
    const negocio = await Negocio.findOne({ propietario: req.usuario._id });
    const local   = await Local.findOne({ _id: req.params.id, negocio: negocio?._id });
    if (!local) return res.status(404).json({ ok: false, mensaje: 'Local no encontrado.' });

    await Local.findByIdAndDelete(req.params.id);
    res.json({ ok: true, mensaje: 'Local eliminado.' });
  } catch (error) {
    next(error);
  }
};