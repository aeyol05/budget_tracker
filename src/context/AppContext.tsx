import React, { createContext, useContext, useState, useEffect } from 'react';
import { StorageClient, AppSettings } from '../data/storage';

import { Transaction, Category, Budget, Subscription, Account } from '../domain/models';

interface AppContextType {
  settings: AppSettings;
  updateSettings: (newSettings: Partial<AppSettings>) => Promise<void>;
  accounts: Account[];
  isLoaded: boolean;
  refreshAccounts: () => Promise<void>;
  reorderAccounts: (newAccounts: Account[]) => Promise<void>;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [settings, setSettings] = useState<AppSettings>({ currency: 'PHP', darkMode: true });
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);

  const refreshAccounts = async () => {
    const data = await StorageClient.getAccounts();
    setAccounts(data);
  };

  useEffect(() => {
    Promise.all([
      StorageClient.getSettings(),
      StorageClient.getAccounts()
    ]).then(([settingsData, accountsData]) => {
      setSettings(settingsData);
      setAccounts(accountsData);
      setIsLoaded(true);
    });
  }, []);

  const updateSettings = async (newSettings: Partial<AppSettings>) => {
    const updated = { ...settings, ...newSettings };
    setSettings(updated);
    await StorageClient.saveSettings(updated);
  };

  const reorderAccounts = async (newAccounts: Account[]) => {
    setAccounts(newAccounts);
    await StorageClient.saveAccounts(newAccounts);
  };

  return (
    <AppContext.Provider value={{ settings, updateSettings, accounts, isLoaded, refreshAccounts, reorderAccounts }}>
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) throw new Error('useApp must be used within AppProvider');
  return context;
};
