import { Platform } from 'react-native';

const Notifications = Platform.OS !== 'web' ? require('expo-notifications') : null;

export class NotificationService {
  static async requestPermissions() {
    if (Platform.OS === 'web') return false;
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;
    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }
    return finalStatus === 'granted';
  }

  static async sendBudgetWarning(categoryName: string, percentage: number) {
    if (Platform.OS === 'web') {
      console.log(`[Budget Warning] ${categoryName} is at ${Math.round(percentage * 100)}%!`);
      return;
    }

    await Notifications.scheduleNotificationAsync({
      content: {
        title: "⚠️ Budget Warning",
        body: `You have spent ${Math.round(percentage * 100)}% of your ${categoryName} budget!`,
        sound: true,
        data: { categoryName },
      },
      trigger: null, // send immediately
    });
  }

  static async scheduleEventReminder(title: string, date: string, startTime: string) {
    if (Platform.OS === 'web' || !Notifications) return;

    try {
      const [hours, minutes] = startTime.split(':').map(Number);
      const eventDate = new Date(date);
      eventDate.setHours(hours, minutes, 0, 0);

      // Trigger 1 hour before
      const triggerTime = eventDate.getTime() - (60 * 60 * 1000);
      const triggerDate = new Date(triggerTime);

      if (triggerTime <= Date.now()) {
        console.log("Trigger time is in the past, skipping reminder");
        return;
      }

      await Notifications.scheduleNotificationAsync({
        content: {
          title: "📅 Schedule Reminder",
          body: `"${title}" starts in 1 hour!`,
          sound: true,
        },
        trigger: triggerDate,
      });
      console.log(`Scheduled reminder for ${title} at ${triggerDate.toLocaleString()}`);
    } catch (e) {
      console.error("Failed to schedule notification", e);
    }
  }

  static async init() {
    if (!Notifications) return;
    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: false,
        shouldShowBanner: true,
        shouldShowList: true,
      }),
    });
    await this.requestPermissions();
  }
}
