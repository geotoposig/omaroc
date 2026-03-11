import express from "express";
import { createServer } from "http";
import { Server } from "socket.io";
import { createServer as createViteServer } from "vite";
import path from "path";

async function startServer() {
  const app = express();
  const httpServer = createServer(app);
  const io = new Server(httpServer, {
    cors: {
      origin: "*",
      methods: ["GET", "POST"]
    }
  });

  const PORT = 3000;

  // Queue for matching
  let waitingUsers: string[] = [];

  io.on("connection", (socket) => {
    console.log("User connected:", socket.id);

    socket.on("find-partner", () => {
      // Remove from any existing rooms/queues
      waitingUsers = waitingUsers.filter(id => id !== socket.id);
      
      if (waitingUsers.length > 0) {
        const partnerId = waitingUsers.shift()!;
        const roomId = `room-${socket.id}-${partnerId}`;
        
        socket.join(roomId);
        const partnerSocket = io.sockets.sockets.get(partnerId);
        if (partnerSocket) {
          partnerSocket.join(roomId);
          
          // Notify both users
          io.to(socket.id).emit("partner-found", { partnerId, roomId, initiator: true });
          io.to(partnerId).emit("partner-found", { partnerId: socket.id, roomId, initiator: false });
          console.log(`Matched ${socket.id} with ${partnerId} in room ${roomId}`);
        } else {
          // Partner disconnected while waiting
          waitingUsers.push(socket.id);
          socket.emit("waiting");
        }
      } else {
        waitingUsers.push(socket.id);
        socket.emit("waiting");
        console.log(`User ${socket.id} is waiting...`);
      }
    });

    socket.on("signal", (data) => {
      io.to(data.to).emit("signal", {
        signal: data.signal,
        from: socket.id
      });
    });

    socket.on("send-message", (data) => {
      socket.to(data.roomId).emit("receive-message", {
        text: data.text,
        sender: socket.id
      });
    });

    socket.on("disconnect", () => {
      console.log("User disconnected:", socket.id);
      waitingUsers = waitingUsers.filter(id => id !== socket.id);
      // Notify partners in rooms
      socket.broadcast.emit("partner-disconnected", socket.id);
    });

    socket.on("leave-room", (roomId) => {
      socket.leave(roomId);
      socket.to(roomId).emit("partner-left");
    });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.join(process.cwd(), "dist")));
    app.get("*", (req, res) => {
      res.sendFile(path.join(process.cwd(), "dist", "index.html"));
    });
  }

  httpServer.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
