// utils/disponibilidad.js

/**
 * Genera todos los slots de tiempo entre horaInicio y horaFin
 * según la duración en minutos del negocio.
 *
 * @param {string} horaInicio - "09:00"
 * @param {string} horaFin    - "18:00"
 * @param {number} duracionMin - duración de cada slot en minutos
 * @returns {Array} - [{ horaInicio: "09:00", horaFin: "10:00" }, ...]
 */
export const generarSlots = (horaInicio, horaFin, duracionMin = 60) => {
  const slots = [];
  const [hIni, mIni] = horaInicio.split(':').map(Number);
  const [hFin, mFin] = horaFin.split(':').map(Number);

  let totalMinIni = hIni * 60 + mIni;
  const totalMinFin = hFin * 60 + mFin;

  while (totalMinIni + duracionMin <= totalMinFin) {
    const inicio = `${String(Math.floor(totalMinIni / 60)).padStart(2, '0')}:${String(totalMinIni % 60).padStart(2, '0')}`;
    totalMinIni += duracionMin;
    const fin = `${String(Math.floor(totalMinIni / 60)).padStart(2, '0')}:${String(totalMinIni % 60).padStart(2, '0')}`;
    slots.push({ horaInicio: inicio, horaFin: fin });
  }

  return slots;
};

/**
 * Filtra los slots que no están ocupados por reservas existentes.
 *
 * @param {Array} slots     - slots generados
 * @param {Array} reservas  - reservas activas del día (con horaInicio)
 * @returns {Array}
 */
export const filtrarSlotsDisponibles = (slots, reservas) => {
  const ocupados = new Set(reservas.map((r) => r.horaInicio));
  return slots.map((slot) => ({
    ...slot,
    disponible: !ocupados.has(slot.horaInicio),
  }));
};

/**
 * Devuelve el nombre del día de la semana en español para una fecha dada.
 * @param {Date|string} fecha
 * @returns {string} - "lunes", "martes", etc.
 */
export const obtenerDiaSemana = (fecha) => {
  const dias = ['domingo', 'lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado'];
  return dias[new Date(fecha).getDay()];
};