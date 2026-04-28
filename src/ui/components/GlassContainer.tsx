import React from 'react';
import { View, StyleSheet, ViewProps } from 'react-native';
import { theme } from '../theme';
import { BlurView } from 'expo-blur';

interface GlassContainerProps extends ViewProps {
  intensity?: number;
}

export function GlassContainer({ children, style, intensity = 20, ...props }: GlassContainerProps) {
  return (
    <BlurView intensity={intensity} tint="dark" style={[styles.container, style]} {...props}>
      {children}
    </BlurView>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderRadius: 24,
    padding: 20,
    borderWidth: 1,
    borderColor: theme.colors.border,
    overflow: 'hidden', // necessary for border radius with BlurView
  }
});
