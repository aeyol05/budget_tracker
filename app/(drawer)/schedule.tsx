import React, { useState, useCallback, useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, TextInput, Modal, ActivityIndicator, Dimensions, Platform, Alert } from 'react-native';
import { theme } from '../../src/ui/theme';
import { Header } from '../../src/ui/components/Header';
import { Ionicons } from '@expo/vector-icons';
import { StorageClient } from '../../src/data/storage';
import { ScheduleEvent } from '../../src/domain/models';
import { AIEngine } from '../../src/domain/AIEngine';
import { NotificationService } from '../../src/services/NotificationService';
import { useFocusEffect, useLocalSearchParams } from 'expo-router';
import Animated, { FadeInDown, FadeInUp, SlideInUp, FadeOutDown } from 'react-native-reanimated';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, addMonths, subMonths, startOfWeek, endOfWeek, isSameWeek } from 'date-fns';

const { width } = Dimensions.get('window');

type ViewType = 'Month' | 'Week' | 'Day' | 'Agenda';

export default function ScheduleScreen() {
  const { openAdd } = useLocalSearchParams();
  const [viewType, setViewType] = useState<ViewType>('Month');
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [events, setEvents] = useState<ScheduleEvent[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Smart Compose State
  const [smartComposeVisible, setSmartComposeVisible] = useState(false);
  const [inputText, setInputText] = useState('');
  const [parsing, setParsing] = useState(false);
  const [suggestedEvent, setSuggestedEvent] = useState<Partial<ScheduleEvent> | null>(null);

  const loadData = async () => {
    setLoading(true);
    const evs = await StorageClient.getEvents();
    setEvents(evs);
    setLoading(false);
  };

  useFocusEffect(
    useCallback(() => {
      loadData();
      if (openAdd === 'true') {
        setSmartComposeVisible(true);
      }
    }, [openAdd])
  );

  const lastTapRef = useRef<number>(0);

  const handleDayPress = (day: Date) => {
    const now = Date.now();
    const DOUBLE_TAP_DELAY = 300;
    
    if (lastTapRef.current && (now - lastTapRef.current) < DOUBLE_TAP_DELAY) {
      setSelectedDate(day);
      setSmartComposeVisible(true);
    } else {
      setSelectedDate(day);
      setViewType('Day');
    }
    lastTapRef.current = now;
  };

  const handleInput = async (text: string) => {
    setInputText(text);
    if (text.length > 2) {
      setParsing(true);
      const parsed = await AIEngine.parseScheduleEntry(text);
      if (parsed) {
         parsed.date = parsed.date || selectedDate.toISOString();
      }
      setSuggestedEvent(parsed);
      setParsing(false);
    } else {
      setSuggestedEvent(null);
    }
  };

  const handleEditEvent = (event: ScheduleEvent) => {
    setInputText(`Edit: ${event.title} on ${format(new Date(event.date), 'MMM dd')} at ${event.startTime}`);
    setSuggestedEvent(event);
    setSmartComposeVisible(true);
  };

  const handleDeleteEvent = (id: string) => {
    const doDelete = async () => {
      await StorageClient.deleteEvent(id);
      loadData();
    };
    if (Platform.OS === 'web') {
      if (window.confirm("Delete this event?")) doDelete();
    } else {
      Alert.alert("Confirm Delete", "Delete this event?", [
        {text: "Cancel", style: "cancel"},
        {text: "Delete", style: "destructive", onPress: doDelete}
      ]);
    }
  };

  const handleAddEvent = async () => {
    if (suggestedEvent && suggestedEvent.title) {
      const newEvent: ScheduleEvent = {
        id: suggestedEvent.id || Math.random().toString(),
        title: suggestedEvent.title,
        date: suggestedEvent.date || selectedDate.toISOString(),
        startTime: suggestedEvent.startTime || '09:00',
        endTime: suggestedEvent.endTime || '10:00',
        category: suggestedEvent.category || 'Personal',
        attendees: suggestedEvent.attendees,
        location: suggestedEvent.location,
      };
      await StorageClient.saveEvent(newEvent);
      
      await NotificationService.scheduleEventReminder(
        newEvent.title,
        newEvent.date,
        newEvent.startTime
      );

      await loadData();
      setSmartComposeVisible(false);
      setInputText('');
      setSuggestedEvent(null);
    }
  };

  const renderMonthView = () => {
    const start = startOfMonth(currentDate);
    const end = endOfMonth(currentDate);
    const days = eachDayOfInterval({ 
      start: startOfWeek(start, { weekStartsOn: 1 }), 
      end: endOfWeek(end, { weekStartsOn: 1 }) 
    });

    return (
      <View style={styles.calendarContainer}>
        <View style={styles.calendarHeader}>
           <Pressable onPress={() => setCurrentDate(subMonths(currentDate, 1))}>
              <Ionicons name="chevron-back" size={20} color="#1b4332" />
           </Pressable>
           <Text style={styles.monthTitle}>{format(currentDate, 'MMMM yyyy')}</Text>
           <Pressable onPress={() => setCurrentDate(addMonths(currentDate, 1))}>
              <Ionicons name="chevron-forward" size={20} color="#1b4332" />
           </Pressable>
        </View>

        <View style={styles.weekLabels}>
          {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((d, i) => (
            <Text key={i} style={styles.weekDayLabel}>{d}</Text>
          ))}
        </View>

        <View style={styles.daysGrid}>
          {days.map((day, i) => {
            const isCurrentMonth = isSameDay(startOfMonth(day), startOfMonth(currentDate));
            const dayEvents = events.filter(e => isSameDay(new Date(e.date), day));
            const isSelected = isSameDay(day, selectedDate);

            return (
              <Pressable key={i} style={styles.dayCell} onPress={() => handleDayPress(day)}>
                <View style={[
                  styles.dayNumberContainer, 
                  isSelected && styles.selectedDay
                ]}>
                  <Text style={[
                    styles.dayText, 
                    !isCurrentMonth && styles.otherMonthDay,
                    isSelected && styles.selectedDayText
                  ]}>
                    {format(day, 'd')}
                  </Text>
                  {dayEvents.length > 0 && <View style={styles.eventDot} />}
                </View>
              </Pressable>
            );
          })}
        </View>
      </View>
    );
  };

  const EventItem = ({ event }: { event: ScheduleEvent }) => (
    <Pressable style={styles.eventCard} onPress={() => handleEditEvent(event)}>
      <View style={[styles.eventBorder, { backgroundColor: event.category === 'Work' ? '#818cf8' : '#fb923c' }]} />
      <View style={styles.eventInfo}>
         <Text style={styles.eventTitle}>{event.title}</Text>
         <Text style={styles.eventTime}>{event.startTime} – {event.endTime}</Text>
         {event.location && (
           <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 4 }}>
             <Ionicons name="location-outline" size={12} color="#64748b" />
             <Text style={{ fontSize: 11, color: '#64748b', marginLeft: 4 }}>{event.location}</Text>
           </View>
         )}
      </View>
      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
        <View style={[styles.catPill, { backgroundColor: event.category === 'Work' ? '#e0e7ff' : '#ffedd5', marginRight: 8 }]}>
           <Text style={[styles.catPillText, { color: event.category === 'Work' ? '#4338ca' : '#9a3412' }]}>{event.category.toUpperCase()}</Text>
        </View>
        <Pressable onPress={() => handleDeleteEvent(event.id)} style={{ padding: 4 }}>
           <Ionicons name="trash-outline" size={18} color="#64748b" />
        </Pressable>
      </View>
    </Pressable>
  );


  const renderAgenda = () => {
    const dayEvents = events.filter(e => isSameDay(new Date(e.date), selectedDate));
    
    return (
      <ScrollView contentContainerStyle={styles.agendaScroll}>
        <View style={styles.agendaHighlight}>
           <Ionicons name="sparkles-outline" size={18} color="#64748b" style={{ marginRight: 10 }} />
           <Text style={styles.highlightText}>
             Today's highlight is a 60-minute meeting at noon, a great opportunity to connect.
           </Text>
        </View>

        <Text style={styles.sectionTitle}>{isSameDay(selectedDate, new Date()) ? 'Today' : format(selectedDate, 'MMMM dd')}</Text>
        {dayEvents.length === 0 ? (
          <View style={styles.emptyAgenda}>
             <Text style={styles.emptyText}>No events scheduled for this day</Text>
          </View>
        ) : (
          dayEvents.map(event => <EventItem key={event.id} event={event} />)
        )}

        {isSameDay(selectedDate, new Date()) && (
          <>
            <Text style={[styles.sectionTitle, { marginTop: 20 }]}>Tomorrow</Text>
            {events.filter(e => isSameDay(new Date(e.date), new Date(Date.now() + 86400000))).map(event => (
              <EventItem key={event.id} event={event} />
            ))}
          </>
        )}
      </ScrollView>
    );
  };

  const renderDayView = () => (
    <ScrollView contentContainerStyle={styles.agendaScroll}>
      <View style={styles.dayHeaderLarge}>
         <Text style={styles.dayNumLarge}>{format(selectedDate, 'dd')}</Text>
         <Text style={styles.dayNameLarge}>{format(selectedDate, 'EEEE')}</Text>
      </View>
      <View style={styles.timeline}>
         {events.filter(e => isSameDay(new Date(e.date), selectedDate)).map(event => (
           <EventItem key={event.id} event={event} />
         ))}
      </View>
    </ScrollView>
  );

  const renderWeekView = () => {
    const start = startOfWeek(selectedDate, { weekStartsOn: 1 });
    const weekDays = eachDayOfInterval({ start, end: endOfWeek(start, { weekStartsOn: 1 }) });

    return (
      <ScrollView contentContainerStyle={styles.agendaScroll}>
        {weekDays.map(day => {
          const dayEvents = events.filter(e => isSameDay(new Date(e.date), day));
          return (
            <View key={day.toISOString()} style={{ marginBottom: 20 }}>
               <Text style={[styles.weekDayTitle, isSameDay(day, new Date()) && { color: '#8b5e3c' }]}>
                 {format(day, 'EEEE, MMM dd')}
               </Text>
               {dayEvents.length === 0 ? (
                 <Text style={styles.emptyWeekDay}>No events</Text>
               ) : (
                 dayEvents.map(event => <EventItem key={event.id} event={event} />)
               )}
            </View>
          );
        })}
      </ScrollView>
    );
  };

  return (
    <View style={styles.container}>
      <Header title={viewType === 'Agenda' ? "Up Next" : "Schedule"} subtitle="Your personal timeline" icon="calendar" iconColor="#8b5e3c" />
      
      <View style={styles.viewTabs}>
         {(['Month', 'Week', 'Day', 'Agenda'] as ViewType[]).map(tab => (
           <Pressable 
             key={tab} 
             style={[styles.tab, viewType === tab && styles.activeTab]}
             onPress={() => setViewType(tab)}
           >
             <Ionicons 
               name={tab === 'Month' ? 'grid-outline' : tab === 'Week' ? 'calendar-outline' : tab === 'Day' ? 'calendar-number-outline' : 'list-outline'} 
               size={16} 
               color={viewType === tab ? '#fff' : '#64748b'} 
             />
             <Text style={[styles.tabText, viewType === tab && styles.activeTabText]}>{tab}</Text>
           </Pressable>
         ))}
      </View>

      {viewType === 'Month' ? renderMonthView() : 
       viewType === 'Week' ? renderWeekView() : 
       viewType === 'Day' ? renderDayView() : 
       renderAgenda()}

      {/* Floating Add Button */}
      <Pressable style={styles.fab} onPress={() => setSmartComposeVisible(true)}>
         <Ionicons name="add" size={28} color="#fff" />
      </Pressable>

      <Modal
        animationType="slide"
        transparent={true}
        visible={smartComposeVisible}
        onRequestClose={() => setSmartComposeVisible(false)}
      >
        <View style={styles.modalOverlay}>
           <Animated.View entering={SlideInUp} style={styles.modalContent}>
              <View style={styles.modalHeader}>
                 <Ionicons name="add" size={20} color="#8b5e3c" />
                 <Text style={styles.modalTitle}>Smart compose</Text>
              </View>
              <Text style={styles.modalSub}>Describe the event in plain words. Capi reads dates, times, place, attendees, and category.</Text>

              <View style={styles.inputBox}>
                 <TextInput 
                   style={styles.modalInput}
                   placeholder="e.g. Lunch with Sarah at 12pm tomorrow"
                   placeholderTextColor="#94a3b8"
                   value={inputText}
                   onChangeText={handleInput}
                   multiline
                   autoFocus
                 />
                 <Text style={styles.inputTip}>Try: deep work fri 9am for 2 hours</Text>
              </View>

              {suggestedEvent && (
                <Animated.View entering={FadeInUp} style={styles.refiningBox}>
                   <View style={styles.refiningHeader}>
                      <Ionicons name="git-branch-outline" size={14} color="#64748b" />
                      <Text style={styles.refiningTitle}>REFINING...</Text>
                   </View>
                   <Text style={styles.parsedTitle}>{suggestedEvent.title}</Text>
                   <Text style={styles.parsedDetails}>{format(new Date(suggestedEvent.date!), 'EEE, MMM dd')} • all day</Text>
                   {suggestedEvent.attendees && suggestedEvent.attendees.length > 0 && (
                     <Text style={styles.parsedDetails}>with {suggestedEvent.attendees.join(', ')}</Text>
                   )}
                   {suggestedEvent.location && (
                     <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 2 }}>
                        <Ionicons name="location-outline" size={12} color="#64748b" />
                        <Text style={styles.parsedDetails}> at {suggestedEvent.location}</Text>
                     </View>
                   )}
                   <View style={styles.parsedCat}>
                      <Ionicons name="person-outline" size={12} color="#8b5e3c" />
                      <Text style={styles.parsedCatText}>{suggestedEvent.category?.toUpperCase()}</Text>
                   </View>
                </Animated.View>
              )}

              <View style={styles.modalActions}>
                 <Pressable style={styles.cancelBtn} onPress={() => setSmartComposeVisible(false)}>
                    <Text style={styles.cancelText}>Cancel</Text>
                 </Pressable>
                 <Pressable 
                   style={[styles.addBtn, !suggestedEvent && { opacity: 0.5 }]} 
                   onPress={handleAddEvent}
                   disabled={!suggestedEvent}
                 >
                    <Text style={styles.addBtnText}>Add to calendar</Text>
                 </Pressable>
              </View>
           </Animated.View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fdfbfa' },
  viewTabs: { flexDirection: 'row', padding: 16, gap: 8 },
  tab: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20, backgroundColor: '#f1f5f9' },
  activeTab: { backgroundColor: '#8b5e3c' },
  tabText: { marginLeft: 6, fontSize: 13, fontWeight: '700', color: '#64748b' },
  activeTabText: { color: '#fff' },
  calendarContainer: { padding: 16 },
  calendarHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  monthTitle: { fontSize: 18, fontWeight: '900', color: '#1b4332' },
  weekLabels: { flexDirection: 'row', marginBottom: 10 },
  weekDayLabel: { flex: 1, textAlign: 'center', color: '#64748b', fontSize: 12, fontWeight: '800' },
  daysGrid: { flexDirection: 'row', flexWrap: 'wrap' },
  dayCell: { width: (width - 32) / 7, height: 60, alignItems: 'center', justifyContent: 'center' },
  dayNumberContainer: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center', borderRadius: 10 },
  selectedDay: { backgroundColor: '#8b5e3c15', borderWidth: 1, borderColor: '#8b5e3c' },
  dayText: { fontSize: 14, fontWeight: '700', color: '#0f172a' },
  otherMonthDay: { color: '#cbd5e1' },
  selectedDayText: { color: '#8b5e3c' },
  eventDot: { width: 4, height: 4, borderRadius: 2, backgroundColor: '#8b5e3c', position: 'absolute', bottom: 4 },
  agendaScroll: { padding: 16, paddingBottom: 100 },
  agendaHighlight: { flexDirection: 'row', padding: 16, backgroundColor: '#f1f5f9', borderRadius: 24, marginBottom: 24 },
  highlightText: { flex: 1, fontSize: 13, lineHeight: 18, color: '#64748b', fontWeight: '500' },
  sectionTitle: { fontSize: 20, fontWeight: '900', color: '#1b4332', marginBottom: 16, marginTop: 10 },
  eventCard: { flexDirection: 'row', alignItems: 'center', padding: 16, backgroundColor: '#fff', borderRadius: 24, marginBottom: 12, borderWidth: 1, borderColor: '#f1f5f9' },
  eventBorder: { width: 3, height: 32, borderRadius: 2, marginRight: 16 },
  eventInfo: { flex: 1 },
  eventTitle: { fontSize: 16, fontWeight: '800', color: '#0f172a' },
  eventTime: { fontSize: 13, color: '#64748b', marginTop: 2, fontWeight: '600' },
  catPill: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  catPillText: { fontSize: 10, fontWeight: '900' },
  emptyAgenda: { padding: 40, alignItems: 'center' },
  emptyText: { color: '#94a3b8', fontSize: 14, fontWeight: '600' },
  dayHeaderLarge: { paddingVertical: 20, alignItems: 'center', backgroundColor: '#f1f5f9', borderRadius: 32, marginBottom: 24 },
  dayNumLarge: { fontSize: 48, fontWeight: '900', color: '#1b4332' },
  dayNameLarge: { fontSize: 18, color: '#64748b', fontWeight: '700' },
  timeline: { paddingLeft: 8 },
  weekDayTitle: { fontSize: 13, fontWeight: '900', color: '#64748b', marginBottom: 12, textTransform: 'uppercase', letterSpacing: 1 },
  emptyWeekDay: { fontSize: 12, color: '#cbd5e1', marginBottom: 20, fontStyle: 'italic' },
  fab: { position: 'absolute', bottom: 30, right: 24, width: 56, height: 56, borderRadius: 28, backgroundColor: '#8b5e3c', alignItems: 'center', justifyContent: 'center', elevation: 5 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-start', paddingTop: 80 },
  modalContent: { margin: 16, backgroundColor: '#fff', borderRadius: 32, padding: 24, shadowColor: '#000', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.1, shadowRadius: 20 },
  modalHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  modalTitle: { fontSize: 20, fontWeight: '900', color: '#0f172a', marginLeft: 8 },
  modalSub: { fontSize: 13, color: '#64748b', lineHeight: 18, marginBottom: 20 },
  inputBox: { backgroundColor: '#fcfaf8', borderRadius: 24, padding: 16, borderWidth: 1, borderColor: '#f1f5f9', marginBottom: 16 },
  modalInput: { fontSize: 16, fontWeight: '600', color: '#1b4332', minHeight: 60, textAlignVertical: 'top' },
  inputTip: { fontSize: 11, color: '#94a3b8', marginTop: 10, fontWeight: '600' },
  refiningBox: { backgroundColor: '#f1f5f9', borderRadius: 24, padding: 16, marginBottom: 24 },
  refiningHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  refiningTitle: { fontSize: 10, color: '#64748b', fontWeight: '900', letterSpacing: 1, marginLeft: 6 },
  parsedTitle: { fontSize: 18, fontWeight: '900', color: '#0f172a', marginBottom: 4 },
  parsedDetails: { fontSize: 13, color: '#64748b', fontWeight: '600', marginBottom: 2 },
  parsedCat: { flexDirection: 'row', alignItems: 'center', marginTop: 10, alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, backgroundColor: '#fff' },
  parsedCatText: { fontSize: 9, fontWeight: '900', color: '#8b5e3c', marginLeft: 4 },
  modalActions: { flexDirection: 'row', gap: 12 },
  cancelBtn: { flex: 1, paddingVertical: 14, alignItems: 'center', borderRadius: 16, backgroundColor: '#f1f5f9' },
  cancelText: { fontSize: 15, fontWeight: '800', color: '#64748b' },
  addBtn: { flex: 2, paddingVertical: 14, alignItems: 'center', borderRadius: 16, backgroundColor: '#8b5e3c' },
  addBtnText: { fontSize: 15, fontWeight: '800', color: '#fff' }
});
