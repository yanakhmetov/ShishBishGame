import { createServer } from "http";
import { Server } from "socket.io";

const httpServer = createServer();
const io = new Server(httpServer, {
  cors: {
    origin: "*", // Разрешаем подключения ототовсюду для теста
    methods: ["GET", "POST"]
  }
});

io.on("connection", (socket) => {
  console.log("Real-time client connected:", socket.id);

  socket.on("join-room", (roomId) => {
    socket.join(roomId);
    console.log(`User joined room: ${roomId}`);
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
