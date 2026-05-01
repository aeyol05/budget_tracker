import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Dimensions, Pressable } from 'react-native';
import { theme } from '../../src/ui/theme';
import { GlassContainer } from '../../src/ui/components/GlassContainer';
import { PieChart } from 'react-native-chart-kit';
import { StorageClient, AppSettings } from '../../src/data/storage';
import { Transaction, Category } from '../../src/domain/models';
import { useFocusEffect, useNavigation, useLocalSearchParams, router } from 'expo-router';
import { DrawerActions } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { startOfWeek, startOfMonth, startOfYear, isAfter } from 'date-fns';
import { useApp } from '../../src/context/AppContext';
import { Header } from '../../src/ui/components/Header';

export default function AnalyticsScreen() {
  const { settings } = useApp();
  const navigation = useNavigation<any>();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [range, setRange] = useState<'Week' | 'Month' | 'Year'>('Month');
  const { openAdd } = useLocalSearchParams();
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);

  useFocusEffect(
    React.useCallback(() => {
      const load = async () => {
        const [txns, cats] = await Promise.all([
          StorageClient.getTransactions(),
          StorageClient.getCategories()
        ]);
        setTransactions(txns);
        setCategories(cats);
        
        if (openAdd === 'true') {
           router.push('/add');
        }
      };
      load();
    }, [openAdd])
  );

  const screenWidth = Dimensions.get('window').width;

  const getFilteredTransactions = () => {
    let startDate: Date;
    if (range === 'Week') startDate = startOfWeek(new Date());
    else if (range === 'Month') startDate = startOfMonth(new Date());
    else startDate = startOfYear(new Date());

    return transactions.filter(t => t.type === 'expense' && isAfter(new Date(t.date), startDate));
  };

  const expenseT = getFilteredTransactions();
  const totalExpense = expenseT.reduce((acc, t) => acc + t.amount, 0);

  const categorySpending = categories
    .filter(c => c.type === 'expense')
    .map(c => {
      const amount = expenseT
        .filter(t => t.categoryId === c.id)
        .reduce((acc, t) => acc + t.amount, 0);
      return { 
        name: c.name, 
        amount: amount, 
        color: c.color, 
        legendFontColor: theme.colors.slate400,
        percentage: totalExpense > 0 ? (amount / totalExpense) * 100 : 0,
        icon: c.icon
      };
    })
    .filter(item => item.amount > 0)
    .map(stat => ({
      ...stat,
      id: categories.find(c => c.name === stat.name)?.id
    }))
    .sort((a, b) => b.amount - a.amount);

  const pieData = categorySpending.length > 0 ? categorySpending : [
    { name: 'No data', amount: 1, color: theme.colors.slate900, legendFontColor: theme.colors.slate400, percentage: 0 }
  ];

  const curSymbol = settings.currency === 'PHP' ? '₱' : settings.currency === 'USD' ? '$' : '€';
  const isDark = settings.darkMode;
  const bgColor = isDark ? theme.colors.background : '#f8fafc';
  const txtColor = isDark ? '#fff' : '#0f172a';

  return (
    <View style={[styles.container, { backgroundColor: bgColor }]}>
      <Header 
        title="Insights" 
        subtitle="Analyze your spending" 
        icon="analytics" 
        iconColor="#4338ca"
      />
      <ScrollView contentContainerStyle={{padding: 16, paddingBottom: 100}}>
        <View style={styles.headerRow}>
          <View style={styles.rangeSelector}>
             {(['Week', 'Month', 'Year'] as const).map(r => (
               <Pressable key={r} onPress={() => setRange(r)} style={[styles.rangeBtn, range === r && styles.rangeBtnActive]}>
                 <Text style={[styles.rangeText, range === r && {color: theme.colors.indigo400}]}>{r}</Text>
               </Pressable>
             ))}
          </View>
        </View>
      
      <GlassContainer style={{padding: 24, marginBottom: 24}} intensity={15}>
        <View style={styles.chartHeader}>
          <Text style={styles.sectionTitleSmall}>Spending Distribution</Text>
          <Ionicons name="pie-chart" size={18} color={theme.colors.indigo400} />
        </View>
        <PieChart
          data={pieData}
          width={screenWidth - 64}
          height={200}
          chartConfig={{
            color: (opacity = 1) => `rgba(255, 255, 255, ${opacity})`,
            labelColor: (opacity = 1) => theme.colors.slate400,
          }}
          accessor={"amount"}
          backgroundColor={"transparent"}
          paddingLeft={"0"}
          center={[10, 0]}
          absolute
        />
        {selectedCategoryId && (
          <Pressable onPress={() => setSelectedCategoryId(null)} style={styles.clearFilter}>
            <Text style={styles.clearFilterText}>Clear Filter</Text>
            <Ionicons name="close-circle" size={14} color={theme.colors.indigo400} />
          </Pressable>
        )}
      </GlassContainer>

      <View style={styles.transactionHeaderRow}>
        <Text style={styles.sectionTitle}>
          {selectedCategoryId 
            ? `Transactions: ${categories.find(c => c.id === selectedCategoryId)?.name}` 
            : 'Category Breakdown'
          }
        </Text>
      </View>
      
      {!selectedCategoryId ? categorySpending.map((item, i) => (
        <Pressable key={i} onPress={() => setSelectedCategoryId(item.id || null)}>
          <GlassContainer style={styles.breakdownCard} intensity={8}>
            <View style={styles.breakdownRow}>
              <View style={{flexDirection: 'row', alignItems: 'center'}}>
                <View style={[styles.miniIcon, {backgroundColor: `${item.color}20`}]}>
                  <Ionicons name={item.icon as any} size={14} color={item.color} />
                </View>
                <Text style={styles.breakdownName}>{item.name}</Text>
              </View>
              <View style={{alignItems: 'flex-end'}}>
                <Text style={styles.breakdownValue}>{curSymbol}{item.amount.toLocaleString()}</Text>
                <Text style={styles.breakdownPercent}>{item.percentage.toFixed(1)}%</Text>
              </View>
            </View>
            <View style={styles.progressBg}>
              <View style={[styles.progressFill, {width: `${item.percentage}%`, backgroundColor: item.color}]} />
            </View>
          </GlassContainer>
        </Pressable>
      )) : (
        transactions
          .filter(t => t.categoryId === selectedCategoryId && isAfter(new Date(t.date), (range === 'Week' ? startOfWeek(new Date()) : range === 'Month' ? startOfMonth(new Date()) : startOfYear(new Date()))))
          .map((t, idx) => (
            <GlassContainer key={t.id} style={styles.transactionItem} intensity={10}>
                <View>
                  <Text style={styles.tMerchant}>{t.merchant || 'Transaction'}</Text>
                  <Text style={styles.tDate}>{new Date(t.date).toLocaleDateString()}</Text>
                </View>
                <Text style={styles.tAmount}>-{curSymbol}{t.amount.toLocaleString()}</Text>
            </GlassContainer>
          ))
      )}

      {categorySpending.length === 0 && (
        <View style={{alignItems: 'center', marginTop: 40}}>
           <Ionicons name="analytics" size={48} color={theme.colors.slate900} />
           <Text style={{color: theme.colors.slate500, marginTop: 16, fontWeight: '600'}}>No insights yet. Start adding transactions!</Text>
        </View>
      )}

      </ScrollView>
      <Pressable style={styles.fab} onPress={() => navigation.dispatch(DrawerActions.openDrawer())}>
        <Ionicons name="menu" size={24} color="#fff" />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f4f6f3' },
  headerRow: { flexDirection: 'row', justifyContent: 'flex-end', alignItems: 'center', marginBottom: 20 },
  title: { fontSize: 32, fontWeight: '800', color: '#0f172a' },
  rangeSelector: { flexDirection: 'row', backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 12, padding: 4 },
  rangeBtn: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 },
  rangeBtnActive: { backgroundColor: 'rgba(129, 140, 248, 0.1)' },
  rangeText: { fontSize: 12, fontWeight: '700', color: theme.colors.slate500 },
  chartHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  sectionTitle: { fontSize: 20, fontWeight: '800', color: '#0f172a', marginBottom: 16 },
  sectionTitleSmall: { fontSize: 16, fontWeight: '800', color: '#0f172a' },
  transactionHeaderRow: { marginBottom: 16, marginTop: 12 },
  breakdownCard: { marginBottom: 12, padding: 16, borderRadius: 24, borderWidth: 1, borderColor: 'rgba(255,255,255,0.01)' },
  breakdownRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  miniIcon: { width: 32, height: 32, borderRadius: 10, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  breakdownName: { fontSize: 16, fontWeight: '700', color: '#0f172a' },
  breakdownValue: { fontSize: 15, fontWeight: '800', color: '#0f172a' },
  breakdownPercent: { fontSize: 11, fontWeight: '700', color: theme.colors.slate500, marginTop: 2 },
  progressBg: { height: 6, backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 3, overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: 3 },
  clearFilter: { position: 'absolute', right: 20, top: 20, flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(129, 140, 248, 0.15)', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 12 },
  clearFilterText: { color: theme.colors.indigo400, fontSize: 12, fontWeight: '800', marginRight: 5 },
  transactionItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderRadius: 20, marginBottom: 10, borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)' },
  tMerchant: { fontSize: 15, fontWeight: '700', color: '#0f172a' },
  tDate: { fontSize: 11, color: theme.colors.slate500, marginTop: 4 },
  tAmount: { fontSize: 15, fontWeight: '800', color: '#f43f5e' },
  fab: { position: 'absolute', bottom: 24, left: 16, width: 48, height: 48, borderRadius: 24, backgroundColor: '#1b4332', alignItems: 'center', justifyContent: 'center', elevation: 4 }
});
