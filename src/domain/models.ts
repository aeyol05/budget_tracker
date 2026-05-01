export type TransactionType = 'income' | 'expense' | 'transfer';
export type PaymentMethod = 'Cash' | 'Card' | 'Bank Transfer' | 'Other';

export interface Transaction {
  id: string;
  type: TransactionType;
  amount: number;
  categoryId: string;
  date: string; // ISO 8601
  notes: string;
  merchant?: string;
  paymentMethod?: PaymentMethod;
  isRecurring?: boolean;
  confidenceScore?: number; // For AI predicted
}

export interface Category {
  id: string;
  name: string;
  icon: string;
  color: string;
  type: TransactionType;
}

export interface Budget {
  id: string;
  categoryId: string;
  targetAmount: number;
  month: string; // '2026-04'
}

export interface Subscription {
  id: string;
  name: string;
  amount: number;
  frequency: 'monthly' | 'yearly';
  nextBillingDate: string;
  categoryId: string;
  isActive: boolean;
}

export interface Forecast {
  projectedBalance: number;
  endOfMonthBalance: number;
  overspendingRisk: string[];
  categoryOverspendWarnings: string[];
  suggestedSavings: number;
}

export type AccountType = 'debit' | 'credit' | 'crypto' | 'stock' | 'wallet';

export interface Account {
  id: string;
  name: string;
  type: AccountType;
  subtype: string; // e.g., 'Debit - PHP', 'Credit - PHP'
  balance: number;
  currency: string;
  color: string;
  icon?: string;
  details?: string; // e.g., '1.25% yearly', 'due day 10'
  creditLimit?: number;
  usedCredit?: number;
  logoUrl?: string;
}

export interface Trip {
  id: string;
  destination: string;
  description: string;
  startDate: string;
  endDate: string;
  status: 'Planning' | 'Upcoming' | 'Completed';
  color?: string;
}

export interface ScheduleEvent {
  id: string;
  title: string;
  date: string; // ISO string
  startTime: string; // HH:mm
  endTime: string; // HH:mm
  location?: string;
  attendees?: string[];
  category: 'Work' | 'Personal' | 'Health' | 'Education' | 'Other';
  notes?: string;
}

export interface NotificationRecord {
  id: string;
  title: string;
  message: string;
  timestamp: string;
  read: boolean;
  type: 'Budget' | 'Schedule' | 'System';
}
