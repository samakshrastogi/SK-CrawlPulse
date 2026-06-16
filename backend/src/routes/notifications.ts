import { Router } from "express";
import { HttpError } from "../lib/HttpError";
import {
  listNotifications,
  markAllNotificationsRead,
  markNotificationRead,
  streamNotifications,
} from "../modules/notifications/notificationService";

export const notificationRouter = Router();

notificationRouter.get("/", async (req, res, next) => {
  try {
    res.json(await listNotifications(req.query.email));
  } catch (error) {
    next(error);
  }
});

notificationRouter.get("/stream", async (req, res, next) => {
  try {
    const started = await streamNotifications(req.query.email, res);
    if (!started) {
      throw new HttpError(400, "email is required");
    }
  } catch (error) {
    next(error);
  }
});

notificationRouter.patch("/:notificationId/read", async (req, res, next) => {
  try {
    const notification = await markNotificationRead(req.body?.email, req.params.notificationId);
    if (!notification) {
      throw new HttpError(404, "notification not found");
    }

    res.json(notification);
  } catch (error) {
    next(error);
  }
});

notificationRouter.post("/read-all", async (req, res, next) => {
  try {
    res.json({ updated: await markAllNotificationsRead(req.body?.email) });
  } catch (error) {
    next(error);
  }
});
