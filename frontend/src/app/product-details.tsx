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
  ChevronRight,
  Store,
} from 'lucide-react-native';
import { Colors, Fonts, Shadow } from '@/constants/artisan-theme';
import { EditProductModal, EditableProduct } from '@/components/artisan/EditProductModal';
import { useAuth } from '@/context/AuthContext';
import { useCart } from '@/context/CartContext';
import { BACKEND_URL, normalizeImageUrl } from '@/config/api';
import { useProductSpeech } from '@/utils/speech';
import { ProductListenButton } from '@/components/ui/ProductListenButton';
import { useLanguage } from '@/context/LanguageContext';
import { getSelectedLanguage } from '@/utils/language-utils';

export interface DetailedProduct extends EditableProduct {
  artisan_id?: string;
  artisan_name?: string;
  artisan_shop_name?: string;
  artisan_shop_logo?: string;
  shop_name?: string;
  shop_logo_url?: string;
}

const LANG_OPTIONS = ['English', 'हिंदी', 'தமிழ்'];

const DEFAULT_DESCRIPTIONS: Record<string, string> = {
  English: 'Authentic artisan creation handcrafted with heritage techniques. Natural dyes, pure organic cotton, and traditional hand-block printing. Engineered for supreme durability and breathable elegance, directly empowering women artisan clusters in Kutch.',
  'हिंदी': 'प्रामाणिक हस्तशिल्प उत्पाद जो पारंपरिक तकनीकों से निर्मित है। प्राकृतिक रंगों और शुद्ध जैविक सूती धागों से तैयार। यह उत्पाद कच्छ के बुनकर समुदायों को सीधे आत्मनिर्भर बनाता है।',
  'தமிழ்': 'பாரம்பரிய கைவினை நுட்பங்களால் நெய்யப்பட்ட அசல் கைத்தறி தயாரிப்பு. இயற்கை சாயங்கள் மற்றும் தூய பருத்தி கொண்டு அழகாக வடிவமைக்கப்பட்டுள்ளது.',
  EN: 'Authentic artisan creation handcrafted with heritage techniques. Natural dyes, pure organic cotton, and traditional hand-block printing. Engineered for supreme durability and breathable elegance, directly empowering women artisan clusters in Kutch.',
  'हिं': 'प्रामाणिक हस्तशिल्प उत्पाद जो पारंपरिक तकनीकों से निर्मित है। प्राकृतिक रंगों और शुद्ध जैविक सूती धागों से तैयार। यह उत्पाद कच्छ के बुनकर समुदायों को सीधे आत्मनिर्भर बनाता है।',
};

export default function ProductDetailsScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const params = useLocalSearchParams();
  const { userRole, user, profile } = useAuth();
  const { addToCart, cartCount } = useCart();
  const { language } = useLanguage();

  const currentLangLabel = language === 'ta' ? 'தமிழ்' : language === 'hi' ? 'हिंदी' : 'English';
  const [selectedLang, setSelectedLang] = useState(currentLangLabel);

  useEffect(() => {
    setSelectedLang(currentLangLabel);
  }, [language]);

  // Local state for product data
  const [product, setProduct] = useState<DetailedProduct>({
    id: (params.id as string) || '',
    title: (params.title as string) || (language === 'ta' ? 'கைத்தறி பருத்தி துப்பட்டா' : language === 'hi' ? 'हाथ से बुना सूती दुपट्टा' : 'Hand-woven Cotton Dupatta'),
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
    artisan_name: (params.artisan_name as string) || (language === 'ta' ? 'முதன்மை கைவினைஞர்' : language === 'hi' ? 'मास्टर कारीगर' : 'Master Artisan'),
    artisan_shop_name: (params.artisan_shop_name as string) || (params.shop_name as string) || (params.artisan_name as string) || 'Artisan Studio',
    artisan_shop_logo: (params.artisan_shop_logo as string) || (params.shop_logo_url as string) || '',
    shop_name: (params.artisan_shop_name as string) || (params.shop_name as string) || (params.artisan_name as string) || 'Artisan Studio',
    shop_logo_url: (params.artisan_shop_logo as string) || (params.shop_logo_url as string) || '',
  });

  const [quantity, setQuantity] = useState(1);
  const [isFavorite, setIsFavorite] = useState(false);
  const [activeImageIndex, setActiveImageIndex] = useState(1);
  const [imageLoadFailed, setImageLoadFailed] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const { isSpeaking, toggle: toggleSpeech } = useProductSpeech();

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
    if ((selectedLang === 'தமிழ்' || selectedLang === 'ta') && product.description_ta) return product.description_ta;
    if ((selectedLang === 'हिंदी' || selectedLang === 'हिं' || selectedLang === 'hi') && product.description_hi) return product.description_hi;
    if ((selectedLang === 'English' || selectedLang === 'EN' || selectedLang === 'en') && product.description_en) return product.description_en;
    if (product.description_en) return product.description_en;
    return DEFAULT_DESCRIPTIONS[selectedLang] || DEFAULT_DESCRIPTIONS.English;
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
    const confirmMessage = language === 'ta'
      ? `"${product.title}" ஐ நீக்க விரும்புகிறீர்களா? இந்த செயலை மாற்ற முடியாது.`
      : language === 'hi'
      ? `क्या आप वाकई "${product.title}" को हटाना चाहते हैं? यह क्रिया पूर्ववत नहीं की जा सकती।`
      : `Are you sure you want to delete "${product.title}"? This action cannot be undone.`;

    if (Platform.OS === 'web') {
      if (typeof window !== 'undefined' && window.confirm(confirmMessage)) {
        executeDelete();
      }
      return;
    }

    Alert.alert(
      language === 'ta' ? 'தயாரிப்பை நீக்கு' : language === 'hi' ? 'उत्पाद हटाएं' : 'Delete Product',
      confirmMessage,
      [
        { text: language === 'ta' ? 'ரத்து செய்' : language === 'hi' ? 'रद्द करें' : 'Cancel', style: 'cancel' },
        { text: language === 'ta' ? 'நீக்கு' : language === 'hi' ? 'हटाएं' : 'Delete', style: 'destructive', onPress: executeDelete },
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
        Alert.alert(
          language === 'ta' ? 'நீக்கப்பட்டது' : language === 'hi' ? 'हटा दिया गया' : 'Deleted',
          language === 'ta' ? 'தயாரிப்பு வெற்றிகரமாக நீக்கப்பட்டது.' : language === 'hi' ? 'उत्पाद सफलतापूर्वक हटा दिया गया।' : 'Product was successfully removed.'
        );
      }
      router.replace('/listings');
    } catch (err: any) {
      console.warn('[ProductDetails] Delete error:', err.message);
      Alert.alert(
        language === 'ta' ? 'பிழை' : language === 'hi' ? 'त्रुटि' : 'Error',
        err.message || (language === 'ta' ? 'தயாரிப்பை நீக்க முடியவில்லை' : language === 'hi' ? 'उत्पाद नहीं हटाया जा सका' : 'Could not delete product')
      );
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

    Alert.alert(
      language === 'ta' ? 'கார்ட்டில் சேர்க்கப்பட்டது' : language === 'hi' ? 'कार्ट में जोड़ा गया' : 'Added to Cart',
      language === 'ta' ? `${quantity} × ${product.title} உங்கள் பையில் சேர்க்கப்பட்டது!` : language === 'hi' ? `${quantity} × ${product.title} आपके बैग में जोड़ा गया!` : `Added ${quantity} × ${product.title} to your bag!`,
      [
        { text: language === 'ta' ? 'ஷாப்பிங் தொடர்க' : language === 'hi' ? 'खरीदारी जारी रखें' : 'Keep Shopping', style: 'cancel' },
        { text: language === 'ta' ? 'கார்ட்டைப் பார்' : language === 'hi' ? 'कार्ट देखें' : 'View Cart', onPress: () => router.push('/cart') },
      ]
    );
  };

  // Share Product
  const handleShare = () => {
    Alert.alert(
      language === 'ta' ? 'தயாரிப்பைப் பகிர்' : language === 'hi' ? 'उत्पाद साझा करें' : 'Share Product',
      language === 'ta' ? `"${product.title}" இணைப்பு நகலெடுக்கப்பட்டது!` : language === 'hi' ? `"${product.title}" का लिंक क्लिपबोर्ड पर कॉपी किया गया!` : `Share link for "${product.title}" copied to clipboard!`
    );
  };

  // Calculate Numerical Total for Direct Buy
  const rawPriceNum = parseFloat(product.price.replace(/[^0-9.]/g, '')) || 650;
  const orderTotalNum = rawPriceNum * quantity;
  const formattedOrderTotal = `₹${orderTotalNum.toLocaleString('en-IN')}`;

  // Direct Order Submission
  const handleConfirmDirectOrder = async () => {
    if (!deliveryAddress.trim()) {
      Alert.alert(
        language === 'ta' ? 'முகவரி தேவை' : language === 'hi' ? 'पता आवश्यक' : 'Address Required',
        language === 'ta' ? 'உங்கள் விநியோக முகவரியை உள்ளிடவும்.' : language === 'hi' ? 'कृपया अपना शिपिंग डिलीवरी पता दर्ज करें।' : 'Please enter your shipping delivery address.'
      );
      return;
    }

    setOrderSubmitting(true);
    try {
      const payload = {
        product_id: product.id || 'prod-direct',
        product_title: product.title,
        product_image: heroImage,
        artisan_id: product.artisan_id || null,
        artisan_name: product.artisan_name || (language === 'ta' ? 'முதன்மை கைவினைஞர்' : language === 'hi' ? 'मास्टर कारीगर' : 'Master Artisan'),
        buyer_phone: profile?.phone || '+91 93450 73473',
        buyer_name: profile?.name || (language === 'ta' ? 'வாங்குபவர்' : language === 'hi' ? 'खरीदार' : 'Handmade Buyer'),
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
      Alert.alert(
        language === 'ta' ? 'ஆர்டர் தோல்வியடைந்தது' : language === 'hi' ? 'ऑर्डर विफल' : 'Order Failed',
        err.message || (language === 'ta' ? 'ஆர்டர் செய்ய முடியவில்லை. மீண்டும் முயற்சிக்கவும்.' : language === 'hi' ? 'ऑर्डर नहीं दिया जा सका। कृपया पुनः प्रयास करें।' : 'Could not place order. Please try again.')
      );
    } finally {
      setOrderSubmitting(false);
    }
  };

  // Send Direct Inquiry to Artisan
  const handleSendInquiry = async () => {
    if (!inquiryMessage.trim()) {
      Alert.alert(
        language === 'ta' ? 'வெற்று செய்தி' : language === 'hi' ? 'खाली संदेश' : 'Empty Message',
        language === 'ta' ? 'கைவினைஞரிடம் உங்கள் கேள்வியை உள்ளிடவும்.' : language === 'hi' ? 'कृपया कारीगर के लिए अपना प्रश्न दर्ज करें।' : 'Please enter your question for the artisan.'
      );
      return;
    }

    setInquirySubmitting(true);
    try {
      const payload = {
        product_id: product.id,
        product_title: product.title,
        artisan_id: product.artisan_id || null,
        buyer_phone: profile?.phone || '+91 93450 73473',
        buyer_name: profile?.name || (language === 'ta' ? 'ஆர்வம் கொண்ட வாங்குபவர்' : language === 'hi' ? 'इच्छुक खरीदार' : 'Interested Buyer'),
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
        Alert.alert(
          language === 'ta' ? 'விசாரணை அனுப்பப்பட்டது' : language === 'hi' ? 'पूछताछ भेजी गई' : 'Inquiry Sent',
          language === 'ta' ? 'உங்கள் செய்தி நேரடியாக கைவினைஞருக்கு அனுப்பப்பட்டது. விரைவில் பதிலளிப்பார்கள்!' : language === 'hi' ? 'आपका संदेश सीधे कारीगर को भेज दिया गया है। वे शीघ्र उत्तर देंगे!' : 'Your message has been sent directly to the artisan. They will respond shortly!'
        );
      } else {
        throw new Error(data.error || 'Failed to send inquiry');
      }
    } catch (err: any) {
      Alert.alert(
        language === 'ta' ? 'விசாரணை தோல்வியடைந்தது' : language === 'hi' ? 'पूछताछ विफल' : 'Inquiry Failed',
        err.message || (language === 'ta' ? 'செய்தி அனுப்ப முடியவில்லை.' : language === 'hi' ? 'संदेश नहीं भेजा जा सका।' : 'Could not send message.')
      );
    } finally {
      setInquirySubmitting(false);
    }
  };

  const heroImage = imageLoadFailed || !product.image_url
    ? 'https://images.unsplash.com/photo-1605289355680-75fb41239154?w=600&q=80'
    : normalizeImageUrl(product.image_url);

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
          {/* Read-Aloud Listen Button in Top Bar */}
          <ProductListenButton
            product={product}
            isSpeaking={isSpeaking(product.id)}
            onToggle={(p) => toggleSpeech(p, { isDetailView: true, lang: selectedLang })}
            variant="top-bar"
          />
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
            onError={() => setImageLoadFailed(true)}
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
                  <Text style={styles.aiTagText}>
                    {language === 'ta' ? 'புவிசார் & பாரம்பரிய சான்றிதழ்' : language === 'hi' ? 'जीआई और विरासत प्रमाणित' : 'GI & Heritage Certified'}
                  </Text>
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
                      {product.status === 'published'
                        ? (language === 'ta' ? 'வெளியிடப்பட்டது' : language === 'hi' ? 'प्रकाशित' : 'PUBLISHED')
                        : product.status === 'draft'
                        ? (language === 'ta' ? 'வரைவு' : language === 'hi' ? 'ड्राफ्ट' : 'DRAFT')
                        : (language === 'ta' ? 'விற்பனையானது' : language === 'hi' ? 'बिका हुआ' : 'SOLD')}
                    </Text>
                  </View>
                ) : null}
              </View>

              <Text style={styles.title}>{product.title}</Text>
              <Text style={styles.subtitle}>{product.category || product.craft_type}</Text>

              {/* Tappable Verified Shop & Brand Mark Row */}
              <TouchableOpacity
                style={styles.detailSellerRow}
                onPress={() => {
                  if (userRole === 'buyer') {
                    router.push('/buyer-home');
                  }
                }}
                activeOpacity={0.8}
              >
                <View style={styles.detailSellerLeft}>
                  {product.artisan_shop_logo || product.shop_logo_url ? (
                    <Image
                      source={{ uri: normalizeImageUrl(product.artisan_shop_logo || product.shop_logo_url) }}
                      style={styles.detailSellerLogo}
                      resizeMode="contain"
                    />
                  ) : (
                    <View style={styles.detailSellerPlaceholder}>
                      <Text style={styles.detailSellerPlaceholderText}>
                        {(product.artisan_shop_name || product.shop_name || product.artisan_name || 'AS').slice(0, 2).toUpperCase()}
                      </Text>
                    </View>
                  )}
                  <View style={{ flex: 1 }}>
                    <Text style={styles.detailSellerName} numberOfLines={1}>
                      {product.artisan_shop_name || product.shop_name || product.artisan_name || 'Artisan Studio'}
                    </Text>
                    <Text style={styles.detailSellerSub}>
                      {product.craft_type || product.category || 'Traditional Craft'}
                    </Text>
                  </View>
                </View>
                <View style={styles.detailSellerRight}>
                  <View style={styles.detailVerifiedBadge}>
                    <Check size={11} color="#059669" strokeWidth={3} />
                    <Text style={styles.detailVerifiedText}>Verified ✓</Text>
                  </View>
                  <ChevronRight size={15} color="#9CA3AF" />
                </View>
              </TouchableOpacity>

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
                <Text style={styles.ratingCount}>
                  4.9 ({language === 'ta' ? '270 விமர்சனங்கள்' : language === 'hi' ? '270 समीक्षाएं' : '270 Reviews'})
                </Text>
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
                {product.units && product.units > 0
                  ? (language === 'ta' ? `${product.units} இருப்பில் உள்ளது` : language === 'hi' ? `${product.units} उपलब्ध है` : `${product.units} in studio`)
                  : (language === 'ta' ? 'இருப்பில் உள்ளது' : language === 'hi' ? 'उपलब्ध है' : 'In stock')}
              </Text>
            </View>
          </View>

          {/* ── Artisan Trust Banner ────────────────────────────── */}
          <View style={styles.trustBanner}>
            <View style={styles.trustItem}>
              <Truck size={16} color="#0D0D0D" />
              <Text style={styles.trustText}>
                {language === 'ta' ? 'அனைத்து இந்தியா இலவச விநியோகம்' : language === 'hi' ? 'पूरे भारत में निःशुल्क शिपिंग' : 'Free All-India Shipping'}
              </Text>
            </View>
            <View style={styles.trustDivider} />
            <View style={styles.trustItem}>
              <ShieldCheck size={16} color="#10B981" />
              <Text style={styles.trustText}>
                {language === 'ta' ? '100% அசல் கைவினை' : language === 'hi' ? '100% प्रामाणिक शिल्प' : '100% Genuine Craft'}
              </Text>
            </View>
          </View>

          {/* ── Accessible Audio Read-Aloud Button ────────────────── */}
          <ProductListenButton
            product={product}
            isSpeaking={isSpeaking(product.id)}
            onToggle={(p) => toggleSpeech(p, { isDetailView: true, lang: selectedLang })}
            variant="full-banner"
            style={{ marginVertical: 12 }}
          />

          {/* ── Language Preview Selector ─────────────────────── */}
          <View style={styles.langSection}>
            <Text style={styles.sectionHeading}>
              {language === 'ta' ? 'விளக்க மொழி' : language === 'hi' ? 'विवरण की भाषा' : 'Description Language'}
            </Text>
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
              <Text style={styles.sectionHeading}>
                {language === 'ta' ? 'கைவினைஞர் & கைவினை கதை' : language === 'hi' ? 'कारीगर और शिल्प की कहानी' : 'Artisan & Craft Story'}
              </Text>
              <View style={styles.aiBadgePill}>
                <Sparkles size={11} color="#D97706" />
                <Text style={styles.aiBadgeText}>
                  {language === 'ta' ? 'AI மேம்படுத்தப்பட்டது' : language === 'hi' ? 'AI उन्नत' : 'AI Enhanced'}
                </Text>
              </View>
            </View>
            <Text style={styles.descText}>{getDisplayDescription()}</Text>
          </View>

          {/* ── GeM Compliance Panel (Artisan Owner Only) ──────── */}
          {isArtisanOwner && (
            <View style={styles.gemPanel}>
              <View style={styles.gemPanelHeader}>
                <ShieldCheck size={15} color="#2563EB" />
                <Text style={styles.gemPanelTitle}>
                  {language === 'ta' ? 'GeM போர்டல் புலங்கள்' : language === 'hi' ? 'GeM पोर्टल फ़ील्ड' : 'GeM Portal Fields'}
                </Text>
                {product.hsn_code ? (
                  <View style={styles.gemReadyBadge}>
                    <CheckCircle2 size={11} color="#059669" />
                    <Text style={styles.gemReadyText}>
                      {language === 'ta' ? 'GeM தயார்' : language === 'hi' ? 'GeM तैयार' : 'GeM Ready'}
                    </Text>
                  </View>
                ) : (
                  <View style={styles.gemIncBadge}>
                    <Text style={styles.gemIncText}>
                      {language === 'ta' ? 'முழுமையடையாதது' : language === 'hi' ? 'अधूरा' : 'Incomplete'}
                    </Text>
                  </View>
                )}
              </View>

              <View style={styles.gemGrid}>
                {/* Row 1 */}
                <View style={styles.gemCell}>
                  <Text style={styles.gemCellLabel}>{language === 'ta' ? 'HSN குறியீடு' : language === 'hi' ? 'HSN कोड' : 'HSN Code'}</Text>
                  <Text style={styles.gemCellValue}>{product.hsn_code || '—'}</Text>
                </View>
                <View style={styles.gemCell}>
                  <Text style={styles.gemCellLabel}>GSTIN</Text>
                  <Text style={styles.gemCellValue} numberOfLines={1}>{product.gstin || '—'}</Text>
                </View>
                {/* Row 2 */}
                <View style={styles.gemCell}>
                  <Text style={styles.gemCellLabel}>{language === 'ta' ? 'பெஹ்சான் ஐடி' : language === 'hi' ? 'पहचान आईडी' : 'Pehchan ID'}</Text>
                  <Text style={styles.gemCellValue} numberOfLines={1}>{product.pehchan_id || '—'}</Text>
                </View>
                <View style={styles.gemCell}>
                  <Text style={styles.gemCellLabel}>{language === 'ta' ? 'GI குறியீடு எண்' : language === 'hi' ? 'जीआई टैग सं.' : 'GI Tag No.'}</Text>
                  <Text style={styles.gemCellValue}>{product.gi_tag_num || '—'}</Text>
                </View>
                {/* Row 3 */}
                <View style={styles.gemCell}>
                  <Text style={styles.gemCellLabel}>{language === 'ta' ? 'தோற்றம்' : language === 'hi' ? 'उत्पत्ति' : 'Origin'}</Text>
                  <Text style={styles.gemCellValue}>{product.country_of_origin || (language === 'ta' ? 'இந்தியா' : language === 'hi' ? 'भारत' : 'India')}</Text>
                </View>
                <View style={styles.gemCell}>
                  <Text style={styles.gemCellLabel}>{language === 'ta' ? 'உள்ளூர் உள்ளடக்கம்' : language === 'hi' ? 'स्थानीय सामग्री' : 'Local Content'}</Text>
                  <Text style={styles.gemCellValue}>{product.local_content_pct ?? 100}%</Text>
                </View>
                {/* Row 4 */}
                <View style={styles.gemCell}>
                  <Text style={styles.gemCellLabel}>{language === 'ta' ? 'எடை (கிலோ)' : language === 'hi' ? 'वज़न (किग्रा)' : 'Weight (kg)'}</Text>
                  <Text style={styles.gemCellValue}>{product.weight_kg ?? '—'}</Text>
                </View>
                <View style={styles.gemCell}>
                  <Text style={styles.gemCellLabel}>{language === 'ta' ? 'பரிமாணங்கள்' : language === 'hi' ? 'आयाम' : 'Dimensions'}</Text>
                  <Text style={styles.gemCellValue} numberOfLines={1}>{product.dimensions || '—'}</Text>
                </View>
              </View>

              {product.brand_oem ? (
                <View style={styles.gemOEMRow}>
                  <Text style={styles.gemCellLabel}>{language === 'ta' ? 'பிராண்ட் / OEM: ' : language === 'hi' ? 'ब्रांड / ओईएम: ' : 'Brand / OEM: '}</Text>
                  <Text style={styles.gemCellValue}>{product.brand_oem}</Text>
                </View>
              ) : null}
            </View>
          )}

          {/* ── Ask Artisan Inquiry Action ──────────────────────── */}
          <TouchableOpacity
            style={styles.askArtisanBtn}
            onPress={() => setInquiryModalOpen(true)}
            activeOpacity={0.85}
          >
            <MessageCircle size={17} color="#0D0D0D" />
            <Text style={styles.askArtisanText}>
              {language === 'ta' ? 'கேள்வி உள்ளதா? கைவினைஞருக்கு செய்தி அனுப்பவும்' : language === 'hi' ? 'कोई प्रश्न है? कारीगर को संदेश भेजें' : 'Have a question? Message the artisan'}
            </Text>
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
          <Text style={styles.priceLabel}>
            {language === 'ta' ? 'விலை' : language === 'hi' ? 'मूल्य' : 'Price'}
          </Text>
          <Text style={styles.priceValue}>{product.price}</Text>
          <Text style={styles.priceSub}>
            {language === 'ta' ? 'இலவச விநியோகம்' : language === 'hi' ? 'निःशुल्क शिपिंग' : 'Free shipping'}
          </Text>
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
              <Text style={styles.editBtnText}>
                {language === 'ta' ? 'தயாரிப்பைத் திருத்து' : language === 'hi' ? 'उत्पाद संपादित करें' : 'Edit Product'}
              </Text>
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
              <Text style={styles.addToCartText}>
                {language === 'ta' ? 'கார்ட்டில் சேர்' : language === 'hi' ? 'कार्ट में जोड़ें' : 'Add to Cart'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.buyNowBtn}
              onPress={() => setBuyModalOpen(true)}
              activeOpacity={0.88}
            >
              <Text style={styles.buyNowText}>
                {language === 'ta' ? 'உடனே வாங்கு' : language === 'hi' ? 'अभी खरीदें' : 'Buy Now'}
              </Text>
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
                <Text style={styles.successTitle}>
                  {language === 'ta' ? 'ஆர்டர் உறுதி செய்யப்பட்டது!' : language === 'hi' ? 'ऑर्डर की पुष्टि हो गई!' : 'Order Confirmed!'}
                </Text>
                <Text style={styles.successSub}>
                  {language === 'ta'
                    ? `உங்கள் ஆர்டர் #${placedOrderId.slice(-6).toUpperCase()} வைக்கப்பட்டது. கைவினைப் பொருளைத் தயாரிக்க கைவினைஞருக்கு அறிவிக்கப்பட்டுள்ளது.`
                    : language === 'hi'
                    ? `आपका ऑर्डर #${placedOrderId.slice(-6).toUpperCase()} दर्ज कर लिया गया है। शिल्प तैयार करने के लिए कारीगर को सूचित कर दिया गया है।`
                    : `Your order #${placedOrderId.slice(-6).toUpperCase()} has been placed. The artisan has been notified to prepare your handcrafted piece.`}
                </Text>

                <View style={styles.orderSummaryPill}>
                  <Text style={styles.summaryItemTitle}>{product.title}</Text>
                  <Text style={styles.summaryItemQty}>
                    {language === 'ta' ? `அளவு: ${quantity} · மொத்தம்: ${formattedOrderTotal}` : language === 'hi' ? `मात्रा: ${quantity} · कुल: ${formattedOrderTotal}` : `Qty: ${quantity} · Total: ${formattedOrderTotal}`}
                  </Text>
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
                    <Text style={styles.secondaryDoneText}>
                      {language === 'ta' ? 'தொடர்ந்து உலாவுக' : language === 'hi' ? 'खरीदारी जारी रखें' : 'Keep Browsing'}
                    </Text>
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
                    <Text style={styles.primaryDoneText}>
                      {language === 'ta' ? 'ஆர்டர்களில் பார்க்க →' : language === 'hi' ? 'ऑर्डर देखें →' : 'View in Orders →'}
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            ) : (
              /* Checkout Form */
              <>
                {/* Modal Header */}
                <View style={styles.modalHeader}>
                  <Text style={styles.modalTitle}>
                    {language === 'ta' ? 'விரைவு நேரடி ஆர்டர்' : language === 'hi' ? 'त्वरित प्रत्यक्ष ऑर्डर' : 'Quick Direct Order'}
                  </Text>
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
                    <Text style={styles.checkoutMeta}>{product.craft_type || (language === 'ta' ? 'கைவினை' : language === 'hi' ? 'हस्तनिर्मित' : 'Handmade')}</Text>
                    <Text style={styles.checkoutPrice}>{product.price} × {quantity} = {formattedOrderTotal}</Text>
                  </View>
                </View>

                {/* Delivery Address */}
                <Text style={styles.inputLabel}>
                  {language === 'ta' ? 'டெலிவரி முகவரி' : language === 'hi' ? 'डिलीवरी का पता' : 'Delivery Address'}
                </Text>
                <View style={styles.addressInputWrapper}>
                  <MapPin size={18} color="#8E8E93" style={{ marginTop: 2 }} />
                  <TextInput
                    style={styles.addressInput}
                    value={deliveryAddress}
                    onChangeText={setDeliveryAddress}
                    placeholder={language === 'ta' ? 'முழு விநியோக முகவரியை உள்ளிடவும்...' : language === 'hi' ? 'पूरा शिपिंग पता दर्ज करें...' : 'Enter complete shipping address...'}
                    placeholderTextColor="#A0A0A5"
                    multiline
                    numberOfLines={2}
                  />
                </View>

                {/* Payment Method Selector */}
                <Text style={styles.inputLabel}>
                  {language === 'ta' ? 'கட்டண முறை' : language === 'hi' ? 'भुगतान विधि' : 'Payment Method'}
                </Text>
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
                      {language === 'ta' ? 'பொருளைப் பெறும்போது பணம்' : language === 'hi' ? 'कैश ऑन डिलीवरी' : 'Cash on Delivery'}
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
                      {language === 'ta' ? 'கார்டு' : language === 'hi' ? 'कार्ड' : 'Card'}
                    </Text>
                  </TouchableOpacity>
                </View>

                {/* Order Total & Confirm Button */}
                <View style={styles.modalFooterRow}>
                  <View>
                    <Text style={styles.footerTotalLabel}>
                      {language === 'ta' ? 'மொத்த தொகை' : language === 'hi' ? 'कुल राशि' : 'Total Amount'}
                    </Text>
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
                      <Text style={styles.confirmOrderText}>
                        {language === 'ta' ? 'ஆர்டரை உறுதிப்படுத்துக →' : language === 'hi' ? 'ऑर्डर की पुष्टि करें →' : 'Confirm Order →'}
                      </Text>
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
              <Text style={styles.modalTitle}>
                {language === 'ta' ? 'கைவினைஞருக்கு செய்தி' : language === 'hi' ? 'कारीगर को संदेश' : 'Message Artisan'}
              </Text>
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
              {language === 'ta'
                ? 'தனிப்பயன் அளவுகள், பொருட்கள் அல்லது மொத்த ஆர்டர்கள் பற்றி கேட்கவும்.'
                : language === 'hi'
                ? 'कस्टम साइजिंग, सामग्री, बल्क ऑर्डर या डिलीवरी तिथि के बारे में पूछें।'
                : 'Ask about custom sizing, materials, bulk orders, or dispatch dates.'}
            </Text>

            <TextInput
              style={styles.inquiryTextInput}
              value={inquiryMessage}
              onChangeText={setInquiryMessage}
              placeholder={language === 'ta' ? 'எ.கா. இந்த துப்பட்டாவை 2.5 மீட்டர் நீளத்தில் உருவாக்க முடியுமா?' : language === 'hi' ? 'उदा. क्या यह दुपट्टा 2.5 मीटर लंबाई में इंडिगो नीले रंग में बनाया जा सकता है?' : 'e.g. Can this dupatta be made in indigo blue with 2.5m length?'}
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
                <Text style={styles.sendInquiryBtnText}>
                  {language === 'ta' ? 'செய்தி அனுப்புக →' : language === 'hi' ? 'संदेश भेजें →' : 'Send Message to Artisan'}
                </Text>
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
    backgroundColor: Colors.primary,
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
    backgroundColor: Colors.primary,
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
    borderColor: Colors.primary,
    borderRadius: 30,
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  addToCartText: {
    fontSize: 13,
    fontWeight: '700',
    fontFamily: Fonts.headingBold,
    color: Colors.primary,
  },
  buyNowBtn: {
    backgroundColor: Colors.primary,
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
    paddingBottom: 16,
    marginBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
    gap: 12,
  },
  checkoutThumb: {
    width: 54,
    height: 54,
    borderRadius: 12,
    backgroundColor: '#F5F5F7',
  },
  checkoutInfo: {
    flex: 1,
    gap: 3,
  },
  checkoutTitle: {
    fontSize: 14,
    fontWeight: '700',
    fontFamily: Fonts.headingBold,
    color: '#0D0D0D',
  },
  checkoutMeta: {
    fontSize: 12,
    fontFamily: Fonts.body,
    color: '#8E8E93',
  },
  checkoutPrice: {
    fontSize: 15,
    fontWeight: '800',
    fontFamily: Fonts.headingBold,
    color: '#0D0D0D',
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '700',
    fontFamily: Fonts.headingBold,
    color: '#0D0D0D',
    marginBottom: 10,
  },
  addressInputWrapper: {
    flexDirection: 'row',
    backgroundColor: '#F9F9FB',
    borderRadius: 14,
    padding: 12,
    gap: 10,
    borderWidth: 1,
    borderColor: '#EFEFF2',
    marginBottom: 16,
  },
  addressInput: {
    flex: 1,
    fontSize: 13,
    fontFamily: Fonts.body,
    color: '#0D0D0D',
    minHeight: 40,
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: '700',
    fontFamily: Fonts.headingBold,
    color: '#0D0D0D',
    marginBottom: 8,
  },
  paymentMethodsRow: {
    flexDirection: 'row',
    gap: 10,
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
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
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
  paymentCard: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#F9F9FB',
    borderRadius: 14,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: '#EFEFF2',
  },
  paymentCardSelected: {
    borderColor: Colors.primary,
    backgroundColor: '#E8F5E9',
  },
  paymentCardText: {
    fontSize: 12,
    fontWeight: '600',
    fontFamily: Fonts.heading,
    color: '#6B7280',
  },
  paymentCardTextSelected: {
    color: Colors.primary,
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
  checkoutTotalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 14,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  checkoutTotalLabel: {
    fontSize: 14,
    fontWeight: '600',
    fontFamily: Fonts.bodyMedium,
    color: '#6B7280',
  },
  checkoutTotalVal: {
    fontSize: 20,
    fontWeight: '800',
    fontFamily: Fonts.headingBold,
    color: '#0D0D0D',
  },
  confirmOrderBtn: {
    backgroundColor: Colors.primary,
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
    backgroundColor: Colors.primary,
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
    backgroundColor: Colors.primary,
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

  // ── GeM Compliance Panel Styles ──────────────────────────────────
  gemPanel: {
    backgroundColor: '#EFF6FF',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#BFDBFE',
    padding: 16,
    marginBottom: 18,
  },
  gemPanelHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 14,
  },
  gemPanelTitle: {
    flex: 1,
    fontSize: 13,
    fontWeight: '700',
    fontFamily: Fonts.headingBold,
    color: '#1E3A8A',
  },
  gemReadyBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: '#D1FAE5',
    borderRadius: 20,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  gemReadyText: {
    fontSize: 10,
    fontWeight: '700',
    fontFamily: Fonts.headingBold,
    color: '#059669',
  },
  gemIncBadge: {
    backgroundColor: '#FEF3C7',
    borderRadius: 20,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  gemIncText: {
    fontSize: 10,
    fontWeight: '700',
    fontFamily: Fonts.headingBold,
    color: '#D97706',
  },
  gemGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  gemCell: {
    width: '47%',
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: '#E0EAFB',
  },
  gemCellLabel: {
    fontSize: 10,
    fontWeight: '600',
    fontFamily: Fonts.bodyMedium,
    color: '#6B7280',
    marginBottom: 2,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  gemCellValue: {
    fontSize: 13,
    fontWeight: '700',
    fontFamily: Fonts.headingBold,
    color: '#1E40AF',
  },
  gemOEMRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#BFDBFE',
  },

  /* Tappable Verified Shop Brand Row */
  detailSellerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F7F6F2',
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginTop: 10,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E8E5DD',
  },
  detailSellerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  detailSellerLogo: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  detailSellerPlaceholder: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#E8F3E4',
    alignItems: 'center',
    justifyContent: 'center',
  },
  detailSellerPlaceholderText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#2D5016',
  },
  detailSellerName: {
    fontSize: 14,
    fontWeight: '700',
    fontFamily: Fonts.headingBold,
    color: '#1C1917',
  },
  detailSellerSub: {
    fontSize: 11,
    color: '#78716C',
    fontWeight: '500',
    marginTop: 1,
  },
  detailSellerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  detailVerifiedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
    borderWidth: 0.8,
    borderColor: '#A7F3D0',
  },
  detailVerifiedText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#065F46',
  },
});
