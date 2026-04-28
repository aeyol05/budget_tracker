import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, Pressable } from 'react-native';
import { StorageClient } from '../../src/data/storage';
import { Transaction, Category } from '../../src/domain/models';
import { theme } from '../../src/ui/theme';
import { GlassContainer } from '../../src/ui/components/GlassContainer';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from 'expo-router';
import { format } from 'date-fns';
import { useApp } from '../../src/context/AppContext';
import { TextInput } from 'react-native';
import { Swipeable, GestureHandlerRootView } from 'react-native-gesture-handler';
import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import Animated, { FadeIn, FadeOut, SlideInLeft } from 'react-native-reanimated';

export default function TransactionsScreen() {
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

  const handleDelete = async (id: string) => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    await StorageClient.deleteTransaction(id);
    setTransactions(prev => prev.filter(t => t.id !== id));
  };

  const curSymbol = settings.currency === 'PHP' ? '₱' : settings.currency === 'USD' ? '$' : '€';
  const isDark = settings.darkMode;
  const bgColor = isDark ? theme.colors.background : '#f8fafc';
  const txtColor = isDark ? '#fff' : '#0f172a';

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
          <Pressable onPress={() => router.push({ pathname: '/add', params: { editId: item.id } })}>
            <GlassContainer style={styles.card} intensity={isDark ? 8 : 100}>
              <View style={styles.cardLeft}>
                <View style={[styles.iconCircle, {backgroundColor: cat ? `${cat.color}${isDark ? '15' : '20'}` : theme.colors.slate900, borderColor: cat ? `${cat.color}30` : 'rgba(255,255,255,0.05)'}]}>
                   <Ionicons name={(cat?.icon as any) || (isTransfer ? 'swap-horizontal' : isExp ? 'cart' : 'cash')} size={20} color={cat?.color || '#fff'} />
                </View>
                <View style={styles.cardDetails}>
                  <Text style={[styles.merchant, { color: txtColor }]}>{item.merchant || 'Unknown'}</Text>
                  <Text style={[styles.date, { color: isDark ? theme.colors.slate400 : theme.colors.slate500 }]}>{format(new Date(item.date), 'MMM dd, yyyy • HH:mm')}</Text>
                </View>
              </View>
              <Text style={[styles.amount, {color: isTransfer ? theme.colors.indigo400 : isExp ? '#f43f5e' : theme.colors.success}]}>
                {isTransfer ? '' : isExp ? '-' : '+'}{curSymbol}{item.amount.toLocaleString()}
              </Text>
            </GlassContainer>
          </Pressable>
        </Animated.View>
      </Swipeable>
    );
  };

  return (
    <GestureHandlerRootView style={[styles.container, { backgroundColor: bgColor }]}>
      <Text style={[styles.title, { color: txtColor }]}>Transactions</Text>
      
      <GlassContainer style={styles.searchBar} intensity={10}>
        <Ionicons name="search" size={20} color={theme.colors.slate500} />
        <TextInput 
          style={[styles.searchInput, { color: txtColor }]}
          placeholder="Search merchants or notes..."
          placeholderTextColor={theme.colors.slate500}
          value={search}
          onChangeText={setSearch}
        />
      </GlassContainer>

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
            <Text style={[styles.filterText, filter === f && {color: '#fff'}]}>{f.charAt(0).toUpperCase() + f.slice(1)}</Text>
          </Pressable>
        ))}
      </View>

      <FlatList
        data={filteredData}
        keyExtractor={item => item.id}
        renderItem={renderItem}
        contentContainerStyle={{paddingBottom: 150}}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="receipt-outline" size={64} color={theme.colors.slate900} />
            <Text style={styles.emptyText}>No transactions found.</Text>
          </View>
        }
      />

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
  container: { flex: 1, backgroundColor: theme.colors.background, padding: 16, paddingTop: 40 },
  title: { fontSize: 32, fontWeight: '800', color: '#fff', marginBottom: 20 },
  searchBar: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, borderRadius: 16, marginBottom: 16 },
  searchInput: { flex: 1, marginLeft: 10, fontSize: 16, fontWeight: '600' },
  filterRow: { flexDirection: 'row', marginBottom: 20, backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 20, padding: 4 },
  filterBtn: { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: 16 },
  filterBtnActive: { backgroundColor: theme.colors.indigo400 },
  filterText: { color: theme.colors.slate400, fontWeight: '700' },
  card: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, padding: 16, borderRadius: 24 },
  cardLeft: { flexDirection: 'row', alignItems: 'center' },
  iconCircle: { width: 44, height: 44, borderRadius: 14, backgroundColor: theme.colors.slate900, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)' },
  cardDetails: { marginLeft: 12 },
  merchant: { fontSize: 16, fontWeight: '700', color: '#fff' },
  date: { fontSize: 12, color: theme.colors.slate400, marginTop: 4 },
  amount: { fontSize: 16, fontWeight: '800' },
  deleteAction: { backgroundColor: theme.colors.danger, justifyContent: 'center', alignItems: 'center', width: 80, height: 76, borderRadius: 24, marginLeft: 12, marginBottom: 12 },
  emptyContainer: { alignItems: 'center', marginTop: 100 },
  emptyText: { color: theme.colors.slate400, textAlign: 'center', marginTop: 16, fontWeight: '600' },
  fab: { position: 'absolute', bottom: 100, right: 24, width: 64, height: 64, borderRadius: 32, backgroundColor: theme.colors.indigo400, alignItems: 'center', justifyContent: 'center', elevation: 10, shadowColor: theme.colors.indigo400, shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.3, shadowRadius: 15 }
});
