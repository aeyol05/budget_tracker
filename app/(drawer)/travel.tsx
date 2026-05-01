import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, Modal, TextInput, Alert, ActivityIndicator, Platform } from 'react-native';
import { theme } from '../../src/ui/theme';
import { Ionicons } from '@expo/vector-icons';
import { StorageClient } from '../../src/data/storage';
import { Trip } from '../../src/domain/models';
import { useFocusEffect, router, useNavigation, useLocalSearchParams } from 'expo-router';
import { DrawerActions } from '@react-navigation/native';
import Animated, { FadeInUp, FadeInRight, FadeOut } from 'react-native-reanimated';
import { useApp } from '../../src/context/AppContext';
import { Header } from '../../src/ui/components/Header';
import * as Haptics from 'expo-haptics';
import { format } from 'date-fns';

export default function TravelScreen() {
  const params = useLocalSearchParams();
  const { openAdd } = params;
  const navigation = useNavigation<any>();
  const [trips, setTrips] = useState<Trip[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingTrip, setEditingTrip] = useState<Trip | null>(null);

  // Form states
  const [destination, setDestination] = useState('');
  const [description, setDescription] = useState('');
  const [status, setStatus] = useState<'Planning' | 'Upcoming' | 'Completed'>('Planning');
  const [startDate, setStartDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [endDate, setEndDate] = useState(format(new Date(), 'yyyy-MM-dd'));

  useFocusEffect(
    React.useCallback(() => {
      loadTrips();
      if (openAdd === 'true') {
        setDestination((params.destination as string) || '');
        setDescription((params.description as string) || '');
        setStatus((params.status as any) || 'Planning');
        setStartDate((params.startDate as string) || format(new Date(), 'yyyy-MM-dd'));
        setEndDate((params.endDate as string) || format(new Date(), 'yyyy-MM-dd'));
        setModalVisible(true);
      }
    }, [openAdd, params.destination, params.description, params.status, params.startDate, params.endDate])
  );

  const loadTrips = async () => {
    setLoading(true);
    const data = await StorageClient.getTrips();
    setTrips(data);
    setLoading(false);
  };

  const resetForm = () => {
    setDestination('');
    setDescription('');
    setStatus('Planning');
    setStartDate(format(new Date(), 'yyyy-MM-dd'));
    setEndDate(format(new Date(), 'yyyy-MM-dd'));
    setEditingTrip(null);
  };

  const handleAddTrip = () => {
    resetForm();
    setModalVisible(true);
  };

  const handleEditTrip = (trip: Trip) => {
    setEditingTrip(trip);
    setDestination(trip.destination);
    setDescription(trip.description);
    setStatus(trip.status);
    setStartDate(trip.startDate);
    setEndDate(trip.endDate);
    setModalVisible(true);
  };

  const handleSaveTrip = async () => {
    if (!destination.trim()) {
      Alert.alert("Error", "Destination is required");
      return;
    }

    const tripData: Trip = {
      id: editingTrip?.id || '',
      destination,
      description,
      status,
      startDate,
      endDate,
    };

    await StorageClient.saveTrip(tripData);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setModalVisible(false);
    loadTrips();
  };

  const handleDeleteTrip = (id: string) => {
    const doDelete = async () => {
      await StorageClient.deleteTrip(id);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      loadTrips();
    };

    if (Platform.OS === 'web') {
      if (window.confirm("Are you sure you want to delete this record?")) doDelete();
    } else {
      Alert.alert(
        "Confirm Delete",
        "Are you sure you want to delete this record?",
        [
          { text: "Cancel", style: "cancel" },
          { text: "Delete", style: "destructive", onPress: doDelete }
        ]
      );
    }
  };

  const getStatusColor = (s: string) => {
    switch (s) {
      case 'Completed': return '#dcfce7';
      case 'Upcoming': return '#ffedd5';
      case 'Planning': return '#dbeafe';
      default: return '#f1f5f9';
    }
  };

  const getStatusTextColor = (s: string) => {
    switch (s) {
      case 'Completed': return '#166534';
      case 'Upcoming': return '#9a3412';
      case 'Planning': return '#1e40af';
      default: return '#64748b';
    }
  };

  return (
    <View style={styles.container}>
      <Header 
        title="Travel" 
        subtitle="Plan your next adventure" 
        icon="airplane" 
        iconColor="#a78bfa"
        gradient={['#8c6f96', '#6f537a']}
      />

      <View style={styles.toolbar}>
        <Text style={styles.tripCount}>{trips.length} {trips.length === 1 ? 'trip' : 'trips'}</Text>
        <Pressable style={styles.addBtn} onPress={handleAddTrip}>
           <Ionicons name="add" size={20} color="#fff" />
           <Text style={styles.addBtnText}>New Trip</Text>
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {loading ? (
          <ActivityIndicator size="large" color="#1b4332" style={{ marginTop: 50 }} />
        ) : trips.length === 0 ? (
          <View style={styles.emptyState}>
            <View style={styles.emptyIconContainer}>
               <Ionicons name="map-outline" size={48} color="#fff" />
            </View>
            <Text style={styles.emptyTitle}>No trips yet</Text>
            <Text style={styles.emptySubtitle}>Start planning your next journey!</Text>
          </View>
        ) : (
          trips.map((trip, idx) => (
            <Animated.View 
              key={trip.id} 
              entering={FadeInUp.delay(idx * 100)}
              style={styles.tripCardContainer}
            >
              <View style={styles.tripCard}>
                <View style={styles.cardHeader}>
                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <Ionicons name="location" size={18} color="#1b4332" />
                    <Text style={styles.tripTitle}>{trip.destination}</Text>
                  </View>
                  <View style={styles.cardActions}>
                    <Pressable onPress={() => handleEditTrip(trip)} style={styles.actionBtn}>
                      <Ionicons name="create-outline" size={18} color="#64748b" />
                    </Pressable>
                    <Pressable onPress={() => handleDeleteTrip(trip.id)} style={styles.actionBtn}>
                      <Ionicons name="trash-outline" size={18} color="#64748b" />
                    </Pressable>
                  </View>
                </View>

                <View style={styles.cardBody}>
                  <Text style={styles.tripDesc}>{trip.description}</Text>
                  <View style={styles.dateRow}>
                     <Ionicons name="calendar-outline" size={14} color="#64748b" />
                     <Text style={styles.dateText}>
                       {format(new Date(trip.startDate), 'MMM d, yyyy')} – {format(new Date(trip.endDate), 'MMM d, yyyy')}
                     </Text>
                  </View>
                </View>

                <View style={styles.cardFooter}>
                  <View style={[styles.statusPill, { backgroundColor: getStatusColor(trip.status) }]}>
                    <Text style={[styles.statusText, { color: getStatusTextColor(trip.status) }]}>{trip.status}</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={16} color="#cbd5e1" />
                </View>
              </View>
            </Animated.View>
          ))
        )}
      </ScrollView>

      {/* FAB - Menu */}
      <Pressable style={styles.fabMenu} onPress={() => navigation.dispatch(DrawerActions.openDrawer())}>
        <Ionicons name="menu" size={24} color="#fff" />
      </Pressable>

      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
             <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>{editingTrip ? 'Edit Trip' : 'New Trip'}</Text>
                <Pressable onPress={() => setModalVisible(false)}>
                  <Ionicons name="close" size={24} color="#64748b" />
                </Pressable>
             </View>

             <ScrollView showsVerticalScrollIndicator={false}>
               <Text style={styles.inputLabel}>Destination *</Text>
               <TextInput 
                  style={styles.input}
                  placeholder="Where are you going?"
                  value={destination}
                  onChangeText={setDestination}
               />

               <Text style={styles.inputLabel}>Description</Text>
               <TextInput 
                  style={[styles.input, styles.textArea]}
                  placeholder="Trip notes..."
                  value={description}
                  onChangeText={setDescription}
                  multiline
               />

               <Text style={styles.inputLabel}>Status</Text>
               <Pressable style={styles.dropdownFake}>
                 <Text style={styles.dropdownText}>{status}</Text>
                 <Ionicons name="chevron-down" size={20} color="#64748b" />
               </Pressable>

               <View style={styles.dateInputsRow}>
                  <View style={{ flex: 1, marginRight: 8 }}>
                    <Text style={styles.inputLabel}>Start Date</Text>
                    <View style={styles.inputWithIcon}>
                      <TextInput 
                        style={styles.flexInput}
                        value={startDate}
                        onChangeText={setStartDate}
                        placeholder="mm/dd/yyyy"
                      />
                      <Ionicons name="calendar-outline" size={20} color="#000" />
                    </View>
                  </View>
                  <View style={{ flex: 1, marginLeft: 8 }}>
                    <Text style={styles.inputLabel}>End Date</Text>
                    <View style={styles.inputWithIcon}>
                      <TextInput 
                        style={styles.flexInput}
                        value={endDate}
                        onChangeText={setEndDate}
                        placeholder="mm/dd/yyyy"
                      />
                      <Ionicons name="calendar-outline" size={20} color="#000" />
                    </View>
                  </View>
               </View>

               <View style={styles.modalFooter}>
                  <Pressable style={styles.cancelBtn} onPress={() => setModalVisible(false)}>
                    <Text style={styles.cancelBtnText}>Cancel</Text>
                  </Pressable>
                  <Pressable style={styles.submitBtn} onPress={handleSaveTrip}>
                    <Text style={styles.submitBtnText}>{editingTrip ? 'Save Changes' : 'Add Trip'}</Text>
                  </Pressable>
               </View>
             </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9F7F2' },
  toolbar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, borderBottomWidth: 1, borderBottomColor: '#e2e8f0' },
  tripCount: { color: '#64748b', fontWeight: '600' },
  addBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#1b4332', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 12 },
  addBtnText: { color: '#fff', fontWeight: '700', marginLeft: 6 },
  scrollContent: { padding: 16, paddingBottom: 100 },
  tripCardContainer: { marginBottom: 16 },
  tripCard: { backgroundColor: '#fff', borderRadius: 24, padding: 16, borderWidth: 1, borderColor: '#e2e8f0', borderTopWidth: 6, borderTopColor: '#a78bfa', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 10, elevation: 2 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  tripTitle: { fontSize: 18, fontWeight: '800', color: '#0f172a', marginLeft: 8 },
  cardActions: { flexDirection: 'row' },
  actionBtn: { padding: 6, marginLeft: 8 },
  cardBody: { marginBottom: 16 },
  tripDesc: { fontSize: 14, color: '#64748b', marginBottom: 8 },
  dateRow: { flexDirection: 'row', alignItems: 'center' },
  dateText: { fontSize: 13, color: '#64748b', marginLeft: 6, fontWeight: '500' },
  cardFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderTopWidth: 1, borderTopColor: '#f1f5f9', paddingTop: 12 },
  statusPill: { paddingHorizontal: 12, paddingVertical: 4, borderRadius: 12 },
  statusText: { fontSize: 12, fontWeight: '700' },
  emptyState: { alignItems: 'center', marginTop: 100 },
  emptyIconContainer: { width: 80, height: 80, borderRadius: 24, backgroundColor: '#1b4332', alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: '#0f172a', marginBottom: 4 },
  emptySubtitle: { fontSize: 14, color: '#64748b' },
  fabMenu: { position: 'absolute', bottom: 90, left: 16, width: 48, height: 48, borderRadius: 24, backgroundColor: '#1b4332', alignItems: 'center', justifyContent: 'center', elevation: 4 },
  
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  modalContent: { backgroundColor: '#fff', borderRadius: 32, padding: 24, width: '100%', maxWidth: 500, shadowColor: '#000', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.2, shadowRadius: 20, elevation: 10 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 },
  modalTitle: { fontSize: 20, fontWeight: '800', color: '#0f172a' },
  inputLabel: { fontSize: 13, fontWeight: '700', color: '#1e293b', marginBottom: 6 },
  input: { backgroundColor: '#fcfdfa', borderWidth: 1.5, borderColor: '#e2e8f0', borderRadius: 20, padding: 14, fontSize: 15, color: '#052b1b', marginBottom: 16 },
  textArea: { height: 80, borderRadius: 20, textAlignVertical: 'top' },
  dropdownFake: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#fcfdfa', borderWidth: 1.5, borderColor: '#e2e8f0', borderRadius: 20, padding: 14, marginBottom: 24 },
  dropdownText: { fontSize: 15, color: '#0f172a', fontWeight: '500' },
  inputWithIcon: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fcfdfa', borderWidth: 1.5, borderColor: '#e2e8f0', borderRadius: 20, paddingHorizontal: 14, paddingVertical: 4, marginBottom: 16 },
  flexInput: { flex: 1, paddingVertical: 10, fontSize: 15, color: '#0f172a' },
  dateInputsRow: { flexDirection: 'row', marginBottom: 32 },
  modalFooter: { flexDirection: 'row', justifyContent: 'flex-end', alignItems: 'center', gap: 12 },
  cancelBtn: { paddingHorizontal: 24, paddingVertical: 12, borderRadius: 16, backgroundColor: '#f3f4f6', borderWidth: 1, borderColor: '#e5e7eb' },
  cancelBtnText: { fontSize: 15, fontWeight: '700', color: '#0f172a' },
  submitBtn: { paddingHorizontal: 24, paddingVertical: 12, borderRadius: 16, backgroundColor: '#6d8a78' },
  submitBtnText: { fontSize: 15, fontWeight: '700', color: '#fff' }
});
