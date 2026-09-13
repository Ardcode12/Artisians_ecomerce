import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  Image,
  StatusBar,
  Modal,
  TextInput,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter, useFocusEffect, useLocalSearchParams } from 'expo-router';
import {
  ArrowLeft,
  Store,
  FileBadge,
  MapPin,
  Landmark,
  Globe,
  Bell,
  Smartphone,
  HelpCircle,
  FileText,
  Lock,
  Star,
  Award,
  CheckCircle2,
  Edit3,
  LogOut,
  ChevronRight,
  X,
  CreditCard,
  Camera,
  Check,
  ShoppingBag,
  Package,
  MessageCircle,
  Truck,
  Building,
  RefreshCw,
  Home,
  User as UserIcon,
  ArrowRight,
} from 'lucide-react-native';
import { Fonts, Radius, Shadow, NAV_HEIGHT } from '@/constants/artisan-theme';
import { ArtisanBottomNav, ArtisanTab } from '@/components/artisan/ArtisanBottomNav';
import { BuyerBottomNav, BuyerTab } from '@/components/buyer/BuyerBottomNav';
import { useAuth } from '@/context/AuthContext';
import { useLanguage } from '@/context/LanguageContext';
import { LanguagePicker } from '@/components/artisan/LanguagePicker';
import { useCart } from '@/context/CartContext';
import AsyncStorage from '@/utils/storage';

const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL || 'http://10.29.208.1:5000';

const BADGES = [
  { Icon: Award, label: 'GI Tagged', color: '#D97706' },
  { Icon: CheckCircle2, label: 'Verified', color: '#10B981' },
  { Icon: Star, label: 'Top Seller', color: '#0D0D0D' },
];

const PRESET_AVATARS = [
  'https://images.unsplash.com/photo-1544717305-2782549b5136?w=200&q=80',
  'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&q=80',
  'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&q=80',
  'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=200&q=80',
  'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=200&q=80',
  'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=200&q=80',
];

interface OrderItem {
  id: string;
  product_id?: string;
  product_title: string;
  product_image?: string;
  artisan_name?: string;
  quantity: number;
  total_amount: string;
  status: string;
  created_at: string;
}

interface InquiryItem {
  id: string;
  product_title?: string;
  message: string;
  status: string;
  created_at: string;
}

export default function ProfileScreen() {
  const [activeTab, setActiveTab] = useState<ArtisanTab>('profile');
  const {
    profile,
    buyerProfile,
    userRole,
    setUserRole,
    signOut,
    updateProfile,
    updateBuyerProfile,
    updateBankDetails,
    uploadAvatar,
    phone,
  } = useAuth();
  const { t, language, languageMeta } = useLanguage();
  const { cartCount } = useCart();
  const [langPickerOpen, setLangPickerOpen] = useState(false);
  const [toggleValues, setToggleValues] = useState<Record<string, boolean>>({
    'Push Notifications': true,
    'Biometric Login': false,
  });

  // Buyer Specific State
  const [buyerActiveSection, setBuyerActiveSection] = useState<'orders' | 'inquiries' | 'address'>('orders');
  const [buyerOrders, setBuyerOrders] = useState<OrderItem[]>([]);
  const [buyerInquiries, setBuyerInquiries] = useState<InquiryItem[]>([]);
  const [ordersLoading, setOrdersLoading] = useState(false);
  const [editBuyerProfileOpen, setEditBuyerProfileOpen] = useState(false);
  const [editAddressOpen, setEditAddressOpen] = useState(false);
  const [buyerOrdersModalOpen, setBuyerOrdersModalOpen] = useState(false);
  const [buyerInquiriesModalOpen, setBuyerInquiriesModalOpen] = useState(false);

  // Buyer Edit Form
  const [buyerFormName, setBuyerFormName] = useState(buyerProfile?.name || '');
  const [buyerFormType, setBuyerFormType] = useState(buyerProfile?.buyer_type || 'Individual Buyer');
  const [buyerFormBusinessName, setBuyerFormBusinessName] = useState(buyerProfile?.business_name || '');
  const [buyerFormGstin, setBuyerFormGstin] = useState(buyerProfile?.gstin || '');

  // Buyer Address Form
  const [addrLine, setAddrLine] = useState(buyerProfile?.address_line || 'Flat 402, Heritage Residency, MG Road');
  const [addrCity, setAddrCity] = useState(buyerProfile?.city || 'Bengaluru');
  const [addrState, setAddrState] = useState(buyerProfile?.state || 'Karnataka');
  const [addrPincode, setAddrPincode] = useState(buyerProfile?.pincode || '560001');

  // Artisan Modal States
  const [editProfileOpen, setEditProfileOpen] = useState(false);
  const [editStoryOpen, setEditStoryOpen] = useState(false);
  const [bankModalOpen, setBankModalOpen] = useState(false);
  const [avatarModalOpen, setAvatarModalOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  // Form Fields - Artisan Profile
  const [formName, setFormName] = useState('');
  const [formShopName, setFormShopName] = useState('');
  const [formCraftType, setFormCraftType] = useState('');
  const [formLocation, setFormLocation] = useState('');
  const [formSchemeId, setFormSchemeId] = useState('');

  // Form Fields - Craft Story
  const [formBio, setFormBio] = useState('');

  // Form Fields - Bank Details
  const [formAccountNo, setFormAccountNo] = useState('');
  const [formConfirmAccountNo, setFormConfirmAccountNo] = useState('');
  const [formIfsc, setFormIfsc] = useState('');
  const [formHolderName, setFormHolderName] = useState('');
  const [formBankName, setFormBankName] = useState('');
  const [formUpiId, setFormUpiId] = useState('');

  // Form Fields - Avatar
  const [customAvatarUrl, setCustomAvatarUrl] = useState('');

  const insets = useSafeAreaInsets();
  const router = useRouter();

  const params = useLocalSearchParams();

  useEffect(() => {
    if (params?.openOrders === 'true') {
      setBuyerOrdersModalOpen(true);
    }
    if (params?.openInquiries === 'true') {
      setBuyerInquiriesModalOpen(true);
    }
  }, [params?.openOrders, params?.openInquiries]);

  // Load Buyer Orders and Inquiries
  const fetchBuyerData = useCallback(async () => {
    setOrdersLoading(true);
    try {
      const activePhone = buyerProfile?.phone || phone || '';
      let url = `${BACKEND_URL}/api/orders`;
      if (activePhone) {
        url += `?buyer_phone=${encodeURIComponent(activePhone)}`;
      }
      let inqUrl = `${BACKEND_URL}/api/inquiries`;
      if (activePhone) {
        inqUrl += `?buyer_phone=${encodeURIComponent(activePhone)}`;
      }

      const [ordersRes, inqRes] = await Promise.all([
        fetch(url),
        fetch(inqUrl),
      ]);

      let loadedOrders: OrderItem[] = [];
      if (ordersRes.ok) {
        const data = await ordersRes.json();
        if (data.orders && Array.isArray(data.orders)) {
          loadedOrders = data.orders;
        }
      }

      // Check AsyncStorage @buyer_orders fallback
      try {
        const savedOrders = await AsyncStorage.getItem('@buyer_orders');
        if (savedOrders) {
          const parsed = JSON.parse(savedOrders);
          if (Array.isArray(parsed)) {
            const ids = new Set(loadedOrders.map((o) => o.id));
            parsed.forEach((po) => {
              if (!ids.has(po.id)) loadedOrders.unshift(po);
            });
          }
        }
      } catch (_) {}

      setBuyerOrders(loadedOrders);

      if (inqRes.ok) {
        const inqData = await inqRes.json();
        if (inqData.inquiries) setBuyerInquiries(inqData.inquiries);
      }
    } catch (_) {
    } finally {
      setOrdersLoading(false);
    }
  }, [buyerProfile?.phone, phone]);

  useFocusEffect(
    useCallback(() => {
      if (userRole === 'buyer') {
        fetchBuyerData();
      }
    }, [userRole, fetchBuyerData])
  );

  useEffect(() => {
    if (profile) {
      setFormName(profile.name || '');
      setFormShopName(profile.shop_name || (profile.name ? `${profile.name}'s Studio` : ''));
      setFormCraftType(profile.craft_type || '');
      setFormLocation(profile.location || '');
      setFormSchemeId(profile.scheme_id || '');
      setFormBio(profile.bio || '');
      setFormAccountNo(profile.bank_account_no || '');
      setFormConfirmAccountNo(profile.bank_account_no || '');
      setFormIfsc(profile.bank_ifsc || '');
      setFormHolderName(profile.bank_holder_name || profile.name || '');
      setFormBankName(profile.bank_name || '');
      setFormUpiId(profile.upi_id || '');
    }
  }, [profile]);

  useEffect(() => {
    if (buyerProfile) {
      setBuyerFormName(buyerProfile.name || '');
      setBuyerFormType(buyerProfile.buyer_type || 'Individual Buyer');
      setBuyerFormBusinessName(buyerProfile.business_name || '');
      setBuyerFormGstin(buyerProfile.gstin || '');
      if (buyerProfile.address_line) setAddrLine(buyerProfile.address_line);
      if (buyerProfile.city) setAddrCity(buyerProfile.city);
      if (buyerProfile.state) setAddrState(buyerProfile.state);
      if (buyerProfile.pincode) setAddrPincode(buyerProfile.pincode);
    }
  }, [buyerProfile]);

  const handleTabChange = (tab: ArtisanTab) => {
    setActiveTab(tab);
    if (tab === 'home') router.push('/');
    if (tab === 'listings') router.push('/listings');
    if (tab === 'add') router.push('/add-product');
    if (tab === 'inquiries') router.push('/inquiries');
    if (tab === 'profile') router.push('/profile');
  };

  // ── Save Buyer Profile ─────────────────────────────────────────────
  const handleSaveBuyerProfile = async () => {
    if (!buyerFormName.trim()) {
      Alert.alert('Name Required', 'Please enter your name.');
      return;
    }
    setIsSaving(true);
    try {
      await updateBuyerProfile({
        name: buyerFormName.trim(),
        buyer_type: buyerFormType as any,
        business_name: buyerFormBusinessName.trim() || undefined,
        gstin: buyerFormGstin.trim() || undefined,
      });
      setEditBuyerProfileOpen(false);
      Alert.alert('Saved', 'Buyer profile updated successfully!');
    } catch (e: any) {
      Alert.alert('Error', e?.message || 'Could not save profile.');
    } finally {
      setIsSaving(false);
    }
  };

  // ── Save Buyer Address ─────────────────────────────────────────────
  const handleSaveAddress = async () => {
    if (!addrLine.trim() || !addrCity.trim() || !addrPincode.trim()) {
      Alert.alert('Missing Fields', 'Please complete address line, city, and pincode.');
      return;
    }
    setIsSaving(true);
    try {
      await updateBuyerProfile({
        address_line: addrLine.trim(),
        city: addrCity.trim(),
        state: addrState.trim(),
        pincode: addrPincode.trim(),
      });
      setEditAddressOpen(false);
      Alert.alert('Address Updated', 'Shipping delivery address saved.');
    } catch (e: any) {
      Alert.alert('Error', 'Could not update address.');
    } finally {
      setIsSaving(false);
    }
  };

  // ── Save Artisan Profile Details ──────────────────────────────────
  const handleSaveProfile = async () => {
    if (!formName.trim()) {
      setErrorMessage('Name cannot be empty');
      return;
    }
    setErrorMessage('');
    setIsSaving(true);
    try {
      await updateProfile({
        name: formName.trim(),
        shop_name: formShopName.trim() || `${formName.trim()}'s Studio`,
        craft_type: formCraftType.trim() || 'Handicraft & Art',
        location: formLocation.trim(),
        scheme_id: formSchemeId.trim() || undefined,
      });
      setEditProfileOpen(false);
    } catch (e: any) {
      setErrorMessage(e?.message || 'Failed to save profile');
    } finally {
      setIsSaving(false);
    }
  };

  // ── Save Craft Story ──────────────────────────────────────────────
  const handleSaveStory = async () => {
    setIsSaving(true);
    try {
      await updateProfile({
        bio: formBio.trim(),
      });
      setEditStoryOpen(false);
    } catch (e: any) {
      Alert.alert('Error', 'Failed to update craft story');
    } finally {
      setIsSaving(false);
    }
  };

  // ── Save Bank Details ─────────────────────────────────────────────
  const handleSaveBank = async () => {
    setErrorMessage('');
    const cleanAccount = formAccountNo.trim().replace(/[^0-9]/g, '');
    const cleanConfirm = formConfirmAccountNo.trim().replace(/[^0-9]/g, '');
    const cleanIfsc = formIfsc.trim().toUpperCase();

    if (!cleanAccount || cleanAccount.length < 9 || cleanAccount.length > 18) {
      setErrorMessage('Please enter a valid bank account number (9 to 18 digits)');
      return;
    }
    if (cleanAccount !== cleanConfirm) {
      setErrorMessage('Account numbers do not match');
      return;
    }
    if (!cleanIfsc || cleanIfsc.length !== 11) {
      setErrorMessage('Please enter a valid 11-character IFSC code');
      return;
    }
    if (!formHolderName.trim()) {
      setErrorMessage('Account holder name is required');
      return;
    }

    setIsSaving(true);
    try {
      await updateBankDetails({
        bank_account_no: cleanAccount,
        bank_ifsc: cleanIfsc,
        bank_holder_name: formHolderName.trim(),
        bank_name: formBankName.trim() || undefined,
        upi_id: formUpiId.trim() || undefined,
      });
      setBankModalOpen(false);
    } catch (e: any) {
      setErrorMessage(e?.message || 'Failed to save bank details');
    } finally {
      setIsSaving(false);
    }
  };

  // ── Role Switcher ─────────────────────────────────────────────────
  const handleSwitchRole = (newRole: 'artisan' | 'buyer') => {
    setUserRole(newRole);
    if (newRole === 'artisan') {
      router.replace('/');
    } else {
      router.replace('/');
    }
  };

  const handleSignOut = async () => {
    Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign Out',
        style: 'destructive',
        onPress: async () => {
          await signOut();
          router.replace('/welcome');
        },
      },
    ]);
  };

  // Display fields for Artisan
  const displayName = profile?.name || 'Smt. Lakshmi Devi';
  const displayCraft = profile?.craft_type || 'Kutch Handloom & Bandhani';
  const displayLocation = profile?.location || 'Bhuj, Gujarat';
  const displayShop = profile?.shop_name || "Lakshmi's Studio";
  const displayScheme = profile?.scheme_id || 'SCH-78291';
  const displayBio =
    profile?.bio ||
    'Practicing traditional hand-embroidery and natural dye bandhani for over 22 years in the artisan clusters of Kutch.';
  const displayAvatar =
    profile?.avatar_url ||
    'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=300&q=80';
  const displayBankMasked = profile?.bank_account_no
    ? `•••• ${profile.bank_account_no.slice(-4)} (${profile.bank_ifsc || 'Verified'})`
    : 'Not linked';

  // Display fields for Buyer
  const buyerName = buyerProfile?.name || 'Handmade Collector';
  const buyerPhone = buyerProfile?.phone || phone || '+91 93450 73473';
  const buyerType = buyerProfile?.buyer_type || 'Individual Buyer';
  const fullAddress = `${buyerProfile?.address_line || addrLine}, ${buyerProfile?.city || addrCity}, ${buyerProfile?.state || addrState} - ${buyerProfile?.pincode || addrPincode}`;

  // ─────────────────────────────────────────────────────────────────
  // RENDER BUYER PROFILE
  // ─────────────────────────────────────────────────────────────────
  if (userRole === 'buyer') {
    return (
      <View style={styles.container}>
        <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

        {/* ── Top Bar ─────────────────────────────────────────────── */}
        <View style={[styles.topBar, { paddingTop: insets.top + 8 }]}>
          <TouchableOpacity
            style={styles.circleBtnBlack}
            onPress={() => router.back()}
            activeOpacity={0.8}
          >
            <ArrowLeft size={20} color="#FFFFFF" strokeWidth={2.5} />
          </TouchableOpacity>
          <Text style={styles.screenTitle}>Buyer Profile</Text>
          <TouchableOpacity
            style={styles.editBtn}
            onPress={() => setEditBuyerProfileOpen(true)}
            activeOpacity={0.8}
          >
            <Text style={styles.editBtnText}>Edit</Text>
          </TouchableOpacity>
        </View>

        <ScrollView
          contentContainerStyle={[styles.content, { paddingBottom: NAV_HEIGHT + insets.bottom + 30 }]}
          showsVerticalScrollIndicator={false}
        >
          {/* Profile Hero Card (Exact Seller Layout) */}
          <View style={styles.profileCard}>
            <View style={styles.avatarWrapper}>
              <View style={styles.buyerAvatarCircle}>
                <Text style={styles.buyerAvatarInitial}>
                  {buyerName.charAt(0).toUpperCase()}
                </Text>
              </View>
              <TouchableOpacity
                style={styles.avatarEditBtn}
                activeOpacity={0.8}
                onPress={() => setEditBuyerProfileOpen(true)}
              >
                <Camera size={14} color="#FFFFFF" />
              </TouchableOpacity>
            </View>

            <Text style={styles.profileName}>{buyerName}</Text>
            <View style={styles.locRow}>
              <MapPin size={13} color="#8E8E93" />
              <Text style={styles.profileLocation}>{addrCity}, {addrState}</Text>
            </View>

            {/* Badges row */}
            <View style={styles.badgesRow}>
              <View style={[styles.badge, { borderColor: '#D9770640', backgroundColor: '#D9770610' }]}>
                <Award size={14} color="#D97706" />
                <Text style={[styles.badgeText, { color: '#D97706' }]}>GI Patron</Text>
              </View>
              <View style={[styles.badge, { borderColor: '#10B98140', backgroundColor: '#10B98110' }]}>
                <CheckCircle2 size={14} color="#10B981" />
                <Text style={[styles.badgeText, { color: '#10B981' }]}>Verified Buyer</Text>
              </View>
              <View style={[styles.badge, { borderColor: '#0D0D0D40', backgroundColor: '#0D0D0D10' }]}>
                <Star size={14} color="#0D0D0D" />
                <Text style={[styles.badgeText, { color: '#0D0D0D' }]}>Top Collector</Text>
              </View>
            </View>

            {/* Stats mini strip with dividers */}
            <View style={styles.miniStats}>
              <View style={styles.miniStat}>
                <Text style={styles.miniStatValue}>{buyerOrders.length}</Text>
                <Text style={styles.miniStatLabel}>Orders</Text>
              </View>
              <View style={styles.miniStatDivider} />
              <View style={styles.miniStat}>
                <Text style={styles.miniStatValue}>{cartCount}</Text>
                <Text style={styles.miniStatLabel}>In Bag</Text>
              </View>
              <View style={styles.miniStatDivider} />
              <View style={styles.miniStat}>
                <View style={styles.ratingInline}>
                  <Text style={styles.miniStatValue}>{buyerInquiries.length}</Text>
                </View>
                <Text style={styles.miniStatLabel}>Inquiries</Text>
              </View>
              <View style={styles.miniStatDivider} />
              <View style={styles.miniStat}>
                <Text style={styles.miniStatValue}>100%</Text>
                <Text style={styles.miniStatLabel}>Handmade</Text>
              </View>
            </View>
          </View>

          {/* Craft story / Patron Appreciation Card */}
          <View style={styles.storyCard}>
            <Text style={styles.storyTitle}>Collector & Patron Story</Text>
            <Text style={styles.storyText}>
              "Passionate supporter of authentic Indian heritage crafts, regional handloom weavers, and GI-certified master artisan clusters."
            </Text>
            <TouchableOpacity
              style={styles.storyEdit}
              onPress={() => setEditBuyerProfileOpen(true)}
              activeOpacity={0.8}
            >
              <Edit3 size={13} color="#0D0D0D" />
              <Text style={styles.storyEditText}>Edit Collector Bio</Text>
            </TouchableOpacity>
          </View>

          {/* Section 1: Orders & Purchases */}
          <View style={styles.settingsSection}>
            <Text style={styles.sectionTitle}>ORDERS & PURCHASES</Text>
            <View style={styles.sectionCard}>
              <TouchableOpacity
                style={[styles.settingsRow, styles.settingsRowBorder]}
                activeOpacity={0.7}
                onPress={() => setBuyerOrdersModalOpen(true)}
              >
                <Package size={18} color="#0D0D0D" style={styles.settingsIcon} />
                <Text style={styles.settingsLabel}>My Purchase Orders</Text>
                <View style={styles.settingsRight}>
                  <Text style={styles.settingsValue}>{buyerOrders.length} orders</Text>
                  <ChevronRight size={16} color="#8E8E93" />
                </View>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.settingsRow}
                activeOpacity={0.7}
                onPress={() => router.push('/cart')}
              >
                <ShoppingBag size={18} color="#0D0D0D" style={styles.settingsIcon} />
                <Text style={styles.settingsLabel}>Shopping Bag</Text>
                <View style={styles.settingsRight}>
                  <Text style={styles.settingsValue}>{cartCount} items</Text>
                  <ChevronRight size={16} color="#8E8E93" />
                </View>
              </TouchableOpacity>
            </View>
          </View>

          {/* Section 2: Messages & Inquiries */}
          <View style={styles.settingsSection}>
            <Text style={styles.sectionTitle}>MESSAGES & ARTISANS</Text>
            <View style={styles.sectionCard}>
              <TouchableOpacity
                style={styles.settingsRow}
                activeOpacity={0.7}
                onPress={() => setBuyerInquiriesModalOpen(true)}
              >
                <MessageCircle size={18} color="#0D0D0D" style={styles.settingsIcon} />
                <Text style={styles.settingsLabel}>Inquiries to Artisans</Text>
                <View style={styles.settingsRight}>
                  <Text style={styles.settingsValue}>{buyerInquiries.length} sent</Text>
                  <ChevronRight size={16} color="#8E8E93" />
                </View>
              </TouchableOpacity>
            </View>
          </View>

          {/* Section 3: Account & Delivery Address */}
          <View style={styles.settingsSection}>
            <Text style={styles.sectionTitle}>ACCOUNT & DELIVERY</Text>
            <View style={styles.sectionCard}>
              <TouchableOpacity
                style={[styles.settingsRow, styles.settingsRowBorder]}
                activeOpacity={0.7}
                onPress={() => setEditBuyerProfileOpen(true)}
              >
                <Award size={18} color="#0D0D0D" style={styles.settingsIcon} />
                <Text style={styles.settingsLabel}>Buyer Category</Text>
                <View style={styles.settingsRight}>
                  <Text style={styles.settingsValue}>{buyerType}</Text>
                  <ChevronRight size={16} color="#8E8E93" />
                </View>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.settingsRow}
                activeOpacity={0.7}
                onPress={() => setEditAddressOpen(true)}
              >
                <MapPin size={18} color="#0D0D0D" style={styles.settingsIcon} />
                <Text style={styles.settingsLabel}>Shipping Address</Text>
                <View style={styles.settingsRight}>
                  <Text style={styles.settingsValue} numberOfLines={1}>{addrCity}, {addrState}</Text>
                  <ChevronRight size={16} color="#8E8E93" />
                </View>
              </TouchableOpacity>
            </View>
          </View>

          {/* Switch to Artisan Mode Card */}
          <TouchableOpacity
            style={styles.switchRoleCard}
            onPress={() => handleSwitchRole('artisan')}
            activeOpacity={0.88}
          >
            <View style={styles.switchRoleIconCircle}>
              <Store size={22} color="#FFFFFF" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.switchRoleTitle}>Switch to Artisan Seller</Text>
              <Text style={styles.switchRoleSub}>
                Sell your handcrafted creations directly across India.
              </Text>
            </View>
            <ChevronRight size={18} color="#0D0D0D" />
          </TouchableOpacity>

          {/* Section 4: App Preferences */}
          <View style={styles.settingsSection}>
            <Text style={styles.sectionTitle}>PREFERENCES</Text>
            <View style={styles.sectionCard}>
              <TouchableOpacity
                style={[styles.settingsRow, styles.settingsRowBorder]}
                activeOpacity={0.7}
                onPress={() => setLangPickerOpen(true)}
              >
                <Globe size={18} color="#0D0D0D" style={styles.settingsIcon} />
                <Text style={styles.settingsLabel}>App Language</Text>
                <View style={styles.settingsRight}>
                  <Text style={styles.settingsValue}>{languageMeta[language]?.native || 'English'}</Text>
                  <ChevronRight size={16} color="#8E8E93" />
                </View>
              </TouchableOpacity>

              <View style={styles.settingsRow}>
                <Bell size={18} color="#0D0D0D" style={styles.settingsIcon} />
                <Text style={styles.settingsLabel}>Order Notifications</Text>
                <Switch
                  value={toggleValues['Push Notifications']}
                  onValueChange={(val) =>
                    setToggleValues((prev) => ({ ...prev, ['Push Notifications']: val }))
                  }
                  trackColor={{ false: '#E5E7EB', true: '#0D0D0D' }}
                  thumbColor="#FFFFFF"
                />
              </View>
            </View>
          </View>

          {/* Logout Button */}
          <TouchableOpacity
            style={styles.logoutBtn}
            onPress={handleSignOut}
            activeOpacity={0.8}
          >
            <LogOut size={18} color="#EF4444" />
            <Text style={styles.logoutText}>Log Out</Text>
          </TouchableOpacity>
        </ScrollView>

        {/* ── EXACT SELLER NAVBAR: White Pill with Capsule & Center Button ── */}
        <BuyerBottomNav
          activeTab={buyerOrdersModalOpen ? 'orders' : 'profile'}
          onTabChange={(tab) => {
            if (tab === 'home') router.replace('/');
            else if (tab === 'explore') router.push('/explore');
            else if (tab === 'cart') router.push('/cart');
            else if (tab === 'orders') setBuyerOrdersModalOpen(true);
            else if (tab === 'profile') {
              setBuyerOrdersModalOpen(false);
              setBuyerInquiriesModalOpen(false);
            }
          }}
          cartCount={cartCount}
        />

        {/* ── MODAL: Edit Buyer Profile ────────────────────────────── */}
        <Modal
          visible={editBuyerProfileOpen}
          animationType="slide"
          transparent
          onRequestClose={() => setEditBuyerProfileOpen(false)}
        >
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            style={styles.modalOverlay}
          >
            <View style={[styles.modalSheet, { paddingBottom: Math.max(insets.bottom, 20) }]}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Edit Buyer Profile</Text>
                <TouchableOpacity
                  style={styles.modalCloseBtn}
                  onPress={() => setEditBuyerProfileOpen(false)}
                >
                  <X size={18} color="#0D0D0D" />
                </TouchableOpacity>
              </View>

              <Text style={styles.inputLabel}>Full Name</Text>
              <TextInput
                style={styles.inputField}
                value={buyerFormName}
                onChangeText={setBuyerFormName}
                placeholder="Your Name"
                placeholderTextColor="#A0A0A5"
              />

              <Text style={styles.inputLabel}>Buyer Category</Text>
              <View style={styles.buyerTypeRow}>
                {['Individual Buyer', 'Retail Business', 'Government Procurement'].map((bt) => (
                  <TouchableOpacity
                    key={bt}
                    style={[
                      styles.buyerTypeSelectBtn,
                      buyerFormType === bt && styles.buyerTypeSelectBtnActive,
                    ]}
                    onPress={() => setBuyerFormType(bt as any)}
                    activeOpacity={0.8}
                  >
                    <Text
                      style={[
                        styles.buyerTypeSelectText,
                        buyerFormType === bt && styles.buyerTypeSelectTextActive,
                      ]}
                    >
                      {bt === 'Individual Buyer' ? 'Individual' : bt === 'Retail Business' ? 'Business' : 'Govt'}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {buyerFormType === 'Retail Business' && (
                <>
                  <Text style={styles.inputLabel}>Business / Store Name</Text>
                  <TextInput
                    style={styles.inputField}
                    value={buyerFormBusinessName}
                    onChangeText={setBuyerFormBusinessName}
                    placeholder="e.g. FabIndia Boutique"
                    placeholderTextColor="#A0A0A5"
                  />

                  <Text style={styles.inputLabel}>GSTIN (Optional)</Text>
                  <TextInput
                    style={styles.inputField}
                    value={buyerFormGstin}
                    onChangeText={setBuyerFormGstin}
                    placeholder="22AAAAA0000A1Z5"
                    placeholderTextColor="#A0A0A5"
                    autoCapitalize="characters"
                  />
                </>
              )}

              <TouchableOpacity
                style={styles.saveModalBtn}
                onPress={handleSaveBuyerProfile}
                disabled={isSaving}
                activeOpacity={0.88}
              >
                {isSaving ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={styles.saveModalBtnText}>Save Profile</Text>
                )}
              </TouchableOpacity>
            </View>
          </KeyboardAvoidingView>
        </Modal>

        {/* ── MODAL: Edit Shipping Address ─────────────────────────── */}
        <Modal
          visible={editAddressOpen}
          animationType="slide"
          transparent
          onRequestClose={() => setEditAddressOpen(false)}
        >
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            style={styles.modalOverlay}
          >
            <View style={[styles.modalSheet, { paddingBottom: Math.max(insets.bottom, 20) }]}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Shipping Address</Text>
                <TouchableOpacity
                  style={styles.modalCloseBtn}
                  onPress={() => setEditAddressOpen(false)}
                >
                  <X size={18} color="#0D0D0D" />
                </TouchableOpacity>
              </View>

              <Text style={styles.inputLabel}>Street / Building / Area</Text>
              <TextInput
                style={styles.inputField}
                value={addrLine}
                onChangeText={setAddrLine}
                placeholder="Flat / House No., Landmark"
                placeholderTextColor="#A0A0A5"
              />

              <View style={{ flexDirection: 'row', gap: 10 }}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.inputLabel}>City</Text>
                  <TextInput
                    style={styles.inputField}
                    value={addrCity}
                    onChangeText={setAddrCity}
                    placeholder="Bengaluru"
                    placeholderTextColor="#A0A0A5"
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.inputLabel}>State</Text>
                  <TextInput
                    style={styles.inputField}
                    value={addrState}
                    onChangeText={setAddrState}
                    placeholder="Karnataka"
                    placeholderTextColor="#A0A0A5"
                  />
                </View>
              </View>

              <Text style={styles.inputLabel}>PIN Code</Text>
              <TextInput
                style={styles.inputField}
                value={addrPincode}
                onChangeText={setAddrPincode}
                placeholder="560001"
                placeholderTextColor="#A0A0A5"
                keyboardType="numeric"
              />

              <TouchableOpacity
                style={styles.saveModalBtn}
                onPress={handleSaveAddress}
                disabled={isSaving}
                activeOpacity={0.88}
              >
                {isSaving ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={styles.saveModalBtnText}>Update Address</Text>
                )}
              </TouchableOpacity>
            </View>
          </KeyboardAvoidingView>
        </Modal>

        {/* ── MODAL: Purchase Orders History ─────────────────────── */}
        <Modal
          visible={buyerOrdersModalOpen}
          animationType="slide"
          transparent
          onRequestClose={() => setBuyerOrdersModalOpen(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={[styles.modalSheet, { maxHeight: '85%', paddingBottom: Math.max(insets.bottom, 20) }]}>
              <View style={styles.modalHeader}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <Package size={20} color="#0D0D0D" strokeWidth={2.2} />
                  <Text style={styles.modalTitle}>My Purchase Orders</Text>
                </View>
                <TouchableOpacity
                  style={styles.modalCloseBtn}
                  onPress={() => setBuyerOrdersModalOpen(false)}
                >
                  <X size={18} color="#0D0D0D" />
                </TouchableOpacity>
              </View>

              {ordersLoading ? (
                <View style={{ paddingVertical: 40, alignItems: 'center' }}>
                  <ActivityIndicator size="small" color="#0D0D0D" />
                  <Text style={{ marginTop: 10, fontSize: 13, color: '#6B7280' }}>Loading orders...</Text>
                </View>
              ) : buyerOrders.length === 0 ? (
                <View style={{ paddingVertical: 40, alignItems: 'center', paddingHorizontal: 20 }}>
                  <ShoppingBag size={48} color="#D1D5DB" strokeWidth={1.5} />
                  <Text style={{ fontSize: 16, fontWeight: '700', color: '#0D0D0D', marginTop: 12 }}>No Orders Yet</Text>
                  <Text style={{ fontSize: 13, color: '#6B7280', textAlign: 'center', marginTop: 4, marginBottom: 20 }}>
                    Support rural artisans by exploring certified handlooms and crafts.
                  </Text>
                  <TouchableOpacity
                    style={[styles.saveModalBtn, { width: '100%' }]}
                    onPress={() => {
                      setBuyerOrdersModalOpen(false);
                      router.replace('/');
                    }}
                    activeOpacity={0.88}
                  >
                    <Text style={styles.saveModalBtnText}>Discover Handcrafted Treasures</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <ScrollView showsVerticalScrollIndicator={false} style={{ marginTop: 10 }}>
                  {buyerOrders.map((order, idx) => {
                    const fallbackImg = 'https://images.unsplash.com/photo-1605289355680-75fb41239154?w=400&q=80';
                    const orderDate = order.created_at
                      ? new Date(order.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
                      : 'Recent';
                    const statusColor = (order.status || '').toLowerCase() === 'delivered' ? '#10B981' : '#D97706';

                    return (
                      <View key={order.id || idx} style={styles.orderCardItem}>
                        <View style={styles.orderCardTop}>
                          <View>
                            <Text style={styles.orderCardId}>
                              #{order.id ? order.id.slice(0, 10).toUpperCase() : `ORD-${idx + 1001}`}
                            </Text>
                            <Text style={styles.orderCardDate}>{orderDate}</Text>
                          </View>
                          <View
                            style={[
                              styles.orderStatusBadge,
                              { backgroundColor: statusColor + '15', borderColor: statusColor + '40' },
                            ]}
                          >
                            <Text style={[styles.orderCardStatusText, { color: statusColor }]}>
                              {(order.status || 'Confirmed').toUpperCase()}
                            </Text>
                          </View>
                        </View>

                        <View style={styles.orderProductRow}>
                          <Image
                            source={{ uri: order.product_image || fallbackImg }}
                            style={styles.orderProductImg}
                            resizeMode="cover"
                          />
                          <View style={{ flex: 1, marginLeft: 12 }}>
                            <Text style={styles.orderProductTitle} numberOfLines={1}>
                              {order.product_title || 'Handcrafted Treasure'}
                            </Text>
                            <Text style={styles.orderProductArtisan}>
                              by {order.artisan_name || 'Master Artisan'}
                            </Text>
                            <View style={styles.orderProductMeta}>
                              <Text style={styles.orderProductQty}>Qty: {order.quantity || 1}</Text>
                              <Text style={styles.orderProductTotal}>{order.total_amount || '₹650'}</Text>
                            </View>
                          </View>
                        </View>
                      </View>
                    );
                  })}
                </ScrollView>
              )}
            </View>
          </View>
        </Modal>

        {/* ── MODAL: Sent Inquiries to Artisans ───────────────────── */}
        <Modal
          visible={buyerInquiriesModalOpen}
          animationType="slide"
          transparent
          onRequestClose={() => setBuyerInquiriesModalOpen(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={[styles.modalSheet, { maxHeight: '85%', paddingBottom: Math.max(insets.bottom, 20) }]}>
              <View style={styles.modalHeader}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <MessageCircle size={20} color="#0D0D0D" strokeWidth={2.2} />
                  <Text style={styles.modalTitle}>Inquiries to Artisans</Text>
                </View>
                <TouchableOpacity
                  style={styles.modalCloseBtn}
                  onPress={() => setBuyerInquiriesModalOpen(false)}
                >
                  <X size={18} color="#0D0D0D" />
                </TouchableOpacity>
              </View>

              {buyerInquiries.length === 0 ? (
                <View style={{ paddingVertical: 40, alignItems: 'center', paddingHorizontal: 20 }}>
                  <MessageCircle size={48} color="#D1D5DB" strokeWidth={1.5} />
                  <Text style={{ fontSize: 16, fontWeight: '700', color: '#0D0D0D', marginTop: 12 }}>No Messages Sent</Text>
                  <Text style={{ fontSize: 13, color: '#6B7280', textAlign: 'center', marginTop: 4 }}>
                    You can contact artisans directly from any product details page to ask about custom orders, sizing, or bulk commissions.
                  </Text>
                </View>
              ) : (
                <ScrollView showsVerticalScrollIndicator={false} style={{ marginTop: 10 }}>
                  {buyerInquiries.map((inq, idx) => {
                    const inqDate = inq.created_at
                      ? new Date(inq.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })
                      : 'Recent';
                    return (
                      <View key={inq.id || idx} style={styles.inquiryCardItem}>
                        <View style={styles.inquiryCardHeader}>
                          <Text style={styles.inquiryProductTitle} numberOfLines={1}>
                            {inq.product_title || 'Artisan Inquiry'}
                          </Text>
                          <Text style={styles.inquiryDate}>{inqDate}</Text>
                        </View>
                        <Text style={styles.inquiryMessageText}>
                          "{inq.message}"
                        </Text>
                        <View style={styles.inquiryStatusRow}>
                          <View style={styles.inquiryStatusPill}>
                            <Text style={styles.inquiryStatusPillText}>
                              {(inq.status || 'Sent to Artisan').toUpperCase()}
                            </Text>
                          </View>
                        </View>
                      </View>
                    );
                  })}
                </ScrollView>
              )}
            </View>
          </View>
        </Modal>

        {/* Language Picker */}
        <LanguagePicker autoOpen={langPickerOpen} onClose={() => setLangPickerOpen(false)} />
      </View>
    );
  }

  // ─────────────────────────────────────────────────────────────────
  // RENDER ARTISAN PROFILE
  // ─────────────────────────────────────────────────────────────────
  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

      {/* ── Top Bar ───────────────────────────────────────────────── */}
      <View style={[styles.topBar, { paddingTop: insets.top + 8 }]}>
        <TouchableOpacity
          style={styles.circleBtnBlack}
          onPress={() => router.back()}
          activeOpacity={0.8}
        >
          <ArrowLeft size={20} color="#FFFFFF" strokeWidth={2.5} />
        </TouchableOpacity>
        <Text style={styles.screenTitle}>{t('profile_title')}</Text>
        <TouchableOpacity
          style={styles.editBtn}
          onPress={() => setEditProfileOpen(true)}
          activeOpacity={0.8}
        >
          <Text style={styles.editBtnText}>{t('profile_edit')}</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: NAV_HEIGHT + insets.bottom + 30 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Profile hero card */}
        <View style={styles.profileCard}>
          <View style={styles.avatarWrapper}>
            <Image source={{ uri: displayAvatar }} style={styles.avatar} />
            <TouchableOpacity
              style={styles.avatarEditBtn}
              activeOpacity={0.8}
              onPress={() => setAvatarModalOpen(true)}
            >
              <Camera size={14} color="#FFFFFF" />
            </TouchableOpacity>
          </View>

          <Text style={styles.profileName}>{displayName}</Text>
          <View style={styles.locRow}>
            <MapPin size={13} color="#8E8E93" />
            <Text style={styles.profileLocation}>{displayLocation}</Text>
          </View>

          {/* Badges row */}
          <View style={styles.badgesRow}>
            {BADGES.map((badge) => {
              const Icon = badge.Icon;
              return (
                <View
                  key={badge.label}
                  style={[
                    styles.badge,
                    { borderColor: badge.color + '40', backgroundColor: badge.color + '10' },
                  ]}
                >
                  <Icon size={14} color={badge.color} />
                  <Text style={[styles.badgeText, { color: badge.color }]}>{badge.label}</Text>
                </View>
              );
            })}
          </View>

          {/* Stats mini strip */}
          <View style={styles.miniStats}>
            <View style={styles.miniStat}>
              <Text style={styles.miniStatValue}>12</Text>
              <Text style={styles.miniStatLabel}>{t('profile_listings')}</Text>
            </View>
            <View style={styles.miniStatDivider} />
            <View style={styles.miniStat}>
              <Text style={styles.miniStatValue}>48</Text>
              <Text style={styles.miniStatLabel}>{t('profile_sales')}</Text>
            </View>
            <View style={styles.miniStatDivider} />
            <View style={styles.miniStat}>
              <View style={styles.ratingInline}>
                <Text style={styles.miniStatValue}>4.9</Text>
                <Star size={12} color="#F59E0B" fill="#F59E0B" strokeWidth={0} />
              </View>
              <Text style={styles.miniStatLabel}>{t('profile_rating')}</Text>
            </View>
            <View style={styles.miniStatDivider} />
            <View style={styles.miniStat}>
              <Text style={styles.miniStatValue}>₹8,450</Text>
              <Text style={styles.miniStatLabel}>{t('profile_revenue')}</Text>
            </View>
          </View>
        </View>

        {/* Craft story card */}
        <View style={styles.storyCard}>
          <Text style={styles.storyTitle}>{t('profile_craft_story')}</Text>
          <Text style={styles.storyText}>"{displayBio}"</Text>
          <TouchableOpacity
            style={styles.storyEdit}
            onPress={() => setEditStoryOpen(true)}
            activeOpacity={0.8}
          >
            <Edit3 size={13} color="#0D0D0D" />
            <Text style={styles.storyEditText}>{t('profile_edit_story')}</Text>
          </TouchableOpacity>
        </View>

        {/* Switch to Buyer Mode */}
        <TouchableOpacity
          style={styles.switchRoleCard}
          onPress={() => handleSwitchRole('buyer')}
          activeOpacity={0.88}
        >
          <View style={styles.switchRoleIconCircle}>
            <ShoppingBag size={22} color="#FFFFFF" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.switchRoleTitle}>Switch to Buyer Marketplace</Text>
            <Text style={styles.switchRoleSub}>
              Browse craft creations from fellow artisans across India.
            </Text>
          </View>
          <ArrowRight size={18} color="#0D0D0D" />
        </TouchableOpacity>

        {/* Settings sections - Business */}
        <View style={styles.settingsSection}>
          <Text style={styles.sectionTitle}>{t('profile_section_business').toUpperCase()}</Text>
          <View style={styles.sectionCard}>
            <TouchableOpacity
              style={[styles.settingsRow, styles.settingsRowBorder]}
              activeOpacity={0.7}
              onPress={() => setEditProfileOpen(true)}
            >
              <Store size={18} color="#0D0D0D" style={styles.settingsIcon} />
              <Text style={styles.settingsLabel}>{t('profile_shop_name')}</Text>
              <View style={styles.settingsRight}>
                <Text style={styles.settingsValue}>{displayShop}</Text>
                <ChevronRight size={16} color="#8E8E93" />
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.settingsRow, styles.settingsRowBorder]}
              activeOpacity={0.7}
              onPress={() => setEditProfileOpen(true)}
            >
              <FileBadge size={18} color="#0D0D0D" style={styles.settingsIcon} />
              <Text style={styles.settingsLabel}>{t('profile_scheme_id')}</Text>
              <View style={styles.settingsRight}>
                <Text style={styles.settingsValue}>{displayScheme}</Text>
                <ChevronRight size={16} color="#8E8E93" />
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.settingsRow, styles.settingsRowBorder]}
              activeOpacity={0.7}
              onPress={() => setEditProfileOpen(true)}
            >
              <MapPin size={18} color="#0D0D0D" style={styles.settingsIcon} />
              <Text style={styles.settingsLabel}>{t('profile_location')}</Text>
              <View style={styles.settingsRight}>
                <Text style={styles.settingsValue}>{displayLocation}</Text>
                <ChevronRight size={16} color="#8E8E93" />
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.settingsRow}
              activeOpacity={0.7}
              onPress={() => setBankModalOpen(true)}
            >
              <Landmark size={18} color="#0D0D0D" style={styles.settingsIcon} />
              <Text style={styles.settingsLabel}>{t('profile_bank_account')}</Text>
              <View style={styles.settingsRight}>
                <Text
                  style={[
                    styles.settingsValue,
                    profile?.bank_account_no ? styles.bankLinkedValue : styles.bankUnlinkedValue,
                  ]}
                >
                  {displayBankMasked}
                </Text>
                <ChevronRight size={16} color="#8E8E93" />
              </View>
            </TouchableOpacity>
          </View>
        </View>

        {/* App Settings section */}
        <View style={styles.settingsSection}>
          <Text style={styles.sectionTitle}>{t('profile_section_app').toUpperCase()}</Text>
          <View style={styles.sectionCard}>
            <TouchableOpacity
              style={[styles.settingsRow, styles.settingsRowBorder]}
              activeOpacity={0.7}
              onPress={() => setLangPickerOpen(true)}
            >
              <Globe size={18} color="#0D0D0D" style={styles.settingsIcon} />
              <Text style={styles.settingsLabel}>{t('profile_language')}</Text>
              <View style={styles.settingsRight}>
                <Text style={styles.settingsValue}>{languageMeta[language]?.native}</Text>
                <ChevronRight size={16} color="#8E8E93" />
              </View>
            </TouchableOpacity>

            <View style={styles.settingsRow}>
              <Bell size={18} color="#0D0D0D" style={styles.settingsIcon} />
              <Text style={styles.settingsLabel}>{t('profile_push_notifications')}</Text>
              <Switch
                value={toggleValues['Push Notifications']}
                onValueChange={(val) =>
                  setToggleValues((prev) => ({ ...prev, ['Push Notifications']: val }))
                }
                trackColor={{ false: '#E5E7EB', true: '#0D0D0D' }}
                thumbColor="#FFFFFF"
              />
            </View>
          </View>
        </View>

        {/* Logout Button */}
        <TouchableOpacity
          style={styles.logoutBtn}
          onPress={handleSignOut}
          activeOpacity={0.8}
        >
          <LogOut size={18} color="#EF4444" />
          <Text style={styles.logoutText}>{t('profile_logout')}</Text>
        </TouchableOpacity>
      </ScrollView>

      {/* Artisan Bottom Navigation */}
      <ArtisanBottomNav activeTab={activeTab} onTabChange={handleTabChange} />

      {/* Artisan Modals: Edit Profile, Bank Details, Story, Avatar */}
      <Modal
        visible={editProfileOpen}
        animationType="slide"
        transparent
        onRequestClose={() => setEditProfileOpen(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.modalOverlay}
        >
          <View style={[styles.modalSheet, { paddingBottom: Math.max(insets.bottom, 20) }]}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{t('profile_edit')}</Text>
              <TouchableOpacity
                style={styles.modalCloseBtn}
                onPress={() => setEditProfileOpen(false)}
              >
                <X size={18} color="#0D0D0D" />
              </TouchableOpacity>
            </View>

            <Text style={styles.inputLabel}>Artisan Name</Text>
            <TextInput
              style={styles.inputField}
              value={formName}
              onChangeText={setFormName}
              placeholder="Name"
              placeholderTextColor="#A0A0A5"
            />

            <Text style={styles.inputLabel}>Studio / Shop Name</Text>
            <TextInput
              style={styles.inputField}
              value={formShopName}
              onChangeText={setFormShopName}
              placeholder="Studio Name"
              placeholderTextColor="#A0A0A5"
            />

            <Text style={styles.inputLabel}>Craft Type</Text>
            <TextInput
              style={styles.inputField}
              value={formCraftType}
              onChangeText={setFormCraftType}
              placeholder="e.g. Kutch Handloom"
              placeholderTextColor="#A0A0A5"
            />

            <Text style={styles.inputLabel}>Location</Text>
            <TextInput
              style={styles.inputField}
              value={formLocation}
              onChangeText={setFormLocation}
              placeholder="City, State"
              placeholderTextColor="#A0A0A5"
            />

            <TouchableOpacity
              style={styles.saveModalBtn}
              onPress={handleSaveProfile}
              disabled={isSaving}
              activeOpacity={0.88}
            >
              {isSaving ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Text style={styles.saveModalBtnText}>Save Details</Text>
              )}
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Bank Modal */}
      <Modal
        visible={bankModalOpen}
        animationType="slide"
        transparent
        onRequestClose={() => setBankModalOpen(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.modalOverlay}
        >
          <View style={[styles.modalSheet, { paddingBottom: Math.max(insets.bottom, 20) }]}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Bank Payout Details</Text>
              <TouchableOpacity
                style={styles.modalCloseBtn}
                onPress={() => setBankModalOpen(false)}
              >
                <X size={18} color="#0D0D0D" />
              </TouchableOpacity>
            </View>

            <Text style={styles.inputLabel}>Account Number</Text>
            <TextInput
              style={styles.inputField}
              value={formAccountNo}
              onChangeText={setFormAccountNo}
              placeholder="Enter Account Number"
              placeholderTextColor="#A0A0A5"
              keyboardType="numeric"
            />

            <Text style={styles.inputLabel}>Confirm Account Number</Text>
            <TextInput
              style={styles.inputField}
              value={formConfirmAccountNo}
              onChangeText={setFormConfirmAccountNo}
              placeholder="Re-enter Account Number"
              placeholderTextColor="#A0A0A5"
              keyboardType="numeric"
            />

            <Text style={styles.inputLabel}>IFSC Code</Text>
            <TextInput
              style={styles.inputField}
              value={formIfsc}
              onChangeText={setFormIfsc}
              placeholder="SBIN0001234"
              placeholderTextColor="#A0A0A5"
              autoCapitalize="characters"
            />

            <Text style={styles.inputLabel}>Account Holder Name</Text>
            <TextInput
              style={styles.inputField}
              value={formHolderName}
              onChangeText={setFormHolderName}
              placeholder="Name on Bank Account"
              placeholderTextColor="#A0A0A5"
            />

            {errorMessage ? <Text style={styles.errorText}>{errorMessage}</Text> : null}

            <TouchableOpacity
              style={styles.saveModalBtn}
              onPress={handleSaveBank}
              disabled={isSaving}
              activeOpacity={0.88}
            >
              {isSaving ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Text style={styles.saveModalBtnText}>Link Bank Account</Text>
              )}
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Story Modal */}
      <Modal
        visible={editStoryOpen}
        animationType="slide"
        transparent
        onRequestClose={() => setEditStoryOpen(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.modalOverlay}
        >
          <View style={[styles.modalSheet, { paddingBottom: Math.max(insets.bottom, 20) }]}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Craft & Artisan Story</Text>
              <TouchableOpacity
                style={styles.modalCloseBtn}
                onPress={() => setEditStoryOpen(false)}
              >
                <X size={18} color="#0D0D0D" />
              </TouchableOpacity>
            </View>

            <TextInput
              style={[styles.inputField, { height: 120, textAlignVertical: 'top' }]}
              value={formBio}
              onChangeText={setFormBio}
              placeholder="Share your artisan heritage and crafting techniques..."
              placeholderTextColor="#A0A0A5"
              multiline
              numberOfLines={5}
            />

            <TouchableOpacity
              style={styles.saveModalBtn}
              onPress={handleSaveStory}
              disabled={isSaving}
              activeOpacity={0.88}
            >
              {isSaving ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Text style={styles.saveModalBtnText}>Save Story</Text>
              )}
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Language Picker */}
      <LanguagePicker autoOpen={langPickerOpen} onClose={() => setLangPickerOpen(false)} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F7',
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 14,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F5F5F7',
  },
  screenTitle: {
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
  editBtn: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#F5F5F7',
  },
  editBtnText: {
    fontSize: 13,
    fontWeight: '700',
    fontFamily: Fonts.headingBold,
    color: '#0D0D0D',
  },
  content: {
    paddingHorizontal: 20,
    paddingTop: 16,
  },
  profileCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 20,
    alignItems: 'center',
    marginBottom: 16,
    ...Shadow.card,
  },
  avatarWrapper: {
    position: 'relative',
    marginBottom: 12,
  },
  avatar: {
    width: 84,
    height: 84,
    borderRadius: 42,
    backgroundColor: '#F5F5F7',
  },
  avatarEditBtn: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#0D0D0D',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  buyerAvatarCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#0D0D0D',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
    ...Shadow.card,
  },
  buyerAvatarInitial: {
    fontSize: 32,
    fontWeight: '800',
    fontFamily: Fonts.headingBold,
    color: '#FFFFFF',
  },
  profileName: {
    fontSize: 20,
    fontWeight: '800',
    fontFamily: Fonts.headingBold,
    color: '#0D0D0D',
    marginBottom: 4,
  },
  buyerPhoneText: {
    fontSize: 13,
    fontFamily: Fonts.bodyMedium,
    color: '#8E8E93',
    marginBottom: 8,
  },
  buyerTypePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#F5F5F7',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 14,
    marginBottom: 8,
  },
  buyerTypePillText: {
    fontSize: 12,
    fontWeight: '700',
    fontFamily: Fonts.headingBold,
    color: '#0D0D0D',
  },
  businessTagRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginBottom: 10,
  },
  businessTagText: {
    fontSize: 12,
    fontFamily: Fonts.body,
    color: '#8E8E93',
  },
  locRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 12,
  },
  profileLocation: {
    fontSize: 13,
    fontFamily: Fonts.body,
    color: '#8E8E93',
  },
  badgesRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '700',
    fontFamily: Fonts.headingBold,
  },
  miniStats: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    width: '100%',
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#F5F5F7',
  },
  miniStat: {
    alignItems: 'center',
    flex: 1,
  },
  miniStatValue: {
    fontSize: 16,
    fontWeight: '800',
    fontFamily: Fonts.headingBold,
    color: '#0D0D0D',
  },
  miniStatLabel: {
    fontSize: 11,
    fontFamily: Fonts.body,
    color: '#8E8E93',
    marginTop: 2,
  },
  miniStatDivider: {
    width: 1,
    height: 24,
    backgroundColor: '#E5E5EA',
  },
  ratingInline: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  storyCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 18,
    marginBottom: 16,
    ...Shadow.card,
  },
  storyTitle: {
    fontSize: 14,
    fontWeight: '700',
    fontFamily: Fonts.headingBold,
    color: '#0D0D0D',
    marginBottom: 8,
  },
  storyText: {
    fontSize: 13,
    fontFamily: Fonts.body,
    color: '#6B7280',
    lineHeight: 20,
    fontStyle: 'italic',
    marginBottom: 12,
  },
  storyEdit: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'flex-start',
  },
  storyEditText: {
    fontSize: 12,
    fontWeight: '700',
    fontFamily: Fonts.headingBold,
    color: '#0D0D0D',
  },
  switchRoleCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 16,
    marginBottom: 16,
    gap: 12,
    borderWidth: 1.5,
    borderColor: '#0D0D0D',
    ...Shadow.card,
  },
  switchRoleIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#0D0D0D',
    justifyContent: 'center',
    alignItems: 'center',
  },
  switchRoleTitle: {
    fontSize: 14,
    fontWeight: '800',
    fontFamily: Fonts.headingBold,
    color: '#0D0D0D',
  },
  switchRoleSub: {
    fontSize: 11,
    fontFamily: Fonts.body,
    color: '#6B7280',
    marginTop: 2,
    lineHeight: 16,
  },
  sectionTabsRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  sectionTabPill: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    paddingVertical: 10,
    paddingHorizontal: 6,
    ...Shadow.card,
  },
  sectionTabPillActive: {
    backgroundColor: '#0D0D0D',
  },
  sectionTabPillText: {
    fontSize: 11,
    fontWeight: '700',
    fontFamily: Fonts.headingBold,
    color: '#0D0D0D',
  },
  sectionTabPillTextActive: {
    color: '#FFFFFF',
  },
  sectionCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 16,
    marginBottom: 16,
    ...Shadow.card,
  },
  sectionHeaderBetween: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  cardHeaderTitle: {
    fontSize: 15,
    fontWeight: '800',
    fontFamily: Fonts.headingBold,
    color: '#0D0D0D',
  },
  emptyOrderBox: {
    alignItems: 'center',
    paddingVertical: 24,
  },
  emptyOrderTitle: {
    fontSize: 15,
    fontWeight: '700',
    fontFamily: Fonts.headingBold,
    color: '#0D0D0D',
    marginTop: 10,
  },
  emptyOrderSub: {
    fontSize: 12,
    fontFamily: Fonts.body,
    color: '#8E8E93',
    textAlign: 'center',
    marginTop: 4,
    marginBottom: 16,
    paddingHorizontal: 20,
  },
  browseSmallBtn: {
    backgroundColor: '#0D0D0D',
    borderRadius: 20,
    paddingVertical: 10,
    paddingHorizontal: 18,
  },
  browseSmallText: {
    fontSize: 12,
    fontWeight: '700',
    fontFamily: Fonts.headingBold,
    color: '#FFFFFF',
  },
  orderItemCard: {
    backgroundColor: '#F9F9FB',
    borderRadius: 16,
    padding: 12,
    borderWidth: 1,
    borderColor: '#EFEFF2',
  },
  orderTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  orderItemTitle: {
    fontSize: 13,
    fontWeight: '700',
    fontFamily: Fonts.headingBold,
    color: '#0D0D0D',
  },
  orderDate: {
    fontSize: 11,
    fontFamily: Fonts.body,
    color: '#8E8E93',
    marginTop: 2,
  },
  orderStatusPill: {
    backgroundColor: '#DCFCE7',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  orderStatusText: {
    fontSize: 10,
    fontWeight: '800',
    fontFamily: Fonts.headingBold,
    color: '#10B981',
  },
  orderDivider: {
    height: 1,
    backgroundColor: '#E5E5EA',
    marginVertical: 8,
  },
  orderBottomRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  orderQtyText: {
    fontSize: 12,
    fontFamily: Fonts.body,
    color: '#8E8E93',
  },
  orderAmountText: {
    fontSize: 14,
    fontWeight: '800',
    fontFamily: Fonts.headingBold,
    color: '#0D0D0D',
  },
  inquiryCard: {
    backgroundColor: '#F9F9FB',
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: '#EFEFF2',
  },
  inqProductTitle: {
    fontSize: 12,
    fontWeight: '700',
    fontFamily: Fonts.headingBold,
    color: '#0D0D0D',
    marginBottom: 4,
  },
  inqMessage: {
    fontSize: 13,
    fontFamily: Fonts.body,
    color: '#4B5563',
    lineHeight: 18,
    fontStyle: 'italic',
    marginBottom: 8,
  },
  inqFooterRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  inqDate: {
    fontSize: 11,
    fontFamily: Fonts.body,
    color: '#8E8E93',
  },
  inqBadge: {
    backgroundColor: '#F5F5F7',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  inqBadgeText: {
    fontSize: 10,
    fontWeight: '600',
    fontFamily: Fonts.bodyMedium,
    color: '#0D0D0D',
  },
  editAddressPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#F5F5F7',
    borderRadius: 14,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  editAddressPillText: {
    fontSize: 11,
    fontWeight: '700',
    fontFamily: Fonts.headingBold,
    color: '#0D0D0D',
  },
  addressDisplayBox: {
    flexDirection: 'row',
    gap: 12,
    backgroundColor: '#F9F9FB',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: '#EFEFF2',
  },
  addressName: {
    fontSize: 14,
    fontWeight: '700',
    fontFamily: Fonts.headingBold,
    color: '#0D0D0D',
  },
  addressBody: {
    fontSize: 13,
    fontFamily: Fonts.body,
    color: '#6B7280',
    lineHeight: 19,
    marginTop: 4,
  },
  addressPhone: {
    fontSize: 12,
    fontFamily: Fonts.bodyMedium,
    color: '#0D0D0D',
    marginTop: 6,
  },
  settingsSection: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '700',
    fontFamily: Fonts.headingBold,
    color: '#8E8E93',
    marginBottom: 8,
    paddingHorizontal: 4,
  },
  settingsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
  },
  settingsRowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: '#F5F5F7',
  },
  settingsIcon: {
    marginRight: 12,
  },
  settingsLabel: {
    flex: 1,
    fontSize: 14,
    fontFamily: Fonts.bodyMedium,
    color: '#0D0D0D',
  },
  settingsRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  settingsValue: {
    fontSize: 13,
    fontFamily: Fonts.body,
    color: '#8E8E93',
  },
  bankLinkedValue: {
    color: '#10B981',
    fontWeight: '600',
  },
  bankUnlinkedValue: {
    color: '#EF4444',
  },
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#FEE2E2',
    borderRadius: 20,
    paddingVertical: 14,
    marginTop: 10,
    marginBottom: 30,
  },
  logoutText: {
    fontSize: 14,
    fontWeight: '700',
    fontFamily: Fonts.headingBold,
    color: '#EF4444',
  },
  buyerBottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 50,
  },
  buyerNavPill: {
    flexDirection: 'row',
    backgroundColor: '#0D0D0D',
    borderRadius: 36,
    paddingHorizontal: 12,
    paddingVertical: 8,
    alignItems: 'center',
    gap: 16,
    ...Shadow.hero,
  },
  buyerNavTab: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 24,
  },
  buyerNavTabActive: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#262626',
    gap: 6,
    paddingHorizontal: 16,
  },
  buyerNavActiveLabel: {
    fontSize: 12,
    fontWeight: '700',
    fontFamily: Fonts.headingBold,
    color: '#FFFFFF',
  },
  cartBadgeSmall: {
    position: 'absolute',
    top: -4,
    right: -6,
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    minWidth: 16,
    height: 16,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 3,
  },
  cartBadgeSmallText: {
    fontSize: 9,
    fontWeight: '800',
    fontFamily: Fonts.headingBold,
    color: '#0D0D0D',
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
  inputLabel: {
    fontSize: 12,
    fontWeight: '700',
    fontFamily: Fonts.headingBold,
    color: '#0D0D0D',
    marginBottom: 6,
    marginTop: 10,
  },
  inputField: {
    backgroundColor: '#F5F5F7',
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 13,
    fontFamily: Fonts.body,
    color: '#0D0D0D',
  },
  buyerTypeRow: {
    flexDirection: 'row',
    gap: 8,
  },
  buyerTypeSelectBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 14,
    backgroundColor: '#F5F5F7',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: 'transparent',
  },
  buyerTypeSelectBtnActive: {
    backgroundColor: '#0D0D0D',
    borderColor: '#0D0D0D',
  },
  buyerTypeSelectText: {
    fontSize: 12,
    fontWeight: '600',
    fontFamily: Fonts.headingBold,
    color: '#0D0D0D',
  },
  buyerTypeSelectTextActive: {
    color: '#FFFFFF',
  },
  saveModalBtn: {
    backgroundColor: '#0D0D0D',
    borderRadius: 28,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 20,
    ...Shadow.card,
  },
  saveModalBtnText: {
    fontSize: 14,
    fontWeight: '700',
    fontFamily: Fonts.headingBold,
    color: '#FFFFFF',
  },
  errorText: {
    fontSize: 12,
    fontFamily: Fonts.body,
    color: '#EF4444',
    marginTop: 8,
  },
  orderCardItem: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  orderCardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  orderCardId: {
    fontSize: 13,
    fontWeight: '700',
    fontFamily: Fonts.headingBold,
    color: '#0D0D0D',
  },
  orderCardDate: {
    fontSize: 11,
    color: '#8E8E93',
    marginTop: 2,
  },
  orderStatusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
  },
  orderCardStatusText: {
    fontSize: 10,
    fontWeight: '700',
    fontFamily: Fonts.headingBold,
  },
  orderProductRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  orderProductImg: {
    width: 56,
    height: 56,
    borderRadius: 12,
    backgroundColor: '#F5F5F7',
  },
  orderProductTitle: {
    fontSize: 13,
    fontWeight: '700',
    fontFamily: Fonts.headingBold,
    color: '#0D0D0D',
  },
  orderProductArtisan: {
    fontSize: 11,
    color: '#6B7280',
    marginTop: 2,
  },
  orderProductMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 6,
  },
  orderProductQty: {
    fontSize: 11,
    color: '#8E8E93',
  },
  orderProductTotal: {
    fontSize: 13,
    fontWeight: '700',
    fontFamily: Fonts.headingBold,
    color: '#0D0D0D',
  },
  inquiryCardItem: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  inquiryCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  inquiryProductTitle: {
    fontSize: 13,
    fontWeight: '700',
    fontFamily: Fonts.headingBold,
    color: '#0D0D0D',
    flex: 1,
  },
  inquiryDate: {
    fontSize: 11,
    color: '#8E8E93',
    marginLeft: 8,
  },
  inquiryMessageText: {
    fontSize: 12,
    color: '#374151',
    fontStyle: 'italic',
    lineHeight: 18,
    marginBottom: 8,
  },
  inquiryStatusRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  inquiryStatusPill: {
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  inquiryStatusPillText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#4B5563',
  },
});
