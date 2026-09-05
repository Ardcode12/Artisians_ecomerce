import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Home, Package, Plus, MessageCircle, User } from 'lucide-react-native';
import { Fonts, Shadow } from '@/constants/artisan-theme';

export type ArtisanTab = 'home' | 'listings' | 'add' | 'inquiries' | 'profile';

interface ArtisanBottomNavProps {
  activeTab: ArtisanTab;
  onTabChange: (tab: ArtisanTab) => void;
}

const TABS: { key: ArtisanTab; Icon: any; label: string }[] = [
  { key: 'home',      Icon: Home,          label: 'Home' },
  { key: 'listings',  Icon: Package,       label: 'Listings' },
  { key: 'add',       Icon: Plus,          label: 'Add' },
  { key: 'inquiries', Icon: MessageCircle, label: 'Inquiries' },
  { key: 'profile',   Icon: User,          label: 'Profile' },
];

export function ArtisanBottomNav({ activeTab, onTabChange }: ArtisanBottomNavProps) {
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.wrapper, { paddingBottom: Math.max(insets.bottom, 10) }]}>
      <View style={styles.pill}>
        {TABS.map(({ key, Icon, label }) => {
          const isActive = key === activeTab;
          const isAdd = key === 'add';

          /* ── Center Raised Add Button ─────────────────────────────── */
          if (isAdd) {
            return (
              <TouchableOpacity
                key={key}
                style={styles.addTabContainer}
                onPress={() => onTabChange(key)}
                activeOpacity={0.85}
              >
                <View style={styles.addCircle}>
                  <Icon size={24} color="#FFFFFF" strokeWidth={2.8} />
                </View>
                <Text style={styles.addLabel}>{label}</Text>
              </TouchableOpacity>
            );
          }

          /* ── Regular Tab with Icon + Label ────────────────────────── */
          if (isActive) {
            return (
              <TouchableOpacity
                key={key}
                style={styles.activeCapsule}
                onPress={() => onTabChange(key)}
                activeOpacity={0.9}
              >
                <View style={styles.activeIconCircle}>
                  <Icon size={16} color="#FFFFFF" strokeWidth={2.5} />
                </View>
                <Text style={styles.activeLabel}>{label}</Text>
              </TouchableOpacity>
            );
          }

          return (
            <TouchableOpacity
              key={key}
              style={styles.tab}
              onPress={() => onTabChange(key)}
              activeOpacity={0.75}
            >
              <Icon size={20} color="#0D0D0D" strokeWidth={1.8} />
              <Text style={styles.tabLabel}>{label}</Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 16,
    paddingTop: 8,
    backgroundColor: 'transparent',
    zIndex: 100,
  },
  pill: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingVertical: 6,
    paddingHorizontal: 8,
    height: 68,
    ...Shadow.nav,
    elevation: 10,
  },
  tab: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 4,
    paddingHorizontal: 6,
    gap: 3,
    minWidth: 50,
  },
  tabLabel: {
    fontSize: 10,
    fontWeight: '600',
    fontFamily: Fonts.heading,
    color: '#0D0D0D',
  },
  activeCapsule: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
    borderRadius: 26,
    paddingVertical: 4,
    paddingLeft: 4,
    paddingRight: 12,
    gap: 6,
    height: 44,
  },
  activeIconCircle: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#0D0D0D',
    justifyContent: 'center',
    alignItems: 'center',
  },
  activeLabel: {
    fontSize: 12,
    fontWeight: '700',
    fontFamily: Fonts.headingBold,
    color: '#0D0D0D',
  },
  addTabContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: -20,
    gap: 2,
  },
  addCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#0D0D0D',
    justifyContent: 'center',
    alignItems: 'center',
    ...Shadow.hero,
    elevation: 8,
    borderWidth: 3,
    borderColor: '#FFFFFF',
  },
  addLabel: {
    fontSize: 10,
    fontWeight: '700',
    fontFamily: Fonts.headingBold,
    color: '#0D0D0D',
  },
});
