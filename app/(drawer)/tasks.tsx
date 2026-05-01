import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, TextInput, Pressable, ScrollView, Modal, Alert, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router, useNavigation, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { DrawerActions } from '@react-navigation/native';
import { Image } from 'expo-image';
import { theme } from '../../src/ui/theme';
import { StorageClient } from '../../src/data/storage';
import * as Haptics from 'expo-haptics';
import { Header } from '../../src/ui/components/Header';

interface Task {
  id: string;
  title: string;
  description: string;
  priority: 'Low' | 'Medium' | 'High';
  dueDate: string;
  completed: boolean;
}

export default function TasksScreen() {
  const params = useLocalSearchParams();
  const { openAdd } = params;
  const navigation = useNavigation<any>();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [filter, setFilter] = useState<'All' | 'Active' | 'Completed'>('All');
  const [isModalVisible, setModalVisible] = useState(false);
  const [isPriorityPickerOpen, setPriorityPickerOpen] = useState(false);
  const [isDatePickerOpen, setDatePickerOpen] = useState(false);
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);

  const [newTask, setNewTask] = useState<Partial<Task>>({
    title: '',
    description: '',
    priority: 'Medium',
    dueDate: 'Today'
  });

  useFocusEffect(
    useCallback(() => {
      StorageClient.getTasks().then(setTasks);
      if (openAdd === 'true') {
        setNewTask({
          title: (params.title as string) || '',
          description: (params.description as string) || '',
          priority: (params.priority as any) || 'Medium',
          dueDate: (params.dueDate as string) || 'Today'
        });
        setModalVisible(true);
      }
    }, [openAdd, params.title, params.description, params.priority, params.dueDate])
  );

  const saveTask = () => {
    if (!newTask.title) return;

    let newTasksList: Task[] = [];
    if (editingTaskId) {
      newTasksList = tasks.map(t => t.id === editingTaskId ? {
        ...t,
        title: newTask.title || '',
        description: newTask.description || '',
        priority: newTask.priority as any || 'Medium',
        dueDate: newTask.dueDate || 'Today'
      } : t);
    } else {
      const t = {
        id: Math.random().toString(),
        title: newTask.title || '',
        description: newTask.description || '',
        priority: newTask.priority || 'Medium',
        dueDate: newTask.dueDate && newTask.dueDate !== 'mm/dd/yyyy' ? newTask.dueDate : 'Today',
        completed: false
      };
      newTasksList = [t as Task, ...tasks];
    }
    
    setTasks(newTasksList);
    StorageClient.saveTasks(newTasksList);
    setModalVisible(false);
    setNewTask({ title: '', description: '', priority: 'Medium', dueDate: 'Today' });
    setEditingTaskId(null);
  };

  const handleEditTask = (task: Task) => {
    setEditingTaskId(task.id);
    setNewTask({
      title: task.title,
      description: task.description,
      priority: task.priority,
      dueDate: task.dueDate
    });
    setModalVisible(true);
  };

  const toggleTask = (id: string) => {
    const updated = tasks.map(t => t.id === id ? { ...t, completed: !t.completed } : t);
    setTasks(updated);
    StorageClient.saveTasks(updated);
  };
  
  const deleteTask = (id: string) => {
    const doDelete = () => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      const updated = tasks.filter(t => t.id !== id);
      setTasks(updated);
      StorageClient.saveTasks(updated);
    };

    if (Platform.OS === 'web') {
      if (window.confirm("Are you sure you want to delete this task?")) doDelete();
    } else {
      Alert.alert(
        "Confirm Delete",
        "Are you sure you want to delete this task?",
        [
          { text: "Cancel", style: "cancel" },
          { text: "Delete", style: "destructive", onPress: doDelete }
        ]
      );
    }
  };

  const filteredTasks = tasks.filter(t => {
    if (filter === 'Active') return !t.completed;
    if (filter === 'Completed') return t.completed;
    return true;
  });

  const getPriorityColor = (priority: string) => {
    if (priority === 'Low') return { bg: '#dcfce7', text: '#166534' };
    if (priority === 'High') return { bg: '#fee2e2', text: '#991b1b' };
    return { bg: '#fef3c7', text: '#92400e' };
  };

  return (
    <View style={styles.container}>
      <Header 
        title="Tasks" 
        subtitle="Stay on top of your to-dos" 
        icon="checkbox-outline" 
        iconColor="#d59d47"
      />

      {/* Toolbar / Filters */}
      <View style={styles.toolbar}>
        <View style={styles.filters}>
          {(['All', 'Active', 'Completed'] as const).map(f => {
            const count = tasks.filter(t => f === 'All' ? true : f === 'Active' ? !t.completed : t.completed).length;
            const isActive = filter === f;
            return (
              <Pressable 
                key={f} 
                style={[styles.filterPill, isActive && styles.filterPillActive]}
                onPress={() => setFilter(f)}
              >
                <Text style={[styles.filterText, isActive && styles.filterTextActive]}>{f}</Text>
                <Text style={[styles.filterCount, isActive && styles.filterTextActive]}>{count}</Text>
              </Pressable>
            )
          })}
        </View>
        <Pressable style={styles.newTaskBtn} onPress={() => { setEditingTaskId(null); setNewTask({ title: '', description: '', priority: 'Medium', dueDate: 'Today' }); setModalVisible(true); }}>
          <Ionicons name="add" size={18} color="#fff" />
          <Text style={styles.newTaskBtnText}>New Task</Text>
        </Pressable>

      </View>

      {/* Content */}
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {tasks.length === 0 ? (
           <View style={styles.emptyState}>
             <View style={styles.emptyIconContainer}>
                <Ionicons name="checkbox-outline" size={40} color="#fff" />
             </View>
             <Text style={styles.emptyTitle}>No tasks yet</Text>
             <Text style={styles.emptySubtitle}>Add your first task to get started</Text>
             <Pressable style={styles.createBtn} onPress={() => setModalVisible(true)}>
               <Ionicons name="add" size={18} color="#fff" style={{marginRight: 8}} />
               <Text style={styles.createBtnText}>Add Task</Text>
             </Pressable>
           </View>
        ) : (
           <View style={styles.tasksList}>
             {filteredTasks.map(task => {
                const priorityStyle = getPriorityColor(task.priority);
                return (
                  <View key={task.id} style={styles.taskCard}>
                    <View style={styles.taskCardRow}>
                      <Pressable onPress={() => toggleTask(task.id)} style={styles.radioBtn}>
                         {task.completed ? <Ionicons name="checkmark-circle" size={24} color="#10b981" /> : <Ionicons name="ellipse-outline" size={24} color="#64748b" />}
                      </Pressable>
                      <View style={{flex: 1, marginLeft: 12}}>
                         <Text style={[styles.taskTitle, task.completed && styles.taskTitleCompleted]}>{task.title}</Text>
                         {task.description ? <Text style={styles.taskDesc}>{task.description}</Text> : null}
                         <View style={styles.badgesRow}>
                           <View style={[styles.priorityBadge, {backgroundColor: priorityStyle.bg}]}>
                             <Text style={[styles.priorityText, {color: priorityStyle.text}]}>{task.priority}</Text>
                           </View>
                           <View style={styles.dateBadge}>
                             <Ionicons name="calendar-outline" size={12} color="#ef4444" />
                             <Text style={styles.dateText}>{task.dueDate}</Text>
                           </View>
                         </View>
                      </View>
                       <View style={styles.actionsBox}>
                         <Pressable style={styles.actionIcon} onPress={() => handleEditTask(task)}><Ionicons name="pencil" size={16} color="#64748b" /></Pressable>
                         <Pressable style={styles.actionIcon} onPress={() => deleteTask(task.id)}><Ionicons name="trash-outline" size={16} color="#64748b" /></Pressable>
                      </View>
                    </View>
                  </View>
                );
             })}
           </View>
        )}
      </ScrollView>

      {/* FAB - Menu */}
      <Pressable style={styles.fab}>
        <Ionicons name="menu" size={24} color="#fff" />
      </Pressable>

      {/* Create Modal */}
      <Modal visible={isModalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={{flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20}}>
               <View style={{width: 24}} />
               <Text style={styles.modalTitle}>New Task</Text>
               <Pressable onPress={() => setModalVisible(false)}><Ionicons name="close" size={24} color="#64748b" /></Pressable>
            </View>
            
            <Text style={styles.inputLabel}>Title *</Text>
            <TextInput 
               style={styles.modalInput} 
               placeholder="What needs to be done?"
               value={newTask.title}
               onChangeText={(v) => setNewTask({...newTask, title: v})}
            />

            <Text style={styles.inputLabel}>Description</Text>
            <TextInput 
               style={[styles.modalInput, styles.textArea]} 
               placeholder="Optional details..."
               value={newTask.description}
               onChangeText={(v) => setNewTask({...newTask, description: v})}
               multiline
               textAlignVertical="top"
            />

            <View style={{flexDirection: 'row', justifyContent: 'space-between', zIndex: 100, elevation: 100}}>
              <View style={{flex: 1, marginRight: 8, zIndex: 100, elevation: 100}}>
                <Text style={styles.inputLabel}>Priority</Text>
                <Pressable 
                  style={[styles.modalInput, {flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 14}]}
                  onPress={() => { setPriorityPickerOpen(!isPriorityPickerOpen); setDatePickerOpen(false); }}
                >
                  <Text style={{color: '#0f172a'}}>{newTask.priority}</Text>
                  <Ionicons name="chevron-down" size={16} color="#64748b" />
                </Pressable>
                
                {isPriorityPickerOpen && (
                  <View style={styles.dropdownMenu}>
                    {['Low', 'Medium', 'High'].map(p => (
                      <Pressable key={p} style={styles.dropdownItem} onPress={() => { setNewTask({...newTask, priority: p as any}); setPriorityPickerOpen(false); }}>
                        <Text style={styles.dropdownItemText}>{p}</Text>
                      </Pressable>
                    ))}
                  </View>
                )}
              </View>

              <View style={{flex: 1, marginLeft: 8, zIndex: 100, elevation: 100}}>
                <Text style={styles.inputLabel}>Due Date</Text>
                <Pressable 
                  style={[styles.modalInput, {flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 14}]}
                  onPress={() => { setDatePickerOpen(!isDatePickerOpen); setPriorityPickerOpen(false); }}
                >
                  <Text style={{color: '#0f172a'}}>{newTask.dueDate}</Text>
                  <Ionicons name="calendar-outline" size={16} color="#0f172a" />
                </Pressable>

                {isDatePickerOpen && (
                  <View style={styles.dropdownMenu}>
                    {['Today', 'Tomorrow', 'Next Week'].map(d => (
                      <Pressable key={d} style={styles.dropdownItem} onPress={() => { setNewTask({...newTask, dueDate: d}); setDatePickerOpen(false); }}>
                        <Text style={styles.dropdownItemText}>{d}</Text>
                      </Pressable>
                    ))}
                  </View>
                )}
              </View>
            </View>

            <View style={[styles.modalActions, { marginTop: 20, zIndex: 1, elevation: 1 }]}>
               <Pressable style={styles.cancelBtn} onPress={() => { setModalVisible(false); setPriorityPickerOpen(false); setDatePickerOpen(false); }}>
                 <Text style={styles.cancelBtnText}>Cancel</Text>
               </Pressable>
               <Pressable style={styles.addBtn} onPress={saveTask}>
                 <Text style={styles.addBtnText}>{editingTaskId ? 'Save Task' : 'Add Task'}</Text>
               </Pressable>
            </View>
          </View>
        </View>
      </Modal>
      <Pressable style={styles.fab} onPress={() => navigation.dispatch(DrawerActions.openDrawer())}>
        <Ionicons name="menu" size={24} color="#fff" />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f4f6f3' },
  headerIconContainer: {
    width: 32, height: 32, borderRadius: 10, backgroundColor: '#d59d47',
    alignItems: 'center', justifyContent: 'center'
  },
  headerTitle: { fontSize: 18, fontWeight: '700', color: '#1b4332' },
  headerSubtitle: { fontSize: 12, color: '#64748b' },
  avatar: { width: 32, height: 32, borderRadius: 16, borderWidth: 1, borderColor: '#e2e8f0' },
  toolbar: { flexDirection: 'row', padding: 16, alignItems: 'center', borderBottomWidth: 1, borderBottomColor: '#f1f5f9', backgroundColor: '#fff'},
  filters: { flex: 1, flexDirection: 'row', alignItems: 'center' },
  filterPill: { flexDirection: 'row', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16, marginRight: 8 },
  filterPillActive: { backgroundColor: '#fef3c7' },
  filterText: { fontSize: 14, fontWeight: '600', color: '#64748b' },
  filterTextActive: { color: '#92400e' },
  filterCount: { fontSize: 12, color: '#94a3b8', marginLeft: 4, marginTop: 2 },
  newTaskBtn: { 
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#1b4332', 
    paddingHorizontal: 12, height: 36, borderRadius: 18 
  },
  newTaskBtnText: { color: '#fff', fontWeight: '600', fontSize: 13, marginLeft: 4 },
  scrollContent: { padding: 16, flexGrow: 1 },
  emptyState: { flex: 1, justifyContent: 'center', alignItems: 'center', marginTop: 100 },
  emptyIconContainer: { width: 80, height: 80, borderRadius: 24, backgroundColor: '#d59d47', alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: '#0f172a', marginBottom: 4 },
  emptySubtitle: { fontSize: 14, color: '#64748b', marginBottom: 24 },
  createBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#1b4332', paddingHorizontal: 20, paddingVertical: 12, borderRadius: 12 },
  createBtnText: { color: '#fff', fontWeight: '600', fontSize: 15 },
  fab: { position: 'absolute', bottom: 24, left: 16, width: 48, height: 48, borderRadius: 24, backgroundColor: '#1b4332', alignItems: 'center', justifyContent: 'center', elevation: 4 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: 20 },
  modalContent: { width: '100%', backgroundColor: '#fff', borderRadius: 24, padding: 24, position: 'relative' },
  modalTitle: { fontSize: 18, fontWeight: '700', color: '#0f172a' },
  inputLabel: { fontSize: 14, fontWeight: '600', color: '#1e293b', marginBottom: 8 },
  modalInput: { borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 12, padding: 12, fontSize: 15, marginBottom: 16, color: '#0f172a', backgroundColor: '#fff' },
  textArea: { height: 100 },
  modalActions: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', marginTop: 12 },
  cancelBtn: { paddingHorizontal: 24, paddingVertical: 12, borderRadius: 24, borderWidth: 1, borderColor: '#e2e8f0', marginRight: 12 },
  cancelBtnText: { color: '#0f172a', fontWeight: '600', fontSize: 15 },
  addBtn: { paddingHorizontal: 24, paddingVertical: 12, borderRadius: 24, backgroundColor: '#1b4332' },
  addBtnText: { color: '#fff', fontWeight: '600', fontSize: 15 },
  tasksList: { paddingBottom: 80 },
  taskCard: { backgroundColor: '#fff', padding: 16, borderRadius: 16, marginBottom: 12, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 2 },
  taskCardRow: { flexDirection: 'row', alignItems: 'flex-start' },
  radioBtn: { marginTop: 2 },
  taskTitle: { fontSize: 16, fontWeight: '700', color: '#0f172a', marginBottom: 4 },
  taskTitleCompleted: { textDecorationLine: 'line-through', color: '#94a3b8' },
  taskDesc: { fontSize: 14, color: '#475569', marginBottom: 8 },
  badgesRow: { flexDirection: 'row', alignItems: 'center' },
  priorityBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12, marginRight: 8 },
  priorityText: { fontSize: 11, fontWeight: '700' },
  dateBadge: { flexDirection: 'row', alignItems: 'center' },
  dateText: { fontSize: 12, color: '#ef4444', marginLeft: 4 },
  actionsBox: { flexDirection: 'column', alignItems: 'flex-end', marginLeft: 12 },
  actionIcon: { padding: 4, backgroundColor: '#f1f5f9', borderRadius: 12, marginBottom: 8 },
  dropdownMenu: { position: 'absolute', top: 76, left: 0, right: 0, backgroundColor: '#fff', borderRadius: 12, borderWidth: 1, borderColor: '#e2e8f0', shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 10, elevation: 5, zIndex: 50 },
  dropdownItem: { paddingVertical: 12, paddingHorizontal: 16, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
  dropdownItemText: { fontSize: 15, color: '#0f172a' }
});
