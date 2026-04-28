import 'react-native-reanimated';
import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, RefreshControl, Dimensions } from 'react-native';
import { StorageClient, AppSettings } from '../../src/data/storage';
import { AIEngine } from '../../src/domain/AIEngine';
import { Transaction, Forecast, Category } from '../../src/domain/models';
import { theme } from '../../src/ui/theme';
import { GlassContainer } from '../../src/ui/components/GlassContainer';
import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';
import { LineChart } from 'react-native-chart-kit';
import { LinearGradient } from 'expo-linear-gradient';
import { formatDistanceToNow, format, subMonths, isSameDay } from 'date-fns';
import { useApp } from '../../src/context/AppContext';
import { Subscription } from '../../src/domain/models';
import Animated, { FadeInUp, SlideInRight, SlideInLeft, FadeIn } from 'react-native-reanimated';
import { Image } from 'expo-image';

export default function DashboardScreen() {
  const { settings } = useApp();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [forecast, setForecast] = useState<Forecast | null>(null);
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
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
    detectSubscriptions(data);
  };

  const detectSubscriptions = (txns: Transaction[]) => {
    // Basic logic: same merchant and similar amount in last 2 months
    const subs: Subscription[] = [];
    const merchants = [...new Set(txns.map(t => t.merchant))];
    merchants.forEach(m => {
      if (!m) return;
      const history = txns.filter(t => t.merchant === m).sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      if (history.length >= 2) {
         const t1 = new Date(history[0].date);
         const t2 = new Date(history[1].date);
         const diffMonths = (t1.getFullYear() - t2.getFullYear()) * 12 + (t1.getMonth() - t2.getMonth());
         if (diffMonths === 1 && Math.abs(history[0].amount - history[1].amount) < 10) {
            subs.push({
              id: m,
              name: m,
              amount: history[0].amount,
              frequency: 'monthly',
              nextBillingDate: new Date(t1.setMonth(t1.getMonth() + 1)).toISOString(),
              categoryId: history[0].categoryId,
              isActive: true
            });
         }
      }
    });
    setSubscriptions(subs);
  };
  useFocusEffect(
    React.useCallback(() => {
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
    else { balance -= t.amount; expense += t.amount; }
  });

  const screenWidth = Dimensions.get('window').width;
  
  const getChartData = () => {
    if (timeframe === 'W') {
      return {
        labels: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"],
        datasets: [{
          data: [120, 250, 180, 420, 310, 560, expense / 30], // mock distribution
          color: (opacity = 1) => `rgba(129, 140, 248, ${opacity})`,
          strokeWidth: 3
        }]
      };
    } else if (timeframe === 'M') {
      return {
        labels: ["W1", "W2", "W3", "W4"],
        datasets: [{
          data: [1420, 2150, 1890, expense],
          color: (opacity = 1) => `rgba(129, 140, 248, ${opacity})`,
          strokeWidth: 3
        }]
      };
    } else {
      return {
        labels: ["Jan", "Feb", "Mar", "Apr", "May", "Jun"],
        datasets: [{
          data: [8500, 9200, 7800, 11000, 9500, expense * 2],
          color: (opacity = 1) => `rgba(129, 140, 248, ${opacity})`,
          strokeWidth: 3
        }]
      };
    }
  };

  const chartData = getChartData();

  const curSymbol = settings?.currency === 'PHP' ? '₱' : settings?.currency === 'USD' ? '$' : '€';

  const formatAmount = (amt: number) => {
    if (!showBalance) return "••••••••";
    return `${curSymbol}${amt.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}`;
  };

  const isDark = settings.darkMode;
  const bgColor = isDark ? theme.colors.background : '#f8fafc';
  const txtColor = isDark ? '#fff' : '#0f172a';
  const subTxtColor = isDark ? theme.colors.slate400 : theme.colors.slate500;

  return (
    <View style={[styles.container, { backgroundColor: bgColor }]}>
      <ScrollView 
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.colors.primary} />}
      >
        <View style={styles.header}>
          <View style={{flexDirection: 'row', alignItems: 'center'}}>
            <Image 
              source={require('../../assets/images/lucky_cat.png')} 
              style={styles.logoImage} 
            />
            <View style={{marginLeft: 12}}>
              <Text style={[styles.greeting, {color: txtColor}]}>Lucky<Text style={{color: theme.colors.indigo400}}>Buff</Text></Text>
              <Text style={[styles.dateText, {color: subTxtColor, letterSpacing: 0.5, marginTop: 2}]}>Luck favors the disciplined.</Text>
            </View>
          </View>
          <View style={[styles.headerIcons, { flexDirection: 'row', alignItems: 'center' }]}>
             <Pressable onPress={() => router.push('/settings')} style={{ marginRight: 12 }}>
               <Ionicons name="settings-outline" size={22} color={isDark ? theme.colors.textMain : '#0f172a'} />
             </Pressable>
             <Ionicons name="notifications-outline" size={24} color={isDark ? theme.colors.textMain : '#0f172a'} />
          </View>
        </View>

        <Animated.View entering={FadeInUp.duration(600)}>
          <LinearGradient
            colors={theme.colors.cardGradient as any}
            style={styles.balanceCard}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
          <View style={{flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start'}}>
            <View>
              <Text style={styles.balanceLabel}>TOTAL BALANCE</Text>
              <Text style={styles.balanceValue}>{formatAmount(balance)}</Text>
              <Text style={styles.subBalanceLabel}>Available balance</Text>
            </View>
            <Pressable 
              onPress={() => setShowBalance(!showBalance)}
              style={styles.eyeBtn}
            >
              <Ionicons name={showBalance ? "eye-outline" : "eye-off-outline"} size={22} color="rgba(255,255,255,0.6)" />
            </Pressable>
          </View>
          
          <View style={[styles.row, {marginTop: 10}]}>
            <View style={[styles.innerStatBox, {borderColor: 'rgba(52, 211, 153, 0.3)', borderWidth: 1}]}>
              <View style={[styles.iconSm, {backgroundColor: 'rgba(52, 211, 153, 0.15)'}]}>
                <Ionicons name="trending-up" size={14} color="#34d399" />
              </View>
              <View style={{marginLeft: 10}}>
                <Text style={styles.boxLabel}>Income</Text>
                <Text style={[styles.boxValue, {color: '#34d399'}]}>{showBalance ? `${curSymbol}${income.toLocaleString()}` : "••••"}</Text>
              </View>
            </View>
            <View style={{width: 12}} />
            <View style={[styles.innerStatBox, {borderColor: 'rgba(244, 63, 94, 0.3)', borderWidth: 1}]}>
              <View style={[styles.iconSm, {backgroundColor: 'rgba(244, 63, 94, 0.15)'}]}>
                <Ionicons name="trending-down" size={14} color="#f43f5e" />
              </View>
              <View style={{marginLeft: 10}}>
                <Text style={styles.boxLabel}>Expenses</Text>
                <Text style={[styles.boxValue, {color: '#f43f5e'}]}>{showBalance ? `${curSymbol}${expense.toLocaleString()}` : "••••"}</Text>
              </View>
            </View>
          </View>
        </LinearGradient>
      </Animated.View>

        <View style={styles.quickActions}>
          <Pressable style={styles.actionBtn} onPress={() => router.push('/add')}>
            <LinearGradient colors={theme.colors.actionAdd as any} style={styles.actionIcon}>
              <Ionicons name="add" size={26} color="#fff" />
            </LinearGradient>
            <Text style={styles.actionText}>Add</Text>
          </Pressable>
          <Pressable style={styles.actionBtn} onPress={() => router.push({ pathname: '/add', params: { mode: 'scan' }})}>
            <LinearGradient colors={theme.colors.actionScan as any} style={styles.actionIcon}>
              <Ionicons name="scan" size={26} color="#fff" />
            </LinearGradient>
            <Text style={styles.actionText}>Scan</Text>
          </Pressable>
          <Pressable style={styles.actionBtn} onPress={() => router.push({ pathname: '/add', params: { mode: 'voice' }})}>
            <LinearGradient colors={theme.colors.actionVoice as any} style={styles.actionIcon}>
              <Ionicons name="mic" size={26} color="#fff" />
            </LinearGradient>
            <Text style={styles.actionText}>Voice</Text>
          </Pressable>
          <Pressable style={styles.actionBtn} onPress={() => router.push('/budgets')}>
            <LinearGradient colors={theme.colors.primaryGradient as any} style={styles.actionIcon}>
              <Ionicons name="pie-chart" size={26} color="#fff" />
            </LinearGradient>
            <Text style={styles.actionText}>Budgets</Text>
          </Pressable>
        </View>

        {forecast && (
          <Animated.View entering={SlideInLeft.delay(200)}>
            <GlassContainer style={styles.projectionCard} intensity={15}>
              <View style={styles.projectionHeader}>
                <View style={{flexDirection: 'row', alignItems: 'center'}}>
                  <Ionicons name="sparkles" size={18} color={theme.colors.indigo400} />
                  <Text style={styles.aiTitle}>AI Projection</Text>
                  <View style={styles.betaBadge}>
                     <Text style={styles.betaText}>BETA</Text>
                  </View>
                </View>
                <Text style={{color: theme.colors.success, fontWeight: '700', fontSize: 12}}>+12.4%</Text>
              </View>
              <Text style={styles.aiText}>Estimated EOM Balance: <Text style={{fontWeight: '800', color: '#fff'}}>{formatAmount(forecast.endOfMonthBalance)}</Text></Text>
            </GlassContainer>
          </Animated.View>
        )}

        {subscriptions.length > 0 && (
          <GlassContainer style={{marginTop: 20, padding: 20, borderRadius: 24}} intensity={15}>
            <View style={{flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16}}>
              <Text style={[styles.trendTitle, {color: txtColor}]}>Subscriptions</Text>
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{subscriptions.length} Active</Text>
              </View>
            </View>
            {subscriptions.slice(0, 2).map(sub => (
              <View key={sub.id} style={styles.subRow}>
                <View style={{flexDirection: 'row', alignItems: 'center'}}>
                  <View style={styles.subIcon}>
                    <Ionicons name="repeat" size={16} color={theme.colors.indigo400} />
                  </View>
                  <View>
                    <Text style={[styles.subName, {color: txtColor}]}>{sub.name}</Text>
                    <Text style={styles.subDate}>Next billing: {format(new Date(sub.nextBillingDate), 'MMM dd')}</Text>
                  </View>
                </View>
                <View style={{alignItems: 'flex-end'}}>
                   <Text style={[styles.subAmount, {color: txtColor}]}>{curSymbol}{sub.amount.toLocaleString()}</Text>
                   <Text style={{fontSize: 10, color: theme.colors.slate500}}>MONTHLY</Text>
                </View>
              </View>
            ))}
          </GlassContainer>
        )}

        <GlassContainer style={styles.trendCard} intensity={10}>
          <View style={styles.trendHeader}>
            <View>
              <Text style={styles.trendTitle}>Spending Trend</Text>
              <Text style={styles.trendSubtitle}>This week</Text>
            </View>
            <View style={styles.toggleGroup}>
              <Pressable 
                onPress={() => setTimeframe('W')} 
                style={[styles.toggleBtn, timeframe === 'W' && styles.toggleActive]}
              >
                <Text style={[styles.toggleText, timeframe === 'W' && styles.toggleTextActive]}>W</Text>
              </Pressable>
              <Pressable 
                onPress={() => setTimeframe('M')} 
                style={[styles.toggleBtn, timeframe === 'M' && styles.toggleActive]}
              >
                <Text style={[styles.toggleText, timeframe === 'M' && styles.toggleTextActive]}>M</Text>
              </Pressable>
              <Pressable 
                onPress={() => setTimeframe('Y')} 
                style={[styles.toggleBtn, timeframe === 'Y' && styles.toggleActive]}
              >
                <Text style={[styles.toggleText, timeframe === 'Y' && styles.toggleTextActive]}>Y</Text>
              </Pressable>
            </View>
          </View>
          <LineChart
            data={chartData}
            width={screenWidth - 48}
            height={160}
            withHorizontalLines={true}
            withVerticalLines={false}
            withDots={true}
            withShadow={true}
            chartConfig={{
              backgroundColor: 'transparent',
              backgroundGradientFromOpacity: 0,
              backgroundGradientToOpacity: 0,
              decimalPlaces: 0,
              color: (opacity = 1) => `rgba(129, 140, 248, ${opacity})`,
              labelColor: (opacity = 1) => `rgba(148, 163, 184, ${opacity})`,
              strokeWidth: 3,
              propsForBackgroundLines: { stroke: 'rgba(255,255,255,0.05)', strokeDasharray: "" },
              propsForDots: {
                r: "4",
                strokeWidth: "2",
                stroke: "#818cf8"
              }
            }}
            bezier
            style={{ marginVertical: 8, paddingRight: 0, marginLeft: -16 }}
          />
        </GlassContainer>

        <View style={styles.transactionHeaderRow}>
          <Text style={[styles.sectionTitle, {color: txtColor}]}>Recent Transactions</Text>
          <Pressable onPress={() => router.push('/transactions')} style={{flexDirection: 'row', alignItems: 'center'}}>
            <Text style={styles.seeAll}>See all</Text>
            <Ionicons name="arrow-forward" size={14} color={theme.colors.indigo400} style={{marginLeft: 4, marginTop: 1}} />
          </Pressable>
        </View>
        
        {transactions.slice(0, 5).map(t => {
          const cat = categories.find(c => c.id === t.categoryId);
          return (
            <GlassContainer key={t.id} style={styles.transactionCard} intensity={isDark ? 8 : 100}>
              <View style={{flexDirection: 'row', alignItems: 'center'}}>
                <View style={[styles.rowIconContainer, {backgroundColor: cat ? `${cat.color}${isDark ? '15' : '20'}` : theme.colors.slate900, borderColor: cat ? `${cat.color}30` : 'rgba(255,255,255,0.05)'}]}>
                  <Ionicons name={(cat?.icon as any) || 'cart'} size={20} color={cat?.color || '#fff'} />
                </View>
                <View style={{marginLeft: 12}}>
                  <Text style={[styles.tName, {color: txtColor}]}>{t.merchant || 'Transaction'}</Text>
                  <Text style={[styles.tDate, {color: subTxtColor}]}>{cat?.name} • {format(new Date(t.date), 'MMM dd • HH:mm')}</Text>
                </View>
              </View>
              <Text style={[styles.tAmount, {color: t.type === 'expense' ? '#f43f5e' : theme.colors.success}]}>
                {t.type === 'expense' ? '-' : '+'}{curSymbol}{showBalance ? t.amount.toLocaleString() : "••••"}
              </Text>
            </GlassContainer>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  scrollContent: { padding: 16, paddingBottom: 110, paddingTop: 40 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 28 },
  dateText: { fontSize: 11, color: theme.colors.slate400, textTransform: 'uppercase', letterSpacing: 2, fontWeight: '700' },
  greeting: { fontSize: 24, fontWeight: '900', color: '#fff' },
  logoImage: { width: 56, height: 56, borderRadius: 18, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
  headerIcons: { backgroundColor: 'rgba(255,255,255,0.05)', padding: 10, borderRadius: 20, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
  balanceCard: { borderRadius: 32, padding: 28, marginBottom: 24, borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)' },
  balanceLabel: { fontSize: 10, color: 'rgba(255,255,255,0.5)', letterSpacing: 2, fontWeight: '800' },
  balanceValue: { fontSize: 48, fontWeight: '800', color: '#fff', marginTop: 8, marginBottom: 4 },
  subBalanceLabel: { fontSize: 10, color: 'rgba(255,255,255,0.4)', fontWeight: '600', marginBottom: 28 },
  eyeBtn: { backgroundColor: 'rgba(255,255,255,0.1)', padding: 8, borderRadius: 12 },
  row: { flexDirection: 'row', justifyContent: 'space-between' },
  innerStatBox: { flexDirection: 'row', alignItems: 'center', flex: 1, backgroundColor: 'rgba(255,255,255,0.05)', padding: 12, borderRadius: 20 },
  iconSm: { width: 32, height: 32, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  boxLabel: { fontSize: 9, color: 'rgba(255,255,255,0.5)', fontWeight: '800', letterSpacing: 1 },
  boxValue: { fontSize: 15, fontWeight: '800', color: '#fff', marginTop: 2 },
  quickActions: { flexDirection: 'row', justifyContent: 'space-around', marginBottom: 20 },
  actionBtn: { alignItems: 'center' },
  actionIcon: { width: 56, height: 56, borderRadius: 20, alignItems: 'center', justifyContent: 'center', marginBottom: 10 },
  actionText: { fontSize: 12, color: theme.colors.slate500, fontWeight: '700' },
  trendCard: { marginTop: 24, padding: 20, borderRadius: 32, borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)' },
  trendHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 },
  trendTitle: { fontSize: 18, fontWeight: '800', color: '#fff' },
  trendSubtitle: { fontSize: 12, color: theme.colors.slate500, marginTop: 2 },
  toggleGroup: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 20, padding: 2 },
  toggleBtn: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16 },
  toggleActive: { backgroundColor: 'rgba(129, 140, 248, 0.2)' },
  toggleTextActive: { color: theme.colors.indigo400, fontWeight: '900' },
  toggleText: { color: theme.colors.slate500, fontWeight: '700', fontSize: 12 },
  projectionCard: { marginTop: 10, padding: 20, borderRadius: 24, backgroundColor: 'rgba(129, 140, 248, 0.05)', borderColor: 'rgba(129, 140, 248, 0.1)' },
  projectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  aiTitle: { fontSize: 14, fontWeight: '700', color: theme.colors.indigo400, marginLeft: 8 },
  betaBadge: { backgroundColor: 'rgba(129, 140, 248, 0.15)', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 8, marginLeft: 8 },
  betaText: { fontSize: 9, color: theme.colors.indigo400, fontWeight: '900', paddingHorizontal: 6, paddingVertical: 2 },
  aiText: { fontSize: 14, color: theme.colors.slate400, fontWeight: '500' },
  sectionTitle: { fontSize: 20, fontWeight: '800', color: '#fff', marginTop: 24, marginBottom: 16 },
  badge: { backgroundColor: 'rgba(129, 140, 248, 0.15)', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10 },
  badgeText: { fontSize: 10, fontWeight: '800', color: theme.colors.indigo400 },
  subRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  subIcon: { width: 36, height: 36, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.03)', alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  subName: { fontSize: 14, fontWeight: '700' },
  subDate: { fontSize: 11, color: theme.colors.slate500, marginTop: 2 },
  subAmount: { fontSize: 14, fontWeight: '800' },
  transactionHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 12 },
  seeAll: { fontSize: 13, color: theme.colors.indigo400, fontWeight: '700' },
  transactionCard: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, padding: 16, borderRadius: 24, borderWidth: 1, borderColor: 'rgba(255,255,255,0.01)' },
  rowIconContainer: { width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center', borderWidth: 1 },
  tName: { fontSize: 16, fontWeight: '700', color: '#fff' },
  tDate: { fontSize: 12, color: theme.colors.slate500, marginTop: 4 },
  tAmount: { fontSize: 16, fontWeight: '800' }
});
