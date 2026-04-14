"use client";

import React, { useState, useEffect, useRef } from "react";
import { useAppContext } from "@/context/AppContext";
import { Send, MessageSquare } from "lucide-react";
import { useGame, PlayerPosition } from "@/context/GameContext";
import { useSession } from "next-auth/react";

interface ChatMessage {
  id: string;
  senderId: string;
  senderName: string;
  senderPos: string;
  text: string;
  timestamp: number;
}

const GameChat = () => {
  const { t } = useAppContext();
  const { connectedPlayers, roomId } = useGame();
  const { data: session } = useSession();
  
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputValue, setInputValue] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    const handleSocketUpdate = (data: any) => {
      if (data.action === "chat-message") {
        setMessages((prev) => [...prev, data.payload]);
      }
    };

    import("@/lib/socket").then(({ getSocket }) => {
      getSocket().on("game-update", handleSocketUpdate);
    });

    return () => {
      import("@/lib/socket").then(({ getSocket }) => {
        getSocket().off("game-update", handleSocketUpdate);
      });
    };
  }, []);

  const handleSend = async () => {
    if (!inputValue.trim() || !roomId || !session?.user) return;

    // Determine current user's position for coloring/logic
    const me = connectedPlayers.find(p => p.userId === (session.user as any).id);
    const myName = me?.name || session.user.name || "Unknown";
    const myPos = me?.position || "unknown";

    const newMessage: ChatMessage = {
      id: Math.random().toString(36).substring(2, 9),
      senderId: (session.user as any).id,
      senderName: myName,
      senderPos: myPos,
      text: inputValue.trim(),
      timestamp: Date.now(),
    };

    const { getSocket } = await import("@/lib/socket");
    getSocket().emit("game-action", {
      roomId,
      action: "chat-message",
      payload: newMessage,
    });

    setInputValue("");
  };

  const getPosColor = (pos: string) => {
    switch (pos) {
      case "top": return "#ef4444"; // Red
      case "bottom": return "#3b82f6"; // Blue
      case "left": return "#eab308"; // Yellow
      case "right": return "#22c55e"; // Green
      default: return "rgba(255,255,255,0.7)";
    }
  };

  return (
    <div className="chat-container">
      <div className="chat-header">
        <MessageSquare size={18} color="var(--accent)" />
        <h3>{t("arenaChat")}</h3>
      </div>

      <div className="chat-messages no-scrollbar" style={{ overflowY: "auto", display: "flex", flexDirection: "column", gap: "10px", padding: "10px" }}>
        {messages.length === 0 ? (
          <div style={{ textAlign: "center", opacity: 0.3, fontSize: "12px", marginTop: "1rem" }}>
            {t("noMessages")}
          </div>
        ) : (
          messages.map((msg) => {
            const isMe = session?.user && (session.user as any).id === msg.senderId;
            return (
              <div key={msg.id} style={{
                display: "flex", 
                flexDirection: "column", 
                alignItems: isMe ? "flex-end" : "flex-start",
                width: "100%"
              }}>
                <span style={{ 
                  fontSize: "10px", 
                  opacity: 0.6, 
                  marginBottom: "2px", 
                  color: isMe ? "rgba(255,255,255,0.5)" : getPosColor(msg.senderPos) 
                }}>
                  {isMe ? t("you") : msg.senderName}
                </span>
                <div style={{
                  background: isMe ? "rgba(168, 85, 247, 0.2)" : "rgba(255,255,255,0.05)",
                  border: isMe ? "1px solid rgba(168, 85, 247, 0.4)" : "1px solid rgba(255,255,255,0.1)",
                  padding: "8px 12px",
                  borderRadius: isMe ? "12px 2px 12px 12px" : "2px 12px 12px 12px",
                  fontSize: "12px",
                  maxWidth: "85%",
                  wordBreak: "break-word"
                }}>
                  {msg.text}
                </div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      <div className="chat-input-area" style={{ display: "flex", gap: "8px", padding: "10px", borderTop: "1px solid rgba(255,255,255,0.05)" }}>
        <input
          type="text"
          className="chat-input glass"
          placeholder={t("chatPlaceholder")}
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSend()}
          style={{ 
            flex: 1, 
            background: "rgba(0,0,0,0.2)", 
            border: "1px solid rgba(255,255,255,0.1)", 
            padding: "8px 12px", 
            borderRadius: "6px",
            color: "white",
            fontSize: "12px",
            outline: "none"
          }}
        />
        <button 
          className="chat-send-btn" 
          onClick={handleSend}
          disabled={!inputValue.trim()}
          style={{
            background: inputValue.trim() ? "var(--accent)" : "rgba(255,255,255,0.1)",
            border: "none",
            borderRadius: "6px",
            padding: "0 12px",
            cursor: inputValue.trim() ? "pointer" : "not-allowed",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            transition: "all 0.2s ease"
          }}
        >
          <Send size={16} color="white" style={{ opacity: inputValue.trim() ? 1 : 0.5 }} />
        </button>
      </div>
    </div>
  );
};

export default GameChat;
