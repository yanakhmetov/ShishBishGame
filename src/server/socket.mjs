import { createServer } from "http";
import { Server } from "socket.io";

const httpServer = createServer();
const io = new Server(httpServer, {
  cors: {
    origin: true, // Allow all origins but echo them back (better for credentials: true)
    methods: ["GET", "POST"],
    credentials: true
  },
  pingTimeout: 60000,
  pingInterval: 25000
});

io.on("connection", (socket) => {
  console.log(`[Socket] New connection: ${socket.id} (Total: ${io.engine.clientsCount})`);

  socket.on("join-room", (roomId) => {
    if (!roomId) return;
    socket.join(roomId);
    console.log(`[Socket] User ${socket.id} joined room: ${roomId}`);
    
    // Optional: notify others in the room
    socket.to(roomId).emit("player-joined", { id: socket.id });
  });

  socket.on("game-action", (data) => {
    const { roomId, action, payload } = data;
    console.log(`Action in ${roomId}: ${action}`);
    // Broadcast to everyone in the room including sender
    io.in(roomId).emit("game-update", { action, payload });
  });

  socket.on("disconnect", () => {
    console.log("Client disconnected");
  });
});

const PORT = process.env.PORT || 3005;
httpServer.listen(PORT, "0.0.0.0", () => {
  console.log(`🚀 Socket.io server running on port ${PORT}`);
});
