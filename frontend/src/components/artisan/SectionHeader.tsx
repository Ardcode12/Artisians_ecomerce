import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Search } from 'lucide-react-native';
import { Colors, Fonts, Radius, Spacing } from '@/constants/artisan-theme';
import { useLanguage } from '@/context/LanguageContext';

interface SectionHeaderProps {
  title: string;
  actionLabel?: string;
  onAction?: () => void;
}

export function SectionHeader({ title, actionLabel, onAction }: SectionHeaderProps) {
  const { language } = useLanguage();
  const defaultLabel = language === 'ta' ? 'அனைத்தையும் காண்க' : language === 'hi' ? 'सभी देखें' : 'View All';
  const resolvedLabel = actionLabel === 'View All' || actionLabel === undefined ? defaultLabel : actionLabel;

  return (
    <View style={styles.row}>
      <Text style={styles.title}>{title}</Text>
      {resolvedLabel && (
        <TouchableOpacity onPress={onAction} activeOpacity={0.7}>
          <Text style={styles.action}>{resolvedLabel}</Text>
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
