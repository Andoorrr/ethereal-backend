// backend/utils/socket.js
export function configurarSocket(io) {
  io.on('connection', (socket) => {
    console.log(`🔌 Cliente conectado: ${socket.id}`);

    // ── TICKETS ──────────────────────────────────────────────
    socket.on('ticket:join', (ticketId) => {
      socket.join(`ticket:${ticketId}`);
      console.log(`📥 ${socket.id} entró a ticket:${ticketId}`);
    });
    socket.on('ticket:leave', (ticketId) => {
      socket.leave(`ticket:${ticketId}`);
      console.log(`📤 ${socket.id} salió de ticket:${ticketId}`);
    });
    socket.on('ticket:typing', ({ ticketId, autor }) => {
      socket.to(`ticket:${ticketId}`).emit('ticket:typing', { autor });
    });

    // ── CHAT DIRECTO (cliente ↔ propietario) ─────────────────
    socket.on('chat:join', (conversacionId) => {
      socket.join(`chat:${conversacionId}`);
      console.log(`💬 ${socket.id} entró a chat:${conversacionId}`);
    });
    socket.on('chat:leave', (conversacionId) => {
      socket.leave(`chat:${conversacionId}`);
      console.log(`💬 ${socket.id} salió de chat:${conversacionId}`);
    });
    socket.on('chat:typing', ({ conversacionId, nombre }) => {
      socket.to(`chat:${conversacionId}`).emit('chat:typing', { nombre });
    });

    // ── Propietario online en su panel ───────────────────────
    // El negocio se suscribe a su sala para recibir nuevos chats
    socket.on('negocio:online', (negocioId) => {
      socket.join(`negocio:${negocioId}`);
      console.log(`🏢 Negocio ${negocioId} online`);
    });
    socket.on('negocio:offline', (negocioId) => {
      socket.leave(`negocio:${negocioId}`);
    });

    socket.on('disconnect', () => {
      console.log(`🔌 Cliente desconectado: ${socket.id}`);
    });
  });
}