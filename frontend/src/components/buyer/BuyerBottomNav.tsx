import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Home, Search, ShoppingBag, Heart, User, Package } from 'lucide-react-native';
import { Fonts, Shadow } from '@/constants/artisan-theme';

export type BuyerTab = 'home' | 'explore' | 'cart' | 'wishlist' | 'orders' | 'profile';

interface BuyerBottomNavProps {
  activeTab: BuyerTab;
  onTabChange: (tab: BuyerTab) => void;
  cartCount?: number;
  wishlistCount?: number;
}

const TABS: { key: BuyerTab; Icon: any; label: string }[] = [
  { key: 'home',     Icon: Home,        label: 'Home' },
  { key: 'explore',  Icon: Search,      label: 'Explore' },
  { key: 'cart',     Icon: ShoppingBag, label: 'Cart' },
  { key: 'wishlist', Icon: Heart,       label: 'Wishlist' },
  { key: 'profile',  Icon: User,        label: 'Profile' },
];

export function BuyerBottomNav({
  activeTab,
  onTabChange,
  cartCount = 0,
  wishlistCount = 0,
}: BuyerBottomNavProps) {
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.wrapper, { paddingBottom: Math.max(insets.bottom, 10) }]}>
      <View style={styles.pill}>
        {TABS.map(({ key, Icon, label }) => {
          const isActive = key === activeTab;
          const isCart = key === 'cart';
          const isWishlist = key === 'wishlist';

          /* ── Center Raised Button (Cart with Live Badge) ────────── */
          if (isCart) {
            return (
              <TouchableOpacity
                key={key}
                style={styles.centerTabContainer}
                onPress={() => onTabChange(key)}
                activeOpacity={0.85}
              >
                <View style={styles.centerCircle}>
                  <Icon size={22} color="#FFFFFF" strokeWidth={2.4} />
                  {cartCount > 0 && (
                    <View style={styles.badgeDot}>
                      <Text style={styles.badgeText}>{cartCount}</Text>
                    </View>
                  )}
                </View>
                <Text style={styles.centerLabel}>{label}</Text>
              </TouchableOpacity>
            );
          }

          /* ── Regular Tab: Active Capsule with Black Circle Icon ─── */
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

          /* ── Regular Tab: Inactive Icon + Label ─────────────────── */
          return (
            <TouchableOpacity
              key={key}
              style={styles.tab}
              onPress={() => onTabChange(key)}
              activeOpacity={0.75}
            >
              <View style={{ position: 'relative' }}>
                <Icon size={20} color="#0D0D0D" strokeWidth={1.8} />
                {isWishlist && wishlistCount > 0 && (
                  <View style={styles.miniBadge}>
                    <Text style={styles.miniBadgeText}>{wishlistCount}</Text>
                  </View>
                )}
              </View>
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
  centerTabContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: -20,
    gap: 2,
  },
  centerCircle: {
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
  centerLabel: {
    fontSize: 10,
    fontWeight: '700',
    fontFamily: Fonts.headingBold,
    color: '#0D0D0D',
  },
  badgeDot: {
    position: 'absolute',
    top: -3,
    right: -3,
    backgroundColor: '#EF4444',
    borderRadius: 9,
    minWidth: 18,
    height: 18,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
    borderWidth: 1.5,
    borderColor: '#FFFFFF',
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: 9,
    fontWeight: '800',
    fontFamily: Fonts.headingBold,
  },
  miniBadge: {
    position: 'absolute',
    top: -4,
    right: -6,
    backgroundColor: '#EF4444',
    borderRadius: 7,
    minWidth: 14,
    height: 14,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 2,
  },
  miniBadgeText: {
    color: '#FFFFFF',
    fontSize: 8,
    fontWeight: '800',
  },
});
