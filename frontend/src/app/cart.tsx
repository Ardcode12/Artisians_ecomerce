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
  Alert,
  ActivityIndicator,
  Modal,
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
  MapPin,
  Truck,
  ShieldCheck,
  CheckCircle2,
  Tag,
  CreditCard,
  Banknote,
  QrCode,
} from 'lucide-react-native';
import { Fonts, Shadow, Radius } from '@/constants/artisan-theme';
import { useCart } from '@/context/CartContext';
import { useAuth } from '@/context/AuthContext';
import { useLanguage } from '@/context/LanguageContext';
import { BACKEND_URL } from '@/config/api';

export default function CartScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { language } = useLanguage();
  const { cart, removeFromCart, updateQuantity, clearCart, cartTotal, isCartLoading } = useCart();
  const { profile, user } = useAuth();

  const [promoCode, setPromoCode] = useState('');
  const [discount, setDiscount] = useState(0);
  const [promoApplied, setPromoApplied] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<'cod' | 'upi' | 'card'>('cod');
  const [shippingAddress, setShippingAddress] = useState(
    profile?.location || 'Flat 402, Heritage Residency, MG Road, Bengaluru - 560001'
  );
  const [isPlacingOrder, setIsPlacingOrder] = useState(false);
  const [orderSuccessModal, setOrderSuccessModal] = useState(false);
  const [placedOrderId, setPlacedOrderId] = useState('');

  // Apply Promo Code
  const handleApplyPromo = () => {
    const code = promoCode.trim().toUpperCase();
    if (code === 'HERITAGE10' || code === 'ARTISAN10') {
      const disc = Math.round(cartTotal * 0.1);
      setDiscount(disc);
      setPromoApplied(true);
      const title = language === 'ta' ? 'கூப்பன் பயன்படுத்தப்பட்டது!' : language === 'hi' ? 'प्रोमो लागू हुआ!' : 'Promo Applied!';
      const msg = language === 'ta'
        ? `நீங்கள் ₹${disc.toLocaleString('en-IN')} சேமித்தீர்கள் (10% கைவினை தள்ளுபடி)`
        : language === 'hi'
        ? `आपने ₹${disc.toLocaleString('en-IN')} बचाए (10% कारीगर शिल्प छूट)`
        : `You saved ₹${disc.toLocaleString('en-IN')} (10% Artisan Craft Discount)`;
      Alert.alert(title, msg);
    } else if (code) {
      const title = language === 'ta' ? 'செல்லாத கூப்பன்' : language === 'hi' ? 'अमान्य कोड' : 'Invalid Code';
      const msg = language === 'ta'
        ? '10% கைவினை தள்ளுபடிக்கு "HERITAGE10" குறியீட்டைப் பயன்படுத்தவும்.'
        : language === 'hi'
        ? '10% शिल्प छूट के लिए "HERITAGE10" कोड का उपयोग करें।'
        : 'Try code "HERITAGE10" for 10% off handcrafted crafts.';
      Alert.alert(title, msg);
    }
  };

  const finalTotal = Math.max(0, cartTotal - discount);

  // Place Order API
  const handlePlaceOrder = async () => {
    if (cart.length === 0) {
      Alert.alert(
        language === 'ta' ? 'பை காலியாக உள்ளது' : language === 'hi' ? 'बैग खाली है' : 'Cart Empty',
        language === 'ta' ? 'ஆர்டர் செய்வதற்கு முன் பொருட்களைச் சேர்க்கவும்.' : language === 'hi' ? 'ऑर्डर देने से पहले हस्तनिर्मित वस्तुएं जोड़ें।' : 'Add handcrafted items before placing an order.'
      );
      return;
    }

    if (!shippingAddress.trim()) {
      Alert.alert(
        language === 'ta' ? 'முகவரி தேவை' : language === 'hi' ? 'पता दर्ज करें' : 'Address Missing',
        language === 'ta' ? 'தயவுசெய்து டெலிவரி முகவரியை உள்ளிடவும்.' : language === 'hi' ? 'कृपया डिलीवरी का पता प्रदान करें।' : 'Please provide a shipping delivery address.'
      );
      return;
    }

    setIsPlacingOrder(true);
    try {
      // Create orders on backend for all items
      const orderPromises = cart.map(async (item) => {
        const itemPriceNum = parseFloat(item.product.price.replace(/[^0-9.]/g, '')) || 650;
        const itemTotal = `₹${(itemPriceNum * item.quantity).toLocaleString('en-IN')}`;

        return fetch(`${BACKEND_URL}/api/orders`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            product_id: item.product.id,
            product_title: item.product.title,
            product_image: item.product.image_url || '',
            artisan_id: item.product.artisan_id || null,
            artisan_name: item.product.artisan_name || 'Master Artisan',
            buyer_phone: profile?.phone || '+91 93450 73473',
            buyer_name: profile?.name || 'Handmade Buyer',
            buyer_address: shippingAddress.trim(),
            quantity: item.quantity,
            total_amount: itemTotal,
            payment_method: paymentMethod,
          }),
        });
      });

      await Promise.all(orderPromises);

      const generatedId = `ORD-${Date.now().toString().slice(-6)}`;
      setPlacedOrderId(generatedId);
      clearCart();
      setOrderSuccessModal(true);
    } catch (err: any) {
      Alert.alert(
        language === 'ta' ? 'ஆர்டர் தோல்வியடைந்தது' : language === 'hi' ? 'ऑर्डर विफल' : 'Order Failed',
        err.message || (language === 'ta' ? 'ஆர்டர் செய்ய முடியவில்லை. இணைப்பைச் சரிபார்க்கவும்.' : language === 'hi' ? 'ऑर्डर नहीं दिया जा सका। कृपया कनेक्शन जांचें।' : 'Could not place order. Please check connection.')
      );
    } finally {
      setIsPlacingOrder(false);
    }
  };

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

        <Text style={styles.headerTitle}>
          {language === 'ta' ? 'ஷாப்பிங் பை' : language === 'hi' ? 'शॉपिंग बैग' : 'Shopping Bag'}
        </Text>

        <View style={styles.circleBtnWhite}>
          <ShoppingBag size={20} color="#0D0D0D" strokeWidth={2} />
        </View>
      </View>

      {/* ── Main Content ────────────────────────────────────────── */}
      {isCartLoading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color="#0D0D0D" />
        </View>
      ) : cart.length === 0 ? (
        /* Empty Cart State */
        <View style={styles.emptyContainer}>
          <View style={styles.emptyIconCircle}>
            <ShoppingBag size={48} color="#8E8E93" strokeWidth={1.5} />
          </View>
          <Text style={styles.emptyTitle}>
            {language === 'ta' ? 'உங்கள் பை காலியாக உள்ளது' : language === 'hi' ? 'आपका बैग खाली है' : 'Your Bag is Empty'}
          </Text>
          <Text style={styles.emptySubtitle}>
            {language === 'ta'
              ? 'நேரடியாக கைவினைஞர்களிடமிருந்து அசல் கைத்தறி ஆடைகள், சுடுமண் மண்பாண்டங்கள் மற்றும் புவிசார் குறியீடு பெற்ற கைவினைப் பொருட்களைக் கண்டறியுங்கள்.'
              : language === 'hi'
              ? 'भारतीय कारीगरों से सीधे प्रामाणिक हथकरघा वस्त्र, टेराकोटा मिट्टी के बर्तन और प्रमाणित जीआई शिल्प खोजें।'
              : 'Explore authentic handloom textiles, terracotta pottery, and certified GI crafts directly from Indian artisans.'}
          </Text>
          <TouchableOpacity
            style={styles.exploreBtn}
            onPress={() => router.replace('/')}
            activeOpacity={0.85}
          >
            <Text style={styles.exploreBtnText}>
              {language === 'ta' ? 'கைவினைப் பொருட்களைக் காண்க' : language === 'hi' ? 'हस्तनिर्मित शिल्प खोजें' : 'Discover Handcrafted Items'}
            </Text>
            <ArrowRight size={16} color="#FFFFFF" strokeWidth={2.5} />
          </TouchableOpacity>
        </View>
      ) : (
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 120 }]}
        >
          {/* Trust Banner */}
          <View style={styles.trustBanner}>
            <View style={styles.trustItem}>
              <Truck size={16} color="#0D0D0D" />
              <Text style={styles.trustText}>
                {language === 'ta' ? 'கைவினைஞரிடமிருந்து நேரடி டெலிவரி' : language === 'hi' ? 'कारीगर से मुफ्त सीधी डिलीवरी' : 'Free Direct Artisan Delivery'}
              </Text>
            </View>
            <View style={styles.trustDivider} />
            <View style={styles.trustItem}>
              <ShieldCheck size={16} color="#10B981" />
              <Text style={styles.trustText}>
                {language === 'ta' ? '100% அசல் பாரம்பரியம்' : language === 'hi' ? '100% प्रामाणिक विरासत' : '100% Genuine Heritage'}
              </Text>
            </View>
          </View>

          {/* Cart Items List */}
          <View style={styles.itemsList}>
            {cart.map((item) => {
              const priceNum = parseFloat(item.product.price.replace(/[^0-9.]/g, '')) || 650;
              const formattedItemPrice = `₹${priceNum.toLocaleString('en-IN')}`;
              const imageUri =
                item.product.image_url ||
                'https://images.unsplash.com/photo-1605289355680-75fb41239154?w=600&q=80';

              return (
                <View key={item.id} style={styles.cartCard}>
                  <Image source={{ uri: imageUri }} style={styles.cardImage} resizeMode="cover" />

                  <View style={styles.cardContent}>
                    <View style={styles.cardTopRow}>
                      <View style={{ flex: 1, marginRight: 8 }}>
                        <Text style={styles.itemTitle} numberOfLines={1}>
                          {item.product.title}
                        </Text>
                        <Text style={styles.itemSubtitle} numberOfLines={1}>
                          {item.product.craft_type || item.product.category || (language === 'ta' ? 'பாரம்பரிய கைவினை' : language === 'hi' ? 'हस्तशिल्प' : 'Handcrafted')}
                        </Text>
                      </View>

                      <TouchableOpacity
                        style={styles.deleteCircle}
                        onPress={() => removeFromCart(item.product.id)}
                        activeOpacity={0.7}
                      >
                        <Trash2 size={16} color="#EF4444" strokeWidth={2} />
                      </TouchableOpacity>
                    </View>

                    <View style={styles.cardBottomRow}>
                      <Text style={styles.itemPrice}>{formattedItemPrice}</Text>

                      {/* Stepper */}
                      <View style={styles.stepperWrap}>
                        <TouchableOpacity
                          style={styles.stepperBtn}
                          onPress={() => updateQuantity(item.product.id, item.quantity - 1)}
                          activeOpacity={0.7}
                        >
                          <Minus size={13} color="#0D0D0D" strokeWidth={2.5} />
                        </TouchableOpacity>

                        <Text style={styles.quantityText}>{item.quantity}</Text>

                        <TouchableOpacity
                          style={styles.stepperBtn}
                          onPress={() => updateQuantity(item.product.id, item.quantity + 1)}
                          activeOpacity={0.7}
                        >
                          <Plus size={13} color="#0D0D0D" strokeWidth={2.5} />
                        </TouchableOpacity>
                      </View>
                    </View>
                  </View>
                </View>
              );
            })}
          </View>

          {/* Promo Code Input */}
          <View style={styles.promoSection}>
            <View style={styles.promoInputWrap}>
              <Tag size={18} color="#8E8E93" style={{ marginRight: 8 }} />
              <TextInput
                style={styles.promoInput}
                placeholder={language === 'ta' ? 'தள்ளுபடி கூப்பன் (எ.கா. HERITAGE10)' : language === 'hi' ? 'प्रोमो कोड (उदा. HERITAGE10)' : 'Promo code (e.g. HERITAGE10)'}
                placeholderTextColor="#A0A0A5"
                value={promoCode}
                onChangeText={setPromoCode}
                autoCapitalize="characters"
              />
              <TouchableOpacity
                style={[styles.applyBtn, promoApplied && styles.applyBtnActive]}
                onPress={handleApplyPromo}
                activeOpacity={0.8}
              >
                <Text style={styles.applyBtnText}>
                  {promoApplied
                    ? (language === 'ta' ? 'பயன்படுத்தப்பட்டது' : language === 'hi' ? 'लागू हुआ' : 'Applied')
                    : (language === 'ta' ? 'பயன்படுத்து' : language === 'hi' ? 'लागू करें' : 'Apply')}
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Delivery Shipping Address */}
          <View style={styles.sectionCard}>
            <View style={styles.sectionCardHeader}>
              <View style={styles.rowAlign}>
                <MapPin size={17} color="#0D0D0D" />
                <Text style={styles.sectionCardTitle}>
                  {language === 'ta' ? 'டெலிவரி முகவரி' : language === 'hi' ? 'शिपिंग का पता' : 'Shipping Address'}
                </Text>
              </View>
            </View>
            <TextInput
              style={styles.addressInputField}
              value={shippingAddress}
              onChangeText={setShippingAddress}
              placeholder={language === 'ta' ? 'உங்கள் டெலிவரி முகவரியை உள்ளிடவும்...' : language === 'hi' ? 'अपना शिपिंग पता दर्ज करें...' : 'Enter your shipping address...'}
              placeholderTextColor="#A0A0A5"
              multiline
              numberOfLines={2}
            />
          </View>

          {/* Payment Method Selector */}
          <View style={styles.sectionCard}>
            <Text style={styles.sectionCardTitle}>
              {language === 'ta' ? 'பணம் செலுத்தும் முறை' : language === 'hi' ? 'भुगतान विधि' : 'Payment Method'}
            </Text>
            <View style={styles.paymentOptionsRow}>
              <TouchableOpacity
                style={[
                  styles.paymentOptionCard,
                  paymentMethod === 'cod' && styles.paymentOptionCardActive,
                ]}
                onPress={() => setPaymentMethod('cod')}
                activeOpacity={0.8}
              >
                <Banknote size={20} color={paymentMethod === 'cod' ? '#FFFFFF' : '#0D0D0D'} />
                <Text
                  style={[
                    styles.paymentOptionText,
                    paymentMethod === 'cod' && styles.paymentOptionTextActive,
                  ]}
                >
                  {language === 'ta' ? 'நேரில் பணம்' : language === 'hi' ? 'कैश ऑन डिलीवरी' : 'Cash on Delivery'}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.paymentOptionCard,
                  paymentMethod === 'upi' && styles.paymentOptionCardActive,
                ]}
                onPress={() => setPaymentMethod('upi')}
                activeOpacity={0.8}
              >
                <QrCode size={20} color={paymentMethod === 'upi' ? '#FFFFFF' : '#0D0D0D'} />
                <Text
                  style={[
                    styles.paymentOptionText,
                    paymentMethod === 'upi' && styles.paymentOptionTextActive,
                  ]}
                >
                  UPI / QR
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.paymentOptionCard,
                  paymentMethod === 'card' && styles.paymentOptionCardActive,
                ]}
                onPress={() => setPaymentMethod('card')}
                activeOpacity={0.8}
              >
                <CreditCard size={20} color={paymentMethod === 'card' ? '#FFFFFF' : '#0D0D0D'} />
                <Text
                  style={[
                    styles.paymentOptionText,
                    paymentMethod === 'card' && styles.paymentOptionTextActive,
                  ]}
                >
                  {language === 'ta' ? 'கார்டு / வங்கி' : language === 'hi' ? 'कार्ड / नेट' : 'Card / Net'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Order Summary Receipt */}
          <View style={styles.summaryCard}>
            <Text style={styles.summaryTitle}>
              {language === 'ta' ? 'ஆர்டர் சுருக்கம்' : language === 'hi' ? 'ऑर्डर का सारांश' : 'Order Summary'}
            </Text>

            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>
                {language === 'ta'
                  ? `மொத்த மதிப்பு (${cart.length} பொருட்கள்)`
                  : language === 'hi'
                  ? `उप-योग (${cart.length} शिल्प)`
                  : `Subtotal (${cart.length} crafts)`}
              </Text>
              <Text style={styles.summaryValue}>₹{cartTotal.toLocaleString('en-IN')}</Text>
            </View>

            {discount > 0 && (
              <View style={styles.summaryRow}>
                <Text style={[styles.summaryLabel, { color: '#10B981' }]}>
                  {language === 'ta' ? 'கைவினைஞர் தள்ளுபடி' : language === 'hi' ? 'कारीगर प्रोमो छूट' : 'Artisan Promo Discount'}
                </Text>
                <Text style={[styles.summaryValue, { color: '#10B981' }]}>
                  -₹{discount.toLocaleString('en-IN')}
                </Text>
              </View>
            )}

            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>
                {language === 'ta' ? 'கைவினைஞர் நேரடி டெலிவரி' : language === 'hi' ? 'कारीगर सीधी शिपिंग' : 'Artisan Direct Shipping'}
              </Text>
              <Text style={[styles.summaryValue, { color: '#10B981' }]}>
                {language === 'ta' ? 'இலவசம்' : language === 'hi' ? 'निःशुल्क' : 'FREE'}
              </Text>
            </View>

            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>
                {language === 'ta' ? 'ஜிஎஸ்டி மற்றும் வரிகள்' : language === 'hi' ? 'जीएसटी और शिल्प शुल्क' : 'GST & Craft Levies'}
              </Text>
              <Text style={styles.summaryValue}>
                {language === 'ta' ? 'சேர்க்கப்பட்டுள்ளது' : language === 'hi' ? 'शामिल है' : 'Included'}
              </Text>
            </View>

            <View style={styles.summaryDivider} />

            <View style={styles.summaryRowTotal}>
              <Text style={styles.totalLabel}>
                {language === 'ta' ? 'செலுத்த வேண்டிய மொத்தத் தொகை' : language === 'hi' ? 'कुल देय राशि' : 'Total Payable'}
              </Text>
              <Text style={styles.totalValue}>₹{finalTotal.toLocaleString('en-IN')}</Text>
            </View>
          </View>
        </ScrollView>
      )}

      {/* ── Fixed Bottom Checkout Bar ────────────────────────────── */}
      {cart.length > 0 && (
        <View style={[styles.bottomBar, { paddingBottom: Math.max(insets.bottom, 16) }]}>
          <View style={styles.bottomPriceCol}>
            <Text style={styles.bottomPriceLabel}>
              {language === 'ta' ? 'மொத்தம்' : language === 'hi' ? 'कुल' : 'Total'}
            </Text>
            <Text style={styles.bottomPriceValue}>₹{finalTotal.toLocaleString('en-IN')}</Text>
          </View>

          <TouchableOpacity
            style={styles.checkoutBtn}
            onPress={handlePlaceOrder}
            disabled={isPlacingOrder}
            activeOpacity={0.88}
          >
            {isPlacingOrder ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <>
                <Text style={styles.checkoutBtnText}>
                  {language === 'ta' ? 'ஆர்டர் செய்யுங்கள்' : language === 'hi' ? 'ऑर्डर दें' : 'Place Order'}
                </Text>
                <ArrowRight size={18} color="#FFFFFF" strokeWidth={2.5} />
              </>
            )}
          </TouchableOpacity>
        </View>
      )}

      {/* ── Order Success Modal ─────────────────────────────────── */}
      <Modal
        visible={orderSuccessModal}
        animationType="slide"
        transparent
        onRequestClose={() => setOrderSuccessModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.successModalSheet, { paddingBottom: Math.max(insets.bottom, 24) }]}>
            <View style={styles.successIconCircle}>
              <CheckCircle2 size={48} color="#10B981" />
            </View>

            <Text style={styles.successTitle}>
              {language === 'ta' ? 'ஆர்டர் வெற்றிகரமாக செய்யப்பட்டது!' : language === 'hi' ? 'ऑर्डर सफलतापूर्वक दिया गया!' : 'Order Placed Successfully!'}
            </Text>
            <Text style={styles.successSub}>
              {language === 'ta'
                ? `ஆர்டர் #${placedOrderId} உறுதி செய்யப்பட்டது. கைவினைஞர்கள் உங்கள் அசல் தயாரிப்பைத் தயாரிக்கத் தொடங்குவார்கள்.`
                : language === 'hi'
                ? `ऑर्डर #${placedOrderId} की पुष्टि हो गई है। कारीगरों को आपकी प्रामाणिक हस्तनिर्मित वस्तुएं तैयार करने के लिए सूचित कर दिया गया है।`
                : `Order #${placedOrderId} has been confirmed. The artisans have been notified to begin preparing your authentic handmade pieces.`}
            </Text>

            <View style={styles.modalSuccessBtns}>
              <TouchableOpacity
                style={styles.keepBrowsingBtn}
                onPress={() => {
                  setOrderSuccessModal(false);
                  router.replace('/');
                }}
                activeOpacity={0.85}
              >
                <Text style={styles.keepBrowsingText}>
                  {language === 'ta' ? 'மேலும் காண்க' : language === 'hi' ? 'और देखें' : 'Discover More'}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.viewOrdersBtn}
                onPress={() => {
                  setOrderSuccessModal(false);
                  router.push('/profile');
                }}
                activeOpacity={0.85}
              >
                <Text style={styles.viewOrdersText}>
                  {language === 'ta' ? 'ஆர்டர்களைக் காண்க →' : language === 'hi' ? 'ऑर्डर देखें →' : 'View in Orders →'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
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
    paddingHorizontal: 20,
    paddingBottom: 14,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F5F5F7',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '800',
    fontFamily: Fonts.headingBold,
    color: '#0D0D0D',
  },
  circleBtnBlack: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#0D0D0D',
    justifyContent: 'center',
    alignItems: 'center',
    ...Shadow.card,
  },
  circleBtnWhite: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E5E5EA',
    ...Shadow.card,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  emptyIconCircle: {
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: '#F5F5F7',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  emptyTitle: {
    fontSize: 22,
    fontWeight: '800',
    fontFamily: Fonts.headingBold,
    color: '#0D0D0D',
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    fontFamily: Fonts.body,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 28,
  },
  exploreBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#0D0D0D',
    borderRadius: 30,
    paddingVertical: 14,
    paddingHorizontal: 24,
    ...Shadow.card,
  },
  exploreBtnText: {
    fontSize: 14,
    fontWeight: '700',
    fontFamily: Fonts.headingBold,
    color: '#FFFFFF',
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 16,
  },
  trustBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    backgroundColor: '#F9F9FB',
    borderRadius: 14,
    paddingVertical: 10,
    paddingHorizontal: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#EFEFF2',
  },
  trustItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  trustText: {
    fontSize: 12,
    fontWeight: '600',
    fontFamily: Fonts.bodyMedium,
    color: '#0D0D0D',
  },
  trustDivider: {
    width: 1,
    height: 16,
    backgroundColor: '#E5E5EA',
  },
  itemsList: {
    gap: 14,
    marginBottom: 20,
  },
  cartCard: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 12,
    borderWidth: 1,
    borderColor: '#EFEFF2',
    ...Shadow.card,
  },
  cardImage: {
    width: 80,
    height: 80,
    borderRadius: 14,
    backgroundColor: '#F5F5F7',
  },
  cardContent: {
    flex: 1,
    marginLeft: 12,
    justifyContent: 'space-between',
  },
  cardTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  itemTitle: {
    fontSize: 14,
    fontWeight: '700',
    fontFamily: Fonts.headingBold,
    color: '#0D0D0D',
  },
  itemSubtitle: {
    fontSize: 12,
    fontWeight: '500',
    fontFamily: Fonts.body,
    color: '#8E8E93',
    marginTop: 2,
  },
  deleteCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#FEE2E2',
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardBottomRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
  },
  itemPrice: {
    fontSize: 15,
    fontWeight: '800',
    fontFamily: Fonts.headingBold,
    color: '#0D0D0D',
  },
  stepperWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F5F5F7',
    borderRadius: 16,
    paddingHorizontal: 8,
    paddingVertical: 4,
    gap: 10,
  },
  stepperBtn: {
    padding: 3,
  },
  quantityText: {
    fontSize: 13,
    fontWeight: '700',
    fontFamily: Fonts.headingBold,
    color: '#0D0D0D',
    minWidth: 14,
    textAlign: 'center',
  },
  promoSection: {
    marginBottom: 16,
  },
  promoInputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F9F9FB',
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: '#EFEFF2',
  },
  promoInput: {
    flex: 1,
    fontSize: 13,
    fontFamily: Fonts.bodyMedium,
    color: '#0D0D0D',
    paddingVertical: 8,
  },
  applyBtn: {
    backgroundColor: '#0D0D0D',
    borderRadius: 20,
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  applyBtnActive: {
    backgroundColor: '#10B981',
  },
  applyBtnText: {
    fontSize: 12,
    fontWeight: '700',
    fontFamily: Fonts.headingBold,
    color: '#FFFFFF',
  },
  sectionCard: {
    backgroundColor: '#F9F9FB',
    borderRadius: 18,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#EFEFF2',
  },
  sectionCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  rowAlign: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  sectionCardTitle: {
    fontSize: 14,
    fontWeight: '700',
    fontFamily: Fonts.headingBold,
    color: '#0D0D0D',
    marginBottom: 10,
  },
  addressInputField: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 12,
    fontSize: 13,
    fontFamily: Fonts.body,
    color: '#0D0D0D',
    borderWidth: 1,
    borderColor: '#E5E5EA',
    lineHeight: 18,
  },
  paymentOptionsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  paymentOptionCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    paddingVertical: 12,
    alignItems: 'center',
    gap: 6,
    borderWidth: 1.5,
    borderColor: '#E5E5EA',
  },
  paymentOptionCardActive: {
    backgroundColor: '#0D0D0D',
    borderColor: '#0D0D0D',
  },
  paymentOptionText: {
    fontSize: 11,
    fontWeight: '600',
    fontFamily: Fonts.headingBold,
    color: '#0D0D0D',
  },
  paymentOptionTextActive: {
    color: '#FFFFFF',
  },
  summaryCard: {
    backgroundColor: '#F9F9FB',
    borderRadius: 18,
    padding: 18,
    borderWidth: 1,
    borderColor: '#EFEFF2',
    marginBottom: 16,
  },
  summaryTitle: {
    fontSize: 15,
    fontWeight: '800',
    fontFamily: Fonts.headingBold,
    color: '#0D0D0D',
    marginBottom: 14,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  summaryLabel: {
    fontSize: 13,
    fontFamily: Fonts.body,
    color: '#6B7280',
  },
  summaryValue: {
    fontSize: 13,
    fontWeight: '600',
    fontFamily: Fonts.headingBold,
    color: '#0D0D0D',
  },
  summaryDivider: {
    height: 1,
    backgroundColor: '#E5E5EA',
    marginVertical: 12,
  },
  summaryRowTotal: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  totalLabel: {
    fontSize: 15,
    fontWeight: '800',
    fontFamily: Fonts.headingBold,
    color: '#0D0D0D',
  },
  totalValue: {
    fontSize: 20,
    fontWeight: '800',
    fontFamily: Fonts.headingBold,
    color: '#0D0D0D',
  },
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#FFFFFF',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
    ...Shadow.nav,
  },
  bottomPriceCol: {
    justifyContent: 'center',
  },
  bottomPriceLabel: {
    fontSize: 11,
    fontWeight: '600',
    fontFamily: Fonts.bodyMedium,
    color: '#8E8E93',
  },
  bottomPriceValue: {
    fontSize: 22,
    fontWeight: '800',
    fontFamily: Fonts.headingBold,
    color: '#0D0D0D',
  },
  checkoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#0D0D0D',
    borderRadius: 30,
    paddingVertical: 14,
    paddingHorizontal: 26,
    ...Shadow.card,
  },
  checkoutBtnText: {
    fontSize: 14,
    fontWeight: '700',
    fontFamily: Fonts.headingBold,
    color: '#FFFFFF',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  successModalSheet: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 24,
    paddingTop: 28,
    alignItems: 'center',
  },
  successIconCircle: {
    width: 76,
    height: 76,
    borderRadius: 38,
    backgroundColor: '#DCFCE7',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  successTitle: {
    fontSize: 22,
    fontWeight: '800',
    fontFamily: Fonts.headingBold,
    color: '#0D0D0D',
    marginBottom: 8,
    textAlign: 'center',
  },
  successSub: {
    fontSize: 14,
    fontFamily: Fonts.body,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
  },
  modalSuccessBtns: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
  },
  keepBrowsingBtn: {
    flex: 1,
    backgroundColor: '#F5F5F7',
    borderRadius: 26,
    paddingVertical: 14,
    alignItems: 'center',
  },
  keepBrowsingText: {
    fontSize: 13,
    fontWeight: '700',
    fontFamily: Fonts.headingBold,
    color: '#0D0D0D',
  },
  viewOrdersBtn: {
    flex: 1.2,
    backgroundColor: '#0D0D0D',
    borderRadius: 26,
    paddingVertical: 14,
    alignItems: 'center',
    ...Shadow.card,
  },
  viewOrdersText: {
    fontSize: 13,
    fontWeight: '700',
    fontFamily: Fonts.headingBold,
    color: '#FFFFFF',
  },
});
