import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, TextInput, Pressable, ScrollView, Modal, Alert, Platform } from 'react-native';
import { Swipeable, GestureHandlerRootView } from 'react-native-gesture-handler';
import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons';
import { router, useNavigation, useLocalSearchParams } from 'expo-router';
import { DrawerActions } from '@react-navigation/native';
import { useFocusEffect } from 'expo-router';
import { Image } from 'expo-image';
import { theme } from '../../src/ui/theme';
import { format } from 'date-fns';
import { StorageClient } from '../../src/data/storage';
import { Header } from '../../src/ui/components/Header';

type NoteColor = '#ffffff' | '#dbeafe' | '#fef08a' | '#dcfce7' | '#f3e8ff';

interface Note {
  id: string;
  title: string;
  content: string;
  color: NoteColor;
  createdAt: string;
}

export default function NotesScreen() {
  const params = useLocalSearchParams();
  const { openAdd } = params;
  const navigation = useNavigation<any>();
  const [notes, setNotes] = useState<Note[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isModalVisible, setModalVisible] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newContent, setNewContent] = useState('');
  const [selectedColor, setSelectedColor] = useState<NoteColor>('#ffffff');

  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);

  useFocusEffect(
    useCallback(() => {
      StorageClient.getNotes().then(setNotes);
      if (openAdd === 'true') {
        if (params.title) setNewTitle(params.title as string);
        if (params.content) setNewContent(params.content as string);
        if (params.color) setSelectedColor(params.color as any);
        setModalVisible(true);
      }
    }, [openAdd, params.title, params.content, params.color])
  );

  const addNote = () => {
    if (!newTitle.trim()) return;
    
    let newNotesList: Note[] = [];
    if (editingNoteId) {
       newNotesList = notes.map(n => n.id === editingNoteId ? {
         ...n, title: newTitle, content: newContent, color: selectedColor
       } : n);
    } else {
       const note: Note = {
         id: Math.random().toString(),
         title: newTitle,
         content: newContent,
         color: selectedColor,
         createdAt: new Date().toISOString()
       };
       newNotesList = [note, ...notes];
    }
    
    setNotes(newNotesList);
    StorageClient.saveNotes(newNotesList);
    
    setModalVisible(false);
    setNewTitle('');
    setNewContent('');
    setSelectedColor('#ffffff');
    setEditingNoteId(null);
  };
  
  const handleEditNote = (note: Note) => {
    setEditingNoteId(note.id);
    setNewTitle(note.title);
    setNewContent(note.content);
    setSelectedColor(note.color);
    setModalVisible(true);
  };

  const handleDeleteNote = (id: string) => {
    const doDelete = () => {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        const updated = notes.filter(n => n.id !== id);
        setNotes(updated);
        StorageClient.saveNotes(updated);
    };

    if (Platform.OS === 'web') {
      if (window.confirm("Are you sure you want to delete this note?")) doDelete();
    } else {
      Alert.alert(
        "Confirm Delete",
        "Are you sure you want to delete this note?",
        [
          { text: "Cancel", style: "cancel" },
          { text: "Delete", style: "destructive", onPress: doDelete }
        ]
      );
    }
  };

  const renderRightActions = (id: string) => (
    <Pressable onPress={() => handleDeleteNote(id)} style={styles.deleteAction}>
      <Ionicons name="trash-outline" size={24} color="#fff" />
    </Pressable>
  );

  const filteredNotes = notes.filter(n => 
    n.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
    n.content.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <GestureHandlerRootView style={styles.container}>
      <Header 
        title="Notes" 
        subtitle="Capture your thoughts" 
        icon="document-text" 
        iconColor="#467491"
        gradient={['#467491', '#2f4f4f']}
      />

      {/* Toolbar */}
      <View style={styles.toolbar}>
        <View style={styles.searchContainer}>
           <Ionicons name="search" size={18} color="#94a3b8" style={{marginLeft: 12}} />
           <TextInput 
             style={styles.searchInput} 
             placeholder="Search notes..."
             value={searchQuery}
             onChangeText={setSearchQuery}
           />
        </View>
        <Pressable style={styles.newNoteBtn} onPress={() => {
           setEditingNoteId(null);
           setNewTitle('');
           setNewContent('');
           setSelectedColor('#ffffff');
           setModalVisible(true);
        }}>
          <Ionicons name="add" size={18} color="#fff" />
          <Text style={styles.newNoteBtnText}>New Note</Text>
        </Pressable>
      </View>

      {/* Content */}
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {notes.length === 0 ? (
           <View style={styles.emptyState}>
             <View style={styles.emptyIconContainer}>
                <Ionicons name="document-text-outline" size={40} color="#fff" />
             </View>
             <Text style={styles.emptyTitle}>No notes yet</Text>
             <Text style={styles.emptySubtitle}>Create your first note to get started</Text>
             <Pressable style={styles.createBtn} onPress={() => {
                setEditingNoteId(null);
                setNewTitle('');
                setNewContent('');
                setSelectedColor('#ffffff');
                setModalVisible(true);
             }}>
               <Ionicons name="add" size={18} color="#fff" style={{marginRight: 8}} />
               <Text style={styles.createBtnText}>Create Note</Text>
             </Pressable>
           </View>
        ) : (
           <View style={styles.notesList}>
             {filteredNotes.map(note => (
                 <Pressable key={note.id} style={[styles.noteCard, { backgroundColor: note.color }]} onPress={() => handleEditNote(note)}>
                   <View style={{flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start'}}>
                     <Text style={[styles.noteCardTitle, {flex: 1}]}>{note.title}</Text>
                     <Pressable onPress={() => handleDeleteNote(note.id)} style={{padding: 4, zIndex: 10}}>
                       <Ionicons name="trash-outline" size={16} color="#64748b" />
                     </Pressable>
                   </View>
                   {note.content ? <Text style={styles.noteCardContent} numberOfLines={2}>{note.content}</Text> : null}
                   <Text style={styles.noteCardDate}>{format(new Date(note.createdAt), 'MMM dd, yyyy')}</Text>
                 </Pressable>
             ))}
           </View>
        )}
      </ScrollView>

      {/* FAB - Menu */}
      <Pressable style={styles.fab}>
        <Ionicons name="menu" size={24} color="#fff" />
      </Pressable>

      {/* Add Modal */}
      <Modal visible={isModalVisible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={{flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20}}>
               <View style={{width: 24}} />
               <Text style={styles.modalTitle}>{editingNoteId ? 'Edit Note' : 'New Note'}</Text>
               <Pressable onPress={() => setModalVisible(false)}><Ionicons name="close" size={24} color="#64748b" /></Pressable>
            </View>
            
            <Text style={styles.inputLabel}>Title</Text>
            <TextInput 
               style={styles.modalInput} 
               placeholder="Note title..."
               value={newTitle}
               onChangeText={setNewTitle}
            />

            <Text style={styles.inputLabel}>Content</Text>
            <TextInput 
               style={[styles.modalInput, styles.textArea]} 
               placeholder="Write your note here..."
               value={newContent}
               onChangeText={setNewContent}
               multiline
               textAlignVertical="top"
            />

            <Text style={styles.inputLabel}>Color</Text>
            <View style={styles.colorPicker}>
               {(['#ffffff', '#dbeafe', '#fef08a', '#dcfce7', '#f3e8ff'] as NoteColor[]).map(color => (
                 <Pressable 
                   key={color} 
                   style={[
                     styles.colorCircle, 
                     { backgroundColor: color }, 
                     selectedColor === color && styles.colorCircleSelected
                   ]}
                   onPress={() => setSelectedColor(color)}
                 />
               ))}
            </View>

            <View style={styles.modalActions}>
               <Pressable style={styles.cancelBtn} onPress={() => setModalVisible(false)}>
                 <Text style={styles.cancelBtnText}>Cancel</Text>
               </Pressable>
               <Pressable style={styles.addBtn} onPress={addNote}>
                 <Text style={styles.addBtnText}>{editingNoteId ? 'Save Note' : 'Add Note'}</Text>
               </Pressable>
            </View>
          </View>
        </View>
      </Modal>
      <Pressable style={styles.fab} onPress={() => navigation.dispatch(DrawerActions.openDrawer())}>
        <Ionicons name="menu" size={24} color="#fff" />
      </Pressable>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9F7F2' },
  headerIconContainer: {
    width: 32, height: 32, borderRadius: 10, backgroundColor: '#467491',
    alignItems: 'center', justifyContent: 'center'
  },
  headerTitle: { fontSize: 18, fontWeight: '700', color: '#1b4332' },
  headerSubtitle: { fontSize: 12, color: '#64748b' },
  avatar: { width: 32, height: 32, borderRadius: 16, borderWidth: 1, borderColor: '#e2e8f0' },
  toolbar: { flexDirection: 'row', padding: 16, alignItems: 'center' },
  searchContainer: { 
    flex: 1, flexDirection: 'row', alignItems: 'center', 
    backgroundColor: '#fff', borderRadius: 8, borderWidth: 1, borderColor: '#e2e8f0',
    height: 40, marginRight: 12
  },
  searchInput: { flex: 1, paddingHorizontal: 8, fontSize: 14, color: '#1b4332' },
  newNoteBtn: { 
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#1b4332', 
    paddingHorizontal: 12, height: 40, borderRadius: 8 
  },
  newNoteBtnText: { color: '#fff', fontWeight: '600', fontSize: 14, marginLeft: 4 },
  scrollContent: { padding: 16, flexGrow: 1 },
  emptyState: { flex: 1, justifyContent: 'center', alignItems: 'center', marginTop: 100 },
  emptyIconContainer: { width: 80, height: 80, borderRadius: 24, backgroundColor: '#467491', alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: '#0f172a', marginBottom: 4 },
  emptySubtitle: { fontSize: 14, color: '#64748b', marginBottom: 24 },
  createBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#1b4332', paddingHorizontal: 20, paddingVertical: 12, borderRadius: 12 },
  createBtnText: { color: '#fff', fontWeight: '600', fontSize: 15 },
  fab: { position: 'absolute', bottom: 90, left: 16, width: 48, height: 48, borderRadius: 24, backgroundColor: '#1b4332', alignItems: 'center', justifyContent: 'center', elevation: 4 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  modalContent: { width: '100%', backgroundColor: '#fff', borderRadius: 24, padding: 24 },
  modalTitle: { fontSize: 18, fontWeight: '700', color: '#0f172a' },
  inputLabel: { fontSize: 14, fontWeight: '600', color: '#1e293b', marginBottom: 8 },
  modalInput: { borderWidth: 1, borderColor: '#1b4332', borderRadius: 12, padding: 12, fontSize: 15, marginBottom: 16, color: '#0f172a' },
  textArea: { height: 120, borderColor: '#a7f3d0' },
  colorPicker: { flexDirection: 'row', marginBottom: 32 },
  colorCircle: { width: 36, height: 36, borderRadius: 18, marginRight: 12, borderWidth: 2, borderColor: 'transparent' },
  colorCircleSelected: { borderColor: '#1b4332' },
  modalActions: { flexDirection: 'row', justifyContent: 'flex-end', alignItems: 'center' },
  cancelBtn: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 12, borderWidth: 1, borderColor: '#e2e8f0', marginRight: 12 },
  cancelBtnText: { color: '#0f172a', fontWeight: '600' },
  addBtn: { paddingHorizontal: 20, paddingVertical: 10, borderRadius: 12, backgroundColor: '#1b4332' },
  addBtnText: { color: '#fff', fontWeight: '600' },
  notesList: { paddingBottom: 80 },
  noteCard: { padding: 16, borderRadius: 16, marginBottom: 12, borderWidth: 1, borderColor: 'rgba(0,0,0,0.05)' },
  noteCardTitle: { fontSize: 16, fontWeight: '700', color: '#0f172a', marginBottom: 4 },
  noteCardContent: { fontSize: 14, color: '#475569', marginBottom: 12 },
  noteCardDate: { fontSize: 12, color: '#94a3b8' },
  deleteAction: { backgroundColor: '#ef4444', justifyContent: 'center', alignItems: 'center', width: 80, height: '90%', borderRadius: 16, marginBottom: 12, marginRight: 2 }
});
