import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useNavigation } from 'expo-router';
import { DrawerActions } from '@react-navigation/native';
import { theme } from '../theme';

import { LinearGradient } from 'expo-linear-gradient';

interface HeaderProps {
  title: string;
  subtitle?: string;
  icon?: keyof typeof Ionicons.glyphMap;
  iconColor?: string;
  showBackButton?: boolean;
  gradient?: any;
}

export const Header: React.FC<HeaderProps> = ({ 
  title, 
  subtitle, 
  icon, 
  iconColor = '#1b4332',
  showBackButton = false,
  gradient = ['#ffffff', '#ffffff'] // Default to plain white
}) => {
  const navigation = useNavigation<any>();

  return (
    <LinearGradient colors={gradient} style={styles.header}>
      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
        {showBackButton ? (
          <Pressable onPress={() => navigation.goBack()} style={{ padding: 8, marginLeft: -8 }}>
            <Ionicons name="arrow-back" size={24} color={gradient[0] === '#ffffff' ? '#1b4332' : '#fff'} />
          </Pressable>
        ) : (
          <Pressable onPress={() => navigation.dispatch(DrawerActions.openDrawer())} style={{ padding: 8, marginLeft: -8 }}>
            <Ionicons name="menu" size={24} color={gradient[0] === '#ffffff' ? '#1b4332' : '#fff'} />
          </Pressable>
        )}
        
        <View style={{ marginLeft: 12, flexDirection: 'row', alignItems: 'center' }}>
          {icon && (
            <View style={[styles.headerIconContainer, { backgroundColor: 'rgba(255,255,255,0.2)' }]}>
              <Ionicons name={icon} size={18} color="#fff" />
            </View>
          )}
          <View style={{ marginLeft: icon ? 10 : 0 }}>
            <Text style={[styles.headerTitle, { color: gradient[0] === '#ffffff' ? '#1b4332' : '#fff' }]}>{title}</Text>
            {subtitle && <Text style={[styles.headerSubtitle, { color: gradient[0] === '#ffffff' ? '#64748b' : 'rgba(255,255,255,0.7)' }]}>{subtitle}</Text>}
          </View>
        </View>
      </View>
    </LinearGradient>
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
