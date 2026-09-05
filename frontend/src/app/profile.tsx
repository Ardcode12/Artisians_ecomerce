import React, { useState, useEffect } from 'react';
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
import { useRouter } from 'expo-router';
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
} from 'lucide-react-native';
import { Fonts, Radius, Shadow, NAV_HEIGHT } from '@/constants/artisan-theme';
import { ArtisanBottomNav, ArtisanTab } from '@/components/artisan/ArtisanBottomNav';
import { useAuth } from '@/context/AuthContext';
import { useLanguage } from '@/context/LanguageContext';
import { LanguagePicker } from '@/components/artisan/LanguagePicker';

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

export default function ProfileScreen() {
  const [activeTab, setActiveTab] = useState<ArtisanTab>('profile');
  const { profile, signOut, updateProfile, updateBankDetails, uploadAvatar } = useAuth();
  const { t, language, languageMeta } = useLanguage();
  const [langPickerOpen, setLangPickerOpen] = useState(false);
  const [toggleValues, setToggleValues] = useState<Record<string, boolean>>({
    'Push Notifications': true,
    'Biometric Login': false,
  });

  // Modal States
  const [editProfileOpen, setEditProfileOpen] = useState(false);
  const [editStoryOpen, setEditStoryOpen] = useState(false);
  const [bankModalOpen, setBankModalOpen] = useState(false);
  const [avatarModalOpen, setAvatarModalOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  // Form Fields - Profile
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

  const handleTabChange = (tab: ArtisanTab) => {
    setActiveTab(tab);
    if (tab === 'home') router.push('/');
    if (tab === 'listings') router.push('/listings');
    if (tab === 'add') router.push('/add-product');
    if (tab === 'inquiries') router.push('/inquiries');
    if (tab === 'profile') router.push('/profile');
  };

  // ── Save Profile Details ──────────────────────────────────────────
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
    if (!/^[A-Z]{4}0[A-Z0-9]{6}$/.test(cleanIfsc)) {
      setErrorMessage('Invalid IFSC code format (e.g., SBIN0001234)');
      return;
    }
    if (!formHolderName.trim()) {
      setErrorMessage('Account holder name is required');
      return;
    }

    setIsSaving(true);
    try {
      const res = await updateBankDetails({
        bank_account_no: cleanAccount,
        bank_ifsc: cleanIfsc,
        bank_holder_name: formHolderName.trim(),
        bank_name: formBankName.trim() || 'Commercial Bank',
        upi_id: formUpiId.trim() || undefined,
      });
      if (res?.success) {
        setBankModalOpen(false);
      } else {
        setErrorMessage(res?.error || 'Could not save bank details');
      }
    } catch (e: any) {
      setErrorMessage(e?.message || 'Failed to save bank details');
    } finally {
      setIsSaving(false);
    }
  };

  // ── Select Preset or Custom Avatar ────────────────────────────────
  const handleSelectAvatar = async (avatarUri: string) => {
    setIsSaving(true);
    try {
      await uploadAvatar(avatarUri);
      setAvatarModalOpen(false);
    } catch (e) {
      Alert.alert('Error', 'Failed to update avatar');
    } finally {
      setIsSaving(false);
    }
  };

  const displayName = profile?.name || 'Artisan';
  const displayShop = profile?.shop_name || (profile?.name ? `${profile.name}'s Studio` : "Artisan Studio");
  const displayLocation = profile?.location || profile?.craft_type || 'Location not set';
  const displayScheme = profile?.scheme_id || 'Not Registered';
  const displayBio = profile?.bio || 'Add your craft heritage story to connect with buyers.';
  const displayAvatar = profile?.avatar_url || PRESET_AVATARS[0];
  const displayBankMasked = profile?.bank_account_no
    ? `•••• ${profile.bank_account_no.slice(-4)}`
    : 'Not linked';

  return (
    <View style={styles.root}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <TouchableOpacity
          style={styles.backCircle}
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

        {/* Settings sections - Business */}
        <View style={styles.settingsSection}>
          <Text style={styles.sectionTitle}>{t('profile_section_business').toUpperCase()}</Text>
          <View style={styles.sectionCard}>
            {/* Shop Name */}
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

            {/* Scheme ID */}
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

            {/* Location */}
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

            {/* Bank Account (Interactive - Opens Bank Modal) */}
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
            {/* Language row - opens language picker */}
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

            {/* Push Notifications */}
            <View style={[styles.settingsRow, styles.settingsRowBorder]}>
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

            {/* Biometric */}
            <View style={styles.settingsRow}>
              <Smartphone size={18} color="#0D0D0D" style={styles.settingsIcon} />
              <Text style={styles.settingsLabel}>{t('profile_biometric')}</Text>
              <Switch
                value={toggleValues['Biometric Login']}
                onValueChange={(val) =>
                  setToggleValues((prev) => ({ ...prev, ['Biometric Login']: val }))
                }
                trackColor={{ false: '#E5E7EB', true: '#0D0D0D' }}
                thumbColor="#FFFFFF"
              />
            </View>
          </View>
        </View>

        {/* Help & Support section */}
        <View style={styles.settingsSection}>
          <Text style={styles.sectionTitle}>{t('profile_section_help').toUpperCase()}</Text>
          <View style={styles.sectionCard}>
            <TouchableOpacity style={[styles.settingsRow, styles.settingsRowBorder]} activeOpacity={0.7}>
              <HelpCircle size={18} color="#0D0D0D" style={styles.settingsIcon} />
              <Text style={styles.settingsLabel}>{t('profile_help_support')}</Text>
              <ChevronRight size={16} color="#8E8E93" />
            </TouchableOpacity>
            <TouchableOpacity style={[styles.settingsRow, styles.settingsRowBorder]} activeOpacity={0.7}>
              <FileText size={18} color="#0D0D0D" style={styles.settingsIcon} />
              <Text style={styles.settingsLabel}>{t('profile_terms')}</Text>
              <ChevronRight size={16} color="#8E8E93" />
            </TouchableOpacity>
            <TouchableOpacity style={styles.settingsRow} activeOpacity={0.7}>
              <Lock size={18} color="#0D0D0D" style={styles.settingsIcon} />
              <Text style={styles.settingsLabel}>{t('profile_privacy')}</Text>
              <ChevronRight size={16} color="#8E8E93" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Logout Button */}
        <TouchableOpacity
          style={styles.logoutBtn}
          onPress={async () => {
            await signOut();
            router.push('/welcome');
          }}
          activeOpacity={0.8}
        >
          <LogOut size={18} color="#EF4444" />
          <Text style={styles.logoutText}>{t('profile_logout')}</Text>
        </TouchableOpacity>

        <Text style={styles.versionText}>ArtisanLink v1.0.0 • Artisan Identity ID: {profile?.id?.slice(0, 8) || '4444-91'}</Text>
      </ScrollView>

      {/* ── MODAL 1: Edit Profile Details ──────────────────────────────── */}
      <Modal visible={editProfileOpen} transparent animationType="slide">
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.modalBackdrop}
        >
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Edit Profile</Text>
              <TouchableOpacity onPress={() => setEditProfileOpen(false)}>
                <X size={22} color="#0D0D0D" />
              </TouchableOpacity>
            </View>

            {errorMessage ? <Text style={styles.errorText}>{errorMessage}</Text> : null}

            <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 420 }}>
              <Text style={styles.inputLabel}>Artisan Full Name</Text>
              <TextInput
                style={styles.textInput}
                value={formName}
                onChangeText={setFormName}
                placeholder="Enter your name"
                placeholderTextColor="#9CA3AF"
              />

              <Text style={styles.inputLabel}>Studio / Shop Name</Text>
              <TextInput
                style={styles.textInput}
                value={formShopName}
                onChangeText={setFormShopName}
                placeholder="e.g. Ramesh Handloom Studio"
                placeholderTextColor="#9CA3AF"
              />

              <Text style={styles.inputLabel}>Primary Craft</Text>
              <TextInput
                style={styles.textInput}
                value={formCraftType}
                onChangeText={setFormCraftType}
                placeholder="e.g. Pottery, Handloom, Woodwork"
                placeholderTextColor="#9CA3AF"
              />

              <Text style={styles.inputLabel}>Location (City / State)</Text>
              <TextInput
                style={styles.textInput}
                value={formLocation}
                onChangeText={setFormLocation}
                placeholder="e.g. Varanasi, Uttar Pradesh"
                placeholderTextColor="#9CA3AF"
              />

              <Text style={styles.inputLabel}>Government Scheme / Cluster ID</Text>
              <TextInput
                style={styles.textInput}
                value={formSchemeId}
                onChangeText={setFormSchemeId}
                placeholder="e.g. SC-GJ-2024-00142"
                placeholderTextColor="#9CA3AF"
              />
            </ScrollView>

            <TouchableOpacity
              style={[styles.saveBtn, isSaving && styles.btnDisabled]}
              onPress={handleSaveProfile}
              disabled={isSaving}
              activeOpacity={0.85}
            >
              {isSaving ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={styles.saveBtnText}>{t('common_save')}</Text>
              )}
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* ── MODAL 2: Edit Craft Story ──────────────────────────────────── */}
      <Modal visible={editStoryOpen} transparent animationType="slide">
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.modalBackdrop}
        >
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{t('profile_edit_story')}</Text>
              <TouchableOpacity onPress={() => setEditStoryOpen(false)}>
                <X size={22} color="#0D0D0D" />
              </TouchableOpacity>
            </View>

            <Text style={styles.inputLabel}>Your Artisan Story & Heritage</Text>
            <TextInput
              style={[styles.textInput, styles.textArea]}
              value={formBio}
              onChangeText={setFormBio}
              placeholder="Tell buyers about how you learned your craft, family heritage, materials used..."
              placeholderTextColor="#9CA3AF"
              multiline
              numberOfLines={5}
              textAlignVertical="top"
            />

            <TouchableOpacity
              style={[styles.saveBtn, isSaving && styles.btnDisabled]}
              onPress={handleSaveStory}
              disabled={isSaving}
              activeOpacity={0.85}
            >
              {isSaving ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={styles.saveBtnText}>{t('common_save')}</Text>
              )}
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* ── MODAL 3: Bank Details ──────────────────────────────────────── */}
      <Modal visible={bankModalOpen} transparent animationType="slide">
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.modalBackdrop}
        >
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <View style={styles.modalTitleRow}>
                <Landmark size={20} color="#0D0D0D" />
                <Text style={styles.modalTitle}>Bank Account Details</Text>
              </View>
              <TouchableOpacity onPress={() => setBankModalOpen(false)}>
                <X size={22} color="#0D0D0D" />
              </TouchableOpacity>
            </View>

            <Text style={styles.bankSecurityNote}>
              🔒 Secure direct payouts for your sales. Handled directly via verified NEFT/RTGS/UPI.
            </Text>

            {errorMessage ? <Text style={styles.errorText}>{errorMessage}</Text> : null}

            <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 380 }}>
              <Text style={styles.inputLabel}>Account Holder Name *</Text>
              <TextInput
                style={styles.textInput}
                value={formHolderName}
                onChangeText={setFormHolderName}
                placeholder="Full name as in Bank Passbook"
                placeholderTextColor="#9CA3AF"
              />

              <Text style={styles.inputLabel}>Bank Account Number *</Text>
              <TextInput
                style={styles.textInput}
                value={formAccountNo}
                onChangeText={setFormAccountNo}
                placeholder="e.g. 123456789012"
                placeholderTextColor="#9CA3AF"
                keyboardType="numeric"
                secureTextEntry
              />

              <Text style={styles.inputLabel}>Confirm Account Number *</Text>
              <TextInput
                style={styles.textInput}
                value={formConfirmAccountNo}
                onChangeText={setFormConfirmAccountNo}
                placeholder="Re-enter account number"
                placeholderTextColor="#9CA3AF"
                keyboardType="numeric"
              />

              <Text style={styles.inputLabel}>IFSC Code * (11 characters)</Text>
              <TextInput
                style={styles.textInput}
                value={formIfsc}
                onChangeText={(val) => setFormIfsc(val.toUpperCase())}
                placeholder="e.g. SBIN0001234"
                placeholderTextColor="#9CA3AF"
                autoCapitalize="characters"
                maxLength={11}
              />

              <Text style={styles.inputLabel}>Bank Name</Text>
              <TextInput
                style={styles.textInput}
                value={formBankName}
                onChangeText={setFormBankName}
                placeholder="e.g. State Bank of India"
                placeholderTextColor="#9CA3AF"
              />

              <Text style={styles.inputLabel}>UPI ID (Optional for fast micro-payments)</Text>
              <TextInput
                style={styles.textInput}
                value={formUpiId}
                onChangeText={setFormUpiId}
                placeholder="e.g. artisan@upi"
                placeholderTextColor="#9CA3AF"
                autoCapitalize="none"
              />
            </ScrollView>

            <TouchableOpacity
              style={[styles.saveBtn, isSaving && styles.btnDisabled]}
              onPress={handleSaveBank}
              disabled={isSaving}
              activeOpacity={0.85}
            >
              {isSaving ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={styles.saveBtnText}>Save & Verify Bank Account</Text>
              )}
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* ── MODAL 4: Avatar Picture Selector ───────────────────────────── */}
      <Modal visible={avatarModalOpen} transparent animationType="slide">
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Change Profile Picture</Text>
              <TouchableOpacity onPress={() => setAvatarModalOpen(false)}>
                <X size={22} color="#0D0D0D" />
              </TouchableOpacity>
            </View>

            <Text style={styles.avatarSubtitle}>Select an artisan avatar or enter an image URL:</Text>

            {/* Preset Avatars Grid */}
            <View style={styles.avatarGrid}>
              {PRESET_AVATARS.map((uri, idx) => {
                const isSelected = displayAvatar === uri;
                return (
                  <TouchableOpacity
                    key={idx}
                    style={[styles.avatarOption, isSelected && styles.avatarOptionSelected]}
                    onPress={() => handleSelectAvatar(uri)}
                    activeOpacity={0.8}
                  >
                    <Image source={{ uri }} style={styles.avatarThumb} />
                    {isSelected && (
                      <View style={styles.avatarSelectedBadge}>
                        <Check size={12} color="#FFFFFF" strokeWidth={3} />
                      </View>
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>

            <Text style={styles.inputLabel}>Or Enter Image Web URL</Text>
            <View style={styles.customUrlRow}>
              <TextInput
                style={[styles.textInput, { flex: 1, marginBottom: 0 }]}
                value={customAvatarUrl}
                onChangeText={setCustomAvatarUrl}
                placeholder="https://.../my-photo.jpg"
                placeholderTextColor="#9CA3AF"
                autoCapitalize="none"
              />
              <TouchableOpacity
                style={[styles.applyUrlBtn, !customAvatarUrl && styles.btnDisabled]}
                disabled={!customAvatarUrl || isSaving}
                onPress={() => handleSelectAvatar(customAvatarUrl.trim())}
              >
                <Text style={styles.applyUrlText}>Apply</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Language Picker (opened programmatically via Language row) */}
      {langPickerOpen && (
        <LanguagePicker autoOpen onClose={() => setLangPickerOpen(false)} />
      )}

      {/* Bottom Nav */}
      <ArtisanBottomNav activeTab={activeTab} onTabChange={handleTabChange} />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 14,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  backCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#0D0D0D',
    justifyContent: 'center',
    alignItems: 'center',
  },
  screenTitle: {
    fontSize: 18,
    fontFamily: Fonts.heading,
    color: '#0D0D0D',
  },
  editBtn: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: Radius.pill,
    backgroundColor: '#F3F4F6',
  },
  editBtnText: {
    fontSize: 13,
    fontFamily: Fonts.bodyMedium,
    color: '#0D0D0D',
  },
  content: {
    paddingTop: 20,
  },
  profileCard: {
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  avatarWrapper: {
    position: 'relative',
    marginBottom: 12,
  },
  avatar: {
    width: 90,
    height: 90,
    borderRadius: 45,
    borderWidth: 3,
    borderColor: '#0D0D0D',
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
  profileName: {
    fontSize: 22,
    fontFamily: Fonts.heading,
    color: '#0D0D0D',
    marginBottom: 4,
  },
  locRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 14,
  },
  profileLocation: {
    fontSize: 13,
    fontFamily: Fonts.body,
    color: '#8E8E93',
  },
  badgesRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 20,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: Radius.pill,
    borderWidth: 1,
  },
  badgeText: {
    fontSize: 11,
    fontFamily: Fonts.bodyMedium,
  },
  miniStats: {
    flexDirection: 'row',
    width: '100%',
    backgroundColor: '#FAFAFA',
    borderRadius: Radius.lg,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: '#F3F4F6',
  },
  miniStat: {
    flex: 1,
    alignItems: 'center',
  },
  miniStatValue: {
    fontSize: 15,
    fontFamily: Fonts.heading,
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
    height: '60%',
    backgroundColor: '#E5E7EB',
    alignSelf: 'center',
  },
  ratingInline: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  storyCard: {
    marginHorizontal: 20,
    backgroundColor: '#FFF8F5',
    borderRadius: Radius.lg,
    padding: 18,
    borderWidth: 1,
    borderColor: '#FFE8DF',
    marginBottom: 24,
  },
  storyTitle: {
    fontSize: 14,
    fontFamily: Fonts.heading,
    color: '#B5502F',
    marginBottom: 6,
  },
  storyText: {
    fontSize: 13,
    fontFamily: Fonts.body,
    color: '#374151',
    lineHeight: 20,
    fontStyle: 'italic',
    marginBottom: 10,
  },
  storyEdit: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    alignSelf: 'flex-start',
  },
  storyEditText: {
    fontSize: 12,
    fontFamily: Fonts.bodyMedium,
    color: '#0D0D0D',
  },
  settingsSection: {
    marginHorizontal: 20,
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 11,
    fontFamily: Fonts.bodyMedium,
    color: '#8E8E93',
    letterSpacing: 0.8,
    marginBottom: 10,
    paddingLeft: 4,
  },
  sectionCard: {
    backgroundColor: '#FAFAFA',
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: '#F3F4F6',
    overflow: 'hidden',
  },
  settingsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 15,
  },
  settingsRowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  settingsIcon: {
    marginRight: 12,
  },
  settingsLabel: {
    flex: 1,
    fontSize: 14,
    fontFamily: Fonts.body,
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
    fontFamily: Fonts.bodyMedium,
  },
  bankUnlinkedValue: {
    color: '#EF4444',
    fontFamily: Fonts.bodyMedium,
  },
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#FEF2F2',
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: '#FEE2E2',
    marginBottom: 16,
  },
  logoutText: {
    fontSize: 15,
    fontFamily: Fonts.bodyMedium,
    color: '#EF4444',
  },
  versionText: {
    textAlign: 'center',
    fontSize: 11,
    fontFamily: Fonts.body,
    color: '#9CA3AF',
    marginBottom: 20,
  },

  // Modal Styles
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
    justifyContent: 'flex-end',
  },
  modalCard: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: Radius.xl,
    borderTopRightRadius: Radius.xl,
    padding: 24,
    maxHeight: '85%',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  modalTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  modalTitle: {
    fontSize: 18,
    fontFamily: Fonts.heading,
    color: '#0D0D0D',
  },
  bankSecurityNote: {
    fontSize: 12,
    fontFamily: Fonts.body,
    color: '#059669',
    backgroundColor: '#ECFDF5',
    padding: 10,
    borderRadius: Radius.md,
    marginBottom: 14,
  },
  inputLabel: {
    fontSize: 12,
    fontFamily: Fonts.bodyMedium,
    color: '#374151',
    marginBottom: 6,
    marginTop: 10,
  },
  textInput: {
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: Radius.md,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
    fontFamily: Fonts.body,
    color: '#0D0D0D',
  },
  textArea: {
    height: 110,
  },
  errorText: {
    fontSize: 12,
    fontFamily: Fonts.bodyMedium,
    color: '#EF4444',
    marginBottom: 10,
  },
  saveBtn: {
    backgroundColor: '#0D0D0D',
    borderRadius: Radius.lg,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 18,
  },
  saveBtnText: {
    fontSize: 15,
    fontFamily: Fonts.bodyMedium,
    color: '#FFFFFF',
  },
  btnDisabled: {
    opacity: 0.6,
  },

  // Avatar Modal
  avatarSubtitle: {
    fontSize: 13,
    fontFamily: Fonts.body,
    color: '#6B7280',
    marginBottom: 14,
  },
  avatarGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 14,
    marginBottom: 16,
    justifyContent: 'center',
  },
  avatarOption: {
    position: 'relative',
    borderRadius: 36,
    borderWidth: 2,
    borderColor: 'transparent',
    padding: 2,
  },
  avatarOptionSelected: {
    borderColor: '#0D0D0D',
  },
  avatarThumb: {
    width: 64,
    height: 64,
    borderRadius: 32,
  },
  avatarSelectedBadge: {
    position: 'absolute',
    top: 0,
    right: 0,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#0D0D0D',
    justifyContent: 'center',
    alignItems: 'center',
  },
  customUrlRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 4,
  },
  applyUrlBtn: {
    backgroundColor: '#0D0D0D',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: Radius.md,
  },
  applyUrlText: {
    fontSize: 13,
    fontFamily: Fonts.bodyMedium,
    color: '#FFFFFF',
  },
});
