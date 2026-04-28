import { Account } from '../domain/models';

export const mockAccounts: Account[] = [
  {
    id: 'gcash',
    name: 'GCash',
    type: 'wallet',
    subtype: 'Debit - PHP',
    balance: 8920.00,
    currency: 'PHP',
    color: '#0055D3',
    logoUrl: 'https://placeholder.com/gcash' // Will use icon instead
  },
  {
    id: 'bpi',
    name: 'BPI Savings',
    type: 'debit',
    subtype: 'Debit - PHP',
    details: '1.25% yearly',
    balance: 22450.00,
    currency: 'PHP',
    color: '#E31937'
  },
  {
    id: 'wise',
    name: 'Wise USD',
    type: 'debit',
    subtype: 'Debit - USD',
    balance: 420.00,
    currency: 'USD',
    color: '#00B67A'
  },
  {
    id: 'rcbc',
    name: 'RCBC Visa',
    type: 'credit',
    subtype: 'Credit - PHP',
    details: 'due day 10',
    balance: 6300.00,
    currency: 'PHP',
    color: '#0077C8',
    usedCredit: 6300,
    creditLimit: 40000 // 6300 is 16% of ~40000
  },
  {
    id: 'bitcoin',
    name: 'Bitcoin',
    type: 'crypto',
    subtype: 'Crypto - PHP',
    balance: 154200.00, // Roughly matching a reasonable crypto balance in PHP
    currency: 'PHP',
    color: '#F7931A',
    details: '0.045 BTC'
  },
  {
    id: 'apple',
    name: 'Apple Inc.',
    type: 'stock',
    subtype: 'Stock - PHP',
    balance: 42450.00,
    currency: 'PHP',
    color: '#1CA4A4',
    details: '12.5 shares'
  }
];
