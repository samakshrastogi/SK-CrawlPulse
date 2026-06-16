import type { NotificationView } from "./notificationService";

type Subscriber = (notification: NotificationView) => void;

const subscribers = new Map<string, Set<Subscriber>>();

const normalizeEmail = (value: string) => value.trim().toLowerCase();

export const publishNotificationEvent = (notification: NotificationView) => {
  const recipient = normalizeEmail(notification.recipientEmail);
  subscribers.get(recipient)?.forEach((subscriber) => subscriber(notification));
};

export const subscribeToNotificationEvents = (email: string, subscriber: Subscriber) => {
  const recipient = normalizeEmail(email);
  const recipientSubscribers = subscribers.get(recipient) ?? new Set<Subscriber>();
  recipientSubscribers.add(subscriber);
  subscribers.set(recipient, recipientSubscribers);

  return () => {
    recipientSubscribers.delete(subscriber);
    if (recipientSubscribers.size === 0) {
      subscribers.delete(recipient);
    }
  };
};
