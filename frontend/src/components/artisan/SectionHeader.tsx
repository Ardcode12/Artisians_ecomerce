import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Search } from 'lucide-react-native';
import { Colors, Fonts, Radius, Spacing } from '@/constants/artisan-theme';

interface SectionHeaderProps {
  title: string;
  actionLabel?: string;
  onAction?: () => void;
}

export function SectionHeader({ title, actionLabel = 'View All', onAction }: SectionHeaderProps) {
  return (
    <View style={styles.row}>
      <Text style={styles.title}>{title}</Text>
      {actionLabel && (
        <TouchableOpacity onPress={onAction} activeOpacity={0.7}>
          <Text style={styles.action}>{actionLabel}</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  title: {
    fontSize: 22,
    fontFamily: Fonts.headingBold,
    color: '#0D0D0D',
    letterSpacing: -0.4,
  },
  action: {
    fontSize: 14,
    fontFamily: Fonts.body,
    color: '#8E8E93',
  },
});
