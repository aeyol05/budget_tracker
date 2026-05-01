import React from 'react';
import { Drawer } from 'expo-router/drawer';
import { View, Text, StyleSheet, Image, Pressable } from 'react-native';
import { DrawerContentScrollView, DrawerItemList, DrawerItem } from '@react-navigation/drawer';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../../src/ui/theme';
import { router } from 'expo-router';

function CustomDrawerContent(props: any) {
  return (
    <DrawerContentScrollView {...props} style={styles.drawerStyle}>
      <View style={styles.drawerHeader}>
        <View style={{flexDirection: 'row', justifyContent: 'flex-end', marginBottom: 16}}>
           <Pressable style={{marginRight: 16}} onPress={() => { router.push('/notifications'); }}>
             <Ionicons name="notifications-outline" size={22} color="#fff" />
           </Pressable>
           <Pressable onPress={() => { router.push('/settings'); }}>
             <Ionicons name="settings-outline" size={22} color="#fff" />
           </Pressable>
        </View>
        <View style={{flexDirection: 'row', alignItems: 'center'}}>
          <View style={styles.avatarContainer}>
             <Image source={require('../../assets/images/capy_vault_logo_flat.png')} style={styles.avatar} />
          </View>
          <View style={{marginLeft: 12}}>
            <Text style={styles.brandTitle}>Capi</Text>
            <Text style={styles.brandSubtitle}>Plan. Track. Note. Explore.</Text>
          </View>
        </View>
      </View>
      <View style={styles.drawerItemsContainer}>
        <DrawerItemList {...props} />
      </View>
      <View style={{marginTop: 'auto', padding: 20, alignItems: 'center', opacity: 0.5}}>
         <Text style={{color: '#fff', fontSize: 13, fontWeight: '700'}}>🌱 Your calm companion</Text>
         <Text style={{color: '#fff', fontSize: 13, fontWeight: '700'}}>for everyday life.</Text>
      </View>
    </DrawerContentScrollView>
  );
}

export default function DrawerLayout() {
  return (
    <Drawer
      drawerContent={(props) => <CustomDrawerContent {...props} />}
      screenOptions={{
        headerShown: false,
        drawerStyle: {
          backgroundColor: theme.colors.drawerBg,
          width: 280,
        },
        drawerActiveBackgroundColor: 'rgba(255,255,255,0.05)',
        drawerActiveTintColor: '#fff', 
        drawerInactiveTintColor: '#cbd5e1', 
        drawerLabelStyle: {
          fontSize: 16,
          fontWeight: '600',
          marginLeft: -10,
        },
      }}
    >
      <Drawer.Screen
        name="index"
        options={{
          title: 'Dashboard',
          drawerIcon: ({ color, size }) => (
            <View style={{width: 32, height: 32, borderRadius: 10, backgroundColor: '#1b4332', justifyContent: 'center', alignItems: 'center'}}>
               <Ionicons name="grid" size={18} color="#fff" />
            </View>
          ),
        }}
      />
      <Drawer.Screen
        name="budget_tracker"
        options={{
          title: 'Budget Tracker',
          drawerIcon: ({ color, size }) => (
            <View style={{width: 32, height: 32, borderRadius: 10, backgroundColor: '#698b53', justifyContent: 'center', alignItems: 'center'}}>
               <Ionicons name="wallet" size={18} color="#fff" />
            </View>
          ),
        }}
      />
      <Drawer.Screen
        name="notes"
        options={{
          title: 'Notes',
          drawerIcon: ({ color, size }) => (
            <View style={{width: 32, height: 32, borderRadius: 10, backgroundColor: '#467491', justifyContent: 'center', alignItems: 'center'}}>
               <Ionicons name="document-text" size={18} color="#fff" />
            </View>
          ),
        }}
      />
      <Drawer.Screen
        name="tasks"
        options={{
          title: 'Tasks',
          drawerIcon: ({ color, size }) => (
             <View style={{width: 32, height: 32, borderRadius: 10, backgroundColor: '#d59d47', justifyContent: 'center', alignItems: 'center'}}>
                <Ionicons name="checkmark-done" size={18} color="#fff" />
             </View>
          ),
        }}
      />
      <Drawer.Screen
        name="travel"
        options={{
          title: 'Travel',
          drawerIcon: ({ color, size }) => (
             <View style={{width: 32, height: 32, borderRadius: 10, backgroundColor: '#8c6f96', justifyContent: 'center', alignItems: 'center'}}>
                <Ionicons name="airplane" size={18} color="#fff" />
             </View>
          ),
        }}
      />
      <Drawer.Screen
        name="schedule"
        options={{
          title: 'Schedule',
          drawerIcon: ({ color, size }) => (
             <View style={{width: 32, height: 32, borderRadius: 10, backgroundColor: '#8b5e3c', justifyContent: 'center', alignItems: 'center'}}>
                <Ionicons name="calendar" size={18} color="#fff" />
             </View>
          ),
        }}
      />
       <Drawer.Screen name="notifications" options={{ drawerItemStyle: { display: 'none' } }} />
      <Drawer.Screen name="wallets" options={{ drawerItemStyle: { display: 'none' } }} />
      <Drawer.Screen name="transactions" options={{ drawerItemStyle: { display: 'none' } }} />
      <Drawer.Screen name="explore" options={{ drawerItemStyle: { display: 'none' } }} />
      <Drawer.Screen name="budgets" options={{ drawerItemStyle: { display: 'none' } }} />
      <Drawer.Screen name="settings" options={{ drawerItemStyle: { display: 'none' } }} />
      <Drawer.Screen name="analytics" options={{ drawerItemStyle: { display: 'none' } }} />
    </Drawer>
  );
}

const styles = StyleSheet.create({
  drawerStyle: {
    backgroundColor: theme.colors.drawerBg,
  },
  drawerHeader: {
    padding: 24,
    paddingTop: 40,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.05)',
  },
  avatarContainer: {
    width: 76,
    height: 76,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  avatar: {
    width: 240,
    height: 240,
    resizeMode: 'contain',
  },
  brandTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#fff',
  },
  brandSubtitle: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.7)',
    marginTop: 2,
    maxWidth: 150,
  },
  drawerItemsContainer: {
    paddingTop: 16,
    paddingHorizontal: 12,
  }
});
