import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  StatusBar,
  Linking,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import {
  useFonts,
  Poppins_600SemiBold,
  Poppins_700Bold,
} from '@expo-google-fonts/poppins';
import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_700Bold,
} from '@expo-google-fonts/inter';
import {
  ArrowLeft,
  Video,
  HelpCircle,
  Phone,
  Mail,
  Info,
  Mic,
  MessageCircle,
  ChevronRight,
} from 'lucide-react-native';

import { Colors, Fonts, Shadow } from '@/constants/artisan-theme';
import { useLanguage } from '@/context/LanguageContext';
import { ArtisanBottomNav, ArtisanTab } from '@/components/artisan/ArtisanBottomNav';
import { NAV_HEIGHT } from '@/constants/artisan-theme';

export default function HelpSupportScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { language } = useLanguage();

  const [fontsLoaded] = useFonts({
    Poppins_600SemiBold,
    Poppins_700Bold,
    Inter_400Regular,
    Inter_500Medium,
    Inter_700Bold,
  });

  if (!fontsLoaded) return null;

  const MENU_ITEMS = [
    {
      Icon: Video,
      label: language === 'ta' ? 'பயிற்சி வீடியோக்களைப் பாருங்கள்' : language === 'hi' ? 'ट्यूटोरियल वीडियो देखें' : 'Watch Tutorial Videos',
      onPress: () => {},
    },
    {
      Icon: HelpCircle,
      label: language === 'ta' ? 'அடிக்கடி கேட்கப்படும் கேள்விகள்' : language === 'hi' ? 'अक्सर पूछे जाने वाले प्रश्न' : 'Frequently Asked Questions',
      onPress: () => {},
    },
    {
      Icon: Phone,
      label: language === 'ta' ? 'ஆதரவைத் தொடர்பு கொள்ளவும்' : language === 'hi' ? 'समर्थन से संपर्क करें' : 'Contact Support',
      onPress: () => {},
    },
  ];

  const CONTACT_INFO = [
    {
      Icon: Phone,
      label: '+91 98765 43210',
      onPress: () => Linking.openURL('tel:+919876543210'),
    },
    {
      Icon: Mail,
      label: 'support@enarte.com',
      prefix: language === 'ta' ? 'மின்னஞ்சல் அனுப்புக' : language === 'hi' ? 'हमें ईमेल करें' : 'Email Us',
      onPress: () => Linking.openURL('mailto:support@enarte.com'),
    },
    {
      Icon: Info,
      label: language === 'ta' ? 'எனார்டே பற்றி' : language === 'hi' ? 'एनार्टे के बारे में' : 'About Enarte',
      onPress: () => {},
    },
  ];

  return (
    <View style={styles.root}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => router.back()}
          activeOpacity={0.8}
        >
          <ArrowLeft size={20} color={Colors.textPrimary} strokeWidth={2} />
        </TouchableOpacity>
        <Text style={styles.screenTitle}>
          {language === 'ta' ? 'உதவி மற்றும் ஆதரவு' : language === 'hi' ? 'सहायता और समर्थन' : 'Help & Support'}
        </Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Need Help Hero */}
        <View style={styles.heroCard}>
          <Text style={styles.heroTitle}>
            {language === 'ta' ? 'உதவி வேண்டுமா?' : language === 'hi' ? 'क्या आपको मदद चाहिए?' : 'Need Help?'}
          </Text>
          <Text style={styles.heroTitleLocal}>
            {language === 'ta' ? 'நாங்கள் உங்களுக்கு உதவ இங்கே உள்ளோம்' : language === 'hi' ? 'हम आपकी सहायता के लिए यहाँ हैं' : 'We are here to assist you'}
          </Text>

          {/* Voice Support */}
          <View style={styles.voiceSection}>
            <View style={styles.micCircle}>
              <Mic size={28} color="#FFFFFF" strokeWidth={2} />
            </View>
            <Text style={styles.voiceLabel}>
              {language === 'ta' ? 'எங்களுடன் பேசுங்கள்' : language === 'hi' ? 'हमसे बात करें' : 'Talk to us'}
            </Text>
            <Text style={styles.voiceLabelLocal}>
              {language === 'ta' ? '"எனக்கு உதவி வேண்டும் என்று கூறுங்கள்"' : language === 'hi' ? '"बोलें: मुझे मदद चाहिए"' : 'Say "I need help"'}
            </Text>
          </View>

          {/* Call & Chat Buttons */}
          <View style={styles.actionRow}>
            <TouchableOpacity
              style={styles.callBtn}
              onPress={() => Linking.openURL('tel:+919876543210')}
              activeOpacity={0.85}
            >
              <Phone size={16} color="#FFFFFF" strokeWidth={2} />
              <Text style={styles.callBtnText}>
                {language === 'ta' ? 'அழைக்க' : language === 'hi' ? 'कॉल करें' : 'Call'}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.chatBtn}
              onPress={() => {}}
              activeOpacity={0.85}
            >
              <MessageCircle size={16} color="#FFFFFF" strokeWidth={2} />
              <Text style={styles.chatBtnText}>
                {language === 'ta' ? 'உரையாடு' : language === 'hi' ? 'चैट करें' : 'Chat'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Menu Items */}
        <View style={styles.menuSection}>
          {MENU_ITEMS.map((item, idx) => (
            <TouchableOpacity
              key={item.label}
              style={styles.menuItem}
              onPress={item.onPress}
              activeOpacity={0.8}
            >
              <View style={styles.menuIconWrap}>
                <item.Icon size={18} color={Colors.primary} strokeWidth={2} />
              </View>
              <Text style={styles.menuLabel}>{item.label}</Text>
              <ChevronRight size={16} color={Colors.textMuted} />
            </TouchableOpacity>
          ))}
        </View>

        {/* Contact Info */}
        <View style={styles.contactSection}>
          {CONTACT_INFO.map((item) => (
            <TouchableOpacity
              key={item.label}
              style={styles.contactItem}
              onPress={item.onPress}
              activeOpacity={0.8}
            >
              <View style={styles.contactIconWrap}>
                <item.Icon size={16} color={Colors.primary} strokeWidth={2} />
              </View>
              <View style={styles.contactTextWrap}>
                {item.prefix ? (
                  <Text style={styles.contactPrefix}>{item.prefix}</Text>
                ) : null}
                <Text style={styles.contactLabel}>{item.label}</Text>
              </View>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#FFFFFF' },

  /* Header */
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 12,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.surfaceGray,
    justifyContent: 'center',
    alignItems: 'center',
  },
  screenTitle: {
    fontSize: 18,
    fontWeight: '700',
    fontFamily: Fonts.headingBold,
    color: Colors.textPrimary,
  },

  /* Scroll */
  scroll: { flex: 1 },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 40,
  },

  /* Hero Card */
  heroCard: {
    backgroundColor: Colors.primaryLight,
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
    marginBottom: 28,
    gap: 8,
  },
  heroTitle: {
    fontSize: 22,
    fontWeight: '700',
    fontFamily: Fonts.headingBold,
    color: Colors.textPrimary,
  },
  heroTitleLocal: {
    fontSize: 14,
    fontFamily: Fonts.body,
    color: Colors.textSecondary,
    marginBottom: 8,
  },
  voiceSection: {
    alignItems: 'center',
    marginVertical: 16,
    gap: 8,
  },
  micCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    ...Shadow.hero,
  },
  voiceLabel: {
    fontSize: 15,
    fontWeight: '600',
    fontFamily: Fonts.heading,
    color: Colors.textPrimary,
  },
  voiceLabelLocal: {
    fontSize: 12,
    fontFamily: Fonts.body,
    color: Colors.textSecondary,
    fontStyle: 'italic',
  },
  actionRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
    width: '100%',
  },
  callBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: Colors.primary,
    borderRadius: 28,
    height: 48,
    ...Shadow.hero,
  },
  callBtnText: {
    fontSize: 14,
    fontWeight: '700',
    fontFamily: Fonts.headingBold,
    color: '#FFFFFF',
  },
  chatBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: Colors.primaryDark,
    borderRadius: 28,
    height: 48,
  },
  chatBtnText: {
    fontSize: 14,
    fontWeight: '700',
    fontFamily: Fonts.headingBold,
    color: '#FFFFFF',
  },

  /* Menu */
  menuSection: {
    gap: 2,
    marginBottom: 24,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    gap: 14,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
  },
  menuIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: Colors.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  menuLabel: {
    flex: 1,
    fontSize: 14,
    fontWeight: '500',
    fontFamily: Fonts.bodyMedium,
    color: Colors.textPrimary,
  },

  /* Contact */
  contactSection: {
    gap: 2,
  },
  contactItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    gap: 14,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
  },
  contactIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  contactTextWrap: {
    flex: 1,
  },
  contactPrefix: {
    fontSize: 11,
    fontFamily: Fonts.body,
    color: Colors.textSecondary,
  },
  contactLabel: {
    fontSize: 14,
    fontFamily: Fonts.bodyMedium,
    color: Colors.textPrimary,
  },
});
