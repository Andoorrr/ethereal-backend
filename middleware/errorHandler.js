// middleware/errorHandler.js

// Manejador global de errores
const errorHandler = (err, req, res, next) => {
  let statusCode = err.statusCode || 500;
  let mensaje = err.message || 'Error interno del servidor';

  // Error de clave duplicada en MongoDB (ej: correo ya registrado)
  if (err.code === 11000) {
    const campo = Object.keys(err.keyValue)[0];
    mensaje = `El campo '${campo}' ya está en uso.`;
    statusCode = 400;
  }

  // Error de validación de Mongoose
  if (err.name === 'ValidationError') {
    mensaje = Object.values(err.errors).map((e) => e.message).join(', ');
    statusCode = 400;
  }

  // Token inválido
  if (err.name === 'JsonWebTokenError') {
    mensaje = 'Token inválido.';
    statusCode = 401;
  }

  if (process.env.NODE_ENV === 'development') {
    console.error('❌', err.stack);
  }

  res.status(statusCode).json({
    ok: false,
    mensaje,
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
  });
};

export default errorHandler;