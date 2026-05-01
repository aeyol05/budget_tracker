import React, { useState } from 'react';
import { View, Text, StyleSheet, Pressable, Alert, Switch } from 'react-native';
import { theme } from '../../src/ui/theme';
import { Ionicons } from '@expo/vector-icons';
import { StorageClient, AppSettings } from '../../src/data/storage';
import { Image } from 'expo-image';
import { useApp } from '../../src/context/AppContext';
import { router, useNavigation } from 'expo-router';
import { DrawerActions } from '@react-navigation/native';
import { Header } from '../../src/ui/components/Header';

export default function SettingsScreen() {
  const { settings, updateSettings, isLoaded } = useApp();
  const navigation = useNavigation<any>();

  const toggleDarkMode = () => {
    updateSettings({ darkMode: !settings.darkMode });
  };

  const changeCurrency = () => {
    Alert.alert("Select Currency", "Choose your preferred currency", [
      { text: "PHP (₱)", onPress: () => updateSettings({ currency: 'PHP' }) },
      { text: "USD ($)", onPress: () => updateSettings({ currency: 'USD' }) },
      { text: "EUR (€)", onPress: () => updateSettings({ currency: 'EUR' }) },
      { text: "Cancel", style: "cancel" }
    ]);
  };

  const handleReset = () => {
// ...
    Alert.alert("Reset Data", "Are you sure you want to delete all transactions?", [
      { text: "Cancel", style: "cancel" },
      { text: "Reset", style: "destructive", onPress: async () => {
          await StorageClient.clearTransactions();
          Alert.alert("Success", "All transactions have been deleted.");
        }
      }
    ]);
  };

  if (!isLoaded) return null;

  const bgColor = '#f4f6f3';
  const txtColor = '#0f172a';
  const subTxtColor = '#64748b';

  return (
    <View style={[styles.container, { backgroundColor: bgColor }]}>
      <Header 
        title="Settings" 
        showBackButton={true}
      />

      <Pressable onPress={changeCurrency}>
        <View style={styles.section}>
          <View style={styles.row}>
            <View style={{flexDirection: 'row', alignItems: 'center'}}>
              <Ionicons name="cash-outline" size={24} color={txtColor} />
              <Text style={[styles.rowText, { color: txtColor }]}>Currency</Text>
            </View>
            <View style={{flexDirection: 'row', alignItems: 'center'}}>
              <Text style={styles.rowValue}>{settings.currency}</Text>
              <Ionicons name="chevron-forward" size={16} color={subTxtColor} style={{marginLeft: 8}} />
            </View>
          </View>
        </View>
      </Pressable>

      <View style={styles.section}>
        <View style={styles.row}>
          <View style={{flexDirection: 'row', alignItems: 'center'}}>
            <Ionicons name="moon-outline" size={24} color={txtColor} />
            <Text style={[styles.rowText, { color: txtColor }]}>Dark Mode</Text>
          </View>
          <Switch 
            value={settings.darkMode} 
            onValueChange={toggleDarkMode}
            trackColor={{ false: "#e2e8f0", true: '#1b4332' }}
            thumbColor={"#fff"}
          />
        </View>
      </View>

      <View style={{marginTop: 20}}>
        <Pressable onPress={handleReset}>
          <View style={[styles.section, {borderWidth: 1, borderColor: 'rgba(239, 68, 68, 0.3)'}]}>
            <View style={{flexDirection: 'row', alignItems: 'center', justifyContent: 'center'}}>
              <Ionicons name="trash-outline" size={22} color="#ef4444" />
              <Text style={[styles.rowText, {color: '#ef4444'}]}>Reset App Data</Text>
            </View>
          </View>
        </Pressable>
      </View>
      <Pressable style={styles.fab} onPress={() => navigation.dispatch(DrawerActions.openDrawer())}>
        <Ionicons name="menu" size={24} color="#fff" />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  section: { backgroundColor: '#fff', marginBottom: 12, borderRadius: 24, padding: 16, marginHorizontal: 16, marginTop: 16, borderWidth: 1, borderColor: '#e2e8f0' },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  rowText: { fontSize: 16, fontWeight: '600', marginLeft: 12 },
  rowValue: { fontSize: 16, color: '#64748b', fontWeight: '700' },
  resetBtn: { backgroundColor: 'rgba(244, 63, 94, 0.1)', paddingVertical: 18, borderRadius: 20, alignItems: 'center' },
  resetText: { color: '#f43f5e', fontSize: 16, fontWeight: '700' },
  fab: { position: 'absolute', bottom: 24, left: 16, width: 48, height: 48, borderRadius: 24, backgroundColor: '#1b4332', alignItems: 'center', justifyContent: 'center', elevation: 4 }
});
