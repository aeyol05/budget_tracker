import { Category } from '../domain/models';

export const defaultCategories: Category[] = [
  { id: '1', name: 'Food', icon: 'restaurant-outline', color: '#fb923c', type: 'expense' },
  { id: '2', name: 'Transport', icon: 'car-outline', color: '#818cf8', type: 'expense' },
  { id: '3', name: 'Shopping', icon: 'bag-handle-outline', color: '#a78bfa', type: 'expense' },
  { id: '4', name: 'Utilities', icon: 'flash-outline', color: '#22d3ee', type: 'expense' },
  { id: '5', name: 'Cafe', icon: 'cafe-outline', color: '#ea580c', type: 'expense' },
  { id: '6', name: 'Salary', icon: 'cash-outline', color: '#34d399', type: 'income' },
];
