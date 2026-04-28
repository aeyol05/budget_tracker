import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ScrollView, Dimensions, Modal, ActivityIndicator, Platform, Animated, Vibration } from 'react-native';
import { theme } from '../../src/ui/theme';
import { useApp } from '../../src/context/AppContext';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Account } from '../../src/domain/models';

const { width, height } = Dimensions.get('window');
const CARD_WIDTH = (width - theme.spacing.md * 3) / 2;

const CONNECT_PROVIDERS = [
  { id: 'gcash', name: 'GCash', type: 'wallet', color: '#0055D3', icon: 'wallet' },
  { id: 'bpi', name: 'BPI Online', type: 'debit', color: '#E31937', icon: 'business' },
  { id: 'wise', name: 'Wise', type: 'debit', color: '#00B67A', icon: 'globe' },
  { id: 'binance', name: 'Binance', type: 'crypto', color: '#F3BA2F', icon: 'logo-bitcoin' },
  { id: 'etoro', name: 'eToro', type: 'stock', color: '#1CA4A4', icon: 'trending-up' },
];

const AccountCard = ({ account, isSorting, onLongPress, onPress, isSelected }: { 
  account: Account, 
  isSorting: boolean, 
  onLongPress: () => void,
  onPress: () => void,
  isSelected: boolean
}) => {
  const shakeAnim = React.useRef(new Animated.Value(0)).current;

  React.useEffect(() => {
    if (isSorting) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(shakeAnim, { toValue: 1, duration: 100, useNativeDriver: true }),
          Animated.timing(shakeAnim, { toValue: -1, duration: 100, useNativeDriver: true }),
          Animated.timing(shakeAnim, { toValue: 0, duration: 100, useNativeDriver: true }),
        ])
      ).start();
    } else {
      shakeAnim.setValue(0);
    }
  }, [isSorting]);

  const rotation = shakeAnim.interpolate({
    inputRange: [-1, 1],
    outputRange: ['-2deg', '2deg'],
  });

  const isCredit = account.type === 'credit';
  const progress = isCredit && account.creditLimit ? (account.usedCredit || 0) / account.creditLimit : 0;

  const getIcon = () => {
    switch (account.type) {
      case 'crypto': return 'logo-bitcoin';
      case 'stock': return 'trending-up';
      case 'credit': return 'card';
      case 'wallet': return 'wallet';
      default: return 'business';
    }
  };

  return (
    <Animated.View style={[
      styles.cardContainer, 
      { transform: [{ rotate: isSorting ? rotation : '0deg' }] }
    ]}>
      <TouchableOpacity 
        activeOpacity={0.8} 
        style={[
          styles.card, 
          { backgroundColor: account.color },
          isSelected && { borderWidth: 3, borderColor: 'white' }
        ]}
        onLongPress={onLongPress}
        onPress={onPress}
      >
        <View style={styles.cardHeader}>
          <View style={styles.iconCircle}>
            <Ionicons name={getIcon() as any} size={18} color="white" />
          </View>
          <Text style={styles.cardTitle} numberOfLines={1}>{account.name}</Text>
          {isSorting ? (
            <Ionicons name="swap-vertical" size={16} color="white" />
          ) : (
            <TouchableOpacity style={styles.moreButton}>
              <Ionicons name="ellipsis-horizontal" size={16} color="rgba(255,255,255,0.7)" />
            </TouchableOpacity>
          )}
        </View>

        <Text style={styles.subtypeText}>{account.subtype}</Text>
        {account.details && <Text style={styles.detailsText}>{account.details}</Text>}

        <View style={styles.balanceContainer}>
          <Text style={styles.balanceLabel}>BALANCE</Text>
          <Text style={styles.balanceValue}>
            {account.currency === 'PHP' ? '₱' : '$'}
            {account.balance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </Text>
        </View>

        {isCredit && (
          <View style={styles.creditInfo}>
            <View style={styles.progressBarBg}>
              <View style={[styles.progressBarFill, { width: `${progress * 100}%` }]} />
            </View>
            <View style={styles.creditStats}>
              <Text style={styles.creditPercentage}>{Math.round(progress * 100)}% used</Text>
              <Text style={styles.creditRemaining}>
                ₱{(account.creditLimit! - account.usedCredit!).toLocaleString()} left
              </Text>
            </View>
          </View>
        )}
      </TouchableOpacity>
    </Animated.View>
  );
};

export default function WalletsScreen() {
  const { accounts, reorderAccounts } = useApp();
  const [modalVisible, setModalVisible] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [selectedProvider, setSelectedProvider] = useState<any>(null);
  const [isSorting, setIsSorting] = useState(false);
  const [swapTargetId, setSwapTargetId] = useState<string | null>(null);

  const startSort = (id: string) => {
    setIsSorting(true);
    setSwapTargetId(id);
    Vibration.vibrate(50);
  };

  const handleCardPress = (id: string) => {
    if (!isSorting) return;
    
    if (swapTargetId && swapTargetId !== id) {
      // Perform SWAP
      const newAccounts = [...accounts];
      const idx1 = newAccounts.findIndex(a => a.id === swapTargetId);
      const idx2 = newAccounts.findIndex(a => a.id === id);
      
      const temp = newAccounts[idx1];
      newAccounts[idx1] = newAccounts[idx2];
      newAccounts[idx2] = temp;
      
      reorderAccounts(newAccounts);
      setSwapTargetId(null);
    } else {
      setSwapTargetId(id);
    }
  };

  const handleConnect = (provider: any) => {
    setSelectedProvider(provider);
    setConnecting(true);
    // Mock connection delay
    setTimeout(() => {
      setConnecting(false);
      setModalVisible(false);
      setSelectedProvider(null);
    }, 2000);
  };

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={[theme.colors.background, '#1e1b4b']}
        style={StyleSheet.absoluteFill}
      />
      
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>{isSorting ? 'Sorting Accounts' : 'Wallets'}</Text>
          <Text style={styles.headerSubtitle}>
            {isSorting ? 'Tap another card to swap positions' : 'Manage your connected accounts'}
          </Text>
        </View>
        <TouchableOpacity 
          style={[styles.addButton, isSorting && { backgroundColor: theme.colors.success }]}
          onPress={() => isSorting ? setIsSorting(false) : setModalVisible(true)}
        >
          <Ionicons name={isSorting ? "checkmark-outline" : "add"} size={isSorting ? 28 : 24} color="white" />
        </TouchableOpacity>
      </View>

      <FlatList
        data={accounts}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <AccountCard 
            account={item} 
            isSorting={isSorting}
            onLongPress={() => startSort(item.id)}
            onPress={() => handleCardPress(item.id)}
            isSelected={swapTargetId === item.id}
          />
        )}
        numColumns={2}
        contentContainerStyle={styles.listContent}
        columnWrapperStyle={styles.columnWrapper}
        ListHeaderComponent={() => (
          <View style={styles.instructions}>
            <Text style={styles.instructionText}>
              {isSorting ? "Long press again or tap '✓' to save." : "Press and hold an account card to rearrange it."}
            </Text>
          </View>
        )}
      />

      <View style={styles.badgeContainer}>
        <View style={styles.currencyBadge}>
          <Ionicons name="swap-horizontal" size={14} color="white" />
          <Text style={styles.badgeText}>Supports multiple currencies</Text>
        </View>
      </View>

      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Connect Account</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <Ionicons name="close" size={24} color="white" />
              </TouchableOpacity>
            </View>
            
            {connecting ? (
              <View style={styles.connectingContainer}>
                <ActivityIndicator size="large" color={theme.colors.primary} />
                <Text style={styles.connectingText}>Connecting to {selectedProvider?.name}...</Text>
                <Text style={styles.connectingSubtext}>This will only take a moment</Text>
              </View>
            ) : (
              <ScrollView style={styles.providersList}>
                <Text style={styles.sectionTitle}>Popular Providers</Text>
                {CONNECT_PROVIDERS.map((provider) => (
                  <TouchableOpacity 
                    key={provider.id} 
                    style={styles.providerItem}
                    onPress={() => handleConnect(provider)}
                  >
                    <View style={[styles.providerIcon, { backgroundColor: provider.color }]}>
                      <Ionicons name={provider.icon as any} size={20} color="white" />
                    </View>
                    <View style={styles.providerInfo}>
                      <Text style={styles.providerName}>{provider.name}</Text>
                      <Text style={styles.providerType}>{provider.type.toUpperCase()}</Text>
                    </View>
                    <Ionicons name="chevron-forward" size={20} color={theme.colors.slate500} />
                  </TouchableOpacity>
                ))}
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
    paddingTop: Platform.OS === 'ios' ? 60 : 40,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.md,
    marginBottom: theme.spacing.lg,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: 'white',
    letterSpacing: -0.5,
  },
  headerSubtitle: {
    fontSize: 14,
    color: theme.colors.slate400,
  },
  addButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: theme.colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: theme.colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  listContent: {
    paddingHorizontal: theme.spacing.md,
    paddingBottom: 120,
  },
  columnWrapper: {
    justifyContent: 'space-between',
    marginBottom: theme.spacing.md,
  },
  instructions: {
    marginBottom: theme.spacing.md,
    opacity: 0.6,
  },
  instructionText: {
    color: 'white',
    fontSize: 12,
  },
  cardContainer: {
    width: CARD_WIDTH,
  },
  card: {
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.md,
    height: 180,
    justifyContent: 'space-between',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.2,
    shadowRadius: 15,
    elevation: 10,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  cardTitle: {
    color: 'white',
    fontWeight: '700',
    fontSize: 15,
    flex: 1,
  },
  moreButton: {
    padding: 4,
  },
  subtypeText: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 11,
    marginTop: 2,
  },
  detailsText: {
    color: 'rgba(255,255,255,0.9)',
    fontSize: 10,
    fontWeight: '600',
    marginTop: 2,
  },
  balanceContainer: {
    marginTop: 'auto',
  },
  balanceLabel: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 1,
  },
  balanceValue: {
    color: 'white',
    fontSize: 18,
    fontWeight: '800',
    marginTop: 2,
  },
  creditInfo: {
    marginTop: 8,
  },
  progressBarBg: {
    height: 4,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: 'white',
  },
  creditStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  creditPercentage: {
    color: 'white',
    fontSize: 9,
    fontWeight: '600',
  },
  creditRemaining: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 9,
    fontWeight: '600',
  },
  badgeContainer: {
    position: 'absolute',
    bottom: 110,
    right: 20,
    alignItems: 'flex-end',
  },
  currencyBadge: {
    backgroundColor: '#6b7280',
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  badgeText: {
    color: 'white',
    fontSize: 11,
    fontWeight: '600',
    marginLeft: 6,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: theme.colors.slate900,
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    padding: theme.spacing.lg,
    height: height * 0.7,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.xl,
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: 'white',
  },
  connectingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  connectingText: {
    color: 'white',
    fontSize: 18,
    fontWeight: '700',
    marginTop: 20,
  },
  connectingSubtext: {
    color: theme.colors.slate400,
    fontSize: 14,
    marginTop: 8,
  },
  providersList: {
    flex: 1,
  },
  sectionTitle: {
    color: theme.colors.slate500,
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 1,
    textTransform: 'uppercase',
    marginBottom: 16,
  },
  providerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.05)',
  },
  providerIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  providerInfo: {
    flex: 1,
  },
  providerName: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  providerType: {
    color: theme.colors.slate500,
    fontSize: 10,
    fontWeight: '700',
    marginTop: 2,
  },
});
