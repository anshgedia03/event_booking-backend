import { getMessaging, MulticastMessage, Notification } from 'firebase-admin/messaging';
import firebaseApp from '../config/firebase';
import User from '../models/user.model';
import ApiError from '../utils/ApiError';

export interface SendNotificationInput {
  title: string;
  message: string;
  image?: string;
  userIds?: string[];
  data?: Record<string, string>;
}

/**
 * Send custom FCM push notification with title, message, and optional image
 */
export const sendFCMNotification = async (input: SendNotificationInput) => {
  const { title, message, image, userIds, data } = input;

  if (!firebaseApp) {
    throw new ApiError(500, 'Firebase Admin SDK is not initialized on the server.');
  }

  // 1. Fetch target FCM tokens
  let query: any = { fcmToken: { $ne: null, $exists: true } };
  if (userIds && userIds.length > 0) {
    query._id = { $in: userIds };
  }

  const users = await User.find(query).select('fcmToken');
  const tokens = users.map((u) => u.fcmToken).filter((token): token is string => Boolean(token));

  if (tokens.length === 0) {
    return {
      success: true,
      message: 'No registered device tokens found to send notifications.',
      targetCount: 0,
      successCount: 0,
      failureCount: 0,
    };
  }

  // 2. Build FCM Multicast Message Payload
  const notificationPayload: Notification = {
    title,
    body: message,
  };

  if (image) {
    notificationPayload.imageUrl = image;
  }

  const messagePayload: MulticastMessage = {
    tokens,
    notification: notificationPayload,
    android: {
      notification: {
        channelId: 'default',
        sound: 'default',
        priority: 'high',
        ...(image && { imageUrl: image }),
      },
    },
    data: data || {},
  };

  // 3. Send Multicast Message via Firebase Admin SDK
  const messaging = getMessaging(firebaseApp);
  const response = await messaging.sendEachForMulticast(messagePayload);

  return {
    success: true,
    message: `Sent notification to ${response.successCount} of ${tokens.length} devices.`,
    targetCount: tokens.length,
    successCount: response.successCount,
    failureCount: response.failureCount,
    errors: response.responses
      .filter((r) => !r.success)
      .map((r) => r.error?.message),
  };
};
