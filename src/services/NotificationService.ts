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
