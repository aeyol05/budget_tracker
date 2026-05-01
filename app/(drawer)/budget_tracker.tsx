import 'react-native-reanimated';
import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, RefreshControl, Dimensions } from 'react-native';
import { StorageClient } from '../../src/data/storage';
import { AIEngine } from '../../src/domain/AIEngine';
import { Transaction, Forecast, Category } from '../../src/domain/models';
import { theme } from '../../src/ui/theme';
import { GlassContainer } from '../../src/ui/components/GlassContainer';
import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect, useNavigation } from 'expo-router';
import { LineChart } from 'react-native-chart-kit';
import { LinearGradient } from 'expo-linear-gradient';
import { format } from 'date-fns';
import { useApp } from '../../src/context/AppContext';
import { Subscription } from '../../src/domain/models';
import Animated, { FadeInUp, SlideInLeft } from 'react-native-reanimated';
import { Header } from '../../src/ui/components/Header';
import { DrawerActions } from '@react-navigation/native';

export default function BudgetTrackerScreen() {
  const { settings } = useApp();
  const navigation = useNavigation<any>();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [forecast, setForecast] = useState<Forecast | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [showBalance, setShowBalance] = useState(true);
  const [timeframe, setTimeframe] = useState<'W' | 'M' | 'Y'>('W');

  const loadData = async () => {
    const [data, cats] = await Promise.all([
      StorageClient.getTransactions(),
      StorageClient.getCategories()
    ]);
    setTransactions(data);
    setCategories(cats);
    let bal = 0;
    data.forEach(t => bal += t.type === 'income' ? t.amount : -t.amount);
    const f = await AIEngine.generateForecast(data, bal);
    setForecast(f);
  };

  const safeFormat = (dateStr: any, fmt: string) => {
    try {
      if (!dateStr) return 'N/A';
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return 'N/A';
      return format(d, fmt);
    } catch (e) {
      return 'N/A';
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [])
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  let balance = 0;
  let income = 0;
  let expense = 0;
  transactions.forEach(t => {
    if (t.type === 'income') { balance += t.amount; income += t.amount; }
    else if (t.type === 'expense') { balance -= t.amount; expense += t.amount; }
  });

  const screenWidth = Dimensions.get('window').width;
  const curSymbol = settings?.currency === 'PHP' ? '₱' : settings?.currency === 'USD' ? '$' : '€';

  const formatAmount = (amt: number) => {
    if (!showBalance) return "••••••••";
    return `${curSymbol}${amt.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}`;
  };

  const getChartData = () => {
    // Simple placeholder data distribution based on real expense
    const base = expense / (timeframe === 'W' ? 7 : timeframe === 'M' ? 30 : 365);
    const labels = timeframe === 'W' ? ["M", "T", "W", "T", "F", "S", "S"] : ["W1", "W2", "W3", "W4"];
    const data = timeframe === 'W' ? [base*0.8, base*1.2, base, base*1.5, base*1.1, base*0.9, base] : [base*5, base*8, base*6, base*7];
    
    return {
      labels: labels,
      datasets: [{
        data: data.length > 0 ? data : [0,0,0,0,0,0,0],
        color: (opacity = 1) => `rgba(27, 67, 50, ${opacity})`,
        strokeWidth: 3
      }]
    };
  };

  const isDark = false; // Standardized to light theme
  const bgColor = '#F9F7F2';
  const txtColor = '#0f172a';
  const subTxtColor = '#64748b';

  return (
    <View style={[styles.container, { backgroundColor: bgColor }]}>
      <Header 
        title="Budget Tracker" 
        subtitle="Manage your finances" 
        icon="wallet" 
        iconColor="#1b4332"
        gradient={['#698b53', '#4f772d']}
      />

      <ScrollView 
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#1b4332" />}
      >
        <Animated.View entering={FadeInUp.duration(600)}>
          <View style={styles.balanceCard}>
            <View style={{flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start'}}>
              <View>
                <Text style={styles.balanceLabel}>TOTAL BALANCE</Text>
                <Text style={styles.balanceValue}>{formatAmount(balance)}</Text>
              </View>
              <Pressable onPress={() => setShowBalance(!showBalance)} style={styles.eyeBtn}>
                <Ionicons name={showBalance ? "eye-outline" : "eye-off-outline"} size={22} color="#1b4332" />
              </Pressable>
            </View>
            
            <View style={[styles.row, {marginTop: 20}]}>
              <View style={[styles.innerStatBox, {backgroundColor: '#dcfce7'}]}>
                <View style={[styles.iconSm, {backgroundColor: '#fff'}]}>
                  <Ionicons name="trending-up" size={14} color="#166534" />
                </View>
                <View style={{marginLeft: 10}}>
                  <Text style={styles.boxLabel}>Income</Text>
                  <Text style={[styles.boxValue, {color: '#166534'}]}>{showBalance ? `${curSymbol}${income.toLocaleString()}` : "••••"}</Text>
                </View>
              </View>
              <View style={{width: 12}} />
              <View style={[styles.innerStatBox, {backgroundColor: '#fee2e2'}]}>
                <View style={[styles.iconSm, {backgroundColor: '#fff'}]}>
                  <Ionicons name="trending-down" size={14} color="#991b1b" />
                </View>
                <View style={{marginLeft: 10}}>
                  <Text style={styles.boxLabel}>Expenses</Text>
                  <Text style={[styles.boxValue, {color: '#991b1b'}]}>{showBalance ? `${curSymbol}${expense.toLocaleString()}` : "••••"}</Text>
                </View>
              </View>
            </View>
          </View>
        </Animated.View>

        <View style={styles.quickActions}>
          <Pressable style={styles.actionBtn} onPress={() => router.push('/add')}>
            <View style={[styles.actionIcon, {backgroundColor: '#1b4332'}]}>
              <Ionicons name="add" size={24} color="#fff" />
            </View>
            <Text style={styles.actionText}>Add</Text>
          </Pressable>
          <Pressable style={styles.actionBtn} onPress={() => router.push({ pathname: '/add', params: { mode: 'scan' }})}>
            <View style={[styles.actionIcon, {backgroundColor: '#1b4332'}]}>
              <Ionicons name="scan" size={24} color="#fff" />
            </View>
            <Text style={styles.actionText}>Scan</Text>
          </Pressable>
          <Pressable style={styles.actionBtn} onPress={() => router.push({ pathname: '/add', params: { mode: 'voice' }})}>
            <View style={[styles.actionIcon, {backgroundColor: '#1b4332'}]}>
              <Ionicons name="mic" size={24} color="#fff" />
            </View>
            <Text style={styles.actionText}>Voice</Text>
          </Pressable>
          <Pressable style={styles.actionBtn} onPress={() => router.push('/budgets')}>
            <View style={[styles.actionIcon, {backgroundColor: '#1b4332'}]}>
              <Ionicons name="pie-chart" size={24} color="#fff" />
            </View>
            <Text style={styles.actionText}>Goals</Text>
          </Pressable>
        </View>

        {forecast && (
          <Animated.View entering={SlideInLeft.delay(200)}>
            <GlassContainer style={styles.projectionCard} intensity={15}>
              <View style={styles.projectionHeader}>
                <View style={{flexDirection: 'row', alignItems: 'center'}}>
                  <Ionicons name="sparkles" size={18} color="#1b4332" />
                  <Text style={styles.aiTitle}>AI Projection</Text>
                </View>
                <Text style={{color: '#166534', fontWeight: '700', fontSize: 12}}>Active</Text>
              </View>
              <Text style={styles.aiText}>Estimated EOM Balance: <Text style={{fontWeight: '800', color: '#0f172a'}}>{formatAmount(forecast.endOfMonthBalance)}</Text></Text>
            </GlassContainer>
          </Animated.View>
        )}

        <GlassContainer style={styles.trendCard} intensity={10}>
          <View style={styles.trendHeader}>
            <View>
              <Text style={styles.trendTitle}>Spending Trend</Text>
              <Text style={styles.trendSubtitle}>{timeframe === 'W' ? 'This week' : timeframe === 'M' ? 'This month' : 'This year'}</Text>
            </View>
            <View style={styles.toggleGroup}>
              {['W', 'M', 'Y'].map((t) => (
                <Pressable 
                  key={t}
                  onPress={() => setTimeframe(t as any)} 
                  style={[styles.toggleBtn, timeframe === t && styles.toggleActive]}
                >
                  <Text style={[styles.toggleText, timeframe === t && styles.toggleTextActive]}>{t}</Text>
                </Pressable>
              ))}
            </View>
          </View>
          <LineChart
            data={getChartData()}
            width={screenWidth - 48}
            height={160}
            withHorizontalLines={true}
            withVerticalLines={false}
            withDots={true}
            withShadow={true}
            chartConfig={{
              backgroundColor: '#fff',
              backgroundGradientFrom: '#fff',
              backgroundGradientTo: '#fff',
              decimalPlaces: 0,
              color: (opacity = 1) => `rgba(27, 67, 50, ${opacity})`,
              labelColor: (opacity = 1) => `rgba(100, 116, 139, ${opacity})`,
              strokeWidth: 3,
              propsForBackgroundLines: { stroke: '#f1f5f9', strokeDasharray: "" },
              propsForDots: { r: "4", strokeWidth: "2", stroke: "#1b4332" }
            }}
            bezier
            style={{ marginVertical: 8, paddingRight: 0, marginLeft: -16 }}
          />
        </GlassContainer>

        <View style={styles.transactionHeaderRow}>
          <Text style={styles.sectionTitle}>Recent Transactions</Text>
          <Pressable onPress={() => router.push('/transactions')} style={{flexDirection: 'row', alignItems: 'center'}}>
            <Text style={styles.seeAll}>See all</Text>
            <Ionicons name="arrow-forward" size={14} color="#1b4332" style={{marginLeft: 4}} />
          </Pressable>
        </View>
        
        {transactions.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>No transactions yet</Text>
          </View>
        ) : (
          transactions.slice(0, 5).map(t => {
            const cat = categories.find(c => c.id === t.categoryId);
            return (
              <Pressable key={t.id} style={styles.transactionCard} onPress={() => router.push(`/add?editId=${t.id}`)}>
                <View style={{flexDirection: 'row', alignItems: 'center'}}>
                  <View style={[styles.rowIconContainer, {backgroundColor: cat ? `${cat.color}15` : '#f1f5f9', borderColor: cat ? `${cat.color}30` : '#e2e8f0'}]}>
                    <Ionicons name={(cat?.icon as any) || 'cart'} size={20} color={cat?.color || '#1b4332'} />
                  </View>
                  <View style={{marginLeft: 12}}>
                    <Text style={styles.tName}>{t.merchant || 'Transaction'}</Text>
                    <Text style={styles.tDate}>{cat?.name} • {safeFormat(t.date, 'MMM dd')}</Text>
                  </View>
                </View>
                <Text style={[styles.tAmount, {color: t.type === 'expense' ? '#ef4444' : '#10b981'}]}>
                  {t.type === 'expense' ? '-' : '+'}{curSymbol}{showBalance ? t.amount.toLocaleString() : "••••"}
                </Text>
              </Pressable>
            );
          })
        )}
        <View style={{height: 100}} />
      </ScrollView>

      {/* FAB - Menu */}
      <Pressable style={styles.fabMenu} onPress={() => navigation.dispatch(DrawerActions.openDrawer())}>
        <Ionicons name="menu" size={24} color="#fff" />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: { padding: 16, paddingBottom: 160 },
  balanceCard: { backgroundColor: '#fff', borderRadius: 32, padding: 24, marginBottom: 24, borderWidth: 1, borderColor: '#e2e8f0', shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.05, shadowRadius: 10, elevation: 2 },
  balanceLabel: { fontSize: 10, color: '#64748b', letterSpacing: 1.5, fontWeight: '800' },
  balanceValue: { fontSize: 36, fontWeight: '800', color: '#0f172a', marginTop: 8 },
  eyeBtn: { padding: 8 },
  row: { flexDirection: 'row', justifyContent: 'space-between' },
  innerStatBox: { flexDirection: 'row', alignItems: 'center', flex: 1, padding: 12, borderRadius: 20 },
  iconSm: { width: 28, height: 28, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  boxLabel: { fontSize: 10, color: '#64748b', fontWeight: '700' },
  boxValue: { fontSize: 14, fontWeight: '800', marginTop: 2 },
  quickActions: { flexDirection: 'row', justifyContent: 'space-around', marginBottom: 24 },
  actionBtn: { alignItems: 'center' },
  actionIcon: { width: 56, height: 56, borderRadius: 20, alignItems: 'center', justifyContent: 'center', marginBottom: 8, elevation: 2 },
  actionText: { fontSize: 12, color: '#64748b', fontWeight: '700' },
  trendCard: { backgroundColor: '#fff', padding: 20, borderRadius: 32, borderWidth: 1, borderColor: '#e2e8f0', marginBottom: 24 },
  trendHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  trendTitle: { fontSize: 18, fontWeight: '800', color: '#0f172a' },
  trendSubtitle: { fontSize: 12, color: '#64748b', marginTop: 2 },
  toggleGroup: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#f1f5f9', borderRadius: 12, padding: 2 },
  toggleBtn: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10 },
  toggleActive: { backgroundColor: '#fff', elevation: 2 },
  toggleText: { color: '#64748b', fontWeight: '700', fontSize: 12 },
  toggleTextActive: { color: '#1b4332' },
  projectionCard: { padding: 20, borderRadius: 24, backgroundColor: '#f0fdf4', borderColor: '#dcfce7', borderWidth: 1, marginBottom: 24 },
  projectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  aiTitle: { fontSize: 14, fontWeight: '700', color: '#1b4332', marginLeft: 8 },
  aiText: { fontSize: 14, color: '#475569', fontWeight: '500' },
  sectionTitle: { fontSize: 20, fontWeight: '800', color: '#0f172a' },
  transactionHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  seeAll: { fontSize: 13, color: '#1b4332', fontWeight: '700' },
  transactionCard: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, padding: 16, borderRadius: 24, backgroundColor: '#fff', borderWidth: 1, borderColor: '#f1f5f9' },
  rowIconContainer: { width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center', borderWidth: 1 },
  tName: { fontSize: 16, fontWeight: '700', color: '#0f172a' },
  tDate: { fontSize: 12, color: '#64748b', marginTop: 2 },
  tAmount: { fontSize: 16, fontWeight: '800' },
  emptyContainer: { padding: 40, alignItems: 'center' },
  emptyText: { color: '#94a3b8', fontSize: 14 },
  fabMenu: { position: 'absolute', bottom: 90, left: 16, width: 48, height: 48, borderRadius: 24, backgroundColor: '#1b4332', alignItems: 'center', justifyContent: 'center', elevation: 4 }
});
