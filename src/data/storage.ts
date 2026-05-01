import AsyncStorage from '@react-native-async-storage/async-storage';
import { Transaction, Category, Budget, Subscription, Account, Trip, ScheduleEvent, NotificationRecord, UserProfile } from '../domain/models';
import uuid from 'react-native-uuid';
import { defaultCategories } from './mockData';
import { mockAccounts } from './mockAccounts';
import { NotificationService } from '../services/NotificationService';

const TRANSACTIONS_KEY = '@ai_finance_transactions';
const CATEGORIES_KEY = '@ai_finance_categories';
const BUDGETS_KEY = '@ai_finance_budgets';
const SETTINGS_KEY = '@ai_finance_settings';
const SUBS_KEY = '@ai_finance_subscriptions';
const ACCOUNTS_KEY = '@ai_finance_accounts';
const NOTIFIED_KEY = '@ai_finance_notified';
const NOTES_KEY = '@ai_finance_notes';
const TASKS_KEY = '@ai_finance_tasks';
const TRIPS_KEY = '@ai_finance_trips';
const EVENTS_KEY = '@ai_finance_events';
const NOTIFICATIONS_KEY = '@ai_finance_notifications';
const PROFILE_KEY = '@ai_finance_profile';

export interface AppSettings {
  currency: string;
  darkMode: boolean;
}

const defaultSettings: AppSettings = {
  currency: 'PHP',
  darkMode: true
};

export class StorageClient {
  static async getSettings(): Promise<AppSettings> {
    const data = await AsyncStorage.getItem(SETTINGS_KEY);
    return data ? JSON.parse(data) : defaultSettings;
  }

  static async saveSettings(settings: AppSettings) {
    await AsyncStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  }

  static async getTransactions(): Promise<Transaction[]> {
    const data = await AsyncStorage.getItem(TRANSACTIONS_KEY);
    return data ? JSON.parse(data) : [];
  }

  static async saveTransaction(txn: Omit<Transaction, 'id'> | Transaction): Promise<Transaction> {
    const txns = await this.getTransactions();
    const id = (txn as Transaction).id || uuid.v4() as string;
    const newTxn = { ...txn, id };
    
    const index = txns.findIndex(t => t.id === id);
    if (index > -1) txns[index] = newTxn;
    else txns.push(newTxn);

    txns.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    await AsyncStorage.setItem(TRANSACTIONS_KEY, JSON.stringify(txns));

    // Budget Check: After saving, calculate if we crossed 70%
    if (newTxn.type === 'expense') {
      this.checkBudgetWarning(newTxn.categoryId, txns);
    }

    return newTxn;
  }

  static async checkBudgetWarning(categoryId: string, allTxns: Transaction[]) {
    const budgets = await this.getBudgets();
    const budget = budgets.find(b => b.categoryId === categoryId);
    if (!budget) return;

    const categories = await this.getCategories();
    const cat = categories.find(c => c.id === categoryId);
    if (!cat) return;

    // Filter current month
    const now = new Date();
    const month = now.getMonth();
    const year = now.getFullYear();

    const spent = allTxns
      .filter(t => t.categoryId === categoryId && t.type === 'expense')
      .filter(t => {
        const d = new Date(t.date);
        return d.getMonth() === month && d.getFullYear() === year;
      })
      .reduce((sum, t) => sum + t.amount, 0);

    const percentage = spent / budget.targetAmount;
    
    if (percentage >= 0.7) {
      // Prevent duplicate notifications for the same category in the current month
      const notifiedKey = `${year}-${month}-${categoryId}`;
      const notifiedData = await AsyncStorage.getItem(NOTIFIED_KEY);
      const notifiedList: string[] = notifiedData ? JSON.parse(notifiedData) : [];

      if (!notifiedList.includes(notifiedKey)) {
        await NotificationService.sendBudgetWarning(cat.name, percentage);
        
        // Save to history
        await this.saveNotification({
          id: uuid.v4() as string,
          title: 'Budget Alert',
          message: `Your spending on ${cat.name} has reached ${(percentage * 100).toFixed(0)}% of your budget.`,
          timestamp: new Date().toISOString(),
          read: false,
          type: 'Budget'
        });

        notifiedList.push(notifiedKey);
        await AsyncStorage.setItem(NOTIFIED_KEY, JSON.stringify(notifiedList));
      }
    }
  }

  static async deleteTransaction(id: string) {
    const txns = await this.getTransactions();
    const filtered = txns.filter(t => t.id !== id);
    await AsyncStorage.setItem(TRANSACTIONS_KEY, JSON.stringify(filtered));
  }

  static async clearTransactions() {
    await AsyncStorage.removeItem(TRANSACTIONS_KEY);
  }

  static async getCategories(): Promise<Category[]> {
    const data = await AsyncStorage.getItem(CATEGORIES_KEY);
    if (!data) {
      await AsyncStorage.setItem(CATEGORIES_KEY, JSON.stringify(defaultCategories));
      return defaultCategories;
    }
    return JSON.parse(data);
  }

  static async getBudgets(): Promise<Budget[]> {
    const data = await AsyncStorage.getItem(BUDGETS_KEY);
    return data ? JSON.parse(data) : [];
  }

  static async saveBudget(budget: Budget) {
    const budgets = await this.getBudgets();
    const index = budgets.findIndex(b => b.categoryId === budget.categoryId);
    if (index > -1) budgets[index] = budget;
    else budgets.push({ ...budget, id: uuid.v4() as string });
    await AsyncStorage.setItem(BUDGETS_KEY, JSON.stringify(budgets));
  }

  static async getSubscriptions(): Promise<Subscription[]> {
    const data = await AsyncStorage.getItem(SUBS_KEY);
    return data ? JSON.parse(data) : [];
  }

  static async saveSubscription(sub: Subscription) {
    const subs = await this.getSubscriptions();
    const index = subs.findIndex(s => s.id === sub.id);
    if (index > -1) subs[index] = sub;
    else subs.push({ ...sub, id: uuid.v4() as string });
    await AsyncStorage.setItem(SUBS_KEY, JSON.stringify(subs));
  }

  static async getAccounts(): Promise<Account[]> {
    const data = await AsyncStorage.getItem(ACCOUNTS_KEY);
    if (!data) {
      await AsyncStorage.setItem(ACCOUNTS_KEY, JSON.stringify(mockAccounts));
      return mockAccounts;
    }
    return JSON.parse(data);
  }

  static async saveAccounts(accounts: Account[]): Promise<void> {
    await AsyncStorage.setItem(ACCOUNTS_KEY, JSON.stringify(accounts));
  }

  static async saveAccount(account: Account): Promise<void> {
    const accounts = await this.getAccounts();
    const index = accounts.findIndex(a => a.id === account.id);
    if (index > -1) accounts[index] = account;
    else accounts.push({ ...account, id: account.id || uuid.v4() as string });
    await AsyncStorage.setItem(ACCOUNTS_KEY, JSON.stringify(accounts));
  }

  static async deleteAccount(id: string): Promise<void> {
    const accounts = await this.getAccounts();
    const filtered = accounts.filter(a => a.id !== id);
    await AsyncStorage.setItem(ACCOUNTS_KEY, JSON.stringify(filtered));
  }

  static async getNotes(): Promise<any[]> {
    const data = await AsyncStorage.getItem(NOTES_KEY);
    return data ? JSON.parse(data) : [];
  }

  static async saveNotes(notes: any[]): Promise<void> {
    await AsyncStorage.setItem(NOTES_KEY, JSON.stringify(notes));
  }

  static async getTasks(): Promise<any[]> {
    const data = await AsyncStorage.getItem(TASKS_KEY);
    return data ? JSON.parse(data) : [];
  }

  static async saveTasks(tasks: any[]): Promise<void> {
    await AsyncStorage.setItem(TASKS_KEY, JSON.stringify(tasks));
  }
  
  static async getTrips(): Promise<Trip[]> {
    const data = await AsyncStorage.getItem(TRIPS_KEY);
    return data ? JSON.parse(data) : [];
  }

  static async saveTrip(trip: Trip): Promise<void> {
    const trips = await this.getTrips();
    const index = trips.findIndex(t => t.id === trip.id);
    if (index > -1) {
      trips[index] = trip;
    } else {
      trips.push({ ...trip, id: trip.id || uuid.v4() as string });
    }
    await AsyncStorage.setItem(TRIPS_KEY, JSON.stringify(trips));
  }

  static async deleteTrip(id: string): Promise<void> {
    const trips = await this.getTrips();
    const filtered = trips.filter(t => t.id !== id);
    await AsyncStorage.setItem(TRIPS_KEY, JSON.stringify(filtered));
  }

  static async getEvents(): Promise<ScheduleEvent[]> {
    const data = await AsyncStorage.getItem(EVENTS_KEY);
    return data ? JSON.parse(data) : [];
  }

  static async saveEvent(event: ScheduleEvent): Promise<void> {
    const events = await this.getEvents();
    const index = events.findIndex(e => e.id === event.id);
    if (index > -1) {
      events[index] = event;
    } else {
      events.push({ ...event, id: event.id || uuid.v4() as string });
    }
    await AsyncStorage.setItem(EVENTS_KEY, JSON.stringify(events));
  }

  static async deleteEvent(id: string): Promise<void> {
    const events = await this.getEvents();
    const filtered = events.filter(e => e.id !== id);
    await AsyncStorage.setItem(EVENTS_KEY, JSON.stringify(filtered));
  }

  // Notifications
  static async getNotifications(): Promise<NotificationRecord[]> {
    const data = await AsyncStorage.getItem(NOTIFICATIONS_KEY);
    return data ? JSON.parse(data) : [];
  }

  static async saveNotification(notification: NotificationRecord): Promise<void> {
    const notifications = await this.getNotifications();
    const updated = [notification, ...notifications];
    await AsyncStorage.setItem(NOTIFICATIONS_KEY, JSON.stringify(updated));
  }

  static async markNotificationRead(id: string): Promise<void> {
    const notifications = await this.getNotifications();
    const updated = notifications.map(n => n.id === id ? { ...n, read: true } : n);
    await AsyncStorage.setItem(NOTIFICATIONS_KEY, JSON.stringify(updated));
  }

  static async deleteNotification(id: string): Promise<void> {
    const notifications = await this.getNotifications();
    const filtered = notifications.filter(n => n.id !== id);
    await AsyncStorage.setItem(NOTIFICATIONS_KEY, JSON.stringify(filtered));
  }

  static async clearNotifications(): Promise<void> {
    await AsyncStorage.removeItem(NOTIFICATIONS_KEY);
  }

  static async getProfile(): Promise<UserProfile | null> {
    const data = await AsyncStorage.getItem(PROFILE_KEY);
    return data ? JSON.parse(data) : null;
  }

  static async saveProfile(profile: UserProfile): Promise<void> {
    await AsyncStorage.setItem(PROFILE_KEY, JSON.stringify(profile));
  }
}
