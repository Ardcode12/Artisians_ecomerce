import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Home, Package, TrendingUp, BarChart3 } from 'lucide-react-native';
import { Colors, Fonts, Shadow } from '@/constants/artisan-theme';

// 4-tab nav: Home | Products | Growth | Analytical (Profile accessible via header icon)
export type ArtisanTab = 'home' | 'listings' | 'growth' | 'analytical' | 'add' | 'inquiries' | 'profile';

interface ArtisanBottomNavProps {
  activeTab: ArtisanTab;
  onTabChange: (tab: ArtisanTab) => void;
}

export function ArtisanBottomNav({ activeTab, onTabChange }: ArtisanBottomNavProps) {
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.wrapper, { paddingBottom: Math.max(insets.bottom, 8) }]}>
      <View style={styles.bar}>

        {/* Home */}
        <TouchableOpacity
          style={styles.tab}
          onPress={() => onTabChange('home')}
          activeOpacity={0.75}
        >
          <Home
            size={22}
            color={activeTab === 'home' ? Colors.primary : Colors.navInactive}
            strokeWidth={activeTab === 'home' ? 2.2 : 1.6}
            fill={activeTab === 'home' ? Colors.primary : 'none'}
          />
          <Text style={[styles.tabLabel, activeTab === 'home' && styles.tabLabelActive]}>
            Home
          </Text>
        </TouchableOpacity>

        {/* Products */}
        <TouchableOpacity
          style={styles.tab}
          onPress={() => onTabChange('listings')}
          activeOpacity={0.75}
        >
          <Package
            size={22}
            color={activeTab === 'listings' ? Colors.primary : Colors.navInactive}
            strokeWidth={activeTab === 'listings' ? 2.2 : 1.6}
          />
          <Text style={[styles.tabLabel, activeTab === 'listings' && styles.tabLabelActive]}>
            Products
          </Text>
        </TouchableOpacity>

        {/* Growth */}
        <TouchableOpacity
          style={styles.tab}
          onPress={() => onTabChange('growth')}
          activeOpacity={0.75}
        >
          <TrendingUp
            size={22}
            color={activeTab === 'growth' ? Colors.primary : Colors.navInactive}
            strokeWidth={activeTab === 'growth' ? 2.2 : 1.6}
          />
          <Text style={[styles.tabLabel, activeTab === 'growth' && styles.tabLabelActive]}>
            Growth
          </Text>
        </TouchableOpacity>

        {/* Analytical */}
        <TouchableOpacity
          style={styles.tab}
          onPress={() => onTabChange('analytical')}
          activeOpacity={0.75}
        >
          <BarChart3
            size={22}
            color={activeTab === 'analytical' ? Colors.primary : Colors.navInactive}
            strokeWidth={activeTab === 'analytical' ? 2.2 : 1.6}
          />
          <Text style={[styles.tabLabel, activeTab === 'analytical' && styles.tabLabelActive]}>
            Analytical
          </Text>
        </TouchableOpacity>

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
    backgroundColor: Colors.navBar,
    borderTopWidth: 1,
    borderTopColor: Colors.borderLight,
    zIndex: 100,
    ...Shadow.nav,
  },
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingTop: 8,
    paddingHorizontal: 24,
    height: 60,
  },

  tab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
    paddingVertical: 4,
  },
  tabLabel: {
    fontSize: 11,
    fontFamily: Fonts.bodyMedium,
    color: Colors.navInactive,
    marginTop: 1,
  },
  tabLabelActive: {
    color: Colors.primary,
    fontFamily: Fonts.headingBold,
    fontWeight: '700',
  },
});
