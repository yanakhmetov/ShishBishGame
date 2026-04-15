import { io, Socket } from "socket.io-client";

let socket: Socket | null = null;

export const getSocket = () => {
    if (!socket) {
        const socketUrl = process.env.NEXT_PUBLIC_SOCKET_URL || "http://localhost:3005";
        console.log(`[Socket] Connecting to: ${socketUrl}`);
        
        socket = io(socketUrl, {
            transports: ["websocket", "polling"],
            withCredentials: true,
            secure: socketUrl.startsWith("https")
        });

        socket.on("connect_error", (err) => {
            console.error("[Socket] Connection Error:", err.message);
        });
    }
    return socket;
};

export const disconnectSocket = () => {
    if (socket) {
        socket.disconnect();
        socket = null;
    }
};
