// backend/utils/socket.js
export function configurarSocket(io) {
  io.on('connection', (socket) => {
    console.log(`🔌 Cliente conectado: ${socket.id}`);

    // Unirse a la sala de un ticket
    socket.on('ticket:join', (ticketId) => {
      socket.join(`ticket:${ticketId}`);
      console.log(`📥 ${socket.id} entró a ticket:${ticketId}`);
    });

    // Salir de la sala de un ticket
    socket.on('ticket:leave', (ticketId) => {
      socket.leave(`ticket:${ticketId}`);
      console.log(`📤 ${socket.id} salió de ticket:${ticketId}`);
    });

    // Indicador "está escribiendo..."
    socket.on('ticket:typing', ({ ticketId, autor }) => {
      socket.to(`ticket:${ticketId}`).emit('ticket:typing', { autor });
    });

    socket.on('disconnect', () => {
      console.log(`🔌 Cliente desconectado: ${socket.id}`);
    });
  });
}