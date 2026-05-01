import { Ionicons } from '@expo/vector-icons';
import { DrawerActions } from '@react-navigation/native';
import { format } from 'date-fns';
import * as Haptics from 'expo-haptics';
import { router, useFocusEffect, useNavigation } from 'expo-router';
import React, { useState } from 'react';
import { Alert, FlatList, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { GestureHandlerRootView, Swipeable } from 'react-native-gesture-handler';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';
import { useApp } from '../../src/context/AppContext';
import { StorageClient } from '../../src/data/storage';
import { Category, Transaction } from '../../src/domain/models';
import { Header } from '../../src/ui/components/Header';
import { theme } from '../../src/ui/theme';

export default function TransactionsScreen() {
  const navigation = useNavigation<any>();
  const { settings } = useApp();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [filter, setFilter] = useState<'all' | 'income' | 'expense' | 'transfer'>('all');
  const [search, setSearch] = useState('');

  useFocusEffect(
    React.useCallback(() => {
      const load = async () => {
        const [txns, cats] = await Promise.all([
          StorageClient.getTransactions(),
          StorageClient.getCategories()
        ]);
        setTransactions(txns);
        setCategories(cats);
      };
      load();
    }, [])
  );

  const filteredData = transactions.filter(t => {
    const matchesFilter = filter === 'all' || t.type === filter;
    const matchesSearch = (t.merchant?.toLowerCase() || '').includes(search.toLowerCase()) ||
      (t.notes?.toLowerCase() || '').includes(search.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  const handleDelete = (id: string) => {
    if (Platform.OS === 'web') {
      if (window.confirm("Are you sure you want to delete this transaction?")) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        StorageClient.deleteTransaction(id).then(() => {
          setTransactions(prev => prev.filter(t => t.id !== id));
        });
      }
    } else {
      Alert.alert(
        "Confirm Delete",
        "Are you sure you want to delete this transaction?",
        [
          { text: "Cancel", style: "cancel" },
          {
            text: "Delete", style: "destructive", onPress: async () => {
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
              await StorageClient.deleteTransaction(id);
              setTransactions(prev => prev.filter(t => t.id !== id));
            }
          }
        ]
      );
    }
  };

  const curSymbol = settings.currency === 'PHP' ? '₱' : settings.currency === 'USD' ? '$' : '€';
  const bgColor = '#f4f6f3';
  const txtColor = '#0f172a';
  const subTxtColor = '#64748b';

  const renderRightActions = (id: string) => (
    <Pressable onPress={() => handleDelete(id)} style={styles.deleteAction}>
      <Ionicons name="trash-outline" size={24} color="#fff" />
    </Pressable>
  );

  const renderItem = ({ item }: { item: Transaction }) => {
    const isExp = item.type === 'expense';
    const isTransfer = item.type === 'transfer';
    const cat = categories.find(c => c.id === item.categoryId);
    return (
      <Swipeable renderRightActions={() => renderRightActions(item.id)}>
        <Animated.View entering={FadeIn} exiting={FadeOut}>
          <Pressable onPress={() => router.push(`/add?editId=${item.id}`)}>
            <View style={styles.card}>
              <View style={styles.cardLeft}>
                <View style={[styles.iconCircle, { backgroundColor: cat ? `${cat.color}20` : '#f1f5f9', borderColor: cat ? `${cat.color}30` : '#e2e8f0' }]}>
                  <Ionicons name={(cat?.icon as any) || (isTransfer ? 'swap-horizontal' : isExp ? 'cart' : 'cash')} size={20} color={cat?.color || '#0f172a'} />
                </View>
                <View style={styles.cardDetails}>
                  <Text style={[styles.merchant, { color: txtColor }]}>{item.merchant || 'Unknown'}</Text>
                  <Text style={[styles.date, { color: subTxtColor }]}>{format(new Date(item.date), 'MMM dd, yyyy • HH:mm')}</Text>
                </View>
              </View>
              <Text style={[styles.amount, { color: isTransfer ? '#4338ca' : isExp ? '#ef4444' : '#10b981' }]}>
                {isTransfer ? '' : isExp ? '-' : '+'}{curSymbol}{item.amount.toLocaleString()}
              </Text>
            </View>
          </Pressable>
        </Animated.View>
      </Swipeable>
    );
  };

  return (
    <GestureHandlerRootView style={[styles.container, { backgroundColor: bgColor }]}>
      <Header
        title="Transactions"
        subtitle="Your spending history"
        icon="list"
        iconColor="#1b4332"
        showBackButton={true}
        gradient={['#2d6a4f', '#1b4332']}
      />

      <View style={{ padding: 16 }}>
        <View style={styles.searchBar}>
          <Ionicons name="search" size={20} color="#64748b" />
          <TextInput
            style={[styles.searchInput, { color: txtColor }]}
            placeholder="Search merchants or notes..."
            placeholderTextColor="#94a3b8"
            value={search}
            onChangeText={setSearch}
          />
        </View>

        <View style={styles.filterRow}>
          {(['all', 'income', 'expense', 'transfer'] as const).map(f => (
            <Pressable
              key={f}
              style={[styles.filterBtn, filter === f && styles.filterBtnActive]}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                setFilter(f);
              }}
            >
              <Text style={[styles.filterText, filter === f && { color: '#1b4332' }]}>{f.charAt(0).toUpperCase() + f.slice(1)}</Text>
            </Pressable>
          ))}
        </View>
      </View>

      <FlatList
        data={filteredData}
        keyExtractor={item => item.id}
        renderItem={renderItem}
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 150 }}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="receipt-outline" size={64} color={theme.colors.slate900} />
            <Text style={styles.emptyText}>No transactions found.</Text>
          </View>
        }
      />

      <Pressable style={styles.fabMenu} onPress={() => navigation.dispatch(DrawerActions.openDrawer())}>
        <Ionicons name="menu" size={24} color="#fff" />
      </Pressable>

      <Pressable
        style={styles.fab}
        onPress={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
          router.push('/add');
        }}
      >
        <Ionicons name="add" size={32} color="#fff" />
      </Pressable>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f4f6f3' },
  searchBar: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, borderRadius: 16, marginBottom: 16, backgroundColor: '#fff', borderWidth: 1, borderColor: '#e2e8f0' },
  searchInput: { flex: 1, marginLeft: 10, fontSize: 16, fontWeight: '600' },
  filterRow: { flexDirection: 'row', marginBottom: 20, backgroundColor: '#f1f5f9', borderRadius: 20, padding: 4 },
  filterBtn: { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: 16 },
  filterBtnActive: { backgroundColor: '#fff', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4, elevation: 2 },
  filterText: { color: '#64748b', fontWeight: '700' },
  card: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, padding: 16, borderRadius: 24, backgroundColor: '#fff', borderWidth: 1, borderColor: '#e2e8f0' },
  cardLeft: { flexDirection: 'row', alignItems: 'center' },
  iconCircle: { width: 44, height: 44, borderRadius: 14, backgroundColor: '#f1f5f9', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#e2e8f0' },
  cardDetails: { marginLeft: 12 },
  merchant: { fontSize: 16, fontWeight: '700', color: '#0f172a' },
  date: { fontSize: 12, color: '#64748b', marginTop: 4 },
  amount: { fontSize: 16, fontWeight: '800' },
  deleteAction: { backgroundColor: '#ef4444', justifyContent: 'center', alignItems: 'center', width: 80, height: 76, borderRadius: 24, marginLeft: 12, marginBottom: 12 },
  emptyContainer: { alignItems: 'center', marginTop: 100 },
  emptyText: { color: '#64748b', textAlign: 'center', marginTop: 16, fontWeight: '600' },
  fab: { position: 'absolute', bottom: 40, right: 24, width: 64, height: 64, borderRadius: 32, backgroundColor: '#1b4332', alignItems: 'center', justifyContent: 'center', elevation: 10, shadowColor: '#1b4332', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.3, shadowRadius: 15 },
  fabMenu: { position: 'absolute', bottom: 40, left: 24, width: 48, height: 48, borderRadius: 24, backgroundColor: '#1b4332', alignItems: 'center', justifyContent: 'center', elevation: 4 }
});
