import { io, Socket } from "socket.io-client";

let socket: Socket | null = null;

export const getSocket = () => {
    if (!socket) {
        const envUrl = process.env.NEXT_PUBLIC_SOCKET_URL;
        const socketUrl = envUrl || "http://localhost:3005";
        console.log(`[Socket] Env Var: ${envUrl ? "Found" : "Missing"}, URL: ${socketUrl}`);
        
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
