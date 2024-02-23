import mongoose from "mongoose";
import dotenv from "dotenv";
import moment from "moment";
import { logger } from "./tools/color_console.js";
dotenv.config();
const url = process.env.MONGO_URL;
const notificationSchema = new mongoose.Schema({
  socketId: {
    type: String,
    required: true,
  },
  time: {
    type: Date,
    default: Date.now(),
  },
  data: {
    type: Object,
    required: true,
  },
});
const groupIdBase = mongoose.model(
  "Notifications",
  notificationSchema,
  "notification-group"
);
const indieIdBase = mongoose.model(
  "Notifications",
  notificationSchema,
  "notification-indie"
);
const unsentNotification = mongoose.model(
  "Notifications",
  notificationSchema,
  "unsent"
);

class Notification {
  constructor() {
    this.connect();
  }
  async connect() {
    try {
      await mongoose.connect(url);
      logger("Connected to Mongo DB", 30, 42);
    } catch (error) {
      console.log("error", error);
    }
  }
  async addgroupNotification(socketref, notification) {
    try {
      const { time = moment() } = notification;
      const data = new groupIdBase({
        socketId: socketref,
        data: notification,
        time,
      });
      const result = await data.save();
    } catch (error) {
      console.log("error", error);
    }
  }
  async addIndieNotification(socketref, notification) {
    try {
      const { time = moment() } = notification;
      const data = new indieIdBase({
        socketId: socketref,
        data: notification,
        time,
      });
      const result = await data.save();
      // console.log("result", result);
    } catch (error) {
      console.log("error", error);
    }
  }
  async addUnsent(socketref, notification) {
    try {
      const { time = moment() } = notification;
      const data = new unsentNotification({
        socketId: socketref,
        data: notification,
        time,
      });
      const result = await data.save();
      // console.log("result", result);
    } catch (error) {
      console.log("error", error);
    }
  }

  async get(groupIds, indieId) {
    try {
      const groupNotifications = await groupIdBase
        .find({
          socketId: { $in: groupIds },
        })
        .sort({ _id: -1 });
      const indieVidiualNotification = await indieIdBase
        .find({
          socketId: indieId,
        })
        .sort({ _id: -1 });
      const allNotifications = [
        ...groupNotifications,
        ...indieVidiualNotification,
      ];

      allNotifications.sort((a, b) => {
        // Extract timestamp from ObjectId (_id)
        const timeA = a._id.getTimestamp();
        const timeB = b._id.getTimestamp();
        return timeB - timeA; 
      });

      return allNotifications;
    } catch (error) {
      console.log("error", error);
    }
  }

  async getUnsent(indieId) {
    try {
      const unsents = await unsentNotification
        .find({
          socketId: indieId,
        })
        .sort({ _id: -1 });
      return unsents;
    } catch (error) {
      console.log("error", error);
    }
  }
}
export default Notification;
