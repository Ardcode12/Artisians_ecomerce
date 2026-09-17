import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  StatusBar,
  Alert,
  Platform,
  ActivityIndicator,
  Modal,
  TextInput,
  KeyboardAvoidingView,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import {
  ArrowLeft,
  ShoppingBag,
  Heart,
  Star,
  Plus,
  Minus,
  Check,
  Sparkles,
  Share2,
  Pencil,
  Trash2,
  Package,
  MessageCircle,
  Truck,
  ShieldCheck,
  X,
  CreditCard,
  MapPin,
  CheckCircle2,
} from 'lucide-react-native';
import { Fonts, Shadow } from '@/constants/artisan-theme';
import { EditProductModal, EditableProduct } from '@/components/artisan/EditProductModal';
import { useAuth } from '@/context/AuthContext';
import { useCart } from '@/context/CartContext';

export interface DetailedProduct extends EditableProduct {
  artisan_id?: string;
  artisan_name?: string;
}

import { BACKEND_URL } from '@/constants/api';

const LANG_OPTIONS = ['EN', 'हिं', 'தமிழ்', 'తెలుగు'];

const DEFAULT_DESCRIPTIONS: Record<string, string> = {
  EN: 'Authentic artisan creation handcrafted with heritage techniques. Natural dyes, pure organic cotton, and traditional hand-block printing. Engineered for supreme durability and breathable elegance, directly empowering women artisan clusters in Kutch.',
  'हिं': 'प्रामाणिक हस्तशिल्प उत्पाद जो पारंपरिक तकनीकों से निर्मित है। प्राकृतिक रंगों और शुद्ध जैविक सूती धागों से तैयार। यह उत्पाद कच्छ के बुनकर समुदायों को सीधे आत्मनिर्भर बनाता है।',
  'தமிழ்': 'பாரம்பரிய கைவினை நுட்பங்களால் நெய்யப்பட்ட அசல் கைத்தறி தயாரிப்பு. இயற்கை சாயங்கள் மற்றும் தூய பருத்தி கொண்டு அழகாக வடிவமைக்கப்பட்டுள்ளது.',
  'తెలుగు': 'వారసత్వ పద్ధతులతో తయారు చేసిన ప్రామాణిక చేతిపనుల ఉత్పత్తి. సహజ రంగులు మరియు స్వచ్ఛమైన పత్తితో కళాత్మకంగా రూపొందించబడింది.',
};

export default function ProductDetailsScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const params = useLocalSearchParams();
  const { userRole, user, profile } = useAuth();
  const { addToCart, cartCount } = useCart();

  // Local state for product data
  const [product, setProduct] = useState<DetailedProduct>({
    id: (params.id as string) || '',
    title: (params.title as string) || 'Hand-woven Cotton Dupatta',
    category: (params.category as string) || (params.subtitle as string) || 'Handloom Textile',
    craft_type: (params.craft_type as string) || (params.subtitle as string) || 'Handloom Textile',
    price: (params.price as string) || '₹650',
    image_url: (params.imageUri as string) || (params.image_url as string) || 'https://images.unsplash.com/photo-1605289355680-75fb41239154?w=600&q=80',
    description_en: (params.description_en as string) || '',
    description_hi: (params.description_hi as string) || '',
    description_ta: (params.description_ta as string) || '',
    units: parseInt(params.units as string) || 1,
    status: (params.status as string) || 'published',
    artisan_id: (params.artisan_id as string) || undefined,
    artisan_name: (params.artisan_name as string) || 'Master Artisan',
  });

  const [quantity, setQuantity] = useState(1);
  const [selectedLang, setSelectedLang] = useState('EN');
  const [isFavorite, setIsFavorite] = useState(false);
  const [activeImageIndex, setActiveImageIndex] = useState(1);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // Direct Buy Modal & States
  const [buyModalOpen, setBuyModalOpen] = useState(false);
  const [orderSubmitting, setOrderSubmitting] = useState(false);
  const [orderSuccess, setOrderSuccess] = useState(false);
  const [placedOrderId, setPlacedOrderId] = useState('');
  const [deliveryAddress, setDeliveryAddress] = useState(
    profile?.location || 'Flat 402, Heritage Residency, MG Road, Bengaluru - 560001'
  );
  const [paymentMethod, setPaymentMethod] = useState<'cod' | 'upi' | 'card'>('cod');

  // Direct Inquiry Modal
  const [inquiryModalOpen, setInquiryModalOpen] = useState(false);
  const [inquiryMessage, setInquiryMessage] = useState('');
  const [inquirySubmitting, setInquirySubmitting] = useState(false);

  // Role Checks
  const isArtisanOwner = userRole === 'artisan' && (!product.artisan_id || product.artisan_id === user?.id);
  const isBuyer = userRole === 'buyer' || !isArtisanOwner;

  // Fetch freshest product data from backend if id is present
  useEffect(() => {
    if (product.id) {
      fetch(`${BACKEND_URL}/api/products/${product.id}`)
        .then((res) => res.json())
        .then((data) => {
          if (data.success && data.product) {
            setProduct((prev) => ({
              ...prev,
              ...data.product,
            }));
          }
        })
        .catch((_) => {});
    }
  }, [product.id]);

  // Compute description to display based on selected language
  const getDisplayDescription = () => {
    if (selectedLang === 'EN' && product.description_en) return product.description_en;
    if (selectedLang === 'हिं' && product.description_hi) return product.description_hi;
    if (selectedLang === 'தமிழ்' && product.description_ta) return product.description_ta;
    if (product.description_en) return product.description_en;
    return DEFAULT_DESCRIPTIONS[selectedLang] || DEFAULT_DESCRIPTIONS.EN;
  };

  const handleEditSuccess = (updated: EditableProduct) => {
    setProduct((prev) => ({
      ...prev,
      ...updated,
    }));
    if (updated.units) {
      setQuantity(updated.units);
    }
  };

  // Delete Artisan Product
  const promptDelete = () => {
    const confirmMessage = `Are you sure you want to delete "${product.title}"? This action cannot be undone.`;

    if (Platform.OS === 'web') {
      if (typeof window !== 'undefined' && window.confirm(confirmMessage)) {
        executeDelete();
      }
      return;
    }

    Alert.alert(
      'Delete Product',
      confirmMessage,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: executeDelete },
      ],
      { cancelable: true }
    );
  };

  const executeDelete = async () => {
    if (!product.id) {
      router.replace('/listings');
      return;
    }

    setIsDeleting(true);
    try {
      const resp = await fetch(`${BACKEND_URL}/api/products/${product.id}`, {
        method: 'DELETE',
        headers: { Accept: 'application/json' },
      });

      const data = await resp.json();
      if (!resp.ok || !data.success) {
        throw new Error(data.error || 'Failed to delete product on server');
      }

      if (Platform.OS !== 'web') {
        Alert.alert('Deleted', 'Product was successfully removed.');
      }
      router.replace('/listings');
    } catch (err: any) {
      console.warn('[ProductDetails] Delete error:', err.message);
      Alert.alert('Error', err.message || 'Could not delete product');
      setIsDeleting(false);
    }
  };

  // Add to Global Cart
  const handleAddToCart = () => {
    addToCart(
      {
        id: product.id || `prod-${Date.now()}`,
        title: product.title,
        price: product.price,
        category: product.category || product.craft_type,
        craft_type: product.craft_type,
        image_url: heroImage,
        artisan_id: product.artisan_id,
        artisan_name: product.artisan_name,
      },
      quantity
    );

    Alert.alert('Added to Cart', `Added ${quantity} × ${product.title} to your bag!`, [
      { text: 'Keep Shopping', style: 'cancel' },
      { text: 'View Cart', onPress: () => router.push('/cart') },
    ]);
  };

  // Share Product
  const handleShare = () => {
    Alert.alert('Share Product', `Share link for "${product.title}" copied to clipboard!`);
  };

  // Calculate Numerical Total for Direct Buy
  const rawPriceNum = parseFloat(product.price.replace(/[^0-9.]/g, '')) || 650;
  const orderTotalNum = rawPriceNum * quantity;
  const formattedOrderTotal = `₹${orderTotalNum.toLocaleString('en-IN')}`;

  // Direct Order Submission
  const handleConfirmDirectOrder = async () => {
    if (!deliveryAddress.trim()) {
      Alert.alert('Address Required', 'Please enter your shipping delivery address.');
      return;
    }

    setOrderSubmitting(true);
    try {
      const payload = {
        product_id: product.id || 'prod-direct',
        product_title: product.title,
        product_image: heroImage,
        artisan_id: product.artisan_id || null,
        artisan_name: product.artisan_name || 'Master Artisan',
        buyer_phone: profile?.phone || '+91 93450 73473',
        buyer_name: profile?.name || 'Handmade Buyer',
        buyer_address: deliveryAddress.trim(),
        quantity: quantity,
        total_amount: formattedOrderTotal,
        payment_method: paymentMethod,
      };

      const res = await fetch(`${BACKEND_URL}/api/orders`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setPlacedOrderId(data.order?.id || `ORD-${Date.now()}`);
        setOrderSuccess(true);
      } else {
        throw new Error(data.error || 'Failed to place order');
      }
    } catch (err: any) {
      Alert.alert('Order Failed', err.message || 'Could not place order. Please try again.');
    } finally {
      setOrderSubmitting(false);
    }
  };

  // Send Direct Inquiry to Artisan
  const handleSendInquiry = async () => {
    if (!inquiryMessage.trim()) {
      Alert.alert('Empty Message', 'Please enter your question for the artisan.');
      return;
    }

    setInquirySubmitting(true);
    try {
      const payload = {
        product_id: product.id,
        product_title: product.title,
        artisan_id: product.artisan_id || null,
        buyer_phone: profile?.phone || '+91 93450 73473',
        buyer_name: profile?.name || 'Interested Buyer',
        message: inquiryMessage.trim(),
      };

      const res = await fetch(`${BACKEND_URL}/api/inquiries`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setInquiryModalOpen(false);
        setInquiryMessage('');
        Alert.alert('Inquiry Sent', 'Your message has been sent directly to the artisan. They will respond shortly!');
      } else {
        throw new Error(data.error || 'Failed to send inquiry');
      }
    } catch (err: any) {
      Alert.alert('Inquiry Failed', err.message || 'Could not send message.');
    } finally {
      setInquirySubmitting(false);
    }
  };

  const heroImage = product.image_url || 'https://images.unsplash.com/photo-1605289355680-75fb41239154?w=600&q=80';

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#F4F4F6" />

      {/* ── Top Bar ─────────────────────────────────────────── */}
      <View style={[styles.topBar, { paddingTop: insets.top + 8 }]}>
        <TouchableOpacity
          style={styles.circleBtnBlack}
          onPress={() => router.back()}
          activeOpacity={0.8}
        >
          <ArrowLeft size={20} color="#FFFFFF" strokeWidth={2.5} />
        </TouchableOpacity>

        {/* Right Action Icons: ARTISAN OWNER vs BUYER */}
        <View style={styles.topBarActions}>
          {isArtisanOwner ? (
            /* Artisan Owner sees Edit & Delete */
            <>
              <TouchableOpacity
                style={styles.circleBtnWhite}
                onPress={() => setIsEditModalOpen(true)}
                activeOpacity={0.8}
                accessibilityLabel="Edit Product"
              >
                <Pencil size={18} color="#0D0D0D" strokeWidth={2.2} />
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.circleBtnRed}
                onPress={promptDelete}
                activeOpacity={0.8}
                disabled={isDeleting}
                accessibilityLabel="Delete Product"
              >
                {isDeleting ? (
                  <ActivityIndicator size="small" color="#EF4444" />
                ) : (
                  <Trash2 size={18} color="#EF4444" strokeWidth={2.2} />
                )}
              </TouchableOpacity>
            </>
          ) : (
            /* Buyer sees Share & Wishlist */
            <>
              <TouchableOpacity
                style={styles.circleBtnWhite}
                onPress={handleShare}
                activeOpacity={0.8}
                accessibilityLabel="Share Product"
              >
                <Share2 size={18} color="#0D0D0D" strokeWidth={2} />
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.circleBtnWhite}
                onPress={() => setIsFavorite(!isFavorite)}
                activeOpacity={0.8}
                accessibilityLabel="Save to Wishlist"
              >
                <Heart
                  size={19}
                  color={isFavorite ? '#E53E3E' : '#0D0D0D'}
                  fill={isFavorite ? '#E53E3E' : 'transparent'}
                  strokeWidth={2}
                />
              </TouchableOpacity>
            </>
          )}

          {/* Cart Bag Icon with dynamic badge */}
          <TouchableOpacity
            style={styles.circleBtnWhite}
            onPress={() => router.push('/cart')}
            activeOpacity={0.8}
          >
            <ShoppingBag size={20} color="#0D0D0D" strokeWidth={2} />
            {cartCount > 0 && (
              <View style={styles.cartBadgeDot}>
                <Text style={styles.cartBadgeCount}>{cartCount}</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* ── Product Hero Image Container ────────────────────── */}
        <View style={styles.heroSection}>
          <Image
            source={{ uri: heroImage }}
            style={styles.heroImage}
            resizeMode="cover"
          />

          {/* Pagination dots */}
          <View style={styles.paginationDots}>
            <View style={[styles.dot, activeImageIndex === 0 && styles.dotActive]} />
            <View style={[styles.dot, activeImageIndex === 1 && styles.dotActive]} />
            <View style={[styles.dot, activeImageIndex === 2 && styles.dotActive]} />
          </View>

          {/* Floating Heart Button for quick wishlisting */}
          <TouchableOpacity
            style={styles.floatingHeart}
            onPress={() => setIsFavorite(!isFavorite)}
            activeOpacity={0.85}
          >
            <Heart
              size={20}
              color={isFavorite ? '#FF3B30' : '#0D0D0D'}
              fill={isFavorite ? '#FF3B30' : 'transparent'}
              strokeWidth={2}
            />
          </TouchableOpacity>
        </View>

        {/* ── Bottom Sheet Content ────────────────────────────── */}
        <View style={styles.detailsSheet}>
          {/* Title + Stepper Row */}
          <View style={styles.titleRow}>
            <View style={styles.titleCol}>
              <View style={styles.badgeRow}>
                <View style={styles.aiTagRow}>
                  <Sparkles size={12} color="#D97706" />
                  <Text style={styles.aiTagText}>GI & Heritage Certified</Text>
                </View>
                {product.status ? (
                  <View
                    style={[
                      styles.statusPill,
                      product.status === 'published' && styles.statusPublished,
                      product.status === 'draft' && styles.statusDraft,
                      product.status === 'sold' && styles.statusSold,
                    ]}
                  >
                    <Text style={styles.statusPillText}>
                      {product.status.toUpperCase()}
                    </Text>
                  </View>
                ) : null}
              </View>

              <Text style={styles.title}>{product.title}</Text>
              <Text style={styles.subtitle}>{product.category || product.craft_type}</Text>

              {/* Rating & Craft Marker */}
              <View style={styles.ratingRow}>
                {[1, 2, 3, 4, 5].map((s) => (
                  <Star
                    key={s}
                    size={14}
                    color="#FF9900"
                    fill="#FF9900"
                    strokeWidth={0}
                  />
                ))}
                <Text style={styles.ratingCount}>4.9 (270 Reviews)</Text>
              </View>
            </View>

            {/* Quantity Stepper */}
            <View style={styles.stepperCol}>
              <View style={styles.stepperPill}>
                <TouchableOpacity
                  onPress={() => setQuantity(Math.max(1, quantity - 1))}
                  activeOpacity={0.7}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <Minus size={14} color="#0D0D0D" strokeWidth={2.5} />
                </TouchableOpacity>
                <Text style={styles.quantityText}>{quantity}</Text>
                <TouchableOpacity
                  onPress={() => setQuantity(quantity + 1)}
                  activeOpacity={0.7}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <Plus size={14} color="#0D0D0D" strokeWidth={2.5} />
                </TouchableOpacity>
              </View>
              <Text style={styles.stockStatus}>
                {product.units && product.units > 0 ? `${product.units} in studio` : 'In stock'}
              </Text>
            </View>
          </View>

          {/* ── Artisan Trust Banner ────────────────────────────── */}
          <View style={styles.trustBanner}>
            <View style={styles.trustItem}>
              <Truck size={16} color="#0D0D0D" />
              <Text style={styles.trustText}>Free All-India Shipping</Text>
            </View>
            <View style={styles.trustDivider} />
            <View style={styles.trustItem}>
              <ShieldCheck size={16} color="#10B981" />
              <Text style={styles.trustText}>100% Genuine Craft</Text>
            </View>
          </View>

          {/* ── Language Preview Selector ─────────────────────── */}
          <View style={styles.langSection}>
            <Text style={styles.sectionHeading}>Description Language</Text>
            <View style={styles.langRow}>
              {LANG_OPTIONS.map((lang) => {
                const isSelected = lang === selectedLang;
                return (
                  <TouchableOpacity
                    key={lang}
                    style={[styles.langCircle, isSelected && styles.langCircleSelected]}
                    onPress={() => setSelectedLang(lang)}
                    activeOpacity={0.8}
                  >
                    <Text
                      style={[
                        styles.langCircleText,
                        isSelected && styles.langCircleTextSelected,
                      ]}
                    >
                      {lang}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          {/* ── Description ─────────────────────────────────────── */}
          <View style={styles.descSection}>
            <View style={styles.descHeaderRow}>
              <Text style={styles.sectionHeading}>Artisan & Craft Story</Text>
              <View style={styles.aiBadgePill}>
                <Sparkles size={11} color="#D97706" />
                <Text style={styles.aiBadgeText}>AI Enhanced</Text>
              </View>
            </View>
            <Text style={styles.descText}>{getDisplayDescription()}</Text>
          </View>

          {/* ── Ask Artisan Inquiry Action ──────────────────────── */}
          <TouchableOpacity
            style={styles.askArtisanBtn}
            onPress={() => setInquiryModalOpen(true)}
            activeOpacity={0.85}
          >
            <MessageCircle size={17} color="#0D0D0D" />
            <Text style={styles.askArtisanText}>Have a question? Message the artisan</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* ── Fixed Bottom Bar: ROLE BASED RENDERING ───────────────────── */}
      <View
        style={[
          styles.bottomBar,
          { paddingBottom: Math.max(insets.bottom, 16) },
        ]}
      >
        <View style={styles.priceCol}>
          <Text style={styles.priceLabel}>Price</Text>
          <Text style={styles.priceValue}>{product.price}</Text>
          <Text style={styles.priceSub}>Free shipping</Text>
        </View>

        {isArtisanOwner ? (
          /* ARTISAN OWNER ACTIONS: Edit & Delete */
          <View style={styles.bottomActions}>
            <TouchableOpacity
              style={styles.editBtn}
              onPress={() => setIsEditModalOpen(true)}
              activeOpacity={0.88}
            >
              <Pencil size={16} color="#FFFFFF" strokeWidth={2.5} />
              <Text style={styles.editBtnText}>Edit Product</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.deleteBtn}
              onPress={promptDelete}
              activeOpacity={0.88}
              disabled={isDeleting}
            >
              <Trash2 size={16} color="#DC2626" strokeWidth={2.2} />
            </TouchableOpacity>
          </View>
        ) : (
          /* BUYER ACTIONS: Add to Cart & Buy Now */
          <View style={styles.buyerBottomActions}>
            <TouchableOpacity
              style={styles.addToCartBtn}
              onPress={handleAddToCart}
              activeOpacity={0.85}
            >
              <ShoppingBag size={17} color="#0D0D0D" strokeWidth={2} />
              <Text style={styles.addToCartText}>Add to Cart</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.buyNowBtn}
              onPress={() => setBuyModalOpen(true)}
              activeOpacity={0.88}
            >
              <Text style={styles.buyNowText}>Buy Now</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      {/* ── Edit Product Modal (Only for Artisan) ───────────────────── */}
      <EditProductModal
        visible={isEditModalOpen}
        product={product}
        onClose={() => setIsEditModalOpen(false)}
        onSuccess={handleEditSuccess}
      />

      {/* ── DIRECT BUY CHECKOUT MODAL ──────────────────────────────── */}
      <Modal
        visible={buyModalOpen}
        animationType="slide"
        transparent
        onRequestClose={() => {
          if (!orderSubmitting) {
            setBuyModalOpen(false);
            setOrderSuccess(false);
          }
        }}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.modalOverlay}
        >
          <View style={[styles.modalSheet, { paddingBottom: Math.max(insets.bottom, 20) }]}>
            {orderSuccess ? (
              /* Success Confirmation Screen */
              <View style={styles.orderSuccessContainer}>
                <View style={styles.successIconCircle}>
                  <CheckCircle2 size={44} color="#10B981" />
                </View>
                <Text style={styles.successTitle}>Order Confirmed!</Text>
                <Text style={styles.successSub}>
                  Your order #{placedOrderId.slice(-6).toUpperCase()} has been placed.
                  The artisan has been notified to prepare your handcrafted piece.
                </Text>

                <View style={styles.orderSummaryPill}>
                  <Text style={styles.summaryItemTitle}>{product.title}</Text>
                  <Text style={styles.summaryItemQty}>Qty: {quantity} · Total: {formattedOrderTotal}</Text>
                </View>

                <View style={styles.successButtonsRow}>
                  <TouchableOpacity
                    style={styles.secondaryDoneBtn}
                    onPress={() => {
                      setBuyModalOpen(false);
                      setOrderSuccess(false);
                    }}
                    activeOpacity={0.85}
                  >
                    <Text style={styles.secondaryDoneText}>Keep Browsing</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.primaryDoneBtn}
                    onPress={() => {
                      setBuyModalOpen(false);
                      setOrderSuccess(false);
                      router.push('/profile');
                    }}
                    activeOpacity={0.85}
                  >
                    <Text style={styles.primaryDoneText}>View in Orders →</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ) : (
              /* Checkout Form */
              <>
                {/* Modal Header */}
                <View style={styles.modalHeader}>
                  <Text style={styles.modalTitle}>Quick Direct Order</Text>
                  <TouchableOpacity
                    style={styles.modalCloseBtn}
                    onPress={() => setBuyModalOpen(false)}
                    activeOpacity={0.8}
                    disabled={orderSubmitting}
                  >
                    <X size={18} color="#0D0D0D" />
                  </TouchableOpacity>
                </View>

                {/* Product Summary Row */}
                <View style={styles.checkoutItemRow}>
                  <Image source={{ uri: heroImage }} style={styles.checkoutThumb} resizeMode="cover" />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.checkoutTitle} numberOfLines={1}>{product.title}</Text>
                    <Text style={styles.checkoutArtisan}>{product.craft_type || 'Handmade'}</Text>
                    <Text style={styles.checkoutPrice}>{product.price} × {quantity} = {formattedOrderTotal}</Text>
                  </View>
                </View>

                {/* Delivery Address */}
                <Text style={styles.inputLabel}>Delivery Address</Text>
                <View style={styles.addressInputWrap}>
                  <MapPin size={18} color="#8E8E93" style={{ marginTop: 2 }} />
                  <TextInput
                    style={styles.addressInput}
                    value={deliveryAddress}
                    onChangeText={setDeliveryAddress}
                    placeholder="Enter complete shipping address..."
                    placeholderTextColor="#A0A0A5"
                    multiline
                    numberOfLines={2}
                  />
                </View>

                {/* Payment Method Selector */}
                <Text style={styles.inputLabel}>Payment Method</Text>
                <View style={styles.paymentMethodsRow}>
                  <TouchableOpacity
                    style={[
                      styles.paymentPill,
                      paymentMethod === 'cod' && styles.paymentPillActive,
                    ]}
                    onPress={() => setPaymentMethod('cod')}
                    activeOpacity={0.8}
                  >
                    <Text
                      style={[
                        styles.paymentPillText,
                        paymentMethod === 'cod' && styles.paymentPillTextActive,
                      ]}
                    >
                      Cash on Delivery
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[
                      styles.paymentPill,
                      paymentMethod === 'upi' && styles.paymentPillActive,
                    ]}
                    onPress={() => setPaymentMethod('upi')}
                    activeOpacity={0.8}
                  >
                    <Text
                      style={[
                        styles.paymentPillText,
                        paymentMethod === 'upi' && styles.paymentPillTextActive,
                      ]}
                    >
                      UPI / QR
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[
                      styles.paymentPill,
                      paymentMethod === 'card' && styles.paymentPillActive,
                    ]}
                    onPress={() => setPaymentMethod('card')}
                    activeOpacity={0.8}
                  >
                    <Text
                      style={[
                        styles.paymentPillText,
                        paymentMethod === 'card' && styles.paymentPillTextActive,
                      ]}
                    >
                      Card
                    </Text>
                  </TouchableOpacity>
                </View>

                {/* Order Total & Confirm Button */}
                <View style={styles.modalFooterRow}>
                  <View>
                    <Text style={styles.footerTotalLabel}>Total Amount</Text>
                    <Text style={styles.footerTotalValue}>{formattedOrderTotal}</Text>
                  </View>

                  <TouchableOpacity
                    style={styles.confirmOrderBtn}
                    onPress={handleConfirmDirectOrder}
                    disabled={orderSubmitting}
                    activeOpacity={0.88}
                  >
                    {orderSubmitting ? (
                      <ActivityIndicator size="small" color="#FFFFFF" />
                    ) : (
                      <Text style={styles.confirmOrderText}>Confirm Order →</Text>
                    )}
                  </TouchableOpacity>
                </View>
              </>
            )}
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* ── INQUIRY MODAL ──────────────────────────────────────────── */}
      <Modal
        visible={inquiryModalOpen}
        animationType="slide"
        transparent
        onRequestClose={() => !inquirySubmitting && setInquiryModalOpen(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.modalOverlay}
        >
          <View style={[styles.modalSheet, { paddingBottom: Math.max(insets.bottom, 20) }]}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Message Artisan</Text>
              <TouchableOpacity
                style={styles.modalCloseBtn}
                onPress={() => setInquiryModalOpen(false)}
                activeOpacity={0.8}
                disabled={inquirySubmitting}
              >
                <X size={18} color="#0D0D0D" />
              </TouchableOpacity>
            </View>

            <Text style={styles.inquiryIntro}>
              Ask about custom sizing, materials, bulk orders, or dispatch dates.
            </Text>

            <TextInput
              style={styles.inquiryTextInput}
              value={inquiryMessage}
              onChangeText={setInquiryMessage}
              placeholder="e.g. Can this dupatta be made in indigo blue with 2.5m length?"
              placeholderTextColor="#A0A0A5"
              multiline
              numberOfLines={4}
            />

            <TouchableOpacity
              style={styles.sendInquiryBtn}
              onPress={handleSendInquiry}
              disabled={inquirySubmitting}
              activeOpacity={0.88}
            >
              {inquirySubmitting ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Text style={styles.sendInquiryBtnText}>Send Message to Artisan</Text>
              )}
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F7',
  },
  topBar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 50,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 12,
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
    ...Shadow.card,
  },
  cartBadgeDot: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: '#0D0D0D',
    borderRadius: 10,
    minWidth: 18,
    height: 18,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
    borderWidth: 1.5,
    borderColor: '#FFFFFF',
  },
  cartBadgeCount: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '800',
    fontFamily: Fonts.headingBold,
  },
  scrollContent: {
    paddingBottom: 120,
  },
  heroSection: {
    height: 380,
    width: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
    backgroundColor: '#F5F5F7',
  },
  heroImage: {
    width: '100%',
    height: '100%',
  },
  paginationDots: {
    position: 'absolute',
    bottom: 34,
    flexDirection: 'row',
    gap: 6,
    alignItems: 'center',
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(255,255,255,0.6)',
  },
  dotActive: {
    width: 18,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#FFFFFF',
  },
  floatingHeart: {
    position: 'absolute',
    bottom: 24,
    right: 24,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    ...Shadow.card,
    elevation: 4,
  },
  detailsSheet: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 36,
    borderTopRightRadius: 36,
    paddingHorizontal: 22,
    paddingTop: 28,
    paddingBottom: 30,
    minHeight: 400,
    marginTop: -24,
    ...Shadow.hero,
  },
  titleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  titleCol: {
    flex: 1,
    marginRight: 12,
  },
  aiTagRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 6,
  },
  aiTagText: {
    fontSize: 11,
    fontWeight: '700',
    fontFamily: Fonts.headingBold,
    color: '#D97706',
  },
  title: {
    fontSize: 20,
    fontWeight: '800',
    fontFamily: Fonts.headingBold,
    color: '#0D0D0D',
  },
  subtitle: {
    fontSize: 13,
    fontWeight: '500',
    fontFamily: Fonts.bodyMedium,
    color: '#8E8E93',
    marginTop: 2,
    marginBottom: 6,
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    marginTop: 2,
  },
  ratingCount: {
    fontSize: 12,
    fontWeight: '500',
    fontFamily: Fonts.body,
    color: '#8E8E93',
    marginLeft: 4,
  },
  stepperCol: {
    alignItems: 'flex-end',
  },
  stepperPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F5F5F7',
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 6,
    gap: 12,
  },
  quantityText: {
    fontSize: 14,
    fontWeight: '700',
    fontFamily: Fonts.headingBold,
    color: '#0D0D0D',
    minWidth: 16,
    textAlign: 'center',
  },
  stockStatus: {
    fontSize: 11,
    fontWeight: '500',
    fontFamily: Fonts.body,
    color: '#10B981',
    marginTop: 6,
  },
  trustBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    backgroundColor: '#F9F9FB',
    borderRadius: 14,
    paddingVertical: 10,
    paddingHorizontal: 12,
    marginBottom: 20,
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
  langSection: {
    marginBottom: 20,
  },
  sectionHeading: {
    fontSize: 14,
    fontWeight: '700',
    fontFamily: Fonts.headingBold,
    color: '#0D0D0D',
    marginBottom: 10,
  },
  langRow: {
    flexDirection: 'row',
    gap: 10,
  },
  langCircle: {
    paddingHorizontal: 16,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: '#F5F5F7',
  },
  langCircleSelected: {
    backgroundColor: '#0D0D0D',
  },
  langCircleText: {
    fontSize: 12,
    fontWeight: '600',
    fontFamily: Fonts.bodyMedium,
    color: '#8E8E93',
  },
  langCircleTextSelected: {
    color: '#FFFFFF',
  },
  descSection: {
    marginTop: 4,
    marginBottom: 20,
  },
  descHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  aiBadgePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#FFFBEB',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderWidth: 1,
    borderColor: '#FDE68A',
  },
  aiBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    fontFamily: Fonts.headingBold,
    color: '#D97706',
  },
  descText: {
    fontSize: 13,
    lineHeight: 21,
    fontFamily: Fonts.body,
    color: '#6B7280',
  },
  askArtisanBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#F5F5F7',
    borderRadius: 16,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: '#E5E5EA',
  },
  askArtisanText: {
    fontSize: 13,
    fontWeight: '600',
    fontFamily: Fonts.bodyMedium,
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
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
    ...Shadow.nav,
  },
  priceCol: {
    justifyContent: 'center',
  },
  priceLabel: {
    fontSize: 11,
    fontWeight: '600',
    fontFamily: Fonts.bodyMedium,
    color: '#8E8E93',
  },
  priceValue: {
    fontSize: 20,
    fontWeight: '800',
    fontFamily: Fonts.headingBold,
    color: '#0D0D0D',
  },
  priceSub: {
    fontSize: 10,
    fontWeight: '500',
    fontFamily: Fonts.body,
    color: '#10B981',
  },
  topBarActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  circleBtnRed: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#FEE2E2',
    justifyContent: 'center',
    alignItems: 'center',
    ...Shadow.card,
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  statusPill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
    backgroundColor: '#F3F4F6',
  },
  statusPublished: {
    backgroundColor: '#D1FAE5',
  },
  statusDraft: {
    backgroundColor: '#E5E7EB',
  },
  statusSold: {
    backgroundColor: '#DCFCE7',
  },
  statusPillText: {
    fontSize: 10,
    fontWeight: '700',
    fontFamily: Fonts.headingBold,
    color: '#065F46',
  },
  bottomActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  editBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0D0D0D',
    borderRadius: 30,
    paddingVertical: 13,
    paddingHorizontal: 18,
    gap: 8,
    ...Shadow.card,
  },
  editBtnText: {
    fontSize: 13,
    fontWeight: '700',
    fontFamily: Fonts.headingBold,
    color: '#FFFFFF',
  },
  deleteBtn: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: '#FEE2E2',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#FCA5A5',
  },
  buyerBottomActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  addToCartBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: '#0D0D0D',
    borderRadius: 30,
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  addToCartText: {
    fontSize: 13,
    fontWeight: '700',
    fontFamily: Fonts.headingBold,
    color: '#0D0D0D',
  },
  buyNowBtn: {
    backgroundColor: '#0D0D0D',
    borderRadius: 30,
    paddingVertical: 13,
    paddingHorizontal: 22,
    ...Shadow.card,
  },
  buyNowText: {
    fontSize: 13,
    fontWeight: '700',
    fontFamily: Fonts.headingBold,
    color: '#FFFFFF',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 20,
    paddingTop: 20,
    maxHeight: '90%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '800',
    fontFamily: Fonts.headingBold,
    color: '#0D0D0D',
  },
  modalCloseBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F5F5F7',
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkoutItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F9F9FB',
    borderRadius: 16,
    padding: 12,
    gap: 12,
    marginBottom: 16,
  },
  checkoutThumb: {
    width: 54,
    height: 54,
    borderRadius: 10,
    backgroundColor: '#E5E5EA',
  },
  checkoutTitle: {
    fontSize: 14,
    fontWeight: '700',
    fontFamily: Fonts.headingBold,
    color: '#0D0D0D',
  },
  checkoutArtisan: {
    fontSize: 12,
    fontWeight: '500',
    fontFamily: Fonts.body,
    color: '#8E8E93',
    marginTop: 2,
  },
  checkoutPrice: {
    fontSize: 13,
    fontWeight: '700',
    fontFamily: Fonts.headingBold,
    color: '#0D0D0D',
    marginTop: 4,
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: '700',
    fontFamily: Fonts.headingBold,
    color: '#0D0D0D',
    marginBottom: 8,
  },
  addressInputWrap: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#F5F5F7',
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 8,
    marginBottom: 16,
  },
  addressInput: {
    flex: 1,
    fontSize: 13,
    fontFamily: Fonts.body,
    color: '#0D0D0D',
    lineHeight: 18,
  },
  paymentMethodsRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 20,
  },
  paymentPill: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 14,
    backgroundColor: '#F5F5F7',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: 'transparent',
  },
  paymentPillActive: {
    backgroundColor: '#0D0D0D',
    borderColor: '#0D0D0D',
  },
  paymentPillText: {
    fontSize: 11,
    fontWeight: '600',
    fontFamily: Fonts.headingBold,
    color: '#0D0D0D',
  },
  paymentPillTextActive: {
    color: '#FFFFFF',
  },
  modalFooterRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  footerTotalLabel: {
    fontSize: 11,
    fontWeight: '600',
    fontFamily: Fonts.bodyMedium,
    color: '#8E8E93',
  },
  footerTotalValue: {
    fontSize: 20,
    fontWeight: '800',
    fontFamily: Fonts.headingBold,
    color: '#0D0D0D',
  },
  confirmOrderBtn: {
    backgroundColor: '#0D0D0D',
    borderRadius: 30,
    paddingVertical: 14,
    paddingHorizontal: 24,
    ...Shadow.card,
  },
  confirmOrderText: {
    fontSize: 14,
    fontWeight: '700',
    fontFamily: Fonts.headingBold,
    color: '#FFFFFF',
  },
  orderSuccessContainer: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  successIconCircle: {
    width: 68,
    height: 68,
    borderRadius: 34,
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
  },
  successSub: {
    fontSize: 13,
    fontFamily: Fonts.body,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 19,
    marginBottom: 16,
    paddingHorizontal: 12,
  },
  orderSummaryPill: {
    backgroundColor: '#F9F9FB',
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 10,
    marginBottom: 24,
    alignItems: 'center',
    width: '100%',
  },
  summaryItemTitle: {
    fontSize: 13,
    fontWeight: '700',
    fontFamily: Fonts.headingBold,
    color: '#0D0D0D',
  },
  summaryItemQty: {
    fontSize: 12,
    fontFamily: Fonts.body,
    color: '#8E8E93',
    marginTop: 2,
  },
  successButtonsRow: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
  },
  secondaryDoneBtn: {
    flex: 1,
    backgroundColor: '#F5F5F7',
    borderRadius: 26,
    paddingVertical: 13,
    alignItems: 'center',
  },
  secondaryDoneText: {
    fontSize: 13,
    fontWeight: '700',
    fontFamily: Fonts.headingBold,
    color: '#0D0D0D',
  },
  primaryDoneBtn: {
    flex: 1.2,
    backgroundColor: '#0D0D0D',
    borderRadius: 26,
    paddingVertical: 13,
    alignItems: 'center',
    ...Shadow.card,
  },
  primaryDoneText: {
    fontSize: 13,
    fontWeight: '700',
    fontFamily: Fonts.headingBold,
    color: '#FFFFFF',
  },
  inquiryIntro: {
    fontSize: 13,
    fontFamily: Fonts.body,
    color: '#6B7280',
    marginBottom: 12,
  },
  inquiryTextInput: {
    backgroundColor: '#F5F5F7',
    borderRadius: 14,
    padding: 12,
    fontSize: 13,
    fontFamily: Fonts.body,
    color: '#0D0D0D',
    height: 100,
    textAlignVertical: 'top',
    marginBottom: 16,
  },
  sendInquiryBtn: {
    backgroundColor: '#0D0D0D',
    borderRadius: 28,
    paddingVertical: 14,
    alignItems: 'center',
    ...Shadow.card,
  },
  sendInquiryBtnText: {
    fontSize: 13,
    fontWeight: '700',
    fontFamily: Fonts.headingBold,
    color: '#FFFFFF',
  },
});
