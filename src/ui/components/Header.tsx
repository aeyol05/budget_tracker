import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useNavigation } from 'expo-router';
import { DrawerActions } from '@react-navigation/native';
import { theme } from '../theme';

interface HeaderProps {
  title: string;
  subtitle?: string;
  icon?: keyof typeof Ionicons.glyphMap;
  iconColor?: string;
  showBackButton?: boolean;
}

export const Header: React.FC<HeaderProps> = ({ 
  title, 
  subtitle, 
  icon, 
  iconColor = '#1b4332',
  showBackButton = false 
}) => {
  const navigation = useNavigation<any>();

  return (
    <View style={styles.header}>
      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
        {showBackButton ? (
          <Pressable onPress={() => navigation.goBack()} style={{ padding: 8, marginLeft: -8 }}>
            <Ionicons name="arrow-back" size={24} color="#0f172a" />
          </Pressable>
        ) : (
          <Pressable onPress={() => navigation.dispatch(DrawerActions.openDrawer())} style={{ padding: 8, marginLeft: -8 }}>
            <Ionicons name="menu" size={24} color="#0f172a" />
          </Pressable>
        )}
        
        <View style={{ marginLeft: 12, flexDirection: 'row', alignItems: 'center' }}>
          {icon && (
            <View style={[styles.headerIconContainer, { backgroundColor: iconColor }]}>
              <Ionicons name={icon} size={18} color="#fff" />
            </View>
          )}
          <View style={{ marginLeft: icon ? 10 : 0 }}>
            <Text style={styles.headerTitle}>{title}</Text>
            {subtitle && <Text style={styles.headerSubtitle}>{subtitle}</Text>}
          </View>
        </View>
      </View>
      <Image 
        source={require('../../../assets/images/capy_vault_logo.png')} 
        style={styles.logo} 
        contentFit="contain"
      />
    </View>
  );
};

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 48,
    paddingBottom: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  headerIconContainer: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1b4332',
  },
  headerSubtitle: {
    fontSize: 12,
    color: '#64748b',
  },
  logo: {
    width: 60,
    height: 60,
  },
});
