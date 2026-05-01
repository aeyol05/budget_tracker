import React, { createContext, useContext, useState, useEffect } from 'react';
import { StorageClient, AppSettings } from '../data/storage';

import { Transaction, Category, Budget, Subscription, Account, UserProfile } from '../domain/models';

interface AppContextType {
  settings: AppSettings;
  updateSettings: (newSettings: Partial<AppSettings>) => Promise<void>;
  accounts: Account[];
  isLoaded: boolean;
  refreshAccounts: () => Promise<void>;
  reorderAccounts: (newAccounts: Account[]) => Promise<void>;
  saveAccount: (account: Account) => Promise<void>;
  deleteAccount: (id: string) => Promise<void>;
  userProfile: UserProfile | null;
  saveUserProfile: (profile: UserProfile) => Promise<void>;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [settings, setSettings] = useState<AppSettings>({ currency: 'PHP', darkMode: true });
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);

  const refreshAccounts = async () => {
    const data = await StorageClient.getAccounts();
    setAccounts(data);
  };

  useEffect(() => {
    Promise.all([
      StorageClient.getSettings(),
      StorageClient.getAccounts(),
      StorageClient.getProfile()
    ]).then(([settingsData, accountsData, profileData]) => {
      setSettings(settingsData);
      setAccounts(accountsData);
      setUserProfile(profileData);
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

  const saveAccount = async (account: Account) => {
    await StorageClient.saveAccount(account);
    await refreshAccounts();
  };

  const deleteAccount = async (id: string) => {
    await StorageClient.deleteAccount(id);
    await refreshAccounts();
  };

  const saveUserProfile = async (profile: UserProfile) => {
    await StorageClient.saveProfile(profile);
    setUserProfile(profile);
  };

  return (
    <AppContext.Provider value={{ 
      settings, 
      updateSettings, 
      accounts, 
      isLoaded, 
      refreshAccounts, 
      reorderAccounts,
      saveAccount,
      deleteAccount,
      userProfile,
      saveUserProfile
    }}>
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) throw new Error('useApp must be used within AppProvider');
  return context;
};
