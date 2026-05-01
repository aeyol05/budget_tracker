import React, { useRef, useState, useEffect } from 'react';
import { View, StyleSheet, Animated, Easing, Image } from 'react-native';

interface PullToRefreshProps {
  pulling: boolean;
  progress: number; // 0 to 1
  refreshing: boolean;
}

export const PullToRefresh: React.FC<PullToRefreshProps> = ({ pulling, progress, refreshing }) => {
  const runAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (refreshing) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(runAnim, {
            toValue: 1,
            duration: 400,
            easing: Easing.linear,
            useNativeDriver: true,
          }),
          Animated.timing(runAnim, {
            toValue: 0,
            duration: 400,
            easing: Easing.linear,
            useNativeDriver: true,
          }),
        ])
      ).start();
    } else {
      runAnim.setValue(0);
    }
  }, [refreshing]);

  const translateY = runAnim.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: [0, -10, 0],
  });

  const rotate = runAnim.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: ['0deg', '5deg', '0deg'],
  });

  if (!pulling && !refreshing) return null;

  return (
    <View style={[styles.container, { height: refreshing ? 80 : progress * 80 }]}>
      <Animated.View style={[
        styles.capyContainer,
        { 
          transform: [
            { translateY: refreshing ? translateY : 0 },
            { rotate: refreshing ? rotate : '0deg' },
            { scale: refreshing ? 1 : progress }
          ],
          opacity: refreshing ? 1 : progress
        }
      ]}>
        <Image 
          source={require('../../../assets/images/capy_avatar.png')} 
          style={styles.capy}
          resizeMode="contain"
        />
        {refreshing && (
           <View style={styles.dustCloudContainer}>
              <Animated.View style={[styles.dust, { opacity: runAnim, transform: [{ scale: runAnim }] }]} />
              <Animated.View style={[styles.dust, { opacity: runAnim, transform: [{ scale: runAnim }, { translateX: -20 }] }]} />
           </View>
        )}
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    backgroundColor: 'transparent',
  },
  capyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  capy: {
    width: 50,
    height: 50,
  },
  dustCloudContainer: {
    position: 'absolute',
    bottom: 0,
    flexDirection: 'row',
  },
  dust: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#cbd5e1',
    marginHorizontal: 4,
  }
});
