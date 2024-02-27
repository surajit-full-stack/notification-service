import { createServer } from "http";
import { Server as SocketIO } from "socket.io";
import Redis from "ioredis";
import dotenv from "dotenv";
import cluster from "cluster";
import { cpus } from "os";
import cors from "cors";
import Notification from "./db.js";
import cookieParser from "cookie-parser";
import express from "express";
import { sendData } from "./senddata.js";
import { logger } from "./tools/color_console.js";

dotenv.config();
let notificationdb;
const numCPUs = cpus().length;

const corsOptions = {
  methods: "GET,POST",
  credentials: true,
  origin: process.env.ORIGIN,
};

const redisOptionsPubSub = {
  host: process.env.PUB_SUB_REDIS_HOST ?? "localhost",
  port: process.env.PUB_SUB_REDIS_PORT ?? 6300,
  // password: "notification-pub-sub-redis",
};

if (cluster.isMaster) {
  console.log(`Master ${process.pid} is running`);
  // Fork workers
  for (let i = 0; i < numCPUs; i++) {
    cluster.fork({ PORT: parseInt(process.env.PORT) + i });
  }

  cluster.on("exit", (worker, code, signal) => {
    console.log(`worker ${worker.process.pid} died`);
  });
} else {
  // Notification Database
  notificationdb = new Notification();
  // server
  const app = express();

  const httpServer = createServer(app);
  app.use(cookieParser());
  app.use(cors(corsOptions));
  app.use(express.json());

  app.get("/", (req, res) => {
    res.status(200).send("notificTION SERVER");
  });
  app.post("/", sendData);
  // Socket
  const io = new SocketIO(httpServer, {
    cors: {
      origin: process.env.ORIGIN,
      methods: ["GET", "POST"],
      allowedHeaders: ["Content-Type"],
      credentials: true,
    },
  });

  // Redis Socket Ids
  const socketIds = new Map();

  // Redis Subscriber

  const subscriber = new Redis(redisOptionsPubSub);

  subscriber.subscribe("notification:new");
  subscriber.subscribe("notification:react");
  subscriber.subscribe("notification:comment");
  subscriber.subscribe("notification:reply");
  subscriber.subscribe("notification:following");
  subscriber.on("error", (err) => console.log(" sub err", err));
  subscriber.on("connect", () => {
    logger("Redis Connected", 30, 41);
  });

  //? Handle Socket Connection

  io.on("connection", (socket) => {
    socket.on("join-room", ({ following, userId }) => {
      socketIds.set(userId, socket.id);
      socket.userId = userId;
      const _to_join = following.map((id) => "base:" + id);
      socket.join(_to_join);
      console.log("joined", _to_join.join(","));
      notificationdb.getUnsent(userId).then((unsentNotification) => {
        if (unsentNotification.length > 0) {
          socket.emit("notification", { notification: unsentNotification });
        }
      });
    });
    socket.on("un-follow", ({ followingId, userId }) => {
     
      socket.leave(`base:${followingId}`);
      console.log(`User left room: base:${followingId}`);
    });
    socket.on("disconnect", () => {
      console.log("Client disconnected", socket.userId);
      socketIds.delete(socket.userId);
    });
  });
  subscriber.on("message", (channel, message) => {
    console.log("channel", channel, ": sub:" + cluster?.worker?.id);

    const notification = JSON.parse(message);
    const { dbkey } = notification;
    console.log("dbkey", dbkey);
    
    console.log(notification.sourceUserId, "notification.sourceUserId");
    if (channel === "notification:new") {
      if (!io.sockets.adapter.rooms.has(`base:${dbkey}`)) return;
      console.log("\n\nsending...\n\n");
      io.to(`base:${dbkey}`).emit("notification", {
        notification: [notification],
      });

      notificationdb.addgroupNotification(`base:${dbkey}`, notification);
    } else {
     
      const socket_id_author_of_post = socketIds.get(Number(dbkey));

      if (
        !io.sockets.sockets.has(socket_id_author_of_post) ||
        dbkey == notification.sourceUserId
      )
        return;
      console.log("\n\nsending...\n\n");

      if (socket_id_author_of_post) {
        //author online
        io.to(socket_id_author_of_post).emit("notification", {
          notification: [notification],
        });
      } else {
        //author offline
        notificationdb.addUnsent(dbkey, notification);
      }

      notificationdb.addIndieNotification(dbkey, notification);
    }
  });
  io.on("error", (error) => {
    console.error("Socket.IO error:", error);
  });
  // Create Redis client here
  httpServer.listen(process.env.PORT, () => {
    logger(
      `Socket Server running on port ${process.env.PORT} : Worker ` +
        cluster.worker.id,
      33
    );
  });
}

export { notificationdb };
