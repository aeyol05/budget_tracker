import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, ActivityIndicator, Alert } from 'react-native';
import { theme } from '../../src/ui/theme';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useNavigation } from 'expo-router';
import { DrawerActions } from '@react-navigation/native';
import { StorageClient } from '../../src/data/storage';
import { NotificationRecord } from '../../src/domain/models';
import { Header } from '../../src/ui/components/Header';
import Animated, { FadeInRight, FadeOutLeft } from 'react-native-reanimated';
import { format } from 'date-fns';
import * as Haptics from 'expo-haptics';

export default function NotificationsScreen() {
  const navigation = useNavigation<any>();
  const [notifications, setNotifications] = useState<NotificationRecord[]>([]);
  const [loading, setLoading] = useState(true);

  const loadNotifications = async () => {
    setLoading(true);
    const data = await StorageClient.getNotifications();
    setNotifications(data);
    setLoading(false);
  };

  useFocusEffect(
    useCallback(() => {
      loadNotifications();
    }, [])
  );

  const handleMarkAsRead = async (id: string) => {
    await StorageClient.markNotificationRead(id);
    loadNotifications();
  };

  const handleDelete = async (id: string) => {
    await StorageClient.deleteNotification(id);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    loadNotifications();
  };

  const handleClearAll = () => {
    Alert.alert(
      "Clear All",
      "Are you sure you want to delete all notification history?",
      [
        { text: "Cancel", style: "cancel" },
        { 
          text: "Clear All", 
          style: "destructive", 
          onPress: async () => {
            await StorageClient.clearNotifications();
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            loadNotifications();
          } 
        }
      ]
    );
  };

  const getIcon = (type: NotificationRecord['type']) => {
    switch (type) {
      case 'Budget': return { name: 'wallet' as const, color: '#ef4444' };
      case 'Schedule': return { name: 'calendar' as const, color: '#8b5e3c' };
      default: return { name: 'information-circle' as const, color: '#3b82f6' };
    }
  };

  return (
    <View style={styles.container}>
      <Header 
        title="Notifications" 
        subtitle="Stay updated with your activities" 
        icon="notifications" 
        iconColor="#ef4444"
      />

      <View style={styles.toolbar}>
        <Text style={styles.historyText}>HISTORY</Text>
        {notifications.length > 0 && (
          <Pressable onPress={handleClearAll}>
            <Text style={styles.clearText}>Clear all</Text>
          </Pressable>
        )}
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {loading ? (
          <ActivityIndicator size="large" color="#1b4332" style={{ marginTop: 50 }} />
        ) : notifications.length === 0 ? (
          <View style={styles.emptyState}>
             <View style={styles.emptyIconContainer}>
                <Ionicons name="notifications-off-outline" size={48} color="#fff" />
             </View>
             <Text style={styles.emptyTitle}>All caught up!</Text>
             <Text style={styles.emptySubtitle}>You don't have any notifications at the moment.</Text>
          </View>
        ) : (
          notifications.map((notif, idx) => {
            const icon = getIcon(notif.type);
            return (
              <Animated.View 
                key={notif.id} 
                entering={FadeInRight.delay(idx * 100)} 
                exiting={FadeOutLeft}
                style={[styles.notifCard, !notif.read && styles.unreadCard]}
              >
                <View style={[styles.iconBox, { backgroundColor: icon.color + '15' }]}>
                   <Ionicons name={icon.name} size={20} color={icon.color} />
                </View>
                <View style={{ flex: 1, marginLeft: 12 }}>
                   <View style={styles.cardHeader}>
                      <Text style={styles.notifTitle}>{notif.title}</Text>
                      <Text style={styles.notifTime}>{format(new Date(notif.timestamp), 'MMM dd, HH:mm')}</Text>
                   </View>
                   <Text style={styles.notifMessage}>{notif.message}</Text>
                </View>
                <Pressable onPress={() => handleDelete(notif.id)} style={styles.deleteBtn}>
                   <Ionicons name="close-circle-outline" size={20} color="#cbd5e1" />
                </Pressable>
              </Animated.View>
            );
          })
        )}
      </ScrollView>

      {/* FAB - Menu */}
      <Pressable style={styles.fabMenu} onPress={() => navigation.dispatch(DrawerActions.openDrawer())}>
        <Ionicons name="menu" size={24} color="#fff" />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fdfbfa' },
  toolbar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingTop: 20 },
  historyText: { fontSize: 12, fontWeight: '800', color: '#64748b', letterSpacing: 1 },
  clearText: { fontSize: 13, color: '#ef4444', fontWeight: '700' },
  scrollContent: { padding: 16, paddingBottom: 100 },
  notifCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 24, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: '#f1f5f9' },
  unreadCard: { borderColor: '#ef444420', backgroundColor: '#fffcfc' },
  iconBox: { width: 44, height: 44, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  notifTitle: { fontSize: 15, fontWeight: '800', color: '#0f172a' },
  notifTime: { fontSize: 11, color: '#94a3b8', fontWeight: '600' },
  notifMessage: { fontSize: 13, color: '#64748b', lineHeight: 18 },
  deleteBtn: { padding: 4, marginLeft: 8 },
  emptyState: { alignItems: 'center', marginTop: 100 },
  emptyIconContainer: { width: 80, height: 80, borderRadius: 24, backgroundColor: '#1b4332', alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: '#0f172a', marginBottom: 4 },
  emptySubtitle: { fontSize: 14, color: '#64748b', textAlign: 'center', paddingHorizontal: 40 },
  fabMenu: { position: 'absolute', bottom: 24, left: 16, width: 48, height: 48, borderRadius: 24, backgroundColor: '#1b4332', alignItems: 'center', justifyContent: 'center', elevation: 4 }
});
