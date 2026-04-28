import React, { useEffect } from 'react';
import { Tabs, router } from 'expo-router';
import { theme } from '../../src/ui/theme';
import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { View, StyleSheet, Platform, Pressable, Dimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { 
  useAnimatedStyle, 
  withSpring, 
  useSharedValue, 
  FadeIn
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';

const { width } = Dimensions.get('window');
const TAB_WIDTH = (width - 40) / 5;

function CustomTabBar({ state, descriptors, navigation }: any) {
  const insets = useSafeAreaInsets();
  
  // Define visible tab order exactly as requested
  const visibleTabsOrder = ['index', 'wallets', 'add_placeholder', 'transactions', 'explore'];
  
  // Find current active index relative to our visual order
  const getVisualIndex = () => {
    const activeRoute = state.routes[state.index];
    return visibleTabsOrder.indexOf(activeRoute.name);
  };
  
  const visualIndex = getVisualIndex();
  const translateX = useSharedValue((visualIndex >= 0 ? visualIndex : 0) * TAB_WIDTH);

  useEffect(() => {
    const newIndex = getVisualIndex();
    if (newIndex >= 0) {
      translateX.value = withSpring(newIndex * TAB_WIDTH, {
        damping: 18,
        stiffness: 120,
      });
    }
  }, [state.index]);

  const animatedPillStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
  }));

  return (
    <View style={[styles.tabBarContainer, { bottom: Platform.OS === 'ios' ? insets.bottom + 10 : 20 }]}>
      <BlurView intensity={Platform.OS === 'ios' ? 40 : 100} tint="dark" style={styles.blur}>
        <View style={styles.pillContainer}>
          <Animated.View style={[styles.activeIndicator, animatedPillStyle, { width: TAB_WIDTH }]} />
          
          {visibleTabsOrder.map((routeName, index) => {
            const route = state.routes.find((r: any) => r.name === routeName);
            if (!route) return <View key={routeName} style={{ width: TAB_WIDTH }} />;

            const { options } = descriptors[route.key];
            const isFocused = state.index === state.routes.findIndex((r: any) => r.key === route.key);

            const onPress = () => {
              const event = navigation.emit({
                type: 'tabPress',
                target: route.key,
                canPreventDefault: true,
              });

              if (!isFocused && !event.defaultPrevented) {
                navigation.navigate(route.name);
              }
            };

            const Icon = options.tabBarIcon;
            
            if (routeName === 'add_placeholder') {
               return <View key={routeName} style={{ width: TAB_WIDTH }} />;
            }

            const getIcon = (name: string, focused: boolean) => {
              const color = focused ? '#fff' : theme.colors.slate500;
              switch(name) {
                case 'index': return <Ionicons name={focused ? 'home' : 'home-outline'} size={24} color={color} />;
                case 'wallets': return <Ionicons name={focused ? 'wallet' : 'wallet-outline'} size={24} color={color} />;
                case 'transactions': return <Ionicons name={focused ? 'time' : 'time-outline'} size={24} color={color} />;
                case 'explore': return <Ionicons name={focused ? 'compass' : 'compass-outline'} size={24} color={color} />;
                default: return <Ionicons name="help-outline" size={24} color={color} />;
              }
            };

            return (
              <Pressable
                key={route.key}
                onPress={onPress}
                style={[styles.tabItem, { width: TAB_WIDTH }]}
              >
                {Icon ? <Icon color={isFocused ? '#fff' : theme.colors.slate500} size={24} focused={isFocused} /> : getIcon(route.name, isFocused)}
                {isFocused && (
                  <Animated.Text 
                    entering={FadeIn.duration(200)} 
                    style={styles.label}
                  >
                    {options.title}
                  </Animated.Text>
                )}
              </Pressable>
            );
          })}
        </View>
      </BlurView>

      {/* Center FAB */}
      <View style={styles.fabContainer}>
         <Pressable 
           onPress={() => router.push('/add')}
           style={({ pressed }) => [
             styles.fab,
             { transform: [{ rotate: pressed ? '45deg' : '0deg' }, { scale: pressed ? 0.9 : 1 }] }
           ]}
         >
           <LinearGradient
             colors={['#818cf8', '#4f46e5']}
             style={styles.fabGradient}
           >
             <Ionicons name="add" size={32} color="white" />
           </LinearGradient>
           <View style={styles.fabGlow} />
         </Pressable>
      </View>
    </View>
  );
}

export default function TabLayout() {
  return (
    <Tabs
      tabBar={(props) => <CustomTabBar {...props} />}
      screenOptions={{
        headerShown: false,
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="home-outline" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="wallets"
        options={{
          title: 'Wallet',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="wallet-outline" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="add_placeholder"
        options={{
          title: 'Add',
          href: null,
        }}
      />
      <Tabs.Screen
        name="transactions"
        options={{
          title: 'History',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="time-outline" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="explore"
        options={{
          title: 'Explore',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="compass-outline" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen name="budgets" options={{ href: null }} />
      <Tabs.Screen name="settings" options={{ href: null }} />
      <Tabs.Screen name="analytics" options={{ href: null }} />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  tabBarContainer: {
    position: 'absolute',
    left: 20,
    right: 20,
    alignItems: 'center',
    zIndex: 100,
  },
  blur: {
    borderRadius: 30,
    overflow: 'hidden',
    width: '100%',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    backgroundColor: 'rgba(15, 23, 42, 0.5)',
  },
  pillContainer: {
    flexDirection: 'row',
    height: 64,
    width: '100%',
    alignItems: 'center',
  },
  activeIndicator: {
    position: 'absolute',
    height: 48,
    backgroundColor: 'rgba(129, 140, 248, 0.15)',
    borderRadius: 24,
    marginVertical: 8,
    left: 0,
    zIndex: -1,
  },
  tabItem: {
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '800',
    marginTop: 4,
  },
  fabContainer: {
    position: 'absolute',
    top: -26,
    zIndex: 101,
  },
  fab: {
    width: 60,
    height: 60,
    borderRadius: 30,
    elevation: 10,
    shadowColor: '#818cf8',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.5,
    shadowRadius: 12,
  },
  fabGradient: {
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2,
  },
  fabGlow: {
    position: 'absolute',
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#818cf8',
    opacity: 0.3,
    transform: [{ scale: 1.2 }],
    zIndex: 1,
  }
});
