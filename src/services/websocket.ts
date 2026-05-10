import { WebSocket, WebSocketServer } from "ws";
import { IncomingMessage } from "http";
import jwt from "jsonwebtoken";

const clients = new Map<string, WebSocket>();

export function initWebSocket(wss: WebSocketServer) {
  wss.on("connection", (ws: WebSocket, req: IncomingMessage) => {
    const url = new URL(req.url!, `http://${req.headers.host}`);
    const token = url.searchParams.get("token");

    if (!token) {
      ws.close(1008, "No token provided");
      return;
    }

    try {
      const payload = jwt.verify(token, process.env.JWT_SECRET!) as {
        id: string;
        email: string;
        role: string;
      };

      clients.set(payload.id, ws);
      console.log(`WS connected: ${payload.email}`);

      ws.on("close", () => {
        clients.delete(payload.id);
        console.log(`WS disconnected: ${payload.email}`);
      });

      ws.send(JSON.stringify({ type: "connected", message: "WebSocket active" }));
    } catch {
      ws.close(1008, "Invalid token");
    }
  });
}

export function notifyUser(userId: string, notification: object) {
  const ws = clients.get(userId);
  if (ws && ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify({ type: "notification", data: notification }));
  }
}
