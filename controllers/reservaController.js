// controllers/reservaController.js
import Reserva from '../models/Reserva.js';
import Negocio from '../models/Negocio.js';
import User from '../models/User.js';
import { generarSlots, filtrarSlotsDisponibles, obtenerDiaSemana } from '../utils/disponibilidad.js';
import { crearNotificacion } from '../utils/notificacionHelper.js';

// ─── RF06: Disponibilidad en tiempo real ─────────────────────
export const obtenerDisponibilidad = async (req, res, next) => {
  try {
    const { negocioId, fecha } = req.query;

    if (!negocioId || !fecha) {
      return res.status(400).json({ ok: false, mensaje: 'negocioId y fecha son requeridos.' });
    }

    const negocio = await Negocio.findById(negocioId);
    if (!negocio) return res.status(404).json({ ok: false, mensaje: 'Negocio no encontrado.' });

    const diaSemana = obtenerDiaSemana(fecha);
    const horarioDia = negocio.horarios.find((h) => h.dia === diaSemana);

    if (!horarioDia || !horarioDia.abierto) {
      return res.json({ ok: true, disponible: false, mensaje: 'El negocio no atiende ese día.', slots: [] });
    }

    const todosLosSlots = generarSlots(horarioDia.horaInicio, horarioDia.horaFin, negocio.duracionSlot);

    const inicioDia = new Date(fecha);
    inicioDia.setUTCHours(0, 0, 0, 0);
    const finDia = new Date(fecha);
    finDia.setUTCHours(23, 59, 59, 999);

    const reservasActivas = await Reserva.find({
      negocio: negocioId,
      fecha: { $gte: inicioDia, $lte: finDia },
      estado: { $ne: 'cancelada' },
    });

    const slots = filtrarSlotsDisponibles(todosLosSlots, reservasActivas);
    res.json({ ok: true, fecha, negocio: negocio.nombre, slots });
  } catch (error) {
    next(error);
  }
};

// ─── RF07: Crear reserva por rango de fechas o slot ──────────
export const crearReserva = async (req, res, next) => {
  try {
    const { negocioId, localId, fechaInicio, fechaFin, horaInicio, horaFin, notas } = req.body;

    if (!negocioId || !fechaInicio) {
      return res.status(400).json({ ok: false, mensaje: 'negocioId y fechaInicio son requeridos.' });
    }

    const negocio = await Negocio.findById(negocioId);
    if (!negocio || !negocio.activo) {
      return res.status(404).json({ ok: false, mensaje: 'Negocio no encontrado o inactivo.' });
    }

    if (negocio.propietario.toString() === req.usuario._id.toString()) {
      return res.status(403).json({ ok: false, mensaje: 'El propietario no puede reservar su propio negocio.' });
    }

    const inicio = new Date(fechaInicio);
    inicio.setUTCHours(0, 0, 0, 0);

    const fechaFinStr = fechaFin || fechaInicio;
    const fin = new Date(fechaFinStr);
    if (isNaN(fin.getTime())) {
      return res.status(400).json({ ok: false, mensaje: 'fechaFin inválida.' });
    }
    fin.setUTCHours(23, 59, 59, 999);

    if (horaInicio && horaFin) {
      const conflictoSlot = await Reserva.findOne({
        negocio: negocioId,
        fechaInicio: inicio,
        horaInicio,
        estado: { $ne: 'cancelada' },
      });
      if (conflictoSlot) {
        return res.status(409).json({ ok: false, mensaje: 'Ese horario ya está reservado.' });
      }
    } else {
      if (fin <= inicio) {
        return res.status(400).json({ ok: false, mensaje: 'La fecha de salida debe ser posterior a la de entrada.' });
      }
      const filtroLocal = localId ? { local: localId } : { negocio: negocioId };
      const conflicto = await Reserva.findOne({
        ...filtroLocal,
        estado:      { $ne: 'cancelada' },
        fechaInicio: { $lt: fin },
        fechaFin:    { $gt: inicio },
      });
      if (conflicto) {
        return res.status(409).json({ ok: false, mensaje: 'Las fechas seleccionadas no están disponibles.' });
      }
    }

    const reserva = await Reserva.create({
      cliente:     req.usuario._id,
      negocio:     negocioId,
      local:       localId || null,
      fechaInicio: inicio,
      fechaFin:    fin,
      horaInicio:  horaInicio || '',
      horaFin:     horaFin    || '',
      notas:       notas      || '',
    });

    try {
      await enviarConfirmacionReserva({
        correo:        req.usuario.correo,
        nombre:        req.usuario.nombre,
        negocioNombre: negocio.nombre,
        fecha:         fechaInicio,
        horaInicio:    horaInicio || new Date(inicio).toLocaleDateString('es-PE'),
        horaFin:       horaFin    || new Date(fin).toLocaleDateString('es-PE'),
      });
      await Reserva.findByIdAndUpdate(reserva._id, { notificacionEnviada: true });
    } catch (emailErr) {
      console.error('⚠️ Error al enviar email:', emailErr.message);
    }

    const reservaPopulada = await reserva.populate([
      { path: 'cliente', select: 'nombre correo' },
      { path: 'negocio', select: 'nombre direccion propietario' },
      { path: 'local',   select: 'nombre precio' },
    ]);

    await crearNotificacion({
      usuarioId: req.usuario._id,
      tipo:    'nueva_reserva',
      titulo:  '¡Reserva creada!',
      mensaje: `Tu reserva en ${negocio.nombre} fue registrada correctamente.`,
      link:    '/mi-cuenta',
    });
    await crearNotificacion({
      usuarioId: negocio.propietario,
      tipo:    'nueva_reserva',
      titulo:  'Nueva reserva recibida',
      mensaje: `${req.usuario.nombre} ha realizado una reserva en tu negocio.`,
      link:    '/panel',
    });

    res.status(201).json({ ok: true, mensaje: 'Reserva creada exitosamente.', reserva: reservaPopulada });
  } catch (error) {
    next(error);
  }
};

// ─── Negocio cambia estado de una reserva ────────────────────
export const cambiarEstadoReserva = async (req, res, next) => {
  try {
    const negocio = await Negocio.findOne({ propietario: req.usuario._id });
    if (!negocio) return res.status(404).json({ ok: false, mensaje: 'No tienes un negocio.' });

    const reserva = await Reserva.findOne({ _id: req.params.id, negocio: negocio._id });
    if (!reserva) return res.status(404).json({ ok: false, mensaje: 'Reserva no encontrada.' });

    const { estado } = req.body;
    const estadosValidos = ['confirmada', 'completada', 'cancelada'];
    if (!estadosValidos.includes(estado)) {
      return res.status(400).json({ ok: false, mensaje: 'Estado inválido.' });
    }

    await Reserva.updateOne({ _id: req.params.id }, { $set: { estado } });

    const reservaInfo = await Reserva.findById(req.params.id).populate('cliente', '_id nombre');
    if (reservaInfo?.cliente) {
      const mensajes = {
        confirmada: `Tu reserva en ${negocio.nombre} fue confirmada. ¡Te esperamos!`,
        completada: `Tu reserva en ${negocio.nombre} fue marcada como completada. ¡Gracias!`,
        cancelada:  `Tu reserva en ${negocio.nombre} fue cancelada por el negocio.`,
      };
      await crearNotificacion({
        usuarioId: reservaInfo.cliente._id,
        tipo:    `reserva_${estado}`,
        titulo:  `Reserva ${estado}`,
        mensaje: mensajes[estado] ?? `Tu reserva fue actualizada a: ${estado}.`,
        link:    '/mi-cuenta',
      });
    }

    res.json({ ok: true, mensaje: `Reserva marcada como ${estado}.`, estado });
  } catch (error) {
    next(error);
  }
};

// ─── Crear reserva manual ─────────────────────────────────────
export const crearReservaManual = async (req, res, next) => {
  try {
    const negocio = await Negocio.findOne({ propietario: req.usuario._id });
    if (!negocio) return res.status(404).json({ ok: false, mensaje: 'No tienes un negocio registrado.' });

    const { clienteCorreo, clienteNombre, fecha, horaInicio, horaFin, notas } = req.body;

    if (!clienteCorreo || !fecha || !horaInicio || !horaFin) {
      return res.status(400).json({ ok: false, mensaje: 'clienteCorreo, fecha, horaInicio y horaFin son requeridos.' });
    }

    let cliente = await User.findOne({ correo: clienteCorreo });
    if (!cliente) {
      const passwordTemporal = Math.random().toString(36).slice(-8);
      cliente = await User.create({
        nombre:   clienteNombre || clienteCorreo.split('@')[0],
        correo:   clienteCorreo,
        password: passwordTemporal,
        rol:      'cliente',
      });
    }

    const fechaObj = new Date(fecha);
    fechaObj.setUTCHours(0, 0, 0, 0);

    const conflicto = await Reserva.findOne({
      negocio:    negocio._id,
      fechaInicio: fechaObj,
      horaInicio,
      estado:     { $ne: 'cancelada' },
    });
    if (conflicto) return res.status(409).json({ ok: false, mensaje: 'Ese horario ya está reservado.' });

    const reserva = await Reserva.create({
      cliente:     cliente._id,
      negocio:     negocio._id,
      fechaInicio: fechaObj,
      fechaFin:    fechaObj,
      horaInicio,
      horaFin,
      notas:       notas || '',
      estado:      'confirmada',
    });

    const reservaPopulada = await reserva.populate([
      { path: 'cliente', select: 'nombre correo' },
      { path: 'negocio', select: 'nombre' },
    ]);

    try {
      await enviarConfirmacionReserva({
        correo:        clienteCorreo,
        nombre:        cliente.nombre,
        negocioNombre: negocio.nombre,
        fecha,
        horaInicio,
        horaFin,
      });
    } catch (e) { console.warn('Email no enviado:', e.message); }

    res.status(201).json({ ok: true, mensaje: 'Reserva manual creada exitosamente.', reserva: reservaPopulada });
  } catch (error) {
    next(error);
  }
};

// ─── RF08: Cancelar reserva ───────────────────────────────────
export const cancelarReserva = async (req, res, next) => {
  try {
    const reserva = await Reserva.findOne({
      _id:     req.params.id,
      cliente: req.usuario._id,
    });

    if (!reserva) return res.status(404).json({ ok: false, mensaje: 'Reserva no encontrada.' });
    if (reserva.estado === 'cancelada') return res.status(400).json({ ok: false, mensaje: 'La reserva ya está cancelada.' });

    const fechaReserva = reserva.fechaInicio ?? reserva.fecha;
    if (new Date(fechaReserva) < new Date()) {
      return res.status(400).json({ ok: false, mensaje: 'No puedes cancelar una reserva pasada.' });
    }

    await Reserva.updateOne({ _id: req.params.id }, { $set: { estado: 'cancelada' } });
    res.json({ ok: true, mensaje: 'Reserva cancelada correctamente.' });
  } catch (error) {
    next(error);
  }
};

// ─── RF12: Historial de reservas del cliente ─────────────────
export const misReservas = async (req, res, next) => {
  try {
    const reservas = await Reserva.find({ cliente: req.usuario._id })
      .populate('negocio', 'nombre direccion telefono')
      .sort({ fechaInicio: -1, fecha: -1 });

    res.json({ ok: true, total: reservas.length, reservas });
  } catch (error) {
    next(error);
  }
};

// ─── RF11: Reservas del negocio (panel) ──────────────────────
export const reservasDelNegocio = async (req, res, next) => {
  try {
    const negocio = await Negocio.findOne({ propietario: req.usuario._id });
    if (!negocio) return res.status(404).json({ ok: false, mensaje: 'No tienes un negocio registrado.' });

    const { fecha, estado } = req.query;
    const filtro = { negocio: negocio._id };
    if (estado) filtro.estado = estado;
    if (fecha) {
      const d = new Date(fecha);
      d.setUTCHours(0, 0, 0, 0);
      const fin = new Date(fecha);
      fin.setUTCHours(23, 59, 59, 999);
      // Compatible con ambos campos
      filtro.$or = [
        { fechaInicio: { $gte: d, $lte: fin } },
        { fecha:       { $gte: d, $lte: fin } },
      ];
    }

    const reservas = await Reserva.find(filtro)
      .populate('cliente', 'nombre correo telefono')
      .populate('negocio', 'nombre categoria direccion')
      .populate('local',   'nombre precio')
      .sort({ fechaInicio: 1, fecha: 1, horaInicio: 1 });

    res.json({ ok: true, total: reservas.length, reservas });
  } catch (error) {
    next(error);
  }
};

// ─── Finanzas del negocio ─────────────────────────────────────
export const finanzasNegocio = async (req, res, next) => {
  try {
    const negocio = await Negocio.findOne({ propietario: req.usuario._id });
    if (!negocio) return res.status(404).json({ ok: false, mensaje: 'No tienes un negocio registrado.' });

    const reservas = await Reserva.find({ negocio: negocio._id })
      .populate('cliente', 'nombre correo')
      .populate('local', 'nombre precio')
      .sort({ createdAt: -1 });

    const confirmadas = reservas.filter(r => r.estado === 'confirmada');
    const canceladas  = reservas.filter(r => r.estado === 'cancelada');
    const completadas = reservas.filter(r => r.estado === 'completada');

    // Calcular precio real por reserva (del local, o fallback 50)
    const calcularPrecio = (r) => {
      if (r.estado === 'cancelada') return 0;
      const precioBase = r.local?.precio ?? 50;
      // Si es hospedaje y tiene rango, calcular noches
      if (r.fechaInicio && r.fechaFin && !r.horaInicio) {
        const noches = Math.round((new Date(r.fechaFin) - new Date(r.fechaInicio)) / (1000 * 60 * 60 * 24));
        return precioBase * Math.max(1, noches);
      }
      return precioBase;
    };

    const totalIngresos = reservas
      .filter(r => r.estado === 'confirmada' || r.estado === 'completada')
      .reduce((sum, r) => sum + calcularPrecio(r), 0);

    const transacciones = reservas.slice(0, 20).map(r => {
      const fechaBase = r.fechaInicio ?? r.fecha ?? new Date();
      const horaLabel = r.horaInicio
        ? `${r.horaInicio} a ${r.horaFin}`
        : new Date(fechaBase).toLocaleDateString('es-PE');
      const monto = calcularPrecio(r);
      return {
        id:        r._id.toString(),
        entity:    `${r.local?.nombre || 'Reserva'} — ${horaLabel}`,
        subtext:   `Cliente: ${r.cliente?.nombre ?? 'Sin nombre'}`,
        date:      new Date(fechaBase).toLocaleDateString('es-PE', { day: '2-digit', month: 'short', year: 'numeric' }),
        type:      r.estado === 'cancelada' ? 'EXPENSE' : 'INCOME',
        amount:    monto,
        estado:    r.estado,
        icon:      'hotel',
        iconBg:    r.estado === 'cancelada' ? 'bg-red-100' : 'bg-primary-container',
        iconColor: r.estado === 'cancelada' ? 'text-red-500' : 'text-primary',
      };
    });

    res.json({
      ok: true,
      resumen: {
        totalIngresos,
        totalGastos:   0,
        balance:       totalIngresos,
        totalReservas: reservas.length,
        confirmadas:   confirmadas.length,
        canceladas:    canceladas.length,
        completadas:   completadas.length,
        precioPorSlot: 'Variable según local',
      },
      transacciones,
    });
  } catch (error) {
    next(error);
  }
};

// ─── RF09: Calendario del negocio ────────────────────────────
export const calendarioNegocio = async (req, res, next) => {
  try {
    const { negocioId, mes, anio } = req.query;

    const inicio = new Date(anio, mes - 1, 1);
    const fin    = new Date(anio, mes, 0, 23, 59, 59);

    const reservas = await Reserva.find({
      negocio: negocioId,
      $or: [
        { fechaInicio: { $gte: inicio, $lte: fin } },
        { fecha:       { $gte: inicio, $lte: fin } },
      ],
      estado: { $ne: 'cancelada' },
    }).select('fecha fechaInicio fechaFin horaInicio horaFin estado');

    res.json({ ok: true, reservas });
  } catch (error) {
    next(error);
  }
};