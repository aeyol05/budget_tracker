import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TextInput, Pressable, ScrollView, Alert, ActivityIndicator, TouchableOpacity, Platform } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { theme } from '../src/ui/theme';
import { StorageClient } from '../src/data/storage';
import { Category, TransactionType } from '../src/domain/models';
import { AIEngine } from '../src/domain/AIEngine';
import { Ionicons } from '@expo/vector-icons';
import { GlassContainer } from '../src/ui/components/GlassContainer';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { useApp } from '../src/context/AppContext';
import { CameraView, useCameraPermissions } from 'expo-camera';

// Conditional import for voice as it might not be supported on all web browsers
let useSpeechRecognitionEvent: any = null;
if (Platform.OS !== 'web') {
  try {
    useSpeechRecognitionEvent = require('expo-speech-recognition').useSpeechRecognitionEvent;
  } catch (e) {}
}

export default function AddTransactionScreen() {
  const cameraRef = React.useRef<any>(null);
  const recognitionRef = React.useRef<any>(null);
  const { settings } = useApp();
  const params = useLocalSearchParams();
  const [mode, setMode] = useState(params.mode || 'manual'); // 'manual', 'scan', 'voice'
  const [categories, setCategories] = useState<Category[]>([]);
  
  const [amount, setAmount] = useState('');
  const [type, setType] = useState<TransactionType>('expense');
  const [categoryId, setCategoryId] = useState('');
  const [merchant, setMerchant] = useState('');
  const [notes, setNotes] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<string>('Card');

  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    const init = async () => {
      const cats = await StorageClient.getCategories();
      setCategories(cats);
      
      if (params.editId) {
        const txns = await StorageClient.getTransactions();
        const existing = txns.find(t => t.id === params.editId);
        if (existing) {
          setAmount(existing.amount.toString());
          setType(existing.type);
          setCategoryId(existing.categoryId);
          setMerchant(existing.merchant || '');
          setNotes(existing.notes || '');
          setPaymentMethod(existing.paymentMethod || 'Card');
        }
      } else if (cats.length > 0) {
        setCategoryId(cats[0].id);
      }
    };
    init();
  }, [params.editId]);

  const handleMerchantChange = async (text: string) => {
    setMerchant(text);
    if (text.length > 2) {
      const txns = await StorageClient.getTransactions();
      const past = txns.find(t => t.merchant?.toLowerCase() === text.toLowerCase());
      if (past) {
        setCategoryId(past.categoryId);
        setType(past.type);
      }
    }
  };

  const simulateOCR = async () => {
    setIsProcessing(true);
    // Simulated delay
    setTimeout(async () => {
      const result = await AIEngine.categorizeOCR("Starbucks Coffee $15.00", categories);
      setAmount(result.amount.toString());
      setCategoryId(result.categoryId);
      setMerchant(result.merchant);
      setIsProcessing(false);
      setMode('manual');
    }, 1500);
  };

  const simulateVoiceTimer = async () => {
    setIsProcessing(true);
    setTimeout(async () => {
      const result = await AIEngine.parseVoiceEntry("I spent 150 pesos on food at Jollibee", categories);
      if (result.amount) setAmount(result.amount.toString());
      if (result.categoryId) setCategoryId(result.categoryId);
      if (result.merchant) setMerchant(result.merchant);
      setIsProcessing(false);
      setMode('manual');
    }, 2000);
  };

  const handleSave = async () => {
    if (!amount || isNaN(Number(amount))) {
      Alert.alert("Invalid input", "Please enter a valid amount");
      return;
    }
    
    await StorageClient.saveTransaction({
      id: params.editId as string,
      amount: Number(amount),
      categoryId,
      notes,
      merchant,
      date: new Date().toISOString(),
      type,
      paymentMethod: paymentMethod as any
    });
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    router.back();
  };

  const curSymbol = settings.currency === 'PHP' ? '₱' : settings.currency === 'USD' ? '$' : '€';
  const isDark = settings.darkMode;
  const bgColor = isDark ? theme.colors.background : '#f8fafc';
  const txtColor = isDark ? '#fff' : '#0f172a';

  const [permission, requestPermission] = useCameraPermissions();
  const [isListening, setIsListening] = useState(false);

  // Initialize Web Speech Recognition
  useEffect(() => {
    if (Platform.OS === 'web' && 'webkitSpeechRecognition' in window) {
      const SpeechRecognition = (window as any).webkitSpeechRecognition;
      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.lang = 'en-US';

      recognition.onresult = (event: any) => {
        const text = event.results[0][0].transcript;
        handleVoiceResult(text);
      };

      recognition.onend = () => setIsListening(false);
      recognitionRef.current = recognition;
    }
  }, []);

  const startListening = () => {
    if (Platform.OS === 'web') {
      if (recognitionRef.current) {
        setIsListening(true);
        recognitionRef.current.start();
      } else {
        Alert.alert("Web Speech API not supported in this browser.");
      }
    } else {
      setIsListening(true);
      // For Native, we rely on expo-speech-recognition
      // (Implementation depends on the specific hook/service)
      setTimeout(() => {
        setIsListening(false);
        handleVoiceResult("Milktea 250"); // Fallback for native simulation if not on device
      }, 3000);
    }
  };

  const handleVoiceResult = async (text: string) => {
    const res = await AIEngine.parseVoiceEntry(text, categories);
    if (res.amount) setAmount(res.amount.toString());
    if (res.categoryId) setCategoryId(res.categoryId);
    if (res.merchant) setMerchant(res.merchant);
    setMode('manual');
  };

  const takePicture = async () => {
    if (cameraRef.current) {
      setIsProcessing(true);
      try {
        const photo = await cameraRef.current.takePictureAsync({
          quality: 0.8,
          base64: true,
        });
        
        // Simulating the AI analyzing the actual image
        setTimeout(async () => {
           // We 'hallucinate' a generic receipt extraction
           const ocrResult = await AIEngine.categorizeOCR("Receipt: Starbucks $12", categories);
           setAmount(ocrResult.amount.toString());
           setCategoryId(ocrResult.categoryId);
           setMerchant(ocrResult.merchant);
           setIsProcessing(false);
           setMode('manual');
        }, 2000);
      } catch (err) {
        setIsProcessing(false);
        console.error("Camera error:", err);
        Alert.alert("Camera Error", "Make sure your browser has camera permissions allowed.");
      }
    }
  };

  if (mode === 'scan') {
    if (!permission) return <View style={styles.container}><ActivityIndicator /></View>;
    if (!permission.granted) {
      return (
        <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
          <Ionicons name="camera-outline" size={64} color={theme.colors.indigo400} />
          <Text style={{ color: 'white', textAlign: 'center', marginTop: 20, marginBottom: 20, fontSize: 16 }}>Camera access is required to scan receipts</Text>
          <TouchableOpacity style={styles.primaryBtn} onPress={requestPermission}>
            <Text style={styles.btnText}>Enable Camera</Text>
          </TouchableOpacity>
        </View>
      );
    }

    return (
      <View style={styles.cameraContainer}>
        <CameraView 
          style={styles.camera} 
          facing="back" 
          ref={cameraRef}
          onMountError={(err) => Alert.alert("Camera Mount Error", err.message)}
        >
          <View style={styles.cameraOverlay}>
            <View style={styles.scanFrame}>
               {isProcessing && <View style={styles.scanLine} />}
            </View>
            <Text style={styles.scanTip}>{isProcessing ? 'Analyzing Receipt...' : 'Center your receipt'}</Text>
            
            {!isProcessing && (
              <TouchableOpacity 
                style={styles.shutterBtn} 
                onPress={takePicture}
              >
                <View style={styles.shutterInner} />
              </TouchableOpacity>
            )}

            <TouchableOpacity style={styles.closeCamera} onPress={() => setMode('manual')}>
              <Ionicons name="close-circle" size={36} color="white" />
            </TouchableOpacity>
          </View>
        </CameraView>
        {isProcessing && (
          <View style={styles.processingOverlay}>
            <ActivityIndicator size="large" color={theme.colors.indigo400} />
            <Text style={{ color: 'white', marginTop: 15, fontWeight: '700' }}>AI EXTRACTION IN PROGRESS</Text>
          </View>
        )}
      </View>
    );
  }

  if (mode === 'voice') {
    return (
      <View style={[styles.container, { backgroundColor: bgColor, justifyContent: 'center', alignItems: 'center' }]}>
        <LinearGradient colors={theme.colors.actionVoice as any} style={styles.actionIconLg}>
          <Ionicons name="mic-outline" size={48} color="#fff" />
        </LinearGradient>
        <Text style={[styles.title, { color: txtColor }]}>{isListening ? 'Listening...' : 'Tap to Speak'}</Text>
        <Text style={[styles.subtitle, { color: theme.colors.slate400 }]}>"I spent 150 on food at Jollibee"</Text>
        <TouchableOpacity 
          style={[styles.recordBtn, isListening && styles.recordingBtn]} 
          onPress={() => isListening ? setIsListening(false) : startListening()}
        >
          <Ionicons name={isListening ? "stop" : "mic"} size={32} color="white" />
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <ScrollView style={[styles.container, { backgroundColor: bgColor }]} contentContainerStyle={{paddingBottom: 40}}>
      <Text style={[styles.label, { color: txtColor }]}>Amount</Text>
      <View style={styles.amountContainer}>
        <Text style={[styles.currency, { color: txtColor }]}>{curSymbol}</Text>
        <TextInput 
          style={[styles.amountInput, { color: txtColor }]}
          value={amount}
          onChangeText={setAmount}
          placeholder="0.00"
          placeholderTextColor="rgba(255,255,255,0.2)"
          keyboardType="numeric"
        />
      </View>

      <GlassContainer style={styles.inputContainer}>
        <Text style={[styles.label, { color: txtColor }]}>Type</Text>
        <View style={styles.typeRow}>
          <Pressable 
            style={[styles.typeBtn, type === 'expense' && {backgroundColor: theme.colors.danger}]} 
            onPress={() => setType('expense')}
          >
            <Text style={styles.typeBtnText}>Expense</Text>
          </Pressable>
          <Pressable 
            style={[styles.typeBtn, type === 'income' && {backgroundColor: theme.colors.success}]} 
            onPress={() => setType('income')}
          >
            <Text style={styles.typeBtnText}>Income</Text>
          </Pressable>
          <Pressable 
            style={[styles.typeBtn, type === 'transfer' && {backgroundColor: theme.colors.indigo400}]} 
            onPress={() => setType('transfer')}
          >
            <Text style={styles.typeBtnText}>Transfer</Text>
          </Pressable>
        </View>
      </GlassContainer>

      <Text style={[styles.label, { color: txtColor }]}>Category</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.catScroll}>
        {categories.filter(c => c.type === type).map(cat => (
          <Pressable 
            key={cat.id} 
            onPress={() => setCategoryId(cat.id)}
            style={[
              styles.catItem, 
              categoryId === cat.id && {backgroundColor: theme.colors.indigo400, borderColor: theme.colors.indigo400}
            ]}
          >
            <Ionicons name={cat.icon as any} size={18} color={categoryId === cat.id ? '#fff' : theme.colors.slate400} />
            <Text style={[styles.catText, categoryId === cat.id && {color: '#fff'}]}>{cat.name}</Text>
          </Pressable>
        ))}
      </ScrollView>

      <Text style={[styles.label, { color: txtColor }]}>Merchant</Text>
      <TextInput 
        style={[styles.input, { color: txtColor }]}
        value={merchant}
        onChangeText={handleMerchantChange}
        placeholder="Where was this?"
        placeholderTextColor="rgba(255,255,255,0.2)"
      />

      <Text style={[styles.label, { color: txtColor }]}>Payment Method</Text>
      <View style={styles.methodRow}>
        {['Cash', 'Card', 'Bank'].map(m => (
          <Pressable 
            key={m} 
            onPress={() => setPaymentMethod(m)}
            style={[styles.methodBtn, paymentMethod === m && {backgroundColor: theme.colors.primary, borderColor: theme.colors.primary}]}
          >
            <Text style={[styles.methodText, paymentMethod === m && {color: '#fff'}]}>{m}</Text>
          </Pressable>
        ))}
      </View>

      <Text style={[styles.label, { color: txtColor }]}>Notes</Text>
      <TextInput 
        style={[styles.input, { color: txtColor }]}
        value={notes}
        onChangeText={setNotes}
        placeholder="Add a remark..."
        placeholderTextColor="rgba(255,255,255,0.2)"
        multiline
      />

      <Pressable style={styles.saveBtn} onPress={handleSave}>
        <Text style={styles.saveBtnText}>Save Transaction</Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background, padding: 16 },
  title: { fontSize: 24, fontWeight: 'bold', color: theme.colors.textMain, marginTop: 20 },
  subtitle: { fontSize: 14, color: theme.colors.textMuted, marginTop: 8, marginBottom: 40 },
  primaryBtn: { backgroundColor: theme.colors.indigo400, paddingHorizontal: 30, paddingVertical: 15, borderRadius: 25 },
  btnText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  actionIconLg: { width: 100, height: 100, borderRadius: 30, alignItems: 'center', justifyContent: 'center', marginBottom: 24 },
  label: { fontSize: 14, fontWeight: '700', color: theme.colors.slate400, marginBottom: 12, marginTop: 24 },
  amountContainer: { flexDirection: 'row', alignItems: 'center', marginBottom: 24 },
  currency: { fontSize: 32, fontWeight: '800', marginRight: 8 },
  amountInput: { fontSize: 48, fontWeight: '800', flex: 1 },
  inputContainer: { padding: 16, borderRadius: 24, marginBottom: 20 },
  typeRow: { flexDirection: 'row', justifyContent: 'space-between' },
  typeBtn: { flex: 1, paddingVertical: 14, alignItems: 'center', borderRadius: 16, backgroundColor: 'rgba(255,255,255,0.05)', marginHorizontal: 4 },
  typeBtnText: { color: '#fff', fontWeight: '800' },
  catScroll: { flexDirection: 'row' },
  catItem: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 10, borderRadius: 16, backgroundColor: 'rgba(255,255,255,0.05)', marginRight: 10, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
  catText: { color: theme.colors.slate400, marginLeft: 8, fontWeight: '700' },
  methodRow: { flexDirection: 'row', marginBottom: 20 },
  methodBtn: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.05)', marginRight: 10, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
  methodText: { color: theme.colors.slate400, fontWeight: '700', fontSize: 13 },
  input: { fontSize: 18, fontWeight: '600', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.1)', marginBottom: 32 },
  saveBtn: { backgroundColor: theme.colors.indigo400, paddingVertical: 18, borderRadius: 20, alignItems: 'center', marginTop: 10 },
  saveBtnText: { color: '#fff', fontSize: 18, fontWeight: '800' },
  cameraContainer: { flex: 1, backgroundColor: 'black' },
  camera: { flex: 1 },
  cameraOverlay: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  scanFrame: { width: 280, height: 400, borderWidth: 2, borderColor: theme.colors.primary, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.05)' },
  scanTip: { color: 'white', marginTop: 20, fontWeight: '600' },
  shutterBtn: { position: 'absolute', bottom: 40, width: 70, height: 70, borderRadius: 35, borderWidth: 4, borderColor: 'white', alignItems: 'center', justifyContent: 'center' },
  shutterInner: { width: 54, height: 54, borderRadius: 27, backgroundColor: 'white' },
  processingOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.7)', alignItems: 'center', justifyContent: 'center' },
  recordBtn: { width: 80, height: 80, borderRadius: 40, backgroundColor: theme.colors.indigo400, alignItems: 'center', justifyContent: 'center', marginTop: 40 },
  recordingBtn: { backgroundColor: theme.colors.danger, transform: [{ scale: 1.1 }] },
  scanLine: { width: '100%', height: 2, backgroundColor: theme.colors.primary, position: 'absolute', top: 0, shadowColor: theme.colors.primary, shadowOpacity: 1, shadowRadius: 10, elevation: 5 },
  closeCamera: { position: 'absolute', top: 50, right: 20 },
});
