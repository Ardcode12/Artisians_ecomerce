import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Image,
  StatusBar,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import {
  ArrowLeft,
  ShoppingBag,
  Trash2,
  Plus,
  Minus,
  ArrowRight,
} from 'lucide-react-native';
import { Fonts, Shadow } from '@/constants/artisan-theme';

interface CartItem {
  id: string;
  title: string;
  subtitle: string;
  price: number;
  quantity: number;
  imageUri: string;
  showDelete?: boolean;
}

const INITIAL_ITEMS: CartItem[] = [
  {
    id: '1',
    title: 'Roller Rabbit',
    subtitle: 'Vado Odelle Dress',
    price: 198.0,
    quantity: 1,
    imageUri: 'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?w=300&q=80',
  },
  {
    id: '2',
    title: 'Axel Arigato',
    subtitle: 'Clean 90 Triole Snakers',
    price: 245.0,
    quantity: 1,
    imageUri: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=300&q=80',
    showDelete: true,
  },
  {
    id: '3',
    title: 'Herschel Supply Co.',
    subtitle: 'Daypack Backpack',
    price: 40.0,
    quantity: 1,
    imageUri: 'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=300&q=80',
  },
];

export default function CartScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const [items, setItems] = useState<CartItem[]>(INITIAL_ITEMS);
  const [promoCode, setPromoCode] = useState('');
  const [discount, setDiscount] = useState(0);

  const updateQuantity = (id: string, delta: number) => {
    setItems((prev) =>
      prev.map((item) =>
        item.id === id ? { ...item, quantity: Math.max(1, item.quantity + delta) } : item
      )
    );
  };

  const removeItem = (id: string) => {
    setItems((prev) => prev.filter((item) => item.id !== id));
  };

  const subtotal = items.reduce((acc, it) => acc + it.price * it.quantity, 0);
  const total = Math.max(0, subtotal - discount);

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

      {/* ── Top Header ─────────────────────────────────────────── */}
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <TouchableOpacity
          style={styles.circleBtnBlack}
          onPress={() => router.back()}
          activeOpacity={0.8}
        >
          <ArrowLeft size={20} color="#FFFFFF" strokeWidth={2.5} />
        </TouchableOpacity>

        <View style={styles.circleBtnWhite}>
          <ShoppingBag size={20} color="#0D0D0D" strokeWidth={2} />
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{items.length}</Text>
          </View>
        </View>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: insets.bottom + 120 },
        ]}
      >
        {/* Title */}
        <Text style={styles.pageTitle}>My Cart</Text>

        {/* ── Cart Items List ──────────────────────────────────── */}
        <View style={styles.itemsList}>
          {items.map((item) => {
            return (
              <View key={item.id} style={styles.cardOuterWrapper}>
                {item.showDelete ? (
                  <View style={styles.deleteActionWrapper}>
                    {/* Main item body shifted */}
                    <View style={styles.swipeCardBody}>
                      <View style={styles.itemThumbWrapper}>
                        <Image source={{ uri: item.imageUri }} style={styles.thumbImage} resizeMode="cover" />
                      </View>
                      <View style={styles.itemInfoCol}>
                        <Text style={styles.itemTitle}>{item.title}</Text>
                        <Text style={styles.itemSubtitle}>{item.subtitle}</Text>
                        <Text style={styles.itemPrice}>${item.price.toFixed(2)}</Text>
                      </View>
                      <View style={styles.stepperPill}>
                        <TouchableOpacity
                          onPress={() => updateQuantity(item.id, -1)}
                          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                        >
                          <Minus size={12} color="#0D0D0D" strokeWidth={2.5} />
                        </TouchableOpacity>
                        <Text style={styles.stepperNum}>{item.quantity}</Text>
                        <TouchableOpacity
                          onPress={() => updateQuantity(item.id, 1)}
                          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                        >
                          <Plus size={12} color="#0D0D0D" strokeWidth={2.5} />
                        </TouchableOpacity>
                      </View>
                    </View>
                    {/* Black delete action tab on right */}
                    <TouchableOpacity
                      style={styles.deleteButton}
                      onPress={() => removeItem(item.id)}
                      activeOpacity={0.85}
                    >
                      <Trash2 size={20} color="#FFFFFF" strokeWidth={2.2} />
                    </TouchableOpacity>
                  </View>
                ) : (
                  <View style={styles.regularCard}>
                    <View style={styles.itemThumbWrapper}>
                      <Image source={{ uri: item.imageUri }} style={styles.thumbImage} resizeMode="cover" />
                    </View>
                    <View style={styles.itemInfoCol}>
                      <Text style={styles.itemTitle}>{item.title}</Text>
                      <Text style={styles.itemSubtitle}>{item.subtitle}</Text>
                      <Text style={styles.itemPrice}>${item.price.toFixed(2)}</Text>
                    </View>
                    <View style={styles.stepperPill}>
                      <TouchableOpacity
                        onPress={() => updateQuantity(item.id, -1)}
                        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                      >
                        <Minus size={12} color="#0D0D0D" strokeWidth={2.5} />
                      </TouchableOpacity>
                      <Text style={styles.stepperNum}>{item.quantity}</Text>
                      <TouchableOpacity
                        onPress={() => updateQuantity(item.id, 1)}
                        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                      >
                        <Plus size={12} color="#0D0D0D" strokeWidth={2.5} />
                      </TouchableOpacity>
                    </View>
                  </View>
                )}
              </View>
            );
          })}
        </View>

        {/* ── Promo Code Row ───────────────────────────────────── */}
        <View style={styles.promoContainer}>
          <TextInput
            style={styles.promoInput}
            placeholder="Promo Code"
            placeholderTextColor="#9CA3AF"
            value={promoCode}
            onChangeText={setPromoCode}
          />
          <TouchableOpacity
            style={styles.applyBtn}
            onPress={() => {
              if (promoCode.trim().toLowerCase() === 'fscreation') {
                setDiscount(50);
              }
            }}
            activeOpacity={0.85}
          >
            <Text style={styles.applyBtnText}>Apply</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* ── Fixed Bottom Checkout Section ────────────────────── */}
      <View
        style={[
          styles.bottomFixedSection,
          { paddingBottom: Math.max(insets.bottom, 18) },
        ]}
      >
        <View style={styles.totalRow}>
          <Text style={styles.totalLabel}>Total ({items.length} item) :</Text>
          <Text style={styles.totalAmount}>${total.toFixed(0)}</Text>
        </View>

        <TouchableOpacity
          style={styles.checkoutBtn}
          activeOpacity={0.9}
          onPress={() => router.push('/')}
        >
          <Text style={styles.checkoutBtnText}>Proceed to Checkout</Text>
          <View style={styles.checkoutArrowCircle}>
            <ArrowRight size={16} color="#0D0D0D" strokeWidth={2.5} />
          </View>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 22,
    paddingBottom: 12,
  },
  circleBtnBlack: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#0D0D0D',
    justifyContent: 'center',
    alignItems: 'center',
  },
  circleBtnWhite: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#F0F0F0',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  badge: {
    position: 'absolute',
    top: 4,
    right: 4,
    backgroundColor: '#0D0D0D',
    borderRadius: 8,
    minWidth: 16,
    height: 16,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 3,
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: 9,
    fontWeight: '800',
    fontFamily: Fonts.headingBold,
  },
  scrollContent: {
    paddingHorizontal: 22,
    paddingTop: 10,
  },
  pageTitle: {
    fontSize: 24,
    fontWeight: '800',
    fontFamily: Fonts.headingBold,
    color: '#0D0D0D',
    marginBottom: 20,
  },
  itemsList: {
    gap: 16,
  },
  cardOuterWrapper: {
    width: '100%',
  },
  regularCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 12,
    borderWidth: 1,
    borderColor: '#F3F4F6',
    ...Shadow.card,
    elevation: 3,
  },
  deleteActionWrapper: {
    flexDirection: 'row',
    backgroundColor: '#0D0D0D',
    borderRadius: 20,
    overflow: 'hidden',
    ...Shadow.card,
    elevation: 4,
  },
  swipeCardBody: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderBottomLeftRadius: 20,
    borderTopRightRadius: 20,
    borderBottomRightRadius: 20,
    padding: 12,
  },
  deleteButton: {
    width: 60,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#0D0D0D',
  },
  itemThumbWrapper: {
    width: 68,
    height: 68,
    borderRadius: 14,
    backgroundColor: '#F3F4F6',
    overflow: 'hidden',
    marginRight: 14,
  },
  thumbImage: {
    width: '100%',
    height: '100%',
  },
  itemInfoCol: {
    flex: 1,
    gap: 3,
  },
  itemTitle: {
    fontSize: 14,
    fontWeight: '700',
    fontFamily: Fonts.headingBold,
    color: '#0D0D0D',
  },
  itemSubtitle: {
    fontSize: 12,
    color: '#8E8E93',
    fontFamily: Fonts.body,
  },
  itemPrice: {
    fontSize: 14,
    fontWeight: '700',
    fontFamily: Fonts.headingBold,
    color: '#0D0D0D',
    marginTop: 2,
  },
  stepperPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0F0F0',
    borderRadius: 16,
    paddingHorizontal: 10,
    paddingVertical: 6,
    gap: 10,
  },
  stepperNum: {
    fontSize: 13,
    fontWeight: '700',
    fontFamily: Fonts.headingBold,
    color: '#0D0D0D',
  },
  promoContainer: {
    marginTop: 24,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F5F5F7',
    borderRadius: 16,
    paddingLeft: 18,
    paddingRight: 6,
    height: 54,
  },
  promoInput: {
    flex: 1,
    fontSize: 13,
    fontFamily: Fonts.bodyMedium,
    color: '#0D0D0D',
  },
  applyBtn: {
    backgroundColor: '#0D0D0D',
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 20,
  },
  applyBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
    fontFamily: Fonts.headingBold,
  },
  bottomFixedSection: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 22,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#F5F5F7',
    ...Shadow.nav,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  totalLabel: {
    fontSize: 14,
    fontWeight: '500',
    fontFamily: Fonts.bodyMedium,
    color: '#8E8E93',
  },
  totalAmount: {
    fontSize: 24,
    fontWeight: '800',
    fontFamily: Fonts.headingBold,
    color: '#0D0D0D',
  },
  checkoutBtn: {
    backgroundColor: '#0D0D0D',
    borderRadius: 30,
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 22,
  },
  checkoutBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
    fontFamily: Fonts.headingBold,
  },
  checkoutArrowCircle: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
});
