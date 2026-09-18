import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Image,
  StatusBar,
  ActivityIndicator,
  Modal,
  Pressable,
  Alert,
  Dimensions,
  RefreshControl,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter, useFocusEffect } from 'expo-router';
import {
  Search,
  SlidersHorizontal,
  Heart,
  ShoppingBag,
  Home,
  Bell,
  User,
  X,
  ChevronRight,
  ArrowRight,
  Sparkles,
  MapPin,
  Check,
  Package,
  ShieldCheck,
  Store,
  Award,
  Layers,
  Settings,
  Mic,
  MessageCircle,
  Truck,
  CheckCircle2,
  Tag,
  Send,
  ArrowLeft,
} from 'lucide-react-native';
import { Fonts, Shadow, Radius, NAV_HEIGHT } from '@/constants/artisan-theme';
import { useAuth } from '@/context/AuthContext';
import { useCart } from '@/context/CartContext';
import { useProductSpeech } from '@/utils/speech';
import { ProductListenButton } from '@/components/ui/ProductListenButton';
import { LanguagePicker } from '@/components/artisan/LanguagePicker';
import { BuyerBottomNav, BuyerTab } from '@/components/buyer/BuyerBottomNav';
import AsyncStorage from '@/utils/storage';

import { BACKEND_URL, normalizeImageUrl, DEFAULT_CRAFT_FALLBACK_IMAGE } from '@/config/api';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const DEFAULT_PRODUCT_IMG = DEFAULT_CRAFT_FALLBACK_IMAGE;
const DEFAULT_ARTISAN_AVATAR = 'https://images.unsplash.com/photo-1544717305-2782549b5136?w=200&q=80';

// Safe AsyncStorage wrapper to avoid "Native module is null" crashes
const safeStorageGet = async (key: string): Promise<string | null> => {
  try {
    return await AsyncStorage.getItem(key);
  } catch (_) {
    return null;
  }
};

const safeStorageSet = async (key: string, val: string): Promise<void> => {
  try {
    await AsyncStorage.setItem(key, val);
  } catch (_) {}
};

interface Product {
  id: string;
  title: string;
  category?: string;
  craft_type?: string;
  price: string;
  original_price?: string;
  image_url?: string;
  artisan_id?: string;
  artisan_name?: string;
  artisan_location?: string;
  description_en?: string;
  description_hi?: string;
  units?: number;
  is_gi_tagged?: boolean;
  is_verified?: boolean;
  badge?: 'bestseller' | 'new' | 'pricedrop';
}

interface ArtisanMaker {
  id: string;
  name: string;
  craft_type: string;
  location?: string;
  avatar_url?: string;
  bio?: string;
  is_verified?: boolean;
  shop_name?: string;
}

export interface MessageItem {
  id: string;
  sender: 'buyer' | 'seller' | 'system';
  sender_name?: string;
  text: string;
  time?: string;
  timestamp?: string;
}

export interface BuyerMessage {
  id: string;
  order_id?: string;
  product_id?: string;
  product_title?: string;
  product_image?: string;
  artisan_id?: string;
  artisan_name?: string;
  message: string;
  reply?: string;
  replied_at?: string;
  status: string;
  created_at: string;
  messages?: MessageItem[];
}

// Clean categories without emojis
const CATEGORY_ITEMS = [
  { id: 'all', label: 'All Crafts', filter: 'All', Icon: Layers },
  { id: 'textiles', label: 'Handlooms & Sarees', filter: 'Handloom', Icon: Sparkles },
  { id: 'embroidery', label: 'Embroidery & Toys', filter: 'Embroidery', Icon: Tag },
  { id: 'pottery', label: 'Pottery & Clay', filter: 'Pottery', Icon: Package },
  { id: 'woodcraft', label: 'Woodcraft', filter: 'Woodcraft', Icon: Store },
  { id: 'metalwork', label: 'Metalcraft', filter: 'Metalcraft', Icon: ShieldCheck },
  { id: 'jewelry', label: 'Jewelry', filter: 'Jewelry', Icon: Award },
  { id: 'paintings', label: 'Folk Art', filter: 'Paintings', Icon: ShoppingBag },
];

const HERO_SLIDES = [
  {
    id: 'slide-1',
    tag: 'DIRECT FROM ARTISANS',
    headline: 'Buy Direct. Empower an Artisan.',
    subtext: 'Every purchase goes straight to the maker. Zero middlemen.',
    cta: 'Explore Catalog',
    bg: '#0D0D0D',
    textColor: '#FFFFFF',
    tagColor: '#FBBF24',
    btnBg: '#FFFFFF',
    btnText: '#0D0D0D',
  },
  {
    id: 'slide-2',
    tag: 'FESTIVE HANDMADE COLLECTION',
    headline: 'Authentic Heritage Crafts',
    subtext: 'Handcrafted sarees, regional pottery, and carved treasures.',
    cta: 'Shop Now',
    bg: '#1C1917',
    textColor: '#FFFFFF',
    tagColor: '#FB923C',
    btnBg: '#FB923C',
    btnText: '#000000',
  },
  {
    id: 'slide-3',
    tag: 'VERIFIED MAKERS',
    headline: 'Certified Heritage Artisans',
    subtext: 'Direct artisan pricing with fair trade guarantee.',
    cta: 'Meet The Makers',
    bg: '#142820',
    textColor: '#FFFFFF',
    tagColor: '#34D399',
    btnBg: '#FFFFFF',
    btnText: '#0D0D0D',
  },
];

const HOW_IT_WORKS = [
  { step: '1', Icon: Search, text: 'Discover certified artisan products' },
  { step: '2', Icon: MessageCircle, text: 'Chat directly with the maker' },
  { step: '3', Icon: Truck, text: 'Direct delivery, fair price guaranteed' },
];

export default function BuyerHomeScreen() {
  const [activeTab, setActiveTab] = useState<BuyerTab>('home');
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [locationModalOpen, setLocationModalOpen] = useState(false);
  const [notifModalOpen, setNotifModalOpen] = useState(false);
  const [wishlistModalOpen, setWishlistModalOpen] = useState(false);
  const [messagesModalOpen, setMessagesModalOpen] = useState(false);

  // Booking Modal State
  const [bookingModalOpen, setBookingModalOpen] = useState(false);
  const [bookingProduct, setBookingProduct] = useState<Product | null>(null);
  const [bookingQty, setBookingQty] = useState(1);
  const [bookingBuyerName, setBookingBuyerName] = useState('');
  const [bookingBuyerPhone, setBookingBuyerPhone] = useState('');
  const [bookingAddress, setBookingAddress] = useState('');
  const [isBooking, setIsBooking] = useState(false);

  // Direct Message Modal State
  const [messageModalOpen, setMessageModalOpen] = useState(false);
  const [messageProduct, setMessageProduct] = useState<Product | null>(null);
  const [messageText, setMessageText] = useState('');
  const [isSendingMessage, setIsSendingMessage] = useState(false);

  // Delivery City & Pincode
  const [deliveryCity, setDeliveryCity] = useState('Bengaluru');
  const [deliveryPincode, setDeliveryPincode] = useState('560001');

  // Hero Carousel
  const [currentSlideIndex, setCurrentSlideIndex] = useState(0);
  const heroScrollRef = useRef<ScrollView>(null);

  // Search & Filter
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');

  // Data
  const [products, setProducts] = useState<Product[]>([]);
  const [artisans, setArtisans] = useState<ArtisanMaker[]>([]);
  const [buyerMessages, setBuyerMessages] = useState<BuyerMessage[]>([]);
  const [selectedChat, setSelectedChat] = useState<BuyerMessage | null>(null);
  const [chatInputText, setChatInputText] = useState('');
  const [isSendingChat, setIsSendingChat] = useState(false);
  const [alertsModalOpen, setAlertsModalOpen] = useState(false);
  const [wishlist, setWishlist] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [ordersCount, setOrdersCount] = useState(0);

  const { addToCart: addGlobalCart, cartCount } = useCart();
  const { buyerProfile, profile, signOut, phone } = useAuth();
  const { isSpeaking, toggle: toggleSpeech } = useProductSpeech();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const mainScrollRef = useRef<ScrollView>(null);

  // Initialize booking details from auth
  useEffect(() => {
    setBookingBuyerName(buyerProfile?.name || profile?.name || 'Verified Buyer');
    setBookingBuyerPhone(buyerProfile?.phone || phone || '+91 93450 73473');
    setBookingAddress(buyerProfile?.address_line ? `${buyerProfile.address_line}, ${buyerProfile.city || 'Bengaluru'}` : 'Flat 402, Heritage Residency, MG Road, Bengaluru - 560001');
  }, [buyerProfile, profile, phone]);

  // Fetch real products from backend and de-duplicate artisans
  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const [prodRes, artRes, inqRes] = await Promise.all([
        fetch(`${BACKEND_URL}/api/products`),
        fetch(`${BACKEND_URL}/api/artisans`),
        fetch(`${BACKEND_URL}/api/inquiries`),
      ]);

      if (prodRes.ok) {
        const pData = await prodRes.json();
        if (pData?.products && Array.isArray(pData.products)) {
          const formatted = pData.products.map((p: Product, idx: number) => {
            const priceNum = parseFloat((p.price || '0').replace(/[^0-9.]/g, '')) || 500;
            const origNum = Math.round(priceNum * 1.2);
            return {
              ...p,
              original_price: `₹${origNum.toLocaleString('en-IN')}`,
              image_url: normalizeImageUrl(p.image_url),
              artisan_name: p.artisan_name || 'Verified Artisan Maker',
              badge: idx === 0 ? 'bestseller' : idx === 1 ? 'new' : undefined,
            };
          });
          setProducts(formatted);
        }
      }

      if (artRes.ok) {
        const aData = await artRes.json();
        if (aData?.artisans && Array.isArray(aData.artisans)) {
          // De-duplicate artisans by id and ensure valid avatar
          const seenIds = new Set<string>();
          const cleanedArtisans: ArtisanMaker[] = [];
          for (const a of aData.artisans) {
            if (!a.id || seenIds.has(a.id)) continue;
            seenIds.add(a.id);
            cleanedArtisans.push({
              ...a,
              avatar_url: a.avatar_url && a.avatar_url.trim() ? a.avatar_url : DEFAULT_ARTISAN_AVATAR,
              shop_name: a.shop_name || `${a.name}'s Studio`,
              craft_type: a.craft_type || 'Master Craft',
            });
          }
          setArtisans(cleanedArtisans);
        }
      }

      if (inqRes.ok) {
        const iData = await inqRes.json();
        if (iData?.inquiries && Array.isArray(iData.inquiries)) {
          setBuyerMessages(iData.inquiries);
          setSelectedChat((curr) => {
            if (!curr) return null;
            const updated = iData.inquiries.find((m: any) => m.id === curr.id);
            return updated || curr;
          });
        }
      }

      // Safe storage loads
      const savedWishlist = await safeStorageGet('@buyer_wishlist');
      if (savedWishlist) setWishlist(JSON.parse(savedWishlist));

      const savedCity = await safeStorageGet('@buyer_delivery_city');
      if (savedCity) setDeliveryCity(savedCity);

      const savedPin = await safeStorageGet('@buyer_delivery_pincode');
      if (savedPin) setDeliveryPincode(savedPin);

      // Orders count
      const activePhone = buyerProfile?.phone || phone || '';
      let ordUrl = `${BACKEND_URL}/api/orders`;
      if (activePhone) ordUrl += `?buyer_phone=${encodeURIComponent(activePhone)}`;
      const ordRes = await fetch(ordUrl);
      if (ordRes.ok) {
        const oData = await ordRes.json();
        if (oData?.orders) setOrdersCount(oData.orders.length);
      }
    } catch (err) {
      console.warn('[BuyerHome] Data fetch error handled gracefully');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [buyerProfile?.phone, phone]);

  useFocusEffect(
    useCallback(() => {
      fetchData();
    }, [fetchData])
  );

  const onRefresh = () => {
    setRefreshing(true);
    fetchData();
  };

  // Auto-rotate hero banner every 4 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentSlideIndex((prev) => {
        const next = (prev + 1) % HERO_SLIDES.length;
        heroScrollRef.current?.scrollTo({
          x: next * (SCREEN_WIDTH - 32),
          animated: true,
        });
        return next;
      });
    }, 4000);
    return () => clearInterval(interval);
  }, []);

  // Toggle Wishlist
  const toggleWishlist = async (productId: string) => {
    const updated = { ...wishlist, [productId]: !wishlist[productId] };
    setWishlist(updated);
    await safeStorageSet('@buyer_wishlist', JSON.stringify(updated));
  };

  // Add to Global Cart
  const handleAddToCart = (product: Product) => {
    addGlobalCart(
      {
        id: product.id,
        title: product.title,
        price: product.price,
        category: product.category || product.craft_type,
        craft_type: product.craft_type,
        image_url: product.image_url,
        artisan_id: product.artisan_id,
        artisan_name: product.artisan_name,
      },
      1
    );

    Alert.alert('Added to Bag', `"${product.title}" added to your bag.`, [
      { text: 'Keep Browsing', style: 'cancel' },
      { text: 'View Bag', onPress: () => router.push('/cart') },
    ]);
  };

  // Open Direct Booking Modal
  const handleOpenBooking = (product: Product) => {
    setBookingProduct(product);
    setBookingQty(1);
    setBookingModalOpen(true);
  };

  // Submit Direct Booking to Backend (Triggers Seller Order & Notification)
  const handleConfirmBooking = async () => {
    if (!bookingProduct) return;
    if (!bookingAddress.trim()) {
      Alert.alert('Address Required', 'Please enter your shipping delivery address.');
      return;
    }

    setIsBooking(true);
    try {
      const priceNum = parseFloat(bookingProduct.price.replace(/[^0-9.]/g, '')) || 500;
      const totalAmountStr = `₹${(priceNum * bookingQty).toLocaleString('en-IN')}`;

      const res = await fetch(`${BACKEND_URL}/api/orders`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          product_id: bookingProduct.id,
          product_title: bookingProduct.title,
          product_image: bookingProduct.image_url || '',
          artisan_id: bookingProduct.artisan_id || null,
          artisan_name: bookingProduct.artisan_name || 'Master Artisan',
          buyer_phone: bookingBuyerPhone || phone || '+91 93450 73473',
          buyer_name: bookingBuyerName || 'Handmade Patron',
          buyer_address: bookingAddress.trim(),
          quantity: bookingQty,
          total_amount: totalAmountStr,
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        // Also ensure inquiry notification is registered for Seller Dashboard notifications & messages
        try {
          await fetch(`${BACKEND_URL}/api/inquiries`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              product_id: bookingProduct.id,
              product_title: bookingProduct.title,
              artisan_id: bookingProduct.artisan_id || null,
              buyer_phone: bookingBuyerPhone || phone || '+91 93450 73473',
              buyer_name: bookingBuyerName || 'Handmade Patron',
              buyer_type: 'Order Confirmed',
              message: `New Order Booked! Quantity: ${bookingQty}. Total: ${totalAmountStr}. Delivery: ${bookingAddress.trim()}`,
            }),
          });
        } catch (_) {}

        setBookingModalOpen(false);
        Alert.alert(
          'Booking Confirmed!',
          `Your order for "${bookingProduct.title}" (Qty: ${bookingQty}) has been confirmed. The seller has received your booking notification and message.`,
          [{ text: 'OK' }]
        );
        fetchData();
      } else {
        Alert.alert('Booking Error', data.error || 'Could not place booking. Please try again.');
      }
    } catch (_) {
      Alert.alert('Error', 'Network error placing booking.');
    } finally {
      setIsBooking(false);
    }
  };

  // Open Direct Message Modal
  const handleOpenMessage = (product: Product) => {
    setMessageProduct(product);
    setMessageText(`Hello! I am interested in "${product.title}". Is this available for immediate dispatch or custom order?`);
    setMessageModalOpen(true);
  };

  // Submit Message to Seller (Appears in Seller Dashboard Inquiries)
  const handleSendMessage = async () => {
    if (!messageProduct || !messageText.trim()) return;

    setIsSendingMessage(true);
    try {
      const res = await fetch(`${BACKEND_URL}/api/inquiries`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          product_id: messageProduct.id,
          product_title: messageProduct.title,
          artisan_id: messageProduct.artisan_id || null,
          buyer_phone: bookingBuyerPhone || phone || '+91 93450 73473',
          buyer_name: bookingBuyerName || 'Handmade Buyer',
          buyer_type: 'Product Inquiry',
          message: messageText.trim(),
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setMessageModalOpen(false);
        Alert.alert('Message Sent', 'Your message was sent directly to the seller. They can reply from their dashboard.');
        fetchData();
      } else {
        Alert.alert('Error', 'Failed to send message.');
      }
    } catch (_) {
      Alert.alert('Error', 'Network error sending message.');
    } finally {
      setIsSendingMessage(false);
    }
  };

  // Send message in active two-way chat thread with seller
  const handleSendChatMessage = async () => {
    if (!selectedChat || !chatInputText.trim()) return;
    const textToSend = chatInputText.trim();
    setChatInputText('');
    setIsSendingChat(true);

    const now = new Date();
    const timeStr = now.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }).toLowerCase();
    const tempMsg: MessageItem = {
      id: `msg-${Date.now()}`,
      sender: 'buyer',
      sender_name: bookingBuyerName || buyerProfile?.name || 'Buyer',
      text: textToSend,
      time: timeStr,
      timestamp: now.toISOString(),
    };

    const updatedMessages = [...(selectedChat.messages || []), tempMsg];
    const updatedChat: BuyerMessage = {
      ...selectedChat,
      messages: updatedMessages,
    };
    setSelectedChat(updatedChat);
    setBuyerMessages((prev) => prev.map((m) => (m.id === updatedChat.id ? updatedChat : m)));

    try {
      let res = await fetch(`${BACKEND_URL}/api/inquiries/${selectedChat.id}/message`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sender: 'buyer',
          sender_name: bookingBuyerName || buyerProfile?.name || 'Buyer',
          text: textToSend,
        }),
      });
      if (!res.ok) {
        res = await fetch(`${BACKEND_URL}/api/inquiries/${selectedChat.id}/reply`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ reply: textToSend }),
        });
      }
      if (res.ok) {
        const data = await res.json();
        if (data?.inquiry) {
          setSelectedChat(data.inquiry);
          setBuyerMessages((prev) => prev.map((m) => (m.id === data.inquiry.id ? data.inquiry : m)));
        }
      }
    } catch (err) {
      console.warn('Failed to send chat message:', err);
    } finally {
      setIsSendingChat(false);
    }
  };

  // Bottom Nav Change Handler
  const handleTabChange = (tab: BuyerTab) => {
    setActiveTab(tab);
    if (tab === 'home') {
      mainScrollRef.current?.scrollTo({ y: 0, animated: true });
    } else if (tab === 'explore') {
      router.push('/explore');
    } else if (tab === 'cart') {
      router.push('/cart');
    } else if (tab === 'wishlist') {
      setWishlistModalOpen(true);
    } else if (tab === 'profile') {
      router.push('/profile');
    }
  };

  // Filter products by search and category
  const filteredProducts = products.filter((p) => {
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchTitle = (p.title || '').toLowerCase().includes(q);
      const matchCraft = (p.craft_type || '').toLowerCase().includes(q);
      const matchCat = (p.category || '').toLowerCase().includes(q);
      if (!matchTitle && !matchCraft && !matchCat) return false;
    }
    if (selectedCategory !== 'All') {
      const cat = selectedCategory.toLowerCase();
      const matchCraft = (p.craft_type || '').toLowerCase().includes(cat);
      const matchCat = (p.category || '').toLowerCase().includes(cat);
      if (!matchCraft && !matchCat) return false;
    }
    return true;
  });

  const wishlistItems = products.filter((p) => !!wishlist[p.id]);
  const wishlistCount = Object.values(wishlist).filter(Boolean).length;

  return (
    <View style={styles.root}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

      {/* ── Top Header ────────────────────────────────────────────── */}
      <View style={[styles.header, { paddingTop: insets.top + 6 }]}>
        <View style={styles.headerTopRow}>
          {/* Menu Circle Button */}
          <TouchableOpacity
            style={styles.menuCircle}
            onPress={() => setDrawerOpen(true)}
            activeOpacity={0.8}
          >
            <View style={styles.menuLines}>
              <View style={styles.menuLineLong} />
              <View style={styles.menuLineShort} />
              <View style={styles.menuLineMed} />
            </View>
          </TouchableOpacity>

          {/* Location Selector Pill */}
          <TouchableOpacity
            style={styles.locationPill}
            onPress={() => setLocationModalOpen(true)}
            activeOpacity={0.8}
          >
            <MapPin size={13} color="#B5502F" strokeWidth={2.2} />
            <Text style={styles.locationText} numberOfLines={1}>
              Delivering to <Text style={styles.locationCity}>{deliveryCity}</Text>
            </Text>
            <ChevronRight size={12} color="#6B7280" />
          </TouchableOpacity>

          {/* Right: Notifications + Messages + Cart Icons */}
          <View style={styles.headerRightGroup}>
            <TouchableOpacity
              style={styles.circleIconBtn}
              onPress={() => setAlertsModalOpen(true)}
              activeOpacity={0.8}
            >
              <Bell size={18} color="#0D0D0D" strokeWidth={2} />
              {(buyerMessages.length > 0 || ordersCount > 0) && <View style={styles.unreadDot} />}
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.circleIconBtn}
              onPress={() => {
                setSelectedChat(null);
                setMessagesModalOpen(true);
              }}
              activeOpacity={0.8}
            >
              <MessageCircle size={18} color="#0D0D0D" strokeWidth={2} />
              {buyerMessages.some((m) => m.reply || m.status === 'new_order') && <View style={styles.unreadDot} />}
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.circleIconBtn}
              onPress={() => router.push('/cart')}
              activeOpacity={0.8}
            >
              <ShoppingBag size={18} color="#0D0D0D" strokeWidth={2} />
              {cartCount > 0 && (
                <View style={styles.cartBadge}>
                  <Text style={styles.cartBadgeText}>{cartCount}</Text>
                </View>
              )}
            </TouchableOpacity>
          </View>
        </View>

        {/* Search Bar + Language Toggle */}
        <View style={styles.searchRow}>
          <View style={styles.searchPill}>
            <Search size={18} color="#9CA3AF" strokeWidth={2} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search handloom sarees, pottery, woodcraft..."
              placeholderTextColor="#9CA3AF"
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
            {!!searchQuery && (
              <TouchableOpacity onPress={() => setSearchQuery('')}>
                <X size={16} color="#9CA3AF" />
              </TouchableOpacity>
            )}
          </View>
          <LanguagePicker />
        </View>
      </View>

      <ScrollView
        ref={mainScrollRef}
        style={styles.scroll}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: NAV_HEIGHT + insets.bottom + 40 },
        ]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#0D0D0D" />
        }
      >
        {/* ── Hero Carousel Banner ──────────────────────────────────── */}
        {!searchQuery && (
          <View style={styles.heroSection}>
            <ScrollView
              ref={heroScrollRef}
              horizontal
              pagingEnabled
              showsHorizontalScrollIndicator={false}
              onMomentumScrollEnd={(e) => {
                const idx = Math.round(e.nativeEvent.contentOffset.x / (SCREEN_WIDTH - 32));
                setCurrentSlideIndex(idx);
              }}
              contentContainerStyle={styles.heroCarousel}
            >
              {HERO_SLIDES.map((slide) => (
                <View
                  key={slide.id}
                  style={[
                    styles.heroCard,
                    { backgroundColor: slide.bg, width: SCREEN_WIDTH - 32 },
                  ]}
                >
                  <View style={styles.heroTagRow}>
                    <Sparkles size={12} color={slide.tagColor} />
                    <Text style={[styles.heroTagText, { color: slide.tagColor }]}>
                      {slide.tag}
                    </Text>
                  </View>
                  <Text style={[styles.heroHeadline, { color: slide.textColor }]}>
                    {slide.headline}
                  </Text>
                  <Text style={[styles.heroSubtext, { color: slide.textColor + 'D9' }]}>
                    {slide.subtext}
                  </Text>
                  <TouchableOpacity
                    style={[styles.heroBtn, { backgroundColor: slide.btnBg }]}
                    onPress={() => router.push('/explore')}
                    activeOpacity={0.85}
                  >
                    <Text style={[styles.heroBtnText, { color: slide.btnText }]}>
                      {slide.cta}
                    </Text>
                  </TouchableOpacity>
                </View>
              ))}
            </ScrollView>

            <View style={styles.dotsRow}>
              {HERO_SLIDES.map((_, idx) => (
                <View
                  key={idx}
                  style={[
                    styles.dot,
                    currentSlideIndex === idx && styles.dotActive,
                  ]}
                />
              ))}
            </View>
          </View>
        )}

        {/* ── Category Filters (Clean Without Emojis) ───────────────── */}
        <View style={styles.categorySection}>
          <Text style={styles.sectionTitle}>Shop by Craft</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.categoryScroll}
          >
            {CATEGORY_ITEMS.map((cat) => {
              const isSelected = selectedCategory === cat.filter;
              const IconComp = cat.Icon;
              return (
                <TouchableOpacity
                  key={cat.id}
                  style={[styles.catPill, isSelected && styles.catPillActive]}
                  onPress={() => setSelectedCategory(cat.filter)}
                  activeOpacity={0.85}
                >
                  <IconComp
                    size={14}
                    color={isSelected ? '#FFFFFF' : '#4B5563'}
                    strokeWidth={2}
                  />
                  <Text style={[styles.catLabel, isSelected && styles.catLabelActive]}>
                    {cat.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>

        {/* ── Verified Master Artisans Section (Clean Keys & Safe Avatars) ─ */}
        {!searchQuery && artisans.length > 0 && (
          <View style={styles.makersSection}>
            <View style={styles.makersHeader}>
              <Text style={styles.makersTitle}>Meet the Makers</Text>
              <Text style={styles.makersSubtext}>
                Verified regional artisans preserving generational crafts
              </Text>
            </View>

            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.makersScroll}
            >
              {artisans.map((artisan, index) => (
                <View key={`${artisan.id}-${index}`} style={styles.makerCard}>
                  <View style={styles.makerAvatarWrap}>
                    <Image
                      source={{ uri: artisan.avatar_url || DEFAULT_ARTISAN_AVATAR }}
                      style={styles.makerAvatar}
                    />
                    <View style={styles.makerVerifiedBadge}>
                      <Check size={10} color="#FFFFFF" strokeWidth={3} />
                    </View>
                  </View>
                  <Text style={styles.makerName} numberOfLines={1}>
                    {artisan.name}
                  </Text>
                  <Text style={styles.makerCraft} numberOfLines={1}>
                    {artisan.craft_type}
                  </Text>
                  <TouchableOpacity
                    style={styles.makerShopBtn}
                    onPress={() => {
                      setSelectedCategory('All');
                      setSearchQuery(artisan.name);
                    }}
                    activeOpacity={0.85}
                  >
                    <Text style={styles.makerShopBtnText}>View Craft</Text>
                    <ArrowRight size={10} color="#0D0D0D" />
                  </TouchableOpacity>
                </View>
              ))}
            </ScrollView>
          </View>
        )}

        {/* ── All Products Added by Sellers (Full Real Data) ─────────── */}
        <View style={styles.productsSection}>
          <View style={styles.productsHeader}>
            <View>
              <Text style={styles.productsTitle}>
                {selectedCategory === 'All' ? 'Seller Products Catalog' : `${selectedCategory} Collection`}
              </Text>
              <Text style={styles.productsSubheader}>
                Direct from master artisans · {filteredProducts.length} items available
              </Text>
            </View>
            {selectedCategory !== 'All' && (
              <TouchableOpacity onPress={() => setSelectedCategory('All')}>
                <Text style={styles.clearFilterText}>View All</Text>
              </TouchableOpacity>
            )}
          </View>

          {loading ? (
            <View style={styles.loaderBox}>
              <ActivityIndicator size="small" color="#0D0D0D" />
              <Text style={styles.loaderText}>Loading seller products...</Text>
            </View>
          ) : filteredProducts.length === 0 ? (
            <View style={styles.emptyBox}>
              <Package size={40} color="#9CA3AF" />
              <Text style={styles.emptyTitle}>No Products Found</Text>
              <Text style={styles.emptySub}>
                Try clearing your search filter or checking back soon as more artisans list items.
              </Text>
              <TouchableOpacity
                style={styles.resetBtn}
                onPress={() => {
                  setSelectedCategory('All');
                  setSearchQuery('');
                }}
              >
                <Text style={styles.resetBtnText}>Reset Filters</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.grid}>
              {filteredProducts.map((item) => {
                const isSaved = !!wishlist[item.id];
                return (
                  <View key={item.id} style={styles.gridCell}>
                    <View style={styles.card}>
                      {/* Product Image Frame */}
                      <View style={styles.cardImgContainer}>
                        <TouchableOpacity
                          activeOpacity={0.9}
                          style={StyleSheet.absoluteFill}
                          onPress={() =>
                            router.push({
                              pathname: '/product-details',
                              params: {
                                id: item.id,
                                title: item.title,
                                price: item.price,
                                category: item.category || item.craft_type || 'Handicraft',
                                craft_type: item.craft_type || item.category || 'Handicraft',
                                image_url: item.image_url,
                                description_en: item.description_en || '',
                                units: item.units || 1,
                                artisan_id: item.artisan_id || '',
                                artisan_name: item.artisan_name || '',
                              },
                            })
                          }
                        >
                          <Image
                            source={{ uri: item.image_url || DEFAULT_PRODUCT_IMG }}
                            style={styles.cardImg}
                            resizeMode="cover"
                          />
                        </TouchableOpacity>

                        {/* Clean Status Pill Badge (No Emojis) */}
                        {item.badge && (
                          <View
                            style={[
                              styles.cardBadge,
                              item.badge === 'bestseller' && styles.badgeBestseller,
                              item.badge === 'new' && styles.badgeNew,
                            ]}
                          >
                            <Text style={styles.cardBadgeText}>
                              {item.badge === 'bestseller' ? 'Bestseller' : 'New Arrival'}
                            </Text>
                          </View>
                        )}

                        {/* Wishlist Heart */}
                        <TouchableOpacity
                          style={styles.wishlistBtn}
                          onPress={() => toggleWishlist(item.id)}
                          activeOpacity={0.8}
                        >
                          <Heart
                            size={14}
                            color={isSaved ? '#EF4444' : '#FFFFFF'}
                            fill={isSaved ? '#EF4444' : 'transparent'}
                            strokeWidth={2}
                          />
                        </TouchableOpacity>

                        {/* Listen Button (Speech Read-Aloud) */}
                        <ProductListenButton
                          product={item}
                          isSpeaking={isSpeaking(item.id)}
                          onToggle={toggleSpeech}
                          variant="card-overlay"
                        />
                      </View>

                      {/* Product Card Details */}
                      <View style={styles.cardBody}>
                        <Text style={styles.cardTitle} numberOfLines={1}>
                          {item.title}
                        </Text>
                        <Text style={styles.artisanSubtext} numberOfLines={1}>
                          by {item.artisan_name || 'Master Artisan'}
                        </Text>

                        {/* Price Row */}
                        <View style={styles.priceRow}>
                          <Text style={styles.priceCurrent}>{item.price}</Text>
                          {item.original_price && (
                            <Text style={styles.priceOriginal}>{item.original_price}</Text>
                          )}
                        </View>

                        {/* Action Buttons: Book Now, + Bag, and Message Seller */}
                        <View style={styles.cardActionsRow}>
                          <TouchableOpacity
                            style={styles.bookNowBtn}
                            onPress={() => handleOpenBooking(item)}
                            activeOpacity={0.85}
                          >
                            <Text style={styles.bookNowBtnText}>Book Now</Text>
                          </TouchableOpacity>

                          <TouchableOpacity
                            style={styles.bagBtn}
                            onPress={() => handleAddToCart(item)}
                            activeOpacity={0.85}
                          >
                            <ShoppingBag size={13} color="#FFFFFF" />
                          </TouchableOpacity>

                          <TouchableOpacity
                            style={styles.messageArtisanBtn}
                            onPress={() => handleOpenMessage(item)}
                            activeOpacity={0.85}
                          >
                            <MessageCircle size={13} color="#0D0D0D" />
                          </TouchableOpacity>
                        </View>
                      </View>
                    </View>
                  </View>
                );
              })}
            </View>
          )}
        </View>

        {/* ── Trust Strip: How It Works (Clean Vector Icons) ────────── */}
        <View style={styles.trustSection}>
          <Text style={styles.trustSectionTitle}>Why Buy on Artisans Marketplace?</Text>
          <View style={styles.trustCardsRow}>
            {HOW_IT_WORKS.map((step) => {
              const IconComp = step.Icon;
              return (
                <View key={step.step} style={styles.trustCard}>
                  <View style={styles.trustCardIconCircle}>
                    <IconComp size={16} color="#0D0D0D" strokeWidth={2.2} />
                  </View>
                  <Text style={styles.trustCardText}>{step.text}</Text>
                </View>
              );
            })}
          </View>
        </View>
      </ScrollView>

      {/* ── Bottom Navigation Bar ──────────────────────────────────── */}
      <BuyerBottomNav
        activeTab={activeTab}
        onTabChange={handleTabChange}
        cartCount={cartCount}
        wishlistCount={wishlistCount}
      />

      {/* ── MODAL: Direct Product Booking (Triggers Seller Order) ────── */}
      <Modal visible={bookingModalOpen} animationType="slide" transparent>
        <Pressable style={styles.modalOverlay} onPress={() => setBookingModalOpen(false)}>
          <View style={styles.modalSheet} onStartShouldSetResponder={() => true}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Book Handcrafted Item</Text>
              <TouchableOpacity onPress={() => setBookingModalOpen(false)}>
                <X size={20} color="#0D0D0D" />
              </TouchableOpacity>
            </View>

            {bookingProduct && (
              <View style={styles.bookingProductPreview}>
                <Image
                  source={{ uri: bookingProduct.image_url || DEFAULT_PRODUCT_IMG }}
                  style={styles.bookingThumb}
                />
                <View style={{ flex: 1, marginLeft: 12 }}>
                  <Text style={styles.bookingItemTitle} numberOfLines={1}>
                    {bookingProduct.title}
                  </Text>
                  <Text style={styles.bookingItemPrice}>{bookingProduct.price}</Text>
                  <Text style={styles.bookingArtisan}>
                    Seller: {bookingProduct.artisan_name || 'Master Artisan'}
                  </Text>
                </View>
              </View>
            )}

            {/* Quantity Selector */}
            <View style={styles.qtyRow}>
              <Text style={styles.inputLabel}>Quantity</Text>
              <View style={styles.qtyStepper}>
                <TouchableOpacity
                  style={styles.stepperBtn}
                  onPress={() => setBookingQty((q) => Math.max(1, q - 1))}
                >
                  <Text style={styles.stepperBtnText}>-</Text>
                </TouchableOpacity>
                <Text style={styles.qtyValue}>{bookingQty}</Text>
                <TouchableOpacity
                  style={styles.stepperBtn}
                  onPress={() => setBookingQty((q) => q + 1)}
                >
                  <Text style={styles.stepperBtnText}>+</Text>
                </TouchableOpacity>
              </View>
            </View>

            <Text style={styles.inputLabel}>Your Name</Text>
            <TextInput
              style={styles.inputField}
              value={bookingBuyerName}
              onChangeText={setBookingBuyerName}
              placeholder="Your Name"
              placeholderTextColor="#9CA3AF"
            />

            <Text style={styles.inputLabel}>Contact Phone</Text>
            <TextInput
              style={styles.inputField}
              value={bookingBuyerPhone}
              onChangeText={setBookingBuyerPhone}
              placeholder="Phone Number"
              placeholderTextColor="#9CA3AF"
              keyboardType="phone-pad"
            />

            <Text style={styles.inputLabel}>Delivery Address</Text>
            <TextInput
              style={[styles.inputField, { height: 60 }]}
              value={bookingAddress}
              onChangeText={setBookingAddress}
              placeholder="Street, Building, City, Pincode"
              placeholderTextColor="#9CA3AF"
              multiline
            />

            <TouchableOpacity
              style={styles.confirmBookingBtn}
              onPress={handleConfirmBooking}
              disabled={isBooking}
              activeOpacity={0.88}
            >
              {isBooking ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Text style={styles.confirmBookingBtnText}>Confirm Booking</Text>
              )}
            </TouchableOpacity>
          </View>
        </Pressable>
      </Modal>

      {/* ── MODAL: Message Seller (Sends Direct Inquiry) ───────────── */}
      <Modal visible={messageModalOpen} animationType="slide" transparent>
        <Pressable style={styles.modalOverlay} onPress={() => setMessageModalOpen(false)}>
          <View style={styles.modalSheet} onStartShouldSetResponder={() => true}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Message Seller</Text>
              <TouchableOpacity onPress={() => setMessageModalOpen(false)}>
                <X size={20} color="#0D0D0D" />
              </TouchableOpacity>
            </View>

            {messageProduct && (
              <View style={styles.messageProductInfo}>
                <Text style={styles.messageProductTitle} numberOfLines={1}>
                  Regarding: {messageProduct.title}
                </Text>
                <Text style={styles.messageArtisanLabel}>
                  Seller: {messageProduct.artisan_name || 'Master Artisan'}
                </Text>
              </View>
            )}

            <Text style={styles.inputLabel}>Your Message:</Text>
            <TextInput
              style={[styles.inputField, { height: 90, textAlignVertical: 'top' }]}
              value={messageText}
              onChangeText={setMessageText}
              placeholder="Ask about custom sizing, delivery dates, or bulk quotes..."
              placeholderTextColor="#9CA3AF"
              multiline
            />

            <TouchableOpacity
              style={styles.sendMessageBtn}
              onPress={handleSendMessage}
              disabled={isSendingMessage}
              activeOpacity={0.88}
            >
              {isSendingMessage ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <Send size={15} color="#FFFFFF" />
                  <Text style={styles.sendMessageBtnText}>Send Message to Seller</Text>
                </View>
              )}
            </TouchableOpacity>
          </View>
        </Pressable>
      </Modal>

      {/* ── MODAL: Messages & Two-Way Seller Chat Sheet ─────────────── */}
      <Modal visible={messagesModalOpen} animationType="slide" transparent>
        <Pressable style={styles.modalOverlay} onPress={() => setMessagesModalOpen(false)}>
          <View style={[styles.modalSheet, { maxHeight: '85%', height: '80%' }]} onStartShouldSetResponder={() => true}>
            {selectedChat ? (
              /* Active Two-Way Chat View */
              <View style={{ flex: 1 }}>
                <View style={styles.modalHeader}>
                  <TouchableOpacity
                    onPress={() => setSelectedChat(null)}
                    style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flex: 1 }}
                  >
                    <ArrowLeft size={18} color="#0D0D0D" />
                    <View style={{ flex: 1 }}>
                      <Text style={styles.modalTitle} numberOfLines={1}>
                        {selectedChat.artisan_name || 'Master Artisan'}
                      </Text>
                      <Text style={{ fontSize: 11, color: '#6B7280' }} numberOfLines={1}>
                        {selectedChat.product_title || 'Craft Item'}
                      </Text>
                    </View>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => setMessagesModalOpen(false)}>
                    <X size={20} color="#0D0D0D" />
                  </TouchableOpacity>
                </View>

                {selectedChat.order_id && (
                  <View style={styles.chatOrderBanner}>
                    <Package size={14} color="#B5502F" />
                    <Text style={styles.chatOrderBannerText}>
                      Order #{selectedChat.order_id.slice(0, 10).toUpperCase()} · Confirmed
                    </Text>
                  </View>
                )}

                {/* Message Bubble Thread */}
                <ScrollView style={{ flex: 1, marginVertical: 10 }} showsVerticalScrollIndicator={false}>
                  {(() => {
                    const thread = Array.isArray(selectedChat.messages) && selectedChat.messages.length > 0
                      ? selectedChat.messages
                      : [
                          {
                            id: 'msg-1',
                            sender: 'buyer' as const,
                            text: selectedChat.message,
                            time: selectedChat.created_at ? new Date(selectedChat.created_at).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }) : 'Earlier',
                          },
                          ...(selectedChat.reply ? [{
                            id: 'msg-2',
                            sender: 'seller' as const,
                            text: selectedChat.reply,
                            time: selectedChat.replied_at ? new Date(selectedChat.replied_at).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }) : 'Replied',
                          }] : [])
                        ];

                    return thread.map((msg, idx) => {
                      const isMe = msg.sender === 'buyer';
                      return (
                        <View
                          key={msg.id || idx}
                          style={{
                            alignSelf: isMe ? 'flex-end' : 'flex-start',
                            maxWidth: '82%',
                            marginVertical: 4,
                          }}
                        >
                          <View
                            style={{
                              backgroundColor: isMe ? '#0D0D0D' : '#F3F4F6',
                              borderRadius: 16,
                              borderBottomRightRadius: isMe ? 4 : 16,
                              borderBottomLeftRadius: isMe ? 16 : 4,
                              paddingHorizontal: 14,
                              paddingVertical: 10,
                            }}
                          >
                            <Text
                              style={{
                                color: isMe ? '#FFFFFF' : '#0D0D0D',
                                fontSize: 13,
                                lineHeight: 18,
                              }}
                            >
                              {msg.text}
                            </Text>
                          </View>
                          <Text
                            style={{
                              fontSize: 10,
                              color: '#9CA3AF',
                              marginTop: 2,
                              alignSelf: isMe ? 'flex-end' : 'flex-start',
                            }}
                          >
                            {msg.time || 'Sent'}
                          </Text>
                        </View>
                      );
                    });
                  })()}
                </ScrollView>

                {/* Chat Input Bar */}
                <View style={styles.chatInputRow}>
                  <TextInput
                    style={styles.chatInputField}
                    value={chatInputText}
                    onChangeText={setChatInputText}
                    placeholder="Type message to seller..."
                    placeholderTextColor="#9CA3AF"
                  />
                  <TouchableOpacity
                    style={[styles.chatSendBtn, !chatInputText.trim() && { opacity: 0.5 }]}
                    disabled={!chatInputText.trim() || isSendingChat}
                    onPress={handleSendChatMessage}
                  >
                    <Send size={15} color="#FFFFFF" />
                  </TouchableOpacity>
                </View>
              </View>
            ) : (
              /* Conversations List */
              <>
                <View style={styles.modalHeader}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <MessageCircle size={18} color="#0D0D0D" />
                    <Text style={styles.modalTitle}>Messages & Order Chats</Text>
                  </View>
                  <TouchableOpacity onPress={() => setMessagesModalOpen(false)}>
                    <X size={20} color="#0D0D0D" />
                  </TouchableOpacity>
                </View>

                {buyerMessages.length === 0 ? (
                  <View style={{ paddingVertical: 40, alignItems: 'center' }}>
                    <MessageCircle size={36} color="#9CA3AF" />
                    <Text style={{ fontSize: 14, fontWeight: '700', color: '#0D0D0D', marginTop: 10 }}>
                      No Active Conversations
                    </Text>
                    <Text style={{ fontSize: 12, color: '#6B7280', marginTop: 4, textAlign: 'center', paddingHorizontal: 20 }}>
                      When you book products or message artisans, order updates and live chats will appear here.
                    </Text>
                  </View>
                ) : (
                  <ScrollView showsVerticalScrollIndicator={false}>
                    {buyerMessages.map((m) => {
                      const isOrder = m.order_id || m.status === 'new_order';
                      return (
                        <TouchableOpacity
                          key={m.id}
                          style={styles.msgItem}
                          onPress={() => setSelectedChat(m)}
                          activeOpacity={0.8}
                        >
                          <View style={styles.msgItemTop}>
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flex: 1 }}>
                              <View style={[styles.msgBadge, isOrder ? styles.msgBadgeOrder : styles.msgBadgeInq]}>
                                <Text style={[styles.msgBadgeText, isOrder ? styles.msgBadgeTextOrder : styles.msgBadgeTextInq]}>
                                  {isOrder ? 'ORDER' : 'INQUIRY'}
                                </Text>
                              </View>
                              <Text style={styles.msgProductTitle} numberOfLines={1}>
                                {m.product_title || 'Handcrafted Treasure'}
                              </Text>
                            </View>
                            <Text style={styles.msgDate}>
                              {m.created_at ? new Date(m.created_at).toLocaleDateString() : 'Recent'}
                            </Text>
                          </View>
                          <Text style={styles.msgText} numberOfLines={2}>
                            {m.message}
                          </Text>
                          {m.reply ? (
                            <View style={styles.msgReplyBox}>
                              <Text style={styles.msgReplyAuthor}>Seller Reply:</Text>
                              <Text style={styles.msgReplyText} numberOfLines={1}>
                                "{m.reply}"
                              </Text>
                            </View>
                          ) : (
                            <Text style={styles.msgPendingText}>
                              {isOrder ? 'Order confirmed · Tap to message maker' : 'Awaiting seller response'}
                            </Text>
                          )}
                        </TouchableOpacity>
                      );
                    })}
                  </ScrollView>
                )}
              </>
            )}
          </View>
        </Pressable>
      </Modal>

      {/* ── MODAL: Alerts & Notifications ───────────────────────────── */}
      <Modal visible={alertsModalOpen} animationType="slide" transparent>
        <Pressable style={styles.modalOverlay} onPress={() => setAlertsModalOpen(false)}>
          <View style={[styles.modalSheet, { maxHeight: '70%' }]} onStartShouldSetResponder={() => true}>
            <View style={styles.modalHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Bell size={18} color="#0D0D0D" />
                <Text style={styles.modalTitle}>Notifications</Text>
              </View>
              <TouchableOpacity onPress={() => setAlertsModalOpen(false)}>
                <X size={20} color="#0D0D0D" />
              </TouchableOpacity>
            </View>

            {buyerMessages.length === 0 && ordersCount === 0 ? (
              <View style={{ paddingVertical: 40, alignItems: 'center' }}>
                <Bell size={36} color="#9CA3AF" />
                <Text style={{ fontSize: 14, fontWeight: '700', color: '#0D0D0D', marginTop: 10 }}>
                  All Caught Up
                </Text>
                <Text style={{ fontSize: 12, color: '#6B7280', marginTop: 4, textAlign: 'center' }}>
                  You will be notified here when artisans confirm orders or reply to your messages.
                </Text>
              </View>
            ) : (
              <ScrollView showsVerticalScrollIndicator={false}>
                {buyerMessages.map((m) => (
                  <View key={`alert-${m.id}`} style={styles.alertItem}>
                    <View style={styles.alertIconCircle}>
                      {m.order_id ? <Package size={16} color="#B5502F" /> : <MessageCircle size={16} color="#10B981" />}
                    </View>
                    <View style={{ flex: 1, gap: 2 }}>
                      <Text style={styles.alertTitle}>
                        {m.order_id ? `Order Confirmed: ${m.product_title}` : `Artisan Update: ${m.product_title}`}
                      </Text>
                      <Text style={styles.alertSub} numberOfLines={2}>
                        {m.reply ? `Seller: "${m.reply}"` : m.message}
                      </Text>
                      <Text style={styles.alertTime}>
                        {m.created_at ? new Date(m.created_at).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }) : 'Recent'}
                      </Text>
                    </View>
                  </View>
                ))}
              </ScrollView>
            )}
          </View>
        </Pressable>
      </Modal>

      {/* ── MODAL: Delivery Location Pincode ───────────────────────── */}
      <Modal visible={locationModalOpen} animationType="slide" transparent>
        <Pressable style={styles.modalOverlay} onPress={() => setLocationModalOpen(false)}>
          <View style={styles.modalSheet} onStartShouldSetResponder={() => true}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Delivery City</Text>
              <TouchableOpacity onPress={() => setLocationModalOpen(false)}>
                <X size={20} color="#0D0D0D" />
              </TouchableOpacity>
            </View>
            <Text style={styles.inputLabel}>City</Text>
            <TextInput
              style={styles.inputField}
              value={deliveryCity}
              onChangeText={setDeliveryCity}
              placeholder="e.g. Bengaluru, Mumbai, Delhi"
              placeholderTextColor="#9CA3AF"
            />
            <Text style={styles.inputLabel}>PIN Code</Text>
            <TextInput
              style={styles.inputField}
              value={deliveryPincode}
              onChangeText={setDeliveryPincode}
              placeholder="560001"
              placeholderTextColor="#9CA3AF"
              keyboardType="numeric"
            />
            <TouchableOpacity
              style={styles.confirmBookingBtn}
              onPress={() => {
                safeStorageSet('@buyer_delivery_city', deliveryCity);
                safeStorageSet('@buyer_delivery_pincode', deliveryPincode);
                setLocationModalOpen(false);
              }}
              activeOpacity={0.88}
            >
              <Text style={styles.confirmBookingBtnText}>Save Location</Text>
            </TouchableOpacity>
          </View>
        </Pressable>
      </Modal>

      {/* ── MODAL: Wishlist Items ──────────────────────────────────── */}
      <Modal visible={wishlistModalOpen} animationType="slide" transparent>
        <Pressable style={styles.modalOverlay} onPress={() => setWishlistModalOpen(false)}>
          <View style={[styles.modalSheet, { maxHeight: '80%' }]} onStartShouldSetResponder={() => true}>
            <View style={styles.modalHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Heart size={18} color="#EF4444" fill="#EF4444" />
                <Text style={styles.modalTitle}>Saved Items ({wishlistCount})</Text>
              </View>
              <TouchableOpacity onPress={() => setWishlistModalOpen(false)}>
                <X size={20} color="#0D0D0D" />
              </TouchableOpacity>
            </View>

            {wishlistItems.length === 0 ? (
              <View style={{ paddingVertical: 40, alignItems: 'center' }}>
                <Heart size={36} color="#9CA3AF" />
                <Text style={{ fontSize: 14, fontWeight: '700', color: '#0D0D0D', marginTop: 10 }}>
                  Your Wishlist is Empty
                </Text>
                <Text style={{ fontSize: 12, color: '#6B7280', marginTop: 4 }}>
                  Tap the heart icon on any product to save it here.
                </Text>
              </View>
            ) : (
              <ScrollView showsVerticalScrollIndicator={false}>
                {wishlistItems.map((item) => (
                  <View key={item.id} style={styles.wishlistRow}>
                    <Image
                      source={{ uri: item.image_url || DEFAULT_PRODUCT_IMG }}
                      style={styles.wishlistRowImg}
                    />
                    <View style={{ flex: 1, marginLeft: 12 }}>
                      <Text style={styles.wishlistRowTitle} numberOfLines={1}>
                        {item.title}
                      </Text>
                      <Text style={styles.wishlistRowPrice}>{item.price}</Text>
                    </View>
                    <TouchableOpacity
                      style={styles.wishlistAddBtn}
                      onPress={() => handleAddToCart(item)}
                    >
                      <Text style={styles.wishlistAddBtnText}>+ Bag</Text>
                    </TouchableOpacity>
                  </View>
                ))}
              </ScrollView>
            )}
          </View>
        </Pressable>
      </Modal>

      {/* ── Side Drawer ────────────────────────────────────────────── */}
      <Modal visible={drawerOpen} transparent animationType="fade">
        <Pressable style={styles.drawerOverlay} onPress={() => setDrawerOpen(false)}>
          <View style={styles.drawerContent} onStartShouldSetResponder={() => true}>
            <View style={styles.drawerHeader}>
              <View style={styles.drawerUserRow}>
                <View style={styles.drawerAvatarWrap}>
                  <Text style={styles.drawerAvatarInitial}>
                    {(buyerProfile?.name || 'B').charAt(0).toUpperCase()}
                  </Text>
                </View>
                <View>
                  <Text style={styles.drawerName}>{buyerProfile?.name || 'Handmade Buyer'}</Text>
                  <Text style={styles.drawerRole}>Buyer Patron</Text>
                </View>
              </View>
              <TouchableOpacity onPress={() => setDrawerOpen(false)}>
                <X size={20} color="#0D0D0D" />
              </TouchableOpacity>
            </View>

            <View style={styles.drawerMenu}>
              <TouchableOpacity
                style={styles.drawerMenuItem}
                onPress={() => {
                  setDrawerOpen(false);
                  router.push('/profile');
                }}
              >
                <User size={18} color="#0D0D0D" />
                <Text style={styles.drawerMenuText}>My Profile</Text>
                <ChevronRight size={16} color="#9CA3AF" />
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.drawerMenuItem}
                onPress={() => {
                  setDrawerOpen(false);
                  router.push({ pathname: '/profile', params: { openOrders: 'true' } });
                }}
              >
                <Package size={18} color="#0D0D0D" />
                <Text style={styles.drawerMenuText}>My Orders ({ordersCount})</Text>
                <ChevronRight size={16} color="#9CA3AF" />
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.drawerMenuItem}
                onPress={() => {
                  setDrawerOpen(false);
                  setMessagesModalOpen(true);
                }}
              >
                <MessageCircle size={18} color="#0D0D0D" />
                <Text style={styles.drawerMenuText}>Messages with Sellers</Text>
                <ChevronRight size={16} color="#9CA3AF" />
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.drawerMenuItem}
                onPress={() => {
                  setDrawerOpen(false);
                  router.push('/cart');
                }}
              >
                <ShoppingBag size={18} color="#0D0D0D" />
                <Text style={styles.drawerMenuText}>Shopping Bag ({cartCount})</Text>
                <ChevronRight size={16} color="#9CA3AF" />
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.drawerMenuItem}
                onPress={() => {
                  setDrawerOpen(false);
                  signOut();
                }}
              >
                <Text style={[styles.drawerMenuText, { color: '#EF4444' }]}>Log Out</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  header: {
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
    paddingHorizontal: 16,
    paddingBottom: 10,
    zIndex: 10,
  },
  headerTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  menuCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#0D0D0D',
    justifyContent: 'center',
    alignItems: 'center',
  },
  menuLines: { gap: 3.5 },
  menuLineLong: { width: 16, height: 2, backgroundColor: '#FFFFFF', borderRadius: 1 },
  menuLineShort: { width: 10, height: 2, backgroundColor: '#FFFFFF', borderRadius: 1 },
  menuLineMed: { width: 13, height: 2, backgroundColor: '#FFFFFF', borderRadius: 1 },
  locationPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
    maxWidth: SCREEN_WIDTH - 150,
    gap: 4,
  },
  locationText: {
    fontSize: 11,
    color: '#6B7280',
    fontFamily: Fonts.bodyMedium,
  },
  locationCity: {
    fontWeight: '700',
    color: '#0D0D0D',
    fontFamily: Fonts.headingBold,
  },
  headerRightGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  circleIconBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  unreadDot: {
    position: 'absolute',
    top: 9,
    right: 9,
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: '#10B981',
  },
  cartBadge: {
    position: 'absolute',
    top: -2,
    right: -2,
    backgroundColor: '#0D0D0D',
    borderRadius: 8,
    minWidth: 16,
    height: 16,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 3,
  },
  cartBadgeText: {
    color: '#FFFFFF',
    fontSize: 9,
    fontWeight: '800',
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  searchPill: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
    borderRadius: 24,
    height: 44,
    paddingHorizontal: 12,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    color: '#0D0D0D',
    fontFamily: Fonts.body,
  },
  scroll: { flex: 1 },
  scrollContent: { paddingTop: 10 },
  heroSection: {
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  heroCarousel: { gap: 0 },
  heroCard: {
    borderRadius: 22,
    padding: 20,
    ...Shadow.card,
  },
  heroTagRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginBottom: 8,
  },
  heroTagText: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
  heroHeadline: {
    fontSize: 19,
    fontWeight: '800',
    fontFamily: Fonts.headingBold,
    marginBottom: 6,
    lineHeight: 25,
  },
  heroSubtext: {
    fontSize: 12,
    fontFamily: Fonts.body,
    marginBottom: 14,
    lineHeight: 18,
  },
  heroBtn: {
    alignSelf: 'flex-start',
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: 20,
  },
  heroBtnText: {
    fontSize: 12,
    fontWeight: '700',
    fontFamily: Fonts.headingBold,
  },
  dotsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
    marginTop: 10,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#D1D5DB',
  },
  dotActive: {
    width: 18,
    backgroundColor: '#0D0D0D',
    borderRadius: 3,
  },
  categorySection: {
    marginBottom: 18,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '800',
    fontFamily: Fonts.headingBold,
    color: '#0D0D0D',
    paddingHorizontal: 16,
    marginBottom: 10,
  },
  categoryScroll: {
    paddingHorizontal: 16,
    gap: 8,
  },
  catPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 7,
    gap: 6,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  catPillActive: {
    backgroundColor: '#0D0D0D',
    borderColor: '#0D0D0D',
  },
  catLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#374151',
    fontFamily: Fonts.bodyMedium,
  },
  catLabelActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  makersSection: {
    marginBottom: 20,
  },
  makersHeader: {
    paddingHorizontal: 16,
    marginBottom: 10,
  },
  makersTitle: {
    fontSize: 15,
    fontWeight: '800',
    fontFamily: Fonts.headingBold,
    color: '#0D0D0D',
  },
  makersSubtext: {
    fontSize: 11,
    color: '#6B7280',
    marginTop: 1,
  },
  makersScroll: {
    paddingHorizontal: 16,
    gap: 12,
  },
  makerCard: {
    width: 124,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 10,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#F3F4F6',
    ...Shadow.card,
  },
  makerAvatarWrap: {
    position: 'relative',
    marginBottom: 6,
  },
  makerAvatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#F3F4F6',
  },
  makerVerifiedBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 15,
    height: 15,
    borderRadius: 8,
    backgroundColor: '#10B981',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  makerName: {
    fontSize: 12,
    fontWeight: '700',
    fontFamily: Fonts.headingBold,
    color: '#0D0D0D',
    textAlign: 'center',
  },
  makerCraft: {
    fontSize: 10,
    color: '#6B7280',
    textAlign: 'center',
    marginTop: 1,
    marginBottom: 6,
  },
  makerShopBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 12,
  },
  makerShopBtnText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#0D0D0D',
  },
  productsSection: {
    paddingHorizontal: 16,
    marginBottom: 20,
  },
  productsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  productsTitle: {
    fontSize: 16,
    fontWeight: '800',
    fontFamily: Fonts.headingBold,
    color: '#0D0D0D',
  },
  productsSubheader: {
    fontSize: 11,
    color: '#6B7280',
    marginTop: 2,
  },
  clearFilterText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#B5502F',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  gridCell: {
    width: (SCREEN_WIDTH - 32 - 12) / 2,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#F3F4F6',
    ...Shadow.card,
  },
  cardImgContainer: {
    width: '100%',
    aspectRatio: 1,
    backgroundColor: '#F3F4F6',
    position: 'relative',
  },
  cardImg: {
    width: '100%',
    height: '100%',
  },
  cardBadge: {
    position: 'absolute',
    top: 8,
    left: 8,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  badgeBestseller: { backgroundColor: '#0D0D0D' },
  badgeNew: { backgroundColor: '#10B981' },
  cardBadgeText: {
    color: '#FFFFFF',
    fontSize: 9,
    fontWeight: '800',
  },
  wishlistBtn: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(0,0,0,0.38)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardBody: {
    padding: 10,
  },
  cardTitle: {
    fontSize: 13,
    fontWeight: '700',
    fontFamily: Fonts.headingBold,
    color: '#0D0D0D',
  },
  artisanSubtext: {
    fontSize: 10,
    color: '#6B7280',
    marginTop: 2,
    marginBottom: 6,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 6,
    marginBottom: 8,
  },
  priceCurrent: {
    fontSize: 14,
    fontWeight: '800',
    fontFamily: Fonts.headingBold,
    color: '#0D0D0D',
  },
  priceOriginal: {
    fontSize: 10,
    color: '#9CA3AF',
    textDecorationLine: 'line-through',
  },
  cardActionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  bookNowBtn: {
    flex: 1,
    backgroundColor: '#0D0D0D',
    borderRadius: 14,
    paddingVertical: 6,
    alignItems: 'center',
  },
  bookNowBtnText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '700',
  },
  bagBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#0D0D0D',
    justifyContent: 'center',
    alignItems: 'center',
  },
  messageArtisanBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  loaderBox: {
    paddingVertical: 36,
    alignItems: 'center',
    gap: 8,
  },
  loaderText: {
    fontSize: 12,
    color: '#6B7280',
  },
  emptyBox: {
    paddingVertical: 36,
    alignItems: 'center',
    paddingHorizontal: 20,
    gap: 6,
  },
  emptyTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0D0D0D',
  },
  emptySub: {
    fontSize: 12,
    color: '#6B7280',
    textAlign: 'center',
  },
  resetBtn: {
    marginTop: 10,
    backgroundColor: '#0D0D0D',
    paddingHorizontal: 16,
    paddingVertical: 7,
    borderRadius: 14,
  },
  resetBtnText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
  },
  trustSection: {
    paddingHorizontal: 16,
    marginBottom: 20,
  },
  trustSectionTitle: {
    fontSize: 14,
    fontWeight: '800',
    fontFamily: Fonts.headingBold,
    color: '#0D0D0D',
    marginBottom: 10,
  },
  trustCardsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  trustCard: {
    flex: 1,
    backgroundColor: '#F9FAFB',
    borderRadius: 14,
    padding: 10,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  trustCardIconCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 6,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  trustCardText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#374151',
    textAlign: 'center',
    lineHeight: 14,
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
    padding: 20,
    paddingBottom: 36,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '800',
    fontFamily: Fonts.headingBold,
    color: '#0D0D0D',
  },
  bookingProductPreview: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    borderRadius: 14,
    padding: 10,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  bookingThumb: {
    width: 48,
    height: 48,
    borderRadius: 10,
    backgroundColor: '#F3F4F6',
  },
  bookingItemTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0D0D0D',
  },
  bookingItemPrice: {
    fontSize: 13,
    fontWeight: '800',
    color: '#B5502F',
    marginTop: 2,
  },
  bookingArtisan: {
    fontSize: 10,
    color: '#6B7280',
    marginTop: 1,
  },
  qtyRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginVertical: 4,
  },
  qtyStepper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
    borderRadius: 14,
    padding: 3,
    gap: 8,
  },
  stepperBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  stepperBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0D0D0D',
  },
  qtyValue: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0D0D0D',
    minWidth: 20,
    textAlign: 'center',
  },
  inputLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#374151',
    marginBottom: 4,
    marginTop: 8,
  },
  inputField: {
    backgroundColor: '#F3F4F6',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 13,
    color: '#0D0D0D',
  },
  confirmBookingBtn: {
    backgroundColor: '#0D0D0D',
    borderRadius: 22,
    paddingVertical: 13,
    alignItems: 'center',
    marginTop: 16,
  },
  confirmBookingBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
    fontFamily: Fonts.headingBold,
  },
  messageProductInfo: {
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    padding: 10,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  messageProductTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0D0D0D',
  },
  messageArtisanLabel: {
    fontSize: 11,
    color: '#6B7280',
    marginTop: 2,
  },
  sendMessageBtn: {
    backgroundColor: '#0D0D0D',
    borderRadius: 22,
    paddingVertical: 13,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 16,
  },
  sendMessageBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
    fontFamily: Fonts.headingBold,
  },
  msgItem: {
    backgroundColor: '#F9FAFB',
    borderRadius: 14,
    padding: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  msgItemTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  msgProductTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0D0D0D',
    flex: 1,
  },
  msgDate: {
    fontSize: 10,
    color: '#9CA3AF',
    marginLeft: 8,
  },
  msgText: {
    fontSize: 12,
    color: '#4B5563',
    fontStyle: 'italic',
  },
  msgReplyBox: {
    backgroundColor: '#F0FDF4',
    borderRadius: 8,
    padding: 8,
    marginTop: 6,
    borderWidth: 1,
    borderColor: '#BBF7D0',
  },
  msgReplyAuthor: {
    fontSize: 11,
    fontWeight: '700',
    color: '#166534',
    marginBottom: 1,
  },
  msgReplyText: {
    fontSize: 11,
    color: '#15803D',
  },
  msgPendingText: {
    fontSize: 10,
    color: '#B45309',
    marginTop: 4,
    fontWeight: '600',
  },
  wishlistRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  wishlistRowImg: {
    width: 44,
    height: 44,
    borderRadius: 10,
    backgroundColor: '#F3F4F6',
  },
  wishlistRowTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0D0D0D',
  },
  wishlistRowPrice: {
    fontSize: 12,
    fontWeight: '700',
    color: '#B5502F',
    marginTop: 2,
  },
  wishlistAddBtn: {
    backgroundColor: '#0D0D0D',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  wishlistAddBtnText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
  },
  drawerOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  drawerContent: {
    width: SCREEN_WIDTH * 0.78,
    height: '100%',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 20,
    paddingTop: 54,
  },
  drawerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  drawerUserRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  drawerAvatarWrap: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#0D0D0D',
    justifyContent: 'center',
    alignItems: 'center',
  },
  drawerAvatarInitial: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '800',
  },
  drawerName: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0D0D0D',
  },
  drawerRole: {
    fontSize: 11,
    color: '#10B981',
    fontWeight: '600',
  },
  drawerMenu: { gap: 8 },
  drawerMenuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    gap: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  drawerMenuText: {
    flex: 1,
    fontSize: 13,
    fontWeight: '600',
    color: '#0D0D0D',
  },
  chatOrderBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 10,
    marginBottom: 8,
  },
  chatOrderBannerText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#92400E',
  },
  chatInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  chatInputField: {
    flex: 1,
    backgroundColor: '#F3F4F6',
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 13,
    color: '#0D0D0D',
  },
  chatSendBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#0D0D0D',
    justifyContent: 'center',
    alignItems: 'center',
  },
  msgBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  msgBadgeOrder: {
    backgroundColor: '#FEF3C7',
  },
  msgBadgeInq: {
    backgroundColor: '#E5E7EB',
  },
  msgBadgeText: {
    fontSize: 9,
    fontWeight: '800',
  },
  msgBadgeTextOrder: {
    color: '#B45309',
  },
  msgBadgeTextInq: {
    color: '#4B5563',
  },
  alertItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  alertIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  alertTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0D0D0D',
  },
  alertSub: {
    fontSize: 11,
    color: '#4B5563',
    lineHeight: 16,
  },
  alertTime: {
    fontSize: 10,
    color: '#9CA3AF',
    marginTop: 2,
  },
});
