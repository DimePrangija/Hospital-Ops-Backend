import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import http from "http";
import { WebSocketServer } from "ws";
import { initWebSocket } from "./services/websocket";
import authRoutes from "./routes/auth";
import patientRoutes from "./routes/patients";
import claimRoutes from "./routes/claims";
import documentRoutes from "./routes/documents";
import notificationRoutes from "./routes/notifications";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

app.use(
  cors({
    origin: ["http://localhost:3000", process.env.FRONTEND_URL || ""],
    methods: ["GET", "POST", "PATCH", "DELETE"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);
app.use(express.json());

app.get("/", (_req, res) => {
  res.json({ status: "ok", service: "Hospital Ops API" });
});

app.use("/api/auth", authRoutes);
app.use("/api/patients", patientRoutes);
app.use("/api/claims", claimRoutes);
app.use("/api/documents", documentRoutes);
app.use("/api/notifications", notificationRoutes);

const server = http.createServer(app);
const wss = new WebSocketServer({ server });
initWebSocket(wss);

server.listen(PORT, () => {
  console.log(`🏥 Hospital Ops API running on port ${PORT}`);
  console.log(`🔌 WebSocket server active`);
});
