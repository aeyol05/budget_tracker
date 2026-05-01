import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, ActivityIndicator, Dimensions, PanResponder } from 'react-native';
import { theme } from '../../src/ui/theme';
import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect, useNavigation } from 'expo-router';
import { DrawerActions } from '@react-navigation/native';
import { StorageClient } from '../../src/data/storage';
import { Header } from '../../src/ui/components/Header';
import Animated, { FadeInDown, FadeInRight } from 'react-native-reanimated';
import { format, isSameDay } from 'date-fns';
import { useApp } from '../../src/context/AppContext';
import * as Haptics from 'expo-haptics';
import { ScheduleEvent } from '../../src/domain/models';
import { PullToRefresh } from '../../src/ui/components/PullToRefresh';

const { width } = Dimensions.get('window');

export default function DashboardScreen() {
  const { settings } = useApp();
  const navigation = useNavigation<any>();
  const [loading, setLoading] = useState(true);
  
  // Data states
  const [notes, setNotes] = useState<any[]>([]);
  const [tasks, setTasks] = useState<any[]>([]);
  const [trips, setTrips] = useState<any[]>([]);
  const [events, setEvents] = useState<ScheduleEvent[]>([]);
  
  const [balance, setBalance] = useState(0);
  const [monthlyIncome, setMonthlyIncome] = useState(0);
  const [monthlyExpense, setMonthlyExpense] = useState(0);
  
  const [refreshing, setRefreshing] = useState(false);
  const [pullProgress, setPullProgress] = useState(0);
  
  const loadData = async (isRefreshing = false) => {
    if (!isRefreshing) setLoading(true);
    const [n, t, tr, tx, evs] = await Promise.all([
      StorageClient.getNotes(),
      StorageClient.getTasks(),
      StorageClient.getTrips(),
      StorageClient.getTransactions(),
      StorageClient.getEvents()
    ]);
    setNotes(n);
    setTasks(t);
    setTrips(tr);
    setEvents(evs);
    
    let bal = 0;
    let mIncome = 0;
    let mExpense = 0;
    const currentMonth = new Date().toISOString().substring(0, 7);

    tx.forEach((txn: any) => {
      if (txn.type === 'income') bal += txn.amount;
      else if (txn.type === 'expense') bal -= txn.amount;

      if (txn.date.startsWith(currentMonth)) {
        if (txn.type === 'income') mIncome += txn.amount;
        else if (txn.type === 'expense') mExpense += txn.amount;
      }
    });

    setBalance(bal);
    setMonthlyIncome(mIncome);
    setMonthlyExpense(mExpense);
    setLoading(false);
    setRefreshing(false);
  };

  const onRefresh = async () => {
    setRefreshing(true);
    setPullProgress(1);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    await loadData(true);
    setPullProgress(0);
  };

  const scrollOffsetY = React.useRef(0);
  const panResponder = React.useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (evt, gestureState) => {
        return scrollOffsetY.current <= 0 && gestureState.dy > 15;
      },
      onPanResponderMove: (evt, gestureState) => {
        if (gestureState.dy > 0 && !refreshing) {
          const progress = Math.min(gestureState.dy / 120, 1.2);
          setPullProgress(progress);
        }
      },
      onPanResponderRelease: (evt, gestureState) => {
        if (gestureState.dy > 80 && !refreshing) {
          onRefresh();
        } else if (!refreshing) {
          setPullProgress(0);
        }
      },
      onPanResponderTerminate: () => {
        if (!refreshing) setPullProgress(0);
      }
    })
  ).current;

  const handleScroll = (event: any) => {
    const offsetY = event.nativeEvent.contentOffset.y;
    scrollOffsetY.current = offsetY;
    if (offsetY < 0) {
      const progress = Math.min(Math.abs(offsetY) / 100, 1.2);
      setPullProgress(progress);
    }
  };

  const handleScrollEnd = (event: any) => {
    const offsetY = event.nativeEvent.contentOffset.y;
    if (offsetY <= -80 && !refreshing) {
      onRefresh();
    }
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

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 18) return 'Good afternoon';
    return 'Good evening';
  };

  const activeTasks = tasks.filter(t => !t.completed);
  const todaysTasks = tasks.filter(t => t.dueDate === 'Today');
  const completedToday = todaysTasks.filter(t => t.completed).length;
  const progress = todaysTasks.length > 0 ? completedToday / todaysTasks.length : 0;

  const upcomingTrips = trips
    .filter(t => t.status !== 'Completed')
    .slice(0, 3);

  const recentNotes = notes.slice(0, 4);
  const todaysEvents = events.filter(e => isSameDay(new Date(e.date), new Date()));

  if (loading) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color="#1b4332" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Header 
        title="Dashboard" 
        subtitle="Your daily overview" 
        icon="grid" 
        iconColor="#1b4332"
      />

      <PullToRefresh 
        pulling={pullProgress > 0} 
        progress={pullProgress} 
        refreshing={refreshing} 
      />

      <View style={{ flex: 1 }} {...panResponder.panHandlers}>
        <ScrollView 
          contentContainerStyle={styles.scrollContent} 
          showsVerticalScrollIndicator={false}
          onScroll={handleScroll}
          onMomentumScrollEnd={handleScrollEnd}
          scrollEventThrottle={16}
        >
        {/* Hero Card */}
        <Animated.View entering={FadeInDown} style={styles.heroCard}>
           <View style={styles.heroHeader}>
             <View style={styles.heroLogoContainer}>
                <Ionicons name="leaf" size={24} color="#fff" />
             </View>
             <View style={{ marginLeft: 12 }}>
                <Text style={styles.heroDate}>{format(new Date(), 'EEEE, MMMM dd, yyyy').toUpperCase()}</Text>
                <Text style={styles.heroGreeting}>{getGreeting()} 👋</Text>
             </View>
            </View>
            <View style={styles.heroFooter}>
               <View style={styles.heroSummary}>
                  <Text style={styles.heroSummaryLabel}>Active Tasks</Text>
                  <Text style={styles.heroSummaryValue}>{activeTasks.length}</Text>
               </View>
               <View style={[styles.heroSummary, { borderLeftWidth: 1, borderLeftColor: 'rgba(255,255,255,0.2)', paddingLeft: 16 }]}>
                  <Text style={styles.heroSummaryLabel}>Total Balance</Text>
                  <Text style={styles.heroSummaryValue}>
                    {settings.currency === 'PHP' ? '₱' : settings.currency === 'USD' ? '$' : '€'}
                    {balance.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                  </Text>
               </View>
            </View>
         </Animated.View>

         {/* Wallet Quick Summary */}
         <Animated.View entering={FadeInDown.delay(100)} style={styles.walletCard}>
           <View style={styles.walletHeader}>
              <Text style={styles.walletTitle}>Monthly Cashflow</Text>
              <Pressable onPress={() => router.push('/budget_tracker')}>
                <Text style={styles.walletLink}>View All</Text>
              </Pressable>
           </View>
           <View style={styles.cashflowContainer}>
              <View style={[styles.cashflowItem, { backgroundColor: '#f0fdf4' }]}>
                 <Ionicons name="arrow-up-circle" size={20} color="#16a34a" />
                 <View style={{ marginLeft: 8 }}>
                    <Text style={styles.cashflowLabel}>Income</Text>
                    <Text style={[styles.cashflowValue, { color: '#16a34a' }]}>
                      +{settings.currency === 'PHP' ? '₱' : '$'}{monthlyIncome.toLocaleString()}
                    </Text>
                 </View>
              </View>
              <View style={[styles.cashflowItem, { backgroundColor: '#fef2f2' }]}>
                 <Ionicons name="arrow-down-circle" size={20} color="#dc2626" />
                 <View style={{ marginLeft: 8 }}>
                    <Text style={styles.cashflowLabel}>Spent</Text>
                    <Text style={[styles.cashflowValue, { color: '#dc2626' }]}>
                      -{settings.currency === 'PHP' ? '₱' : '$'}{monthlyExpense.toLocaleString()}
                    </Text>
                 </View>
              </View>
           </View>
         </Animated.View>

        {/* Stats Row */}
        <View style={styles.statsRow}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingRight: 20 }}>
            <Pressable style={styles.statCard} onPress={() => router.push('/notes')}>
               <View style={[styles.statIcon, { backgroundColor: '#dbeafe' }]}>
                 <Ionicons name="document-text" size={18} color="#2563eb" />
               </View>
               <Text style={styles.statNumber}>{notes.length}</Text>
               <Text style={styles.statLabel}>Notes</Text>
            </Pressable>

            <Pressable style={styles.statCard} onPress={() => router.push('/tasks')}>
               <View style={[styles.statIcon, { backgroundColor: '#fef3c7' }]}>
                 <Ionicons name="checkbox" size={18} color="#d97706" />
               </View>
               <Text style={styles.statNumber}>{activeTasks.length}</Text>
               <Text style={styles.statLabel}>Tasks</Text>
            </Pressable>

            <Pressable style={styles.statCard} onPress={() => router.push('/travel')}>
               <View style={[styles.statIcon, { backgroundColor: '#f3e8ff' }]}>
                 <Ionicons name="airplane" size={18} color="#9333ea" />
               </View>
               <Text style={styles.statNumber}>{trips.length}</Text>
               <Text style={styles.statLabel}>Trips</Text>
            </Pressable>

            <Pressable style={styles.statCard} onPress={() => router.push('/schedule')}>
               <View style={[styles.statIcon, { backgroundColor: '#fff7ed' }]}>
                 <Ionicons name="calendar" size={18} color="#ea580c" />
               </View>
               <Text style={styles.statNumber}>{events.length}</Text>
               <Text style={styles.statLabel}>Events</Text>
            </Pressable>
          </ScrollView>
        </View>

        {/* Quick Add Section */}
        <View style={styles.sectionHeader}>
           <Text style={styles.sectionTitle}>QUICK ADD</Text>
        </View>
        <View style={styles.quickAddContainer}>
           <View style={styles.quickAddRow}>
             <Pressable style={styles.quickAddBtn} onPress={() => router.push({ pathname: '/notes', params: { openAdd: 'true' } })}>
               <Ionicons name="add" size={18} color="#2563eb" />
               <Ionicons name="document-text" size={18} color="#2563eb" style={{ marginLeft: 4 }} />
               <Text style={[styles.quickAddText, { color: '#2563eb' }]}>Note</Text>
             </Pressable>
             <Pressable style={styles.quickAddBtn} onPress={() => router.push({ pathname: '/tasks', params: { openAdd: 'true' } })}>
               <Ionicons name="add" size={18} color="#d97706" />
               <Ionicons name="checkbox" size={18} color="#d97706" style={{ marginLeft: 4 }} />
               <Text style={[styles.quickAddText, { color: '#d97706' }]}>Task</Text>
             </Pressable>
           </View>
           <View style={[styles.quickAddRow, { marginTop: 12 }]}>
             <Pressable style={styles.quickAddBtn} onPress={() => router.push({ pathname: '/travel', params: { openAdd: 'true' } })}>
               <Ionicons name="add" size={18} color="#9333ea" />
               <Ionicons name="airplane" size={18} color="#9333ea" style={{ marginLeft: 4 }} />
               <Text style={[styles.quickAddText, { color: '#9333ea' }]}>Trip</Text>
             </Pressable>
             <Pressable style={styles.quickAddBtn} onPress={() => router.push({ pathname: '/schedule', params: { openAdd: 'true' } })}>
               <Ionicons name="add" size={18} color="#ea580c" />
               <Ionicons name="calendar" size={18} color="#ea580c" style={{ marginLeft: 4 }} />
               <Text style={[styles.quickAddText, { color: '#ea580c' }]}>Event</Text>
             </Pressable>
           </View>
        </View>

        {/* Today's Focus (Tasks) */}
        <View style={styles.sectionHeader}>
           <View style={{ flexDirection: 'row', alignItems: 'center' }}>
             <View style={[styles.sectionIcon, { backgroundColor: '#f59e0b' }]}>
               <Ionicons name="checkbox" size={14} color="#fff" />
             </View>
             <Text style={styles.sectionTitleMain}>Today's Focus</Text>
           </View>
           <Pressable onPress={() => router.push('/tasks')}>
              <Text style={styles.seeAllText}>All tasks <Ionicons name="arrow-forward" size={12} /></Text>
           </Pressable>
        </View>

        {todaysTasks.length > 0 ? (
          todaysTasks.slice(0, 3).map((task, idx) => (
            <Animated.View key={task.id} entering={FadeInRight.delay(idx * 100)} style={styles.focusItem}>
               <View style={styles.focusCircle} />
               <Text style={styles.focusText}>{task.title}</Text>
               <Text style={styles.focusDate}>{format(new Date(), 'MMM dd')}</Text>
            </Animated.View>
          ))
        ) : (
          <View style={styles.emptyFocus}>
             <Text style={styles.emptyText}>No tasks for today</Text>
          </View>
        )}

        {/* Today's Schedule (Events) */}
        <View style={styles.sectionHeader}>
           <View style={{ flexDirection: 'row', alignItems: 'center' }}>
             <View style={[styles.sectionIcon, { backgroundColor: '#8b5e3c' }]}>
               <Ionicons name="time" size={14} color="#fff" />
             </View>
             <Text style={styles.sectionTitleMain}>Today's Schedule</Text>
           </View>
           <Pressable onPress={() => router.push('/schedule')}>
              <Text style={styles.seeAllText}>Calendar <Ionicons name="arrow-forward" size={12} /></Text>
           </Pressable>
        </View>

        {todaysEvents.length > 0 ? (
          todaysEvents.slice(0, 3).map((event, idx) => (
            <Animated.View key={event.id} entering={FadeInRight.delay(idx * 100)} style={styles.eventDashItem}>
               <View style={[styles.eventTag, { backgroundColor: event.category === 'Work' ? '#818cf8' : '#fb923c' }]} />
               <View style={{ flex: 1 }}>
                  <Text style={styles.eventTitleText}>{event.title}</Text>
                  <Text style={styles.eventTimeText}>{event.startTime} - {event.endTime}</Text>
               </View>
               <Ionicons name="chevron-forward" size={14} color="#cbd5e1" />
            </Animated.View>
          ))
        ) : (
          <View style={styles.emptyFocus}>
             <Text style={styles.emptyText}>Nothing scheduled today</Text>
          </View>
        )}

        {/* Progress Section */}
        <View style={styles.progressCard}>
           <View style={styles.progressHeader}>
              <Text style={styles.progressTitle}>Tasks Progress</Text>
              <Text style={styles.progressValue}>{completedToday}/{todaysTasks.length} done</Text>
           </View>
           <View style={styles.progressBarBg}>
              <View style={[styles.progressBarFill, { width: `${progress * 100}%` }]} />
           </View>
           <Text style={styles.progressSubtext}>{todaysTasks.length - completedToday} remaining</Text>
        </View>

        {/* Recent Notes */}
        <View style={styles.sectionHeader}>
           <View style={{ flexDirection: 'row', alignItems: 'center' }}>
             <View style={[styles.sectionIcon, { backgroundColor: '#3b82f6' }]}>
               <Ionicons name="document-text" size={14} color="#fff" />
             </View>
             <Text style={styles.sectionTitleMain}>Recent Notes</Text>
           </View>
           <Pressable onPress={() => router.push('/notes')}>
              <Text style={styles.seeAllText}>All notes <Ionicons name="arrow-forward" size={12} /></Text>
           </Pressable>
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.notesRow}>
           {recentNotes.map((note, idx) => (
              <Pressable key={note.id} style={[styles.noteCard, { backgroundColor: note.color || '#fff' }]} onPress={() => router.push('/notes')}>
                 <Text style={styles.noteTitle} numberOfLines={1}>{note.title}</Text>
                 <Text style={styles.noteContent} numberOfLines={2}>{note.content}</Text>
                 <Text style={styles.noteDate}>{safeFormat(note.date, 'MMM dd')}</Text>
              </Pressable>
           ))}
        </ScrollView>

        {/* Upcoming Trips */}
        <View style={styles.sectionHeader}>
           <View style={{ flexDirection: 'row', alignItems: 'center' }}>
             <View style={[styles.sectionIcon, { backgroundColor: '#8b5cf6' }]}>
               <Ionicons name="airplane" size={14} color="#fff" />
             </View>
             <Text style={styles.sectionTitleMain}>Upcoming Trips</Text>
           </View>
           <Pressable onPress={() => router.push('/travel')}>
              <Text style={styles.seeAllText}>All trips <Ionicons name="arrow-forward" size={12} /></Text>
           </Pressable>
        </View>

        {upcomingTrips.map((trip, idx) => (
           <Pressable key={trip.id} style={styles.tripListItem} onPress={() => router.push('/travel')}>
              <View style={styles.tripIcon}>
                 <Ionicons name="location" size={20} color="#fff" />
              </View>
              <View style={{ flex: 1, marginLeft: 12 }}>
                 <Text style={styles.tripName}>{trip.destination}</Text>
                 <Text style={styles.tripDate}>{safeFormat(trip.startDate, 'MMM dd')} – {safeFormat(trip.endDate, 'MMM dd')}</Text>
              </View>
              <View style={styles.tripPill}>
                 <Text style={styles.tripPillText}>{trip.status}</Text>
              </View>
           </Pressable>
        ))}

          <View style={{ height: 100 }} />
        </ScrollView>
      </View>

      {/* FAB - Menu */}
      <Pressable style={styles.fabMenu} onPress={() => navigation.dispatch(DrawerActions.openDrawer())}>
        <Ionicons name="menu" size={24} color="#fff" />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f4f6f3' },
  scrollContent: { paddingHorizontal: 20, paddingTop: 20 },
  heroCard: { backgroundColor: '#1b4332', borderRadius: 32, padding: 24, marginBottom: 24 },
  heroHeader: { flexDirection: 'row', alignItems: 'center' },
  heroLogoContainer: { width: 48, height: 48, borderRadius: 24, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center' },
  heroDate: { color: 'rgba(255,255,255,0.7)', fontSize: 11, fontWeight: '700', letterSpacing: 1 },
  heroGreeting: { fontSize: 24, fontWeight: '800', color: '#fff', marginTop: 4 },
  heroFooter: { marginTop: 24, paddingTop: 20, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.1)', flexDirection: 'row' },
  heroSummary: { flex: 1 },
  heroSummaryLabel: { fontSize: 10, color: 'rgba(255,255,255,0.6)', fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1 },
  heroSummaryValue: { fontSize: 20, fontWeight: '800', color: '#fff', marginTop: 4 },
  
  walletCard: { backgroundColor: '#fff', padding: 16, borderRadius: 24, marginBottom: 20, borderWidth: 1, borderColor: '#e2e8f0' },
  walletHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  walletTitle: { fontSize: 16, fontWeight: '800', color: '#0f172a' },
  walletLink: { fontSize: 12, color: '#1b4332', fontWeight: '700' },
  cashflowContainer: { flexDirection: 'row', gap: 12 },
  cashflowItem: { flex: 1, flexDirection: 'row', alignItems: 'center', padding: 12, borderRadius: 16 },
  cashflowLabel: { fontSize: 10, color: '#64748b', fontWeight: '700' },
  cashflowValue: { fontSize: 15, fontWeight: '800' },

  statsRow: { marginBottom: 24 },
  statCard: { width: 100, backgroundColor: '#fff', borderRadius: 24, padding: 16, marginRight: 12, borderWidth: 1, borderColor: '#e2e8f0', minHeight: 120 },
  statIcon: { width: 32, height: 32, borderRadius: 10, alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  statNumber: { fontSize: 20, fontWeight: '800', color: '#0f172a' },
  statLabel: { fontSize: 12, color: '#64748b', fontWeight: '600' },
  
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, marginTop: 12 },
  sectionTitle: { fontSize: 13, fontWeight: '800', color: '#64748b', letterSpacing: 1 },
  sectionIcon: { width: 24, height: 24, borderRadius: 8, alignItems: 'center', justifyContent: 'center', marginRight: 10 },
  sectionTitleMain: { fontSize: 18, fontWeight: '800', color: '#0f172a' },
  seeAllText: { fontSize: 13, color: '#64748b', fontWeight: '700' },
  
  quickAddContainer: { backgroundColor: '#fff', borderRadius: 24, padding: 16, marginBottom: 24, borderWidth: 1, borderColor: '#e2e8f0' },
  quickAddRow: { flexDirection: 'row', gap: 12 },
  quickAddBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#f8fafc', borderWidth: 1, borderColor: '#e2e8f0', paddingVertical: 12, borderRadius: 16 },
  quickAddText: { fontSize: 14, fontWeight: '700', marginLeft: 8 },
  
  focusItem: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 20, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: '#e2e8f0' },
  focusCircle: { width: 14, height: 14, borderRadius: 7, borderWidth: 1.5, borderColor: '#64748b', marginRight: 16 },
  focusText: { flex: 1, fontSize: 15, fontWeight: '700', color: '#0f172a' },
  focusDate: { fontSize: 12, color: '#94a3b8', fontWeight: '600' },
  emptyFocus: { padding: 20, alignItems: 'center' },
  emptyText: { color: '#94a3b8', fontSize: 14, fontWeight: '600' },
  
  eventDashItem: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 20, padding: 14, marginBottom: 12, borderWidth: 1, borderColor: '#e2e8f0' },
  eventTag: { width: 4, height: 24, borderRadius: 2, marginRight: 12 },
  eventTitleText: { fontSize: 14, fontWeight: '800', color: '#0f172a' },
  eventTimeText: { fontSize: 11, color: '#64748b', marginTop: 2, fontWeight: '600' },

  progressCard: { backgroundColor: '#fff', borderRadius: 24, padding: 20, marginBottom: 24, borderWidth: 1, borderColor: '#e2e8f0' },
  progressHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  progressTitle: { fontSize: 16, fontWeight: '800', color: '#0f172a' },
  progressValue: { fontSize: 12, color: '#64748b', fontWeight: '700' },
  progressBarBg: { height: 8, backgroundColor: '#f1f5f9', borderRadius: 4, overflow: 'hidden' },
  progressBarFill: { height: '100%', backgroundColor: '#1b4332', borderRadius: 4 },
  progressSubtext: { fontSize: 12, color: '#94a3b8', marginTop: 12, fontWeight: '600' },
  
  notesRow: { marginBottom: 24 },
  noteCard: { width: 160, height: 100, borderRadius: 20, padding: 16, marginRight: 12, borderWidth: 1, borderColor: 'rgba(0,0,0,0.05)' },
  noteTitle: { fontSize: 14, fontWeight: '800', color: '#0f172a', marginBottom: 4 },
  noteContent: { fontSize: 12, color: '#64748b', marginBottom: 8 },
  noteDate: { fontSize: 10, color: '#94a3b8', fontWeight: '700' },
  
  tripListItem: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 24, padding: 12, marginBottom: 12, borderWidth: 1, borderColor: '#e2e8f0' },
  tripIcon: { width: 44, height: 44, borderRadius: 16, backgroundColor: '#8b5cf6', alignItems: 'center', justifyContent: 'center' },
  tripName: { fontSize: 15, fontWeight: '800', color: '#0f172a' },
  tripDate: { fontSize: 12, color: '#64748b', marginTop: 2, fontWeight: '500' },
  tripPill: { backgroundColor: '#fef3c7', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10 },
  tripPillText: { fontSize: 10, fontWeight: '800', color: '#92400e' },
  
  fabMenu: { position: 'absolute', bottom: 24, left: 16, width: 48, height: 48, borderRadius: 24, backgroundColor: '#1b4332', alignItems: 'center', justifyContent: 'center', elevation: 4 },

});
