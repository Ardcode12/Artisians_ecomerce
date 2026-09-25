import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  StatusBar,
  Modal,
  TextInput,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import {
  User,
  Store,
  CreditCard,
  Settings,
  HelpCircle,
  ChevronRight,
  LogOut,
  Pencil,
  Camera,
  ImageIcon,
  X,
  Check,
  Globe,
  Share2,
  Sparkles,
} from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';

import { Colors, Fonts, Shadow, NAV_HEIGHT } from '@/constants/artisan-theme';
import { ArtisanBottomNav, ArtisanTab } from '@/components/artisan/ArtisanBottomNav';
import { BuyerBottomNav, BuyerTab } from '@/components/buyer/BuyerBottomNav';
import { useAuth } from '@/context/AuthContext';
import { useLanguage } from '@/context/LanguageContext';
import { useCart } from '@/context/CartContext';
import LinkInstagramCard from '@/components/profile/LinkInstagramCard';
import { BACKEND_URL, normalizeImageUrl } from '@/config/api';
const BG = '#F5F0E8';

const PRESET_AVATARS = [
  'https://images.unsplash.com/photo-1544717305-2782549b5136?w=200&q=80',
  'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&q=80',
  'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&q=80',
  'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=200&q=80',
  'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=200&q=80',
  'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=200&q=80',
];

export default function ProfileScreen() {
  const [activeTab, setActiveTab] = useState<ArtisanTab>('profile');
  const {
    profile,
    buyerProfile,
    userRole,
    isLoading,
    signOut,
    updateProfile,
    updateBankDetails,
    uploadAvatar,
    phone,
    refreshProfile,
  } = useAuth();
  const { t, language } = useLanguage();
  const { cartCount } = useCart();

  // Auto-retry profile fetch if it's missing after loading completes
  useEffect(() => {
    if (!isLoading && !profile && userRole !== 'buyer') {
      refreshProfile().catch(() => {});
    }
  }, [isLoading]);


  // Modals state
  const [personalInfoOpen, setPersonalInfoOpen] = useState(false);
  const [shopDetailsOpen, setShopDetailsOpen] = useState(false);
  const [paymentDetailsOpen, setPaymentDetailsOpen] = useState(false);
  const [appSettingsOpen, setAppSettingsOpen] = useState(false);
  const [photoPickerOpen, setPhotoPickerOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);

  // Form states
  const [formName, setFormName] = useState('');
  const [formLocation, setFormLocation] = useState('');
  const [formPhone, setFormPhone] = useState('');
  const [formShopName, setFormShopName] = useState('');
  const [formCraftType, setFormCraftType] = useState('');
  const [formBankAcc, setFormBankAcc] = useState('');
  const [formIfsc, setFormIfsc] = useState('');
  const [formHolder, setFormHolder] = useState('');
  const [formBankName, setFormBankName] = useState('');
  const [formUpi, setFormUpi] = useState('');

  const insets = useSafeAreaInsets();
  const router = useRouter();

  const handleTabChange = (tab: ArtisanTab) => {
    setActiveTab(tab);
    if (tab === 'home') router.push('/');
    if (tab === 'listings') router.push('/listings');
    if (tab === 'growth') router.push('/growth' as any);
    if (tab === 'analytical') router.push('/analytics' as any);
    if (tab === 'add') router.push('/add-product');
    if (tab === 'profile') { /* already on profile */ }
  };

  const handleSignOut = async () => {
    await signOut();
    router.replace('/welcome');
  };

  // Show loading spinner while auth/profile data is being fetched
  if (isLoading) {
    return (
      <View style={{ flex: 1, backgroundColor: '#F5F0E8', alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator size="large" color="#2D6A4F" />
      </View>
    );
  }

  if (!profile && userRole !== 'buyer') {
    return (
      <View style={{ flex: 1, backgroundColor: '#F5F0E8', alignItems: 'center', justifyContent: 'center', padding: 32 }}>
        <Text style={{ fontSize: 20, fontWeight: '700', color: '#0D0D0D', textAlign: 'center', marginBottom: 8 }}>
          {t('profile_not_found') || 'Profile Not Found'}
        </Text>
        <Text style={{ fontSize: 14, color: '#8E8E93', textAlign: 'center', marginBottom: 28, lineHeight: 20 }}>
          {t('profile_not_found_sub') || "We couldn't load your profile data. You can retry loading, or sign out to return to the login screen."}
        </Text>
        <View style={{ width: '100%', maxWidth: 280, gap: 12 }}>
          <TouchableOpacity
            style={{ backgroundColor: '#C0392B', borderRadius: 24, paddingVertical: 14, alignItems: 'center' }}
            onPress={handleSignOut}
            activeOpacity={0.85}
          >
            <Text style={{ color: '#FFFFFF', fontWeight: '700', fontSize: 15 }}>{t('profile_signout_return') || 'Sign Out / Return to Login'}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={{ backgroundColor: '#2D6A4F', borderRadius: 24, paddingVertical: 14, alignItems: 'center' }}
            onPress={() => refreshProfile()}
            activeOpacity={0.85}
          >
            <Text style={{ color: '#FFFFFF', fontWeight: '700', fontSize: 15 }}>{t('profile_retry') || 'Retry Loading'}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={{ backgroundColor: '#E0DCD3', borderRadius: 24, paddingVertical: 14, alignItems: 'center' }}
            onPress={() => router.replace('/')}
            activeOpacity={0.85}
          >
            <Text style={{ color: '#0D0D0D', fontWeight: '600', fontSize: 15 }}>{t('profile_go_home') || 'Go to Home'}</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // Open Personal Information modal
  const openPersonalInfo = () => {
    setFormName(profile?.name || '');
    setFormLocation(profile?.location || '');
    setFormPhone(profile?.phone || phone || '');
    setPersonalInfoOpen(true);
  };

  // Open Shop Details modal
  const openShopDetails = () => {
    setFormShopName(profile?.shop_name || '');
    setFormCraftType(profile?.craft_type || '');
    setShopDetailsOpen(true);
  };

  // Open Payment Details modal
  const openPaymentDetails = () => {
    setFormBankAcc(profile?.bank_account_no || '');
    setFormIfsc(profile?.bank_ifsc || '');
    setFormHolder(profile?.bank_holder_name || profile?.name || '');
    setFormBankName(profile?.bank_name || '');
    setFormUpi(profile?.upi_id || '');
    setPaymentDetailsOpen(true);
  };

  // Save Personal Info
  const handleSavePersonalInfo = async () => {
    setIsSaving(true);
    try {
      await updateProfile({
        name: formName.trim(),
        location: formLocation.trim(),
      });
      setPersonalInfoOpen(false);
    } catch (_) {}
    setIsSaving(false);
  };

  // Save Shop Details
  const handleSaveShopDetails = async () => {
    setIsSaving(true);
    try {
      await updateProfile({
        shop_name: formShopName.trim(),
        craft_type: formCraftType.trim(),
      });
      setShopDetailsOpen(false);
    } catch (_) {}
    setIsSaving(false);
  };

  // Save Payment Details
  const handleSavePaymentDetails = async () => {
    if (!formBankAcc.trim() || !formIfsc.trim()) {
      Alert.alert(
        language === 'ta' ? 'தேவையான புலங்கள்' : language === 'hi' ? 'आवश्यक फ़ील्ड' : 'Required Fields',
        language === 'ta' ? 'கணக்கு எண் மற்றும் IFSC குறியீட்டை உள்ளிடவும்.' : language === 'hi' ? 'कृपया खाता संख्या और आईएफएससी कोड दर्ज करें।' : 'Please enter account number and IFSC code.'
      );
      return;
    }
    setIsSaving(true);
    try {
      const res = await updateBankDetails({
        bank_account_no: formBankAcc.trim(),
        bank_ifsc: formIfsc.trim().toUpperCase(),
        bank_holder_name: formHolder.trim(),
        bank_name: formBankName.trim() || 'Commercial Bank',
        upi_id: formUpi.trim(),
      });
      if (res.success) {
        Alert.alert(
          language === 'ta' ? 'வெற்றி' : language === 'hi' ? 'सफल' : 'Success',
          language === 'ta' ? 'வங்கி விவரங்கள் வெற்றிகரமாக சேமிக்கப்பட்டன.' : language === 'hi' ? 'बैंक विवरण सफलतापूर्वक सहेजे गए।' : 'Bank details saved successfully.'
        );
        setPaymentDetailsOpen(false);
      } else {
        Alert.alert(
          language === 'ta' ? 'பிழை' : language === 'hi' ? 'त्रुटि' : 'Error',
          res.error || (language === 'ta' ? 'வங்கி விவரங்களை புதுப்பிக்க முடியவில்லை.' : language === 'hi' ? 'बैंक विवरण अपडेट करने में विफल।' : 'Failed to update bank details.')
        );
      }
    } catch (_) {}
    setIsSaving(false);
  };

  // Upload photo from Camera
  const handlePickCamera = async () => {
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(
          language === 'ta' ? 'அனுமதி தேவை' : language === 'hi' ? 'अनुमति आवश्यक' : 'Permission needed',
          language === 'ta' ? 'கேமரா அனுமதி தேவை.' : language === 'hi' ? 'कैमरा अनुमति आवश्यक है।' : 'Camera permission is required.'
        );
        return;
      }
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ['images'],
        quality: 0.8,
        allowsEditing: true,
        aspect: [1, 1],
        base64: true,
      });
      if (!result.canceled && result.assets[0]) {
        setPhotoPickerOpen(false);
        await uploadImageToProfile(result.assets[0]);
      }
    } catch (e: any) {
      Alert.alert(
        language === 'ta' ? 'பிழை' : language === 'hi' ? 'त्रुटि' : 'Error',
        e?.message || (language === 'ta' ? 'புகைப்படம் எடுக்க முடியவில்லை.' : language === 'hi' ? 'फ़ोटो नहीं ली जा सकी।' : 'Could not take photo.')
      );
    }
  };

  // Upload photo from Gallery
  const handlePickGallery = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(
          language === 'ta' ? 'அனுமதி தேவை' : language === 'hi' ? 'अनुमति आवश्यक' : 'Permission needed',
          language === 'ta' ? 'கேலரி அனுமதி தேவை.' : language === 'hi' ? 'गैलरी अनुमति आवश्यक है।' : 'Gallery permission is required.'
        );
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        quality: 0.8,
        allowsEditing: true,
        aspect: [1, 1],
        base64: true,
      });
      if (!result.canceled && result.assets[0]) {
        setPhotoPickerOpen(false);
        await uploadImageToProfile(result.assets[0]);
      }
    } catch (e: any) {
      Alert.alert(
        language === 'ta' ? 'பிழை' : language === 'hi' ? 'त्रुटि' : 'Error',
        e?.message || (language === 'ta' ? 'புகைப்படம் தேர்வு செய்ய முடியவில்லை.' : language === 'hi' ? 'फ़ोटो चुनी नहीं जा सकी।' : 'Could not pick photo.')
      );
    }
  };

  // Upload image data to backend
  const uploadImageToProfile = async (asset: ImagePicker.ImagePickerAsset) => {
    setIsUploadingPhoto(true);
    try {
      const imagePayload = asset.base64
        ? `data:image/jpeg;base64,${asset.base64}`
        : asset.uri;

      const res = await uploadAvatar(imagePayload);
      if (res.success) {
        Alert.alert(
          language === 'ta' ? 'சுயவிவரம் புதுப்பிக்கப்பட்டது' : language === 'hi' ? 'प्रोफ़ाइल अपडेट की गई' : 'Profile Updated',
          language === 'ta' ? 'உங்கள் சுயவிவரப் புகைப்படம் புதுப்பிக்கப்பட்டது!' : language === 'hi' ? 'आपकी प्रोफ़ाइल फ़ोटो अपडेट कर दी गई है!' : 'Your profile picture has been updated!'
        );
      }
    } catch (err: any) {
      Alert.alert(
        language === 'ta' ? 'அறிவிப்பு' : language === 'hi' ? 'सूचना' : 'Notice',
        language === 'ta' ? 'புகைப்படம் சாதனத்தில் அமைக்கப்பட்டது.' : language === 'hi' ? 'फ़ोटो डिवाइस पर सेट की गई।' : 'Photo set on device.'
      );
    } finally {
      setIsUploadingPhoto(false);
    }
  };

  // Select preset avatar
  const handleSelectPreset = async (uri: string) => {
    setPhotoPickerOpen(false);
    setIsUploadingPhoto(true);
    try {
      await uploadAvatar(uri);
    } finally {
      setIsUploadingPhoto(false);
    }
  };

  // ── Buyer profile ────────────────────────────────────────────────────────
  if (userRole === 'buyer') {
    const buyerName = buyerProfile?.name || (language === 'ta' ? 'வாங்குபவர்' : language === 'hi' ? 'खरीदार' : 'Buyer');
    return (
      <View style={styles.root}>
        <StatusBar barStyle="dark-content" backgroundColor={BG} />
        <ScrollView contentContainerStyle={[styles.scrollContent, { paddingTop: insets.top + 20 }]}>
          <View style={styles.heroCard}>
            <View style={styles.avatarCircle}>
              <User size={36} color="#2D6A4F" strokeWidth={2} />
            </View>
            <View style={styles.heroTextContainer}>
              <Text style={styles.profileName}>{buyerName}</Text>
              <Text style={styles.profileSubtitle}>{buyerProfile?.buyer_type || (language === 'ta' ? 'வாங்குபவர்' : language === 'hi' ? 'खरीदार' : 'Buyer')}</Text>
            </View>
          </View>
          <TouchableOpacity
            style={styles.logoutCard}
            onPress={handleSignOut}
            activeOpacity={0.85}
          >
            <LogOut size={20} color="#D32F2F" />
            <Text style={styles.logoutText}>{t('profile_logout') || (language === 'ta' ? 'வெளியேறு' : language === 'hi' ? 'लॉग आउट' : 'Logout')}</Text>
          </TouchableOpacity>
        </ScrollView>
        <BuyerBottomNav
          activeTab="profile"
          onTabChange={(tab: BuyerTab) => {
            if (tab === 'home') router.push('/buyer-home');
            if (tab === 'explore') router.push('/explore');
            if (tab === 'cart') router.push('/cart');
            if (tab === 'profile') router.push('/profile');
          }}
          cartCount={cartCount}
        />
      </View>
    );
  }

  // ── Artisan Profile ───────────────────────────────────────────────────────
  const artisanName = profile?.name || (language === 'ta' ? 'மீனா தேவி' : language === 'hi' ? 'मीना देवी' : 'Meena Devi');
  const locationSubtitle = profile?.location
    ? `${t('profile_artisan_from') || (language === 'ta' ? 'கைவினைஞர் -' : language === 'hi' ? 'कारीगर -' : 'Artisan from')} ${profile.location}`
    : profile?.craft_type
      ? `${profile.craft_type}`
      : `${t('profile_artisan_from') || (language === 'ta' ? 'கைவினைஞர் -' : language === 'hi' ? 'कारीगर -' : 'Artisan from')} ${language === 'ta' ? 'தமிழ்நாடு' : language === 'hi' ? 'तमिलनाडु' : 'Tamil Nadu'}`;

  const MENU_OPTIONS = [
    {
      id: 'personal',
      title: language === 'ta' ? 'தனிப்பட்ட தகவல்' : language === 'hi' ? 'व्यक्तिगत जानकारी' : (t('profile_personal_info') || 'Personal Information'),
      Icon: User,
      iconColor: '#2D6A4F',
      iconBg: '#EDF7F2',
      onPress: openPersonalInfo,
    },
    {
      id: 'shop',
      title: language === 'ta' ? 'கடை விவரங்கள்' : language === 'hi' ? 'दुकान का विवरण' : (t('profile_shop_details') || 'Shop Details'),
      Icon: Store,
      iconColor: '#C26A3E',
      iconBg: '#FDF3EB',
      onPress: openShopDetails,
    },
    {
      id: 'logo',
      title: language === 'ta' ? 'கடை லோகோ & பிராண்ட் முத்திரை' : language === 'hi' ? 'दुकान लोगो व ब्रांड मार्क' : 'Shop Logo & Brand Mark',
      Icon: Sparkles,
      iconColor: '#B45309',
      iconBg: '#FEF3C7',
      onPress: () => router.push('/auth/logo-reveal'),
    },
    {
      id: 'payment',
      title: language === 'ta' ? 'பணம் செலுத்துதல் & வங்கி விவரங்கள்' : language === 'hi' ? 'भुगतान और बैंक विवरण' : (t('profile_payment_bank') || 'Payment Details'),
      Icon: CreditCard,
      iconColor: '#3B82F6',
      iconBg: '#EEF5F9',
      onPress: openPaymentDetails,
    },
    {
      id: 'settings',
      title: language === 'ta' ? 'செயலி அமைப்புகள்' : language === 'hi' ? 'ऐप सेटिंग्स' : (t('profile_app_settings') || 'App Settings'),
      Icon: Settings,
      iconColor: '#2D6A4F',
      iconBg: '#EDF7ED',
      onPress: () => setAppSettingsOpen(true),
    },
    {
      id: 'support',
      title: language === 'ta' ? 'உதவி & ஆதரவு' : language === 'hi' ? 'सहायता और समर्थन' : (t('profile_help_support') || 'Help & Support'),
      Icon: HelpCircle,
      iconColor: '#64748B',
      iconBg: '#EEF2F6',
      onPress: () => router.push('/help-support' as any),
    },
  ];

  return (
    <View style={styles.root}>
      <StatusBar barStyle="dark-content" backgroundColor={BG} />

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[
          styles.scrollContent,
          {
            paddingTop: insets.top + 16,
            paddingBottom: NAV_HEIGHT + insets.bottom + 28,
          },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Top Header ────────────────────────────────────────────── */}
        <View style={styles.headerRow}>
          <View>
            <Text style={styles.screenTitle}>
              {language === 'ta' ? 'என் சுயவிவரம்' : language === 'hi' ? 'मेरी प्रोफ़ाइल' : (t('profile_title') || 'My Profile')}
            </Text>
            <Text style={styles.screenSubtitle}>
              {language === 'ta' ? 'உங்கள் கணக்கை நிர்வகிக்கவும்' : language === 'hi' ? 'अपना खाता प्रबंधित करें' : (t('profile_subtitle') || 'Manage your account')}
            </Text>
          </View>
          <TouchableOpacity
            style={styles.editPillBtn}
            onPress={openPersonalInfo}
            activeOpacity={0.8}
          >
            <Pencil size={15} color="#111827" strokeWidth={2.2} />
            <Text style={styles.editPillText}>
              {language === 'ta' ? 'திருத்து' : language === 'hi' ? 'संपादित करें' : (t('profile_edit') || 'Edit')}
            </Text>
          </TouchableOpacity>
        </View>

        {/* ── Hero Profile Card ─────────────────────────────────────── */}
        <View style={styles.heroCard}>
          <TouchableOpacity
            style={styles.avatarCircle}
            onPress={() => setPhotoPickerOpen(true)}
            activeOpacity={0.85}
          >
            {isUploadingPhoto ? (
              <ActivityIndicator color="#2D6A4F" size="small" />
            ) : profile?.avatar_url ? (
              <Image source={{ uri: profile.avatar_url }} style={styles.avatarImage} />
            ) : (
              <User size={34} color="#2D6A4F" strokeWidth={2} />
            )}
            <View style={styles.cameraBadge}>
              <Camera size={11} color="#FFFFFF" strokeWidth={2.5} />
            </View>
          </TouchableOpacity>

          <View style={styles.heroTextContainer}>
            <Text style={styles.profileName}>{artisanName}</Text>
            <Text style={styles.profileSubtitle}>{locationSubtitle}</Text>
          </View>

          {/* Shop Logo Badge in Hero Card */}
          <TouchableOpacity
            style={styles.heroShopLogoBtn}
            onPress={() => router.push('/auth/logo-reveal')}
            activeOpacity={0.85}
          >
            {profile?.shop_logo_url ? (
              <Image
                source={{ uri: normalizeImageUrl(profile.shop_logo_url) }}
                style={styles.heroShopLogoImg}
                resizeMode="cover"
              />
            ) : (
              <View style={styles.heroShopLogoPlaceholder}>
                <Store size={20} color="#2D5016" />
              </View>
            )}
            <View style={styles.heroLogoEditDot}>
              <Sparkles size={9} color="#FFFFFF" />
            </View>
          </TouchableOpacity>
        </View>

        {/* ── Shop Brand Identity Card ──────────────────────────────── */}
        <TouchableOpacity
          style={styles.brandIdentityCard}
          onPress={() => router.push('/auth/logo-reveal')}
          activeOpacity={0.85}
        >
          <View style={styles.brandIdentityLeft}>
            {profile?.shop_logo_url ? (
              <Image
                source={{ uri: normalizeImageUrl(profile.shop_logo_url) }}
                style={styles.brandIdentityThumb}
                resizeMode="contain"
              />
            ) : (
              <View style={styles.brandIdentityThumbEmpty}>
                <Store size={22} color="#2D5016" />
              </View>
            )}
            <View style={{ flex: 1 }}>
              <View style={styles.brandIdentityTitleRow}>
                <Text style={styles.brandIdentityShopName} numberOfLines={1}>
                  {profile?.shop_name || 'My Artisan Shop'}
                </Text>
                <View style={styles.brandVerifiedTag}>
                  <Check size={11} color="#166534" strokeWidth={3} />
                  <Text style={styles.brandVerifiedTagText}>Brand Verified</Text>
                </View>
              </View>
              <Text style={styles.brandIdentitySubtext}>
                {profile?.craft_type ? `${profile.craft_type} • ` : ''}
                {profile?.shop_logo_style === 'shield'
                  ? 'Heritage Crest'
                  : profile?.shop_logo_style === 'wordmark'
                  ? 'Artisan Wordmark'
                  : 'Classic Shop Badge'}
              </Text>
            </View>
          </View>
          <ChevronRight size={18} color="#9CA3AF" />
        </TouchableOpacity>

        {/* ── Menu Options Card ─────────────────────────────────────── */}
        <View style={styles.menuGroupCard}>
          {MENU_OPTIONS.map((item, index) => {
            const IconComponent = item.Icon;
            const isLast = index === MENU_OPTIONS.length - 1;

            return (
              <TouchableOpacity
                key={item.id}
                style={[styles.menuRow, !isLast && styles.menuRowBorder]}
                onPress={item.onPress}
                activeOpacity={0.75}
              >
                <View style={[styles.iconBadge, { backgroundColor: item.iconBg }]}>
                  <IconComponent size={20} color={item.iconColor} strokeWidth={2} />
                </View>
                <Text style={styles.menuRowTitle}>{item.title}</Text>
                <ChevronRight size={18} color="#9CA3AF" strokeWidth={2} />
              </TouchableOpacity>
            );
          })}
        </View>

        {/* ── Logout Button ─────────────────────────────────────────── */}
        <TouchableOpacity
          style={styles.logoutCard}
          onPress={handleSignOut}
          activeOpacity={0.85}
        >
          <LogOut size={18} color="#D32F2F" strokeWidth={2.2} />
          <Text style={styles.logoutText}>
            {language === 'ta' ? 'வெளியேறு' : language === 'hi' ? 'लॉग आउट' : (t('profile_logout') || 'Logout')}
          </Text>
        </TouchableOpacity>
      </ScrollView>

      {/* ── Personal Information Modal ─────────────────────────────── */}
      <Modal visible={personalInfoOpen} transparent animationType="slide">
        <KeyboardAvoidingView
          style={styles.modalOverlay}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <View style={styles.modalSheet}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{t('profile_personal_info') || 'Personal Information'}</Text>
              <TouchableOpacity onPress={() => setPersonalInfoOpen(false)}>
                <X size={20} color={Colors.textSecondary} />
              </TouchableOpacity>
            </View>
            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={styles.inputLabel}>{t('profile_full_name') || 'Full Name'}</Text>
              <TextInput
                style={styles.input}
                value={formName}
                onChangeText={setFormName}
                placeholder={t('profile_enter_name') || 'Enter your name'}
                placeholderTextColor={Colors.textMuted}
              />
              <Text style={styles.inputLabel}>{t('profile_location') || 'State / Location'}</Text>
              <TextInput
                style={styles.input}
                value={formLocation}
                onChangeText={setFormLocation}
                placeholder={language === 'ta' ? 'எ.கா. தமிழ்நாடு' : language === 'hi' ? 'उदा. तमिलनाडु' : 'e.g. Tamil Nadu'}
                placeholderTextColor={Colors.textMuted}
              />
              <Text style={styles.inputLabel}>{t('profile_phone') || 'Phone Number'}</Text>
              <TextInput
                style={[styles.input, styles.inputDisabled]}
                value={formPhone}
                editable={false}
              />
              <TouchableOpacity
                style={styles.saveBtn}
                onPress={handleSavePersonalInfo}
                activeOpacity={0.88}
                disabled={isSaving}
              >
                {isSaving ? (
                  <ActivityIndicator color="#FFFFFF" size="small" />
                ) : (
                  <Text style={styles.saveBtnText}>{t('profile_save_changes') || 'Save Changes'}</Text>
                )}
              </TouchableOpacity>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* ── Shop Details Modal ────────────────────────────────────── */}
      <Modal visible={shopDetailsOpen} transparent animationType="slide">
        <KeyboardAvoidingView
          style={styles.modalOverlay}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <View style={styles.modalSheet}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{t('profile_shop_details') || 'Shop Details'}</Text>
              <TouchableOpacity onPress={() => setShopDetailsOpen(false)}>
                <X size={20} color={Colors.textSecondary} />
              </TouchableOpacity>
            </View>
            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={styles.inputLabel}>{t('profile_shop_name') || 'Shop Name'}</Text>
              <TextInput
                style={styles.input}
                value={formShopName}
                onChangeText={setFormShopName}
                placeholder={language === 'ta' ? 'எ.கா. மீனா கைவினைப் பொருட்கள்' : language === 'hi' ? 'उदा. मीना हस्तशिल्प' : 'e.g. Meena Handicrafts'}
                placeholderTextColor={Colors.textMuted}
              />
              <Text style={styles.inputLabel}>{t('profile_craft_type') || 'Primary Craft Type'}</Text>
              <TextInput
                style={styles.input}
                value={formCraftType}
                onChangeText={setFormCraftType}
                placeholder={language === 'ta' ? 'எ.கா. பட்டு நெசவு, மண்பாண்டம்' : language === 'hi' ? 'उदा. रेशम बुनाई, मिट्टी के बर्तन' : 'e.g. Silk Weaving, Pottery'}
                placeholderTextColor={Colors.textMuted}
              />

              {/* Shop Logo & Mark Preview in Modal */}
              <View style={styles.modalLogoSection}>
                <Text style={styles.inputLabel}>{language === 'ta' ? 'கடை லோகோ முத்திரை' : language === 'hi' ? 'दुकान का लोगो' : 'Shop Brand Logo'}</Text>
                <View style={styles.modalLogoRow}>
                  {profile?.shop_logo_url ? (
                    <Image
                      source={{ uri: normalizeImageUrl(profile.shop_logo_url) }}
                      style={styles.modalLogoThumb}
                      resizeMode="contain"
                    />
                  ) : (
                    <View style={styles.modalLogoPlaceholder}>
                      <Store size={24} color="#2D5016" />
                    </View>
                  )}
                  <View style={{ flex: 1 }}>
                    <Text style={styles.modalLogoTitle}>
                      {profile?.shop_logo_style === 'shield'
                        ? 'Heritage Crest'
                        : profile?.shop_logo_style === 'wordmark'
                        ? 'Artisan Wordmark'
                        : 'Classic Artisan Badge'}
                    </Text>
                    <Text style={styles.modalLogoSub}>
                      {language === 'ta' ? 'தயாரிப்பு அட்டைகளில் தோன்றும்' : language === 'hi' ? 'उत्पाद कार्ड पर दिखेगा' : 'Displayed on all published products'}
                    </Text>
                    <TouchableOpacity
                      style={styles.modalLogoChangeBtn}
                      onPress={() => {
                        setShopDetailsOpen(false);
                        router.push('/auth/logo-reveal');
                      }}
                      activeOpacity={0.8}
                    >
                      <Sparkles size={13} color="#2D5016" />
                      <Text style={styles.modalLogoChangeText}>
                        {language === 'ta' ? 'லோகோவை மாற்று / உருவாக்கு' : language === 'hi' ? 'लोगो बदलें / नया बनाएं' : 'Regenerate / Change Logo'}
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
              <TouchableOpacity
                style={styles.saveBtn}
                onPress={handleSaveShopDetails}
                activeOpacity={0.88}
                disabled={isSaving}
              >
                {isSaving ? (
                  <ActivityIndicator color="#FFFFFF" size="small" />
                ) : (
                  <Text style={styles.saveBtnText}>{t('profile_save_shop') || 'Save Shop Details'}</Text>
                )}
              </TouchableOpacity>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* ── Payment Details Modal ─────────────────────────────────── */}
      <Modal visible={paymentDetailsOpen} transparent animationType="slide">
        <KeyboardAvoidingView
          style={styles.modalOverlay}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <View style={styles.modalSheet}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{t('profile_payment_bank') || 'Payment & Bank Details'}</Text>
              <TouchableOpacity onPress={() => setPaymentDetailsOpen(false)}>
                <X size={20} color={Colors.textSecondary} />
              </TouchableOpacity>
            </View>
            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={styles.inputLabel}>{t('profile_holder_name') || 'Account Holder Name'}</Text>
              <TextInput
                style={styles.input}
                value={formHolder}
                onChangeText={setFormHolder}
                placeholder={language === 'ta' ? 'வங்கியில் உள்ள பெயர்' : language === 'hi' ? 'बैंक के अनुसार नाम' : 'Name as per bank'}
                placeholderTextColor={Colors.textMuted}
              />
              <Text style={styles.inputLabel}>{t('profile_bank_name') || 'Bank Name'}</Text>
              <TextInput
                style={styles.input}
                value={formBankName}
                onChangeText={setFormBankName}
                placeholder={language === 'ta' ? 'எ.கா. பாரத ஸ்டேட் வங்கி' : language === 'hi' ? 'उदा. भारतीय स्टेट बैंक' : 'e.g. State Bank of India'}
                placeholderTextColor={Colors.textMuted}
              />
              <Text style={styles.inputLabel}>{t('profile_account_no') || 'Account Number *'}</Text>
              <TextInput
                style={styles.input}
                value={formBankAcc}
                onChangeText={setFormBankAcc}
                placeholder={language === 'ta' ? 'வங்கி கணக்கு எண்' : language === 'hi' ? 'बैंक खाता संख्या' : 'Bank account number'}
                keyboardType="numeric"
                placeholderTextColor={Colors.textMuted}
              />
              <Text style={styles.inputLabel}>{t('profile_ifsc') || 'IFSC Code *'}</Text>
              <TextInput
                style={styles.input}
                value={formIfsc}
                onChangeText={setFormIfsc}
                placeholder="e.g. SBIN0001234"
                autoCapitalize="characters"
                placeholderTextColor={Colors.textMuted}
              />
              <Text style={styles.inputLabel}>{t('profile_upi') || 'UPI ID (Optional)'}</Text>
              <TextInput
                style={styles.input}
                value={formUpi}
                onChangeText={setFormUpi}
                placeholder="username@okhdfcbank"
                placeholderTextColor={Colors.textMuted}
              />
              <TouchableOpacity
                style={styles.saveBtn}
                onPress={handleSavePaymentDetails}
                activeOpacity={0.88}
                disabled={isSaving}
              >
                {isSaving ? (
                  <ActivityIndicator color="#FFFFFF" size="small" />
                ) : (
                  <Text style={styles.saveBtnText}>{t('profile_save_payment') || 'Save Payment Details'}</Text>
                )}
              </TouchableOpacity>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* ── App Settings Modal ────────────────────────────────────── */}
      <Modal visible={appSettingsOpen} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{t('profile_app_settings') || 'App Settings'}</Text>
              <TouchableOpacity onPress={() => setAppSettingsOpen(false)}>
                <X size={20} color={Colors.textSecondary} />
              </TouchableOpacity>
            </View>
            <ScrollView showsVerticalScrollIndicator={false}>
              {/* Language Selector */}
              <TouchableOpacity
                style={styles.settingItem}
                onPress={() => {
                  setAppSettingsOpen(false);
                  router.push({ pathname: '/select-language', params: { canGoBack: 'true' } });
                }}
                activeOpacity={0.8}
              >
                <Globe size={20} color="#2D6A4F" />
                <View style={styles.settingTextWrap}>
                  <Text style={styles.settingLabel}>{t('profile_language') || 'Language'}</Text>
                  <Text style={styles.settingSub}>
                    {language === 'ta' ? 'தமிழ்' : language === 'hi' ? 'हिन्दी' : language === 'te' ? 'తెలుగు' : language === 'bn' ? 'বাংলা' : language === 'mr' ? 'मराठी' : 'English'}
                  </Text>
                </View>
                <ChevronRight size={18} color="#9CA3AF" />
              </TouchableOpacity>

              {/* Instagram Card */}
              <View style={{ marginTop: 12 }}>
                <LinkInstagramCard />
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* ── Photo Picker Modal ────────────────────────────────────── */}
      <Modal visible={photoPickerOpen} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{t('profile_update_photo') || 'Update Profile Photo'}</Text>
              <TouchableOpacity onPress={() => setPhotoPickerOpen(false)}>
                <X size={20} color={Colors.textSecondary} />
              </TouchableOpacity>
            </View>

            {/* Camera & Gallery Buttons */}
            <View style={styles.photoActionsRow}>
              <TouchableOpacity
                style={styles.photoActionBtn}
                onPress={handlePickCamera}
                activeOpacity={0.8}
              >
                <View style={styles.photoActionIcon}>
                  <Camera size={22} color="#2D6A4F" />
                </View>
                <Text style={styles.photoActionText}>{t('profile_take_photo') || 'Take Photo'}</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.photoActionBtn}
                onPress={handlePickGallery}
                activeOpacity={0.8}
              >
                <View style={styles.photoActionIcon}>
                  <ImageIcon size={22} color="#2D6A4F" />
                </View>
                <Text style={styles.photoActionText}>{t('profile_from_gallery') || 'From Gallery'}</Text>
              </TouchableOpacity>
            </View>

            {/* Preset Avatars */}
            <Text style={styles.presetLabel}>{t('profile_choose_avatar') || 'Or choose an avatar:'}</Text>
            <View style={styles.avatarGrid}>
              {PRESET_AVATARS.map((uri, idx) => (
                <TouchableOpacity
                  key={idx}
                  onPress={() => handleSelectPreset(uri)}
                  activeOpacity={0.85}
                  style={styles.avatarItem}
                >
                  <Image source={{ uri }} style={styles.avatarOption} />
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </View>
      </Modal>

      {/* ── Bottom Navigation (3 Tabs: Home, Products, Profile) ───── */}
      <ArtisanBottomNav activeTab={activeTab} onTabChange={handleTabChange} />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: BG },
  scroll: { flex: 1 },
  scrollContent: {
    paddingHorizontal: 20,
  },

  /* ── Header ─────────────────────────────────────────────── */
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 20,
    paddingTop: 4,
  },
  screenTitle: {
    fontSize: 26,
    fontFamily: Fonts.headingBold,
    fontWeight: '800',
    color: '#111827',
    letterSpacing: -0.5,
  },
  screenSubtitle: {
    fontSize: 14,
    fontFamily: Fonts.body,
    color: '#6B7280',
    marginTop: 3,
  },
  editPillBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    paddingHorizontal: 16,
    paddingVertical: 8,
    ...Shadow.card,
  },
  editPillText: {
    fontSize: 14,
    fontFamily: Fonts.headingBold,
    fontWeight: '600',
    color: '#111827',
  },

  /* ── Hero Profile Card ───────────────────────────────────── */
  heroCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E8F2EC',
    borderRadius: 20,
    padding: 18,
    gap: 16,
    marginBottom: 18,
  },
  avatarCircle: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: '#CCE2D2',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  avatarImage: {
    width: 68,
    height: 68,
    borderRadius: 34,
  },
  cameraBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: '#2D6A4F',
    width: 22,
    height: 22,
    borderRadius: 11,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#E8F2EC',
  },
  heroTextContainer: {
    flex: 1,
  },
  profileName: {
    fontSize: 18,
    fontFamily: Fonts.headingBold,
    fontWeight: '700',
    color: '#111827',
    letterSpacing: -0.2,
  },
  profileSubtitle: {
    fontSize: 13,
    fontFamily: Fonts.body,
    color: '#6B7280',
    marginTop: 4,
  },

  /* ── Menu Group Card ─────────────────────────────────────── */
  menuGroupCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 22,
    overflow: 'hidden',
    marginBottom: 20,
    ...Shadow.card,
  },
  menuRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 16,
  },
  menuRowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  iconBadge: {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  menuRowTitle: {
    flex: 1,
    fontSize: 15,
    fontFamily: Fonts.headingBold,
    fontWeight: '600',
    color: '#111827',
  },

  /* ── Logout Button ───────────────────────────────────────── */
  logoutCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FDEDEB',
    borderRadius: 18,
    paddingVertical: 16,
    gap: 8,
  },
  logoutText: {
    fontSize: 15,
    fontFamily: Fonts.headingBold,
    fontWeight: '700',
    color: '#D32F2F',
  },

  /* ── Modal Common Styles ─────────────────────────────────── */
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 22,
    maxHeight: '85%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 18,
  },
  modalTitle: {
    fontSize: 18,
    fontFamily: Fonts.headingBold,
    fontWeight: '700',
    color: '#111827',
  },
  inputLabel: {
    fontSize: 13,
    fontFamily: Fonts.bodyMedium,
    color: '#374151',
    marginBottom: 6,
    marginTop: 10,
    fontWeight: '600',
  },
  input: {
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
    fontFamily: Fonts.body,
    color: '#111827',
  },
  inputDisabled: {
    backgroundColor: '#F3F4F6',
    color: '#9CA3AF',
  },
  saveBtn: {
    backgroundColor: '#2D6A4F',
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 22,
    marginBottom: 10,
    ...Shadow.card,
  },
  saveBtnText: {
    fontSize: 15,
    fontFamily: Fonts.headingBold,
    fontWeight: '700',
    color: '#FFFFFF',
  },

  /* Setting Item */
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 12,
    borderRadius: 12,
    backgroundColor: '#F9FAFB',
    marginBottom: 8,
  },
  settingTextWrap: {
    flex: 1,
    marginLeft: 12,
  },
  settingLabel: {
    fontSize: 14,
    fontFamily: Fonts.headingBold,
    fontWeight: '600',
    color: '#111827',
  },
  settingSub: {
    fontSize: 12,
    fontFamily: Fonts.body,
    color: '#6B7280',
    marginTop: 2,
  },

  /* Photo Picker */
  photoActionsRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  photoActionBtn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F3F8F4',
    borderRadius: 14,
    paddingVertical: 16,
    gap: 8,
    borderWidth: 1,
    borderColor: '#CCE2D2',
  },
  photoActionIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  photoActionText: {
    fontSize: 13,
    fontFamily: Fonts.headingBold,
    fontWeight: '600',
    color: '#2D6A4F',
  },
  presetLabel: {
    fontSize: 13,
    fontFamily: Fonts.bodyMedium,
    color: '#6B7280',
    marginBottom: 12,
  },
  avatarGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    justifyContent: 'space-between',
    paddingBottom: 16,
  },
  avatarItem: {
    width: '30%',
    aspectRatio: 1,
    borderRadius: 16,
    overflow: 'hidden',
  },
  avatarOption: {
    width: '100%',
    height: '100%',
    borderRadius: 16,
  },

  /* Shop Logo Badge in Hero Card */
  heroShopLogoBtn: {
    position: 'relative',
    width: 52,
    height: 52,
    borderRadius: 26,
    borderWidth: 2,
    borderColor: '#2D5016',
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'visible',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  heroShopLogoImg: {
    width: 48,
    height: 48,
    borderRadius: 24,
  },
  heroShopLogoPlaceholder: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#E8F3E4',
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroLogoEditDot: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#B45309',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: '#FFFFFF',
  },

  /* Shop Brand Identity Card */
  brandIdentityCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 14,
    marginBottom: 16,
    borderWidth: 1.5,
    borderColor: '#E7E5E4',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 6,
      },
      android: {
        elevation: 1,
      },
    }),
  },
  brandIdentityLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  brandIdentityThumb: {
    width: 50,
    height: 50,
    borderRadius: 12,
    backgroundColor: '#FAF8F5',
  },
  brandIdentityThumbEmpty: {
    width: 50,
    height: 50,
    borderRadius: 12,
    backgroundColor: '#F5F5F4',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#E7E5E4',
  },
  brandIdentityTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 2,
  },
  brandIdentityShopName: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1C1917',
    maxWidth: '65%',
  },
  brandVerifiedTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 10,
    borderWidth: 0.8,
    borderColor: '#A7F3D0',
  },
  brandVerifiedTagText: {
    fontSize: 9.5,
    fontWeight: '700',
    color: '#065F46',
  },
  brandIdentitySubtext: {
    fontSize: 12,
    color: '#78716C',
    fontWeight: '500',
  },

  /* Modal Logo Section */
  modalLogoSection: {
    backgroundColor: '#F9FAFB',
    borderRadius: 14,
    padding: 12,
    marginVertical: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  modalLogoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginTop: 6,
  },
  modalLogoThumb: {
    width: 60,
    height: 60,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  modalLogoPlaceholder: {
    width: 60,
    height: 60,
    borderRadius: 12,
    backgroundColor: '#E8F3E4',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalLogoTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1F2937',
  },
  modalLogoSub: {
    fontSize: 11,
    color: '#6B7280',
    marginTop: 1,
  },
  modalLogoChangeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 6,
    alignSelf: 'flex-start',
    backgroundColor: '#E8F3E4',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  modalLogoChangeText: {
    fontSize: 11.5,
    fontWeight: '700',
    color: '#2D5016',
  },
});
