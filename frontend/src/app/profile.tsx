import React, { useState } from 'react';
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
} from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';

import { Colors, Fonts, Shadow, NAV_HEIGHT } from '@/constants/artisan-theme';
import { ArtisanBottomNav, ArtisanTab } from '@/components/artisan/ArtisanBottomNav';
import { BuyerBottomNav, BuyerTab } from '@/components/buyer/BuyerBottomNav';
import { useAuth } from '@/context/AuthContext';
import { useLanguage } from '@/context/LanguageContext';
import { useCart } from '@/context/CartContext';
import LinkInstagramCard from '@/components/profile/LinkInstagramCard';
import { BACKEND_URL } from '@/config/api';
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
    signOut,
    updateProfile,
    updateBankDetails,
    uploadAvatar,
    phone,
  } = useAuth();
  const { t, language } = useLanguage();
  const { cartCount } = useCart();

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

  if (!profile && userRole !== 'buyer') return null;

  const handleTabChange = (tab: ArtisanTab) => {
    setActiveTab(tab);
    if (tab === 'home') router.push('/');
    if (tab === 'listings') router.push('/listings');
  };

  const handleSignOut = async () => {
    await signOut();
    router.push('/welcome');
  };

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
      Alert.alert('Required Fields', 'Please enter account number and IFSC code.');
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
        Alert.alert('Success', 'Bank details saved successfully.');
        setPaymentDetailsOpen(false);
      } else {
        Alert.alert('Error', res.error || 'Failed to update bank details.');
      }
    } catch (_) {}
    setIsSaving(false);
  };

  // Upload photo from Camera
  const handlePickCamera = async () => {
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission needed', 'Camera permission is required.');
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
      Alert.alert('Error', e?.message || 'Could not take photo.');
    }
  };

  // Upload photo from Gallery
  const handlePickGallery = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission needed', 'Gallery permission is required.');
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
      Alert.alert('Error', e?.message || 'Could not pick photo.');
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
        Alert.alert('Profile Updated', 'Your profile picture has been updated!');
      }
    } catch (err: any) {
      Alert.alert('Notice', 'Photo set on device.');
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
    const buyerName = buyerProfile?.name || 'Buyer';
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
              <Text style={styles.profileSubtitle}>{buyerProfile?.buyer_type || 'Buyer'}</Text>
            </View>
          </View>
          <TouchableOpacity
            style={styles.logoutCard}
            onPress={handleSignOut}
            activeOpacity={0.85}
          >
            <LogOut size={20} color="#D32F2F" />
            <Text style={styles.logoutText}>Logout</Text>
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
  const artisanName = profile?.name || 'Meena Devi';
  const locationSubtitle = profile?.location
    ? `Artisan from ${profile.location}`
    : profile?.craft_type
      ? `${profile.craft_type} Artisan`
      : 'Artisan from Tamil Nadu';

  const MENU_OPTIONS = [
    {
      id: 'personal',
      title: 'Personal Information',
      Icon: User,
      iconColor: '#2D6A4F',
      iconBg: '#EDF7F2',
      onPress: openPersonalInfo,
    },
    {
      id: 'shop',
      title: 'Shop Details',
      Icon: Store,
      iconColor: '#C26A3E',
      iconBg: '#FDF3EB',
      onPress: openShopDetails,
    },
    {
      id: 'payment',
      title: 'Payment Details',
      Icon: CreditCard,
      iconColor: '#3B82F6',
      iconBg: '#EEF5F9',
      onPress: openPaymentDetails,
    },
    {
      id: 'settings',
      title: 'App Settings',
      Icon: Settings,
      iconColor: '#2D6A4F',
      iconBg: '#EDF7ED',
      onPress: () => setAppSettingsOpen(true),
    },
    {
      id: 'support',
      title: 'Help & Support',
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
            <Text style={styles.screenTitle}>My Profile</Text>
            <Text style={styles.screenSubtitle}>Manage your account</Text>
          </View>
          <TouchableOpacity
            style={styles.editPillBtn}
            onPress={openPersonalInfo}
            activeOpacity={0.8}
          >
            <Pencil size={15} color="#111827" strokeWidth={2.2} />
            <Text style={styles.editPillText}>Edit</Text>
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
        </View>

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
          <Text style={styles.logoutText}>Logout</Text>
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
              <Text style={styles.modalTitle}>Personal Information</Text>
              <TouchableOpacity onPress={() => setPersonalInfoOpen(false)}>
                <X size={20} color={Colors.textSecondary} />
              </TouchableOpacity>
            </View>
            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={styles.inputLabel}>Full Name</Text>
              <TextInput
                style={styles.input}
                value={formName}
                onChangeText={setFormName}
                placeholder="Enter your name"
                placeholderTextColor={Colors.textMuted}
              />
              <Text style={styles.inputLabel}>State / Location</Text>
              <TextInput
                style={styles.input}
                value={formLocation}
                onChangeText={setFormLocation}
                placeholder="e.g. Tamil Nadu"
                placeholderTextColor={Colors.textMuted}
              />
              <Text style={styles.inputLabel}>Phone Number</Text>
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
                  <Text style={styles.saveBtnText}>Save Changes</Text>
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
              <Text style={styles.modalTitle}>Shop Details</Text>
              <TouchableOpacity onPress={() => setShopDetailsOpen(false)}>
                <X size={20} color={Colors.textSecondary} />
              </TouchableOpacity>
            </View>
            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={styles.inputLabel}>Shop Name</Text>
              <TextInput
                style={styles.input}
                value={formShopName}
                onChangeText={setFormShopName}
                placeholder="e.g. Meena Handicrafts"
                placeholderTextColor={Colors.textMuted}
              />
              <Text style={styles.inputLabel}>Primary Craft Type</Text>
              <TextInput
                style={styles.input}
                value={formCraftType}
                onChangeText={setFormCraftType}
                placeholder="e.g. Silk Weaving, Pottery"
                placeholderTextColor={Colors.textMuted}
              />
              <TouchableOpacity
                style={styles.saveBtn}
                onPress={handleSaveShopDetails}
                activeOpacity={0.88}
                disabled={isSaving}
              >
                {isSaving ? (
                  <ActivityIndicator color="#FFFFFF" size="small" />
                ) : (
                  <Text style={styles.saveBtnText}>Save Shop Details</Text>
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
              <Text style={styles.modalTitle}>Payment & Bank Details</Text>
              <TouchableOpacity onPress={() => setPaymentDetailsOpen(false)}>
                <X size={20} color={Colors.textSecondary} />
              </TouchableOpacity>
            </View>
            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={styles.inputLabel}>Account Holder Name</Text>
              <TextInput
                style={styles.input}
                value={formHolder}
                onChangeText={setFormHolder}
                placeholder="Name as per bank"
                placeholderTextColor={Colors.textMuted}
              />
              <Text style={styles.inputLabel}>Bank Name</Text>
              <TextInput
                style={styles.input}
                value={formBankName}
                onChangeText={setFormBankName}
                placeholder="e.g. State Bank of India"
                placeholderTextColor={Colors.textMuted}
              />
              <Text style={styles.inputLabel}>Account Number *</Text>
              <TextInput
                style={styles.input}
                value={formBankAcc}
                onChangeText={setFormBankAcc}
                placeholder="Bank account number"
                keyboardType="numeric"
                placeholderTextColor={Colors.textMuted}
              />
              <Text style={styles.inputLabel}>IFSC Code *</Text>
              <TextInput
                style={styles.input}
                value={formIfsc}
                onChangeText={setFormIfsc}
                placeholder="e.g. SBIN0001234"
                autoCapitalize="characters"
                placeholderTextColor={Colors.textMuted}
              />
              <Text style={styles.inputLabel}>UPI ID (Optional)</Text>
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
                  <Text style={styles.saveBtnText}>Save Payment Details</Text>
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
              <Text style={styles.modalTitle}>App Settings</Text>
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
                  router.push('/auth/language');
                }}
                activeOpacity={0.8}
              >
                <Globe size={20} color="#2D6A4F" />
                <View style={styles.settingTextWrap}>
                  <Text style={styles.settingLabel}>Language</Text>
                  <Text style={styles.settingSub}>
                    {language === 'ta' ? 'தமிழ்' : language === 'hi' ? 'हिन्दी' : 'English'}
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
              <Text style={styles.modalTitle}>Update Profile Photo</Text>
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
                <Text style={styles.photoActionText}>Take Photo</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.photoActionBtn}
                onPress={handlePickGallery}
                activeOpacity={0.8}
              >
                <View style={styles.photoActionIcon}>
                  <ImageIcon size={22} color="#2D6A4F" />
                </View>
                <Text style={styles.photoActionText}>From Gallery</Text>
              </TouchableOpacity>
            </View>

            {/* Preset Avatars */}
            <Text style={styles.presetLabel}>Or choose an avatar:</Text>
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
});
