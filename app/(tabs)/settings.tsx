import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Pressable, Alert, Switch } from 'react-native';
import { theme } from '../../src/ui/theme';
import { GlassContainer } from '../../src/ui/components/GlassContainer';
import { Ionicons } from '@expo/vector-icons';
import { StorageClient, AppSettings } from '../../src/data/storage';
import { Image } from 'expo-image';
import { useApp } from '../../src/context/AppContext';

export default function SettingsScreen() {
  const { settings, updateSettings, isLoaded } = useApp();

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

  return (
    <View style={styles.container}>
      <View style={styles.brandHeader}>
        <Image
          source={require('../../assets/images/lucky_cat.png')}
          style={styles.brandLogo}
        />
        <View style={{ marginLeft: 16 }}>
          <Text style={styles.brandName}>Lucky<Text style={{ color: theme.colors.indigo400 }}>Buff</Text></Text>
          <Text style={styles.brandTagline}>Luck favors the disciplined.</Text>
        </View>
      </View>

      <Pressable onPress={changeCurrency}>
        <GlassContainer style={styles.section} intensity={10}>
          <View style={styles.row}>
            <View style={{flexDirection: 'row', alignItems: 'center'}}>
              <Ionicons name="cash-outline" size={24} color="#fff" />
              <Text style={styles.rowText}>Currency</Text>
            </View>
            <View style={{flexDirection: 'row', alignItems: 'center'}}>
              <Text style={styles.rowValue}>{settings.currency}</Text>
              <Ionicons name="chevron-forward" size={16} color={theme.colors.slate400} style={{marginLeft: 8}} />
            </View>
          </View>
        </GlassContainer>
      </Pressable>

      <GlassContainer style={styles.section} intensity={10}>
        <View style={styles.row}>
          <View style={{flexDirection: 'row', alignItems: 'center'}}>
            <Ionicons name="moon-outline" size={24} color="#fff" />
            <Text style={styles.rowText}>Dark Mode</Text>
          </View>
          <Switch 
            value={settings.darkMode} 
            onValueChange={toggleDarkMode}
            trackColor={{ false: "#1e293b", true: theme.colors.indigo400 }}
            thumbColor={"#fff"}
          />
        </View>
      </GlassContainer>

      <View style={{marginTop: 20}}>
        <Pressable onPress={handleReset}>
          <GlassContainer style={[styles.section, {borderWidth: 1, borderColor: 'rgba(244, 63, 94, 0.2)'}]} intensity={5}>
            <View style={{flexDirection: 'row', alignItems: 'center'}}>
              <Ionicons name="trash-outline" size={24} color={theme.colors.danger} />
              <Text style={[styles.rowText, {color: theme.colors.danger}]}>Reset App Data</Text>
            </View>
          </GlassContainer>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background, padding: 16, paddingTop: 40 },
  brandHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 32, padding: 20, borderRadius: 28, backgroundColor: 'rgba(255,255,255,0.03)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)' },
  brandLogo: { width: 72, height: 72, borderRadius: 22 },
  brandName: { fontSize: 28, fontWeight: '900', color: '#fff' },
  brandTagline: { fontSize: 13, color: theme.colors.slate400, marginTop: 4, fontWeight: '600' },
  section: { marginBottom: 12, borderRadius: 24, padding: 16 },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  rowText: { fontSize: 16, fontWeight: '600', color: '#fff', marginLeft: 12 },
  rowValue: { fontSize: 16, color: theme.colors.slate400, fontWeight: '700' }
});
