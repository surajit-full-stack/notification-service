import { createServer } from "http";
import { Server as SocketIO } from "socket.io";
import Redis from "ioredis";
import dotenv from "dotenv";
import cluster from "cluster";
import { cpus } from "os";

dotenv.config();
const numCPUs = cpus().length;

if (cluster.isMaster) {
  console.log(`Master ${process.pid} is running`);
  // Fork workers
  for (let i = 0; i < numCPUs; i++) {
    cluster.fork({ PORT: Number(process.env.PORT) + i });
  }

  cluster.on("exit", (worker, code, signal) => {
    console.log(`worker ${worker.process.pid} died`);
  });
} else {
  const httpServer = createServer();
  const io = new SocketIO(httpServer, {
    cors: {
      origin: process.env.ORIGIN,
      methods: ["GET", "POST"],
      allowedHeaders: ["Content-Type"],
      credentials: true,
    },
  });
  const redisOptionsPubSub = {
    host: process.env.PUB_SUB_REDIS_HOST ?? "localhost",
    port: process.env.PUB_SUB_REDIS_PORT ?? 6300,
    // password: "notification-pub-sub-redis",
  };

  const subscriber = new Redis(redisOptionsPubSub);

  subscriber.subscribe("notification:new");
  subscriber.subscribe("notification:react");
  subscriber.on("error", (err) => console.log(" sub err", err));

  const redisOptionsSocketCache = {
    host: process.env.REDIS_SOCKET_CACHE_HOST ?? "localhost",
    port: process.env.REDIS_SOCKET_CACHE_PORT ?? 6400,
  };
  const socketIds = new Redis(redisOptionsSocketCache); // Create Redis client here

  io.on("connection", (socket) => {
    console.log("Client connected", socket.id);

    socket.on("join-room", ({ following, userId }) => {
      socketIds.set(userId, socket.id);
      socket.join(following.map((id) => "base:" + id));
      console.log("joined", following.map((id) => "base:" + id).join(","));
    });
    subscriber.on("message", (channel, message) => {
      const notification = JSON.parse(message);
      const { author_id } = notification;

      if (channel === "notification:new") {
        io.to(`base:${author_id}`).emit("notification", notification);
      }

      if (channel === "notification:react") {
        console.log("author_id", author_id);
        socketIds.get(author_id).then((author_of_post) => {
          console.log("author_of_post", author_of_post);
          if (author_of_post) {
            io.to(author_of_post).emit("notification", notification);
          }
        });
      }
    });
    socket.on("disconnect", () => {
      console.log("Client disconnected");
    });
  });

  httpServer.listen(process.env.PORT, () => {
    console.log("Socket Server running on port " + process.env.PORT);
  });
}
