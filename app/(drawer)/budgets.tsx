import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, Alert, Dimensions, Modal, TextInput, Platform } from 'react-native';
import { theme } from '../../src/ui/theme';
import { GlassContainer } from '../../src/ui/components/GlassContainer';
import { Ionicons } from '@expo/vector-icons';
import { StorageClient } from '../../src/data/storage';
import { useFocusEffect, router, useNavigation, useLocalSearchParams } from 'expo-router';
import { DrawerActions } from '@react-navigation/native';
import { Budget, Category, Transaction } from '../../src/domain/models';
import { useApp } from '../../src/context/AppContext';
import { Header } from '../../src/ui/components/Header';

export default function BudgetsScreen() {
  const navigation = useNavigation<any>();
  const { settings } = useApp();
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingCatId, setEditingCatId] = useState<string | null>(null);
  const { openAdd } = useLocalSearchParams();
  const [newBudgetVal, setNewBudgetVal] = useState('');

  useFocusEffect(
    React.useCallback(() => {
      const load = async () => {
        const [b, c, t] = await Promise.all([
          StorageClient.getBudgets(),
          StorageClient.getCategories(),
          StorageClient.getTransactions()
        ]);
        setBudgets(b);
        const expenseCats = c.filter(cat => cat.type === 'expense');
        setCategories(expenseCats);
        setTransactions(t);
        
        if (openAdd === 'true' && expenseCats.length > 0) {
          handleSetBudget(expenseCats[0].id, 0);
        }
      };
      load();
    }, [openAdd])
  );

  const curSymbol = settings.currency === 'PHP' ? '₱' : settings.currency === 'USD' ? '$' : '€';
  const bgColor = '#f4f6f3';
  const txtColor = '#0f172a';
  const themeDanger = '#ef4444';
  const themeWarning = '#f59e0b';
  const themeSuccess = '#10b981';
  const themeIndigo = '#1b4332';

  const handleSetBudget = (categoryId: string, currentAmount: number) => {
    setEditingCatId(categoryId);
    setNewBudgetVal(currentAmount.toString());
    setModalVisible(true);
  };

  const saveBudget = async () => {
    if (editingCatId && !isNaN(Number(newBudgetVal))) {
      await StorageClient.saveBudget({
        id: '',
        categoryId: editingCatId,
        targetAmount: Number(newBudgetVal),
        month: new Date().toISOString().substring(0, 7)
      });
      const b = await StorageClient.getBudgets();
      setBudgets(b);
      setModalVisible(false);
      setEditingCatId(null);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: bgColor }]}>
      <Header 
        title="Budgets" 
        subtitle="Monthly spending limits" 
        icon="pie-chart" 
        iconColor="#1b4332"
        showBackButton={true}
      />
      
      <ScrollView contentContainerStyle={{padding: 16, paddingBottom: 100}}>
        {categories.map(cat => {
          const budget = budgets.find(b => b.categoryId === cat.id);
          const spent = transactions
            .filter(t => t.categoryId === cat.id && t.date.startsWith(new Date().toISOString().substring(0, 7)))
            .reduce((acc, t) => acc + t.amount, 0);
          
          const target = budget?.targetAmount || 0;
          const percentage = target > 0 ? (spent / target) : 0;
          const progress = Math.min(percentage, 1);
          
          let progressColor = themeSuccess;
          if (percentage >= 1) progressColor = themeDanger;
          else if (percentage >= 0.7) progressColor = themeWarning;

          return (
            <View key={cat.id} style={styles.card}>
              <View style={styles.cardHeader}>
                <View style={{flexDirection: 'row', alignItems: 'center'}}>
                   <View style={[styles.iconCircle, {backgroundColor: `${cat.color}15`}]}>
                      <Ionicons name={cat.icon as any} size={20} color={cat.color} />
                   </View>
                   <Text style={[styles.catName, { color: txtColor }]}>{cat.name}</Text>
                </View>
                <Pressable onPress={() => handleSetBudget(cat.id, target)}>
                   <Ionicons name="create-outline" size={20} color={themeIndigo} />
                </Pressable>
              </View>

              <View style={styles.budgetRow}>
                <View>
                   <Text style={[styles.spentText, { color: txtColor }]}>{curSymbol}{spent.toLocaleString()}</Text>
                   <Text style={styles.targetText}>of {curSymbol}{target.toLocaleString()}</Text>
                </View>
                <Text style={[styles.percentLabel, { color: progressColor }]}>{Math.round(percentage * 100)}%</Text>
              </View>

              <View style={styles.progressContainer}>
                <View style={[styles.progressBar, { width: `${progress * 100}%`, backgroundColor: progressColor }]} />
              </View>

              {percentage >= 1 ? (
                <View style={[styles.alertBox, {backgroundColor: '#fef2f2'}]}>
                   <Ionicons name="alert-circle" size={16} color={themeDanger} />
                   <Text style={[styles.alertText, {color: themeDanger}]}>Limit exceeded!</Text>
                </View>
              ) : percentage >= 0.7 ? (
                <View style={[styles.alertBox, {backgroundColor: '#fffbeb'}]}>
                   <Ionicons name="warning" size={16} color={themeWarning} />
                   <Text style={[styles.alertText, {color: themeWarning}]}>Approaching limit (70%)</Text>
                </View>
              ) : null}
            </View>
          );
        })}
      </ScrollView>
      <Pressable style={styles.fabMenu} onPress={() => navigation.dispatch(DrawerActions.openDrawer())}>
        <Ionicons name="menu" size={24} color="#fff" />
      </Pressable>
      <Modal
        animationType="fade"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <Pressable style={styles.modalOverlay} onPress={() => setModalVisible(false)}>
          <View style={[styles.modalContent, { backgroundColor: '#fff' }]}>
            <Text style={[styles.modalTitle, { color: txtColor }]}>Set Budget</Text>
            <Text style={styles.modalSubtitle}>Enter monthly limit for this category</Text>
            
            <TextInput
              style={[styles.modalInput, { color: txtColor }]}
              value={newBudgetVal}
              onChangeText={setNewBudgetVal}
              keyboardType="numeric"
              autoFocus
              placeholder="0.00"
              placeholderTextColor={theme.colors.slate500}
            />

            <View style={styles.modalActions}>
              <Pressable style={styles.modalBtn} onPress={() => setModalVisible(false)}>
                <Text style={[styles.modalBtnText, { color: '#64748b' }]}>Cancel</Text>
              </Pressable>
              <Pressable style={[styles.modalBtn, styles.modalBtnPrimary]} onPress={saveBudget}>
                <Text style={[styles.modalBtnText, { color: '#fff' }]}>Set Budget</Text>
              </Pressable>
            </View>
          </View>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f4f6f3' },
  card: { padding: 20, marginBottom: 16, borderRadius: 24, backgroundColor: '#fff', borderWidth: 1, borderColor: '#e2e8f0', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 2 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  iconCircle: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  catName: { fontSize: 18, fontWeight: '700' },
  budgetRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 12 },
  spentText: { fontSize: 24, fontWeight: '800' },
  targetText: { fontSize: 12, color: '#64748b', marginTop: 2 },
  percentLabel: { fontSize: 16, fontWeight: '800' },
  progressContainer: { height: 8, backgroundColor: '#f1f5f9', borderRadius: 4, overflow: 'hidden' },
  progressBar: { height: '100%', borderRadius: 4 },
  alertBox: { flexDirection: 'row', alignItems: 'center', marginTop: 12, backgroundColor: '#f1f5f9', padding: 8, borderRadius: 10 },
  alertText: { fontSize: 12, fontWeight: '700', color: '#ef4444', marginLeft: 6 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  modalContent: { width: '100%', maxWidth: 400, padding: 24, borderRadius: 32, borderWidth: 1, borderColor: '#e2e8f0' },
  modalTitle: { fontSize: 24, fontWeight: '800', marginBottom: 8 },
  modalSubtitle: { fontSize: 14, color: '#64748b', marginBottom: 24 },
  modalInput: { fontSize: 32, fontWeight: '800', borderBottomWidth: 2, borderBottomColor: '#1b4332', paddingVertical: 12, marginBottom: 32 },
  modalActions: { flexDirection: 'row', justifyContent: 'flex-end' },
  modalBtn: { paddingHorizontal: 20, paddingVertical: 12, borderRadius: 12, marginLeft: 12 },
  modalBtnPrimary: { backgroundColor: '#1b4332' },
  modalBtnText: { fontWeight: '700', fontSize: 16 },
  fabMenu: { position: 'absolute', bottom: 40, left: 24, width: 48, height: 48, borderRadius: 24, backgroundColor: '#1b4332', alignItems: 'center', justifyContent: 'center', elevation: 4 }
});
