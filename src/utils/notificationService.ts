import { LocalNotifications } from '@capacitor/local-notifications';

/**
 * Creates Android Notification Channel required for Android 8.0+
 */
export async function setupNotificationChannel(): Promise<void> {
  try {
    await LocalNotifications.createChannel({
      id: 'sessionist_reminders',
      name: 'Sessionist Reminders',
      description: 'Exam and study revision reminders',
      importance: 5, // High importance (plays sound & shows alert banner)
      visibility: 1, // Show on lockscreen
      vibration: true,
    });
  } catch (err) {
    console.warn('[NotificationService] Notification channel setup error:', err);
  }
}

/**
 * Checks current display permission status for native local notifications.
 */
export async function getNotificationPermissionState(): Promise<'granted' | 'denied' | 'prompt'> {
  try {
    const check = await LocalNotifications.checkPermissions();
    return check.display as 'granted' | 'denied' | 'prompt';
  } catch {
    return 'granted';
  }
}

/**
 * Requests native push notification permissions on mobile devices.
 */
export async function requestNotificationPermissions(): Promise<boolean> {
  try {
    await setupNotificationChannel();
    const check = await LocalNotifications.checkPermissions();
    if (check.display === 'granted') return true;

    const req = await LocalNotifications.requestPermissions();
    return req.display === 'granted';
  } catch (err) {
    console.warn('[NotificationService] Local notifications unavailable on this platform:', err);
    return false;
  }
}

/**
 * Schedules a native phone local push notification for an upcoming exam.
 */
export async function scheduleExamNotification(
  examId: number,
  examTitle: string,
  dateStr: string,
  reminderDays: number = 1
): Promise<void> {
  try {
    const granted = await requestNotificationPermissions();
    if (!granted) return;

    const examDate = new Date(`${dateStr}T09:00:00`);
    const notifyDate = new Date(examDate.getTime() - reminderDays * 24 * 60 * 60 * 1000);

    // Only schedule if scheduled time is in the future
    if (notifyDate.getTime() > Date.now()) {
      const notificationId = Math.abs(examId) % 100000;
      
      // Cancel previous notification if exists
      try {
        await LocalNotifications.cancel({ notifications: [{ id: notificationId }] });
      } catch {
        // ignore
      }

      await LocalNotifications.schedule({
        notifications: [
          {
            title: `📅 Upcoming Exam: ${examTitle}`,
            body: `Your ${examTitle} exam is scheduled in ${reminderDays} day${reminderDays > 1 ? 's' : ''}! Time to review your study notes.`,
            id: notificationId,
            schedule: { at: notifyDate },
            channelId: 'sessionist_reminders',
            actionTypeId: '',
            extra: null,
          },
        ],
      });
    }
  } catch (err) {
    console.warn('[NotificationService] Failed to schedule exam notification:', err);
  }
}

/**
 * Schedules a native phone local push notification for a subject revision session.
 */
export async function scheduleSubjectReviewNotification(
  reviewId: number,
  subjectName: string,
  dateStr: string
): Promise<void> {
  try {
    const granted = await requestNotificationPermissions();
    if (!granted) return;

    const notifyDate = new Date(`${dateStr}T08:30:00`);

    if (notifyDate.getTime() > Date.now()) {
      const notificationId = Math.abs(reviewId + 50000) % 100000;
      
      try {
        await LocalNotifications.cancel({ notifications: [{ id: notificationId }] });
      } catch {
        // ignore
      }

      await LocalNotifications.schedule({
        notifications: [
          {
            title: `📚 Revision Session Today: ${subjectName}`,
            body: `You have a scheduled revision session for ${subjectName} today! Keep up your streak! 🔥`,
            id: notificationId,
            schedule: { at: notifyDate },
            channelId: 'sessionist_reminders',
            actionTypeId: '',
            extra: null,
          },
        ],
      });
    }
  } catch (err) {
    console.warn('[NotificationService] Failed to schedule subject review notification:', err);
  }
}
