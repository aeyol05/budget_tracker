import AsyncStorage from '@react-native-async-storage/async-storage';
import { Transaction, Category, Budget, Subscription, Account } from '../domain/models';
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
      await NotificationService.sendBudgetWarning(cat.name, percentage);
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
}
