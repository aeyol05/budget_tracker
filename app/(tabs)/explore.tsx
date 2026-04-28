import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, TextInput, Alert, ActivityIndicator } from 'react-native';
import { theme } from '../../src/ui/theme';
import { GlassContainer } from '../../src/ui/components/GlassContainer';
import { Ionicons } from '@expo/vector-icons';
import { StorageClient } from '../../src/data/storage';
import { Category, Forecast } from '../../src/domain/models';
import { AIEngine } from '../../src/domain/AIEngine';
import { router } from 'expo-router';
import Animated, { FadeInDown, FadeInRight } from 'react-native-reanimated';
import { useApp } from '../../src/context/AppContext';

export interface Goal {
  id: string;
  name: string;
  targetAmount: number;
  currentAmount: number;
  icon: string;
  color: string;
  deadline?: string;
}

export default function ExploreScreen() {
  const { settings } = useApp();
  const [goals, setGoals] = useState<Goal[]>([]);
  const [forecast, setForecast] = useState<Forecast | null>(null);
  const [isAdding, setIsAdding] = useState(false);
  const [newGoal, setNewGoal] = useState({ name: '', target: '', icon: 'star', color: theme.colors.indigo400 });

  const loadData = async () => {
    const [txns, accounts] = await Promise.all([
      StorageClient.getTransactions(),
      StorageClient.getAccounts()
    ]);
    
    let bal = 0;
    txns.forEach(t => bal += t.type === 'income' ? t.amount : -t.amount);
    const f = await AIEngine.generateForecast(txns, bal);
    setForecast(f);

    // Mock goals for now
    setGoals([
      { id: '1', name: 'Emergency Fund', targetAmount: 50000, currentAmount: 12500, icon: 'shield-checkmark', color: '#10b981' },
      { id: '2', name: 'New iPhone', targetAmount: 65000, currentAmount: 5000, icon: 'phone-portrait', color: '#818cf8' }
    ]);
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleAddGoal = () => {
    if (!newGoal.name || !newGoal.target) return;
    const goal: Goal = {
      id: Math.random().toString(),
      name: newGoal.name,
      targetAmount: parseFloat(newGoal.target),
      currentAmount: 0,
      icon: newGoal.icon,
      color: newGoal.color
    };
    setGoals([...goals, goal]);
    setIsAdding(false);
    setNewGoal({ name: '', target: '', icon: 'star', color: theme.colors.indigo400 });
  };

  const isDark = settings.darkMode;
  const txtColor = isDark ? '#fff' : '#0f172a';
  const curSymbol = settings.currency === 'PHP' ? '₱' : '$';

  return (
    <View style={[styles.container, { backgroundColor: isDark ? theme.colors.background : '#f8fafc' }]}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <Text style={[styles.title, { color: txtColor }]}>Financial <Text style={{ color: theme.colors.indigo400 }}>Goals</Text></Text>
          <Pressable style={styles.addBtn} onPress={() => setIsAdding(!isAdding)}>
            <Ionicons name={isAdding ? "close" : "add"} size={24} color="#fff" />
          </Pressable>
        </View>

        {isAdding && (
          <Animated.View entering={FadeInDown} style={styles.addForm}>
            <GlassContainer style={styles.formInside} intensity={20}>
              <TextInput 
                style={[styles.input, { color: txtColor }]}
                placeholder="Goal Name (e.g. New Car)"
                placeholderTextColor="rgba(255,255,255,0.3)"
                value={newGoal.name}
                onChangeText={(t) => setNewGoal({...newGoal, name: t})}
              />
              <TextInput 
                style={[styles.input, { color: txtColor }]}
                placeholder="Target Amount"
                placeholderTextColor="rgba(255,255,255,0.3)"
                keyboardType="numeric"
                value={newGoal.target}
                onChangeText={(t) => setNewGoal({...newGoal, target: t})}
              />
              <Pressable style={styles.submitBtn} onPress={handleAddGoal}>
                <Text style={styles.submitText}>Add Goal</Text>
              </Pressable>
            </GlassContainer>
          </Animated.View>
        )}

        {forecast && (
          <GlassContainer style={styles.coachCard} intensity={15}>
            <View style={styles.coachHeader}>
              <Ionicons name="sparkles" size={20} color={theme.colors.indigo400} />
              <Text style={styles.coachTitle}>AI Financial Coach</Text>
            </View>
            <Text style={styles.coachText}>
              Based on your {curSymbol}{forecast.suggestedSavings.toLocaleString()} suggested monthly savings, 
              you can reach your goals <Text style={{color: theme.colors.success, fontWeight: '800'}}>15% faster</Text> by reducing dining expenses.
            </Text>
          </GlassContainer>
        )}

        <View style={styles.goalsGrid}>
          {goals.map((goal, idx) => {
            const progress = goal.currentAmount / goal.targetAmount;
            const monthsRemaining = forecast?.suggestedSavings && forecast.suggestedSavings > 0 
              ? Math.ceil((goal.targetAmount - goal.currentAmount) / forecast.suggestedSavings)
              : '??';

            return (
              <Animated.View key={goal.id} entering={FadeInDown.delay(idx * 100)} style={styles.goalWrapper}>
                <GlassContainer style={styles.goalCard} intensity={10}>
                  <View style={[styles.iconBox, { backgroundColor: `${goal.color}20` }]}>
                    <Ionicons name={goal.icon as any} size={24} color={goal.color} />
                  </View>
                  <Text style={[styles.goalName, { color: txtColor }]}>{goal.name}</Text>
                  <View style={styles.progressRow}>
                    <View style={styles.progressBar}>
                      <View style={[styles.progressFill, { width: `${progress * 100}%`, backgroundColor: goal.color }]} />
                    </View>
                    <Text style={styles.progressText}>{Math.round(progress * 100)}%</Text>
                  </View>
                  <View style={styles.goalFooter}>
                    <View>
                      <Text style={styles.footerLabel}>Remaining</Text>
                      <Text style={[styles.footerValue, { color: txtColor }]}>{curSymbol}{(goal.targetAmount - goal.currentAmount).toLocaleString()}</Text>
                    </View>
                    <View style={{ alignItems: 'flex-end' }}>
                      <Text style={styles.footerLabel}>Est. Time</Text>
                      <Text style={[styles.footerValue, { color: theme.colors.indigo400 }]}>{monthsRemaining} months</Text>
                    </View>
                  </View>
                </GlassContainer>
              </Animated.View>
            );
          })}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  scrollContent: { padding: 20, paddingTop: 60, paddingBottom: 100 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 },
  title: { fontSize: 28, fontWeight: '900' },
  addBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: theme.colors.indigo400, alignItems: 'center', justifyContent: 'center' },
  addForm: { marginBottom: 24 },
  formInside: { padding: 20, borderRadius: 24 },
  input: { borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.1)', paddingVertical: 12, marginBottom: 16, fontSize: 16, fontWeight: '600' },
  submitBtn: { backgroundColor: theme.colors.indigo400, paddingVertical: 14, borderRadius: 16, alignItems: 'center' },
  submitText: { color: '#fff', fontWeight: '800', fontSize: 16 },
  coachCard: { padding: 20, borderRadius: 24, marginBottom: 30, backgroundColor: 'rgba(129, 140, 248, 0.05)', borderWidth: 1, borderColor: 'rgba(129, 140, 248, 0.2)' },
  coachHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  coachTitle: { color: theme.colors.indigo400, fontWeight: '900', marginLeft: 8, fontSize: 16 },
  coachText: { color: 'rgba(255,255,255,0.7)', lineHeight: 22, fontSize: 14, fontWeight: '500' },
  goalsGrid: { gap: 20 },
  goalWrapper: { width: '100%' },
  goalCard: { padding: 20, borderRadius: 28, borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)' },
  iconBox: { width: 52, height: 52, borderRadius: 18, alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
  goalName: { fontSize: 18, fontWeight: '800', marginBottom: 12 },
  progressRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 20 },
  progressBar: { flex: 1, height: 8, backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 4, marginRight: 12, overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: 4 },
  progressText: { fontSize: 12, fontWeight: '800', color: theme.colors.slate400, width: 35 },
  goalFooter: { flexDirection: 'row', justifyContent: 'space-between', borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.05)', paddingTop: 16 },
  footerLabel: { fontSize: 10, color: theme.colors.slate500, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1 },
  footerValue: { fontSize: 15, fontWeight: '800', marginTop: 4 }
});
