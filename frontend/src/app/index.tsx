import React, { useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  StatusBar,
  ActivityIndicator,
  ScrollView,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter, useFocusEffect } from 'expo-router';
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
  Camera, Package, Mic, User as UserIcon,
  TrendingUp, ShoppingBag, Building2, ChevronRight,
  Volume2, Square, Globe,
} from 'lucide-react-native';

import { Colors, Fonts, NAV_HEIGHT, Shadow } from '@/constants/artisan-theme';
import { ArtisanBottomNav, ArtisanTab } from '@/components/artisan/ArtisanBottomNav';
import { useAuth } from '@/context/AuthContext';
import { useLanguage } from '@/context/LanguageContext';
import { BACKEND_URL } from '@/config/api';
import { isSpeechSupported as checkSpeechSupported, stopSpeech } from '@/utils/speech';
import {
  getSelectedLanguage,
  hasSelectedLanguage,
  speak as centralSpeak,
  AppLanguage,
} from '@/utils/language-utils';
import SelectLanguageScreen from './select-language';
import WelcomeScreen from './welcome';
import BuyerHomeScreen from './buyer-home';

const BG = '#F5F0E8';
const SELL_CARD_BG = '#D6E8D8';

// ── Multilingual Voice Introduction & Section Explanations (STEP 3a) ───────────
export const HOME_PAGE_OVERVIEW_TEXTS: Record<string, string> = {
  en:
    "Welcome to Kala Udyam! This app helps artisans like you sell your handmade products and find money and training programs for your craft. " +
    "First, tap 'Sell a Product' to take photos and list your items. " +
    "Next, open 'My Products' to view your items, or tap 'Help' if you need guidance. " +
    "Tap 'Government Schemes' to find financial support and grants. " +
    "At the bottom, you can track your orders and total earnings. " +
    "Welcome to your Artisan Dashboard. Here you can snap a photo to list your handmade craft in 60 seconds, manage active listings, get help, or find government schemes and grants. Tap any section's speaker icon to hear more.",
  hi:
    "कला उद्यम में आपका स्वागत है! यह ऐप आप जैसे कारीगरों को अपने हस्तनिर्मित उत्पाद बेचने और अपने शिल्प के लिए धन, ऋण और प्रशिक्षण कार्यक्रम खोजने में मदद करता है। " +
    "सबसे पहले, अपने उत्पादों की तस्वीरें खींचने और उन्हें लिस्ट करने के लिए 'उत्पाद बेचें' पर टैप करें। " +
    "इसके बाद, अपने सामान देखने के लिए 'मेरे उत्पाद' खोलें, या मार्गदर्शन चाहिए तो 'सहायता' पर टैप करें। " +
    "वित्तीय सहायता और सरकारी अनुदान खोजने के लिए 'सरकारी योजनाएं' पर टैप करें। " +
    "नीचे, आप अपने ऑर्डर और कुल कमाई देख सकते हैं। किसी भी सेक्शन के बारे में और सुनने के लिए स्पीकर आइकन पर टैप करें।",
  ta:
    "கலா உத்யமிற்கு நல்வரவு! இந்த செயலி உங்களைப் போன்ற கைவினைஞர்கள் தங்கள் கைவினைப் பொருட்களை விற்கவும், உங்கள் தொழிலுக்கான நிதி, கடன் மற்றும் பயிற்சித் திட்டங்களைப் பெறவும் உதவுகிறது. " +
    "முதலில், உங்கள் பொருட்களின் படங்களை எடுத்து விற்க 'பொருளை விற்கவும்' என்பதைத் தட்டவும். " +
    "அடுத்து, உங்கள் பொருட்களைக் காண 'என் பொருட்கள்' என்பதைத் திறக்கவும், அல்லது வழிகாட்டல் தேவைப்பட்டால் 'உதவி' என்பதைத் தட்டவும். " +
    "அரசு நிதியுதவி மற்றும் மானியங்களைப் பெற 'அரசு நலத்திட்டங்கள்' என்பதைத் தட்டவும். " +
    "கீழே, உங்கள் ஆர்டர்கள் மற்றும் மொத்த வருமானத்தைக் கண்காணிக்கலாம். மேலும் கேட்க எந்தப் பகுதியிலும் உள்ள ஸ்பீக்கர் ஐகானைத் தட்டவும்.",
};

export const SECTION_EXPLANATIONS_MULTILINGUAL: Record<string, Record<string, string>> = {
  sell: {
    en: "Sell Your Craft. Tap here to open your camera, take a photo of your craft, and let artificial intelligence create your complete listing automatically in sixty seconds.",
    hi: "अपना शिल्प बेचें। अपने कैमरे को खोलने, अपने शिल्प की तस्वीर लेने और कृत्रिम बुद्धिमत्ता को साठ सेकंड में आपकी पूरी लिस्टिंग स्वचालित रूप से बनाने के लिए यहाँ टैप करें।",
    ta: "உங்கள் கைவினைப் பொருளை விற்கவும். உங்கள் கேமராவைத் திறந்து, உங்கள் கைவினைப் பொருளை புகைப்படம் எடுத்து, அறுபது வினாடிகளில் உங்கள் பட்டியலை உருவாக்க இங்கே தட்டவும்.",
  },
  listings: {
    en: "My Listings. View all your active and draft products, edit details, track stock, or share product links directly with buyers.",
    hi: "मेरे उत्पाद। अपने सभी सक्रिय और ड्राफ्ट उत्पादों को देखें, विवरण संपादित करें, स्टॉक ट्रैक करें, या सीधे खरीदारों के साथ उत्पाद लिंक साझा करें।",
    ta: "என் பொருட்கள். உங்கள் நேரடி மற்றும் வரைவுப் பொருட்களைப் பார்க்கவும், விவரங்களைத் திருத்தவும், இருப்பைக் கண்காணிக்கவும் அல்லது வாங்குபவர்களுடன் இணைப்பைப் பகிரவும்.",
  },
  help: {
    en: "Help and AI Support. Ask questions via voice or text in Hindi, Tamil, or English to learn about pricing, packaging, and shipping your crafts.",
    hi: "सहायता और एआई सपोर्ट। अपने शिल्पों की कीमत तय करने, पैकेजिंग और डिलीवरी के बारे में जानने के लिए हिंदी, तमिल या अंग्रेजी में आवाज या टेक्स्ट द्वारा सवाल पूछें।",
    ta: "உதவி மற்றும் ஆதரவு. உங்கள் கைவினைப் பொருட்களின் விலை நிர்ணயம், பேக்கேஜிங் மற்றும் டெலிவரி பற்றி அறிய தமிழ், இந்தி அல்லது ஆங்கிலத்தில் குரல் அல்லது உரை மூலம் கேள்வி கேட்கலாம்.",
  },
  schemes: {
    en: "Government Schemes. Discover financial assistance, toolkits, subsidies, and artisan credit cards provided by the government.",
    hi: "सरकारी योजनाएं। सरकार द्वारा प्रदान की जाने वाली वित्तीय सहायता, टूलकिट, सब्सिडी और कारीगर क्रेडिट कार्ड की खोज करें।",
    ta: "அரசு நலத்திட்டங்கள். அரசு வழங்கும் நிதி உதவி, கருவித்தொகுப்பு, மானியங்கள் மற்றும் கைவினைஞர் கிரெடிட் கார்டுகளை அறிந்து கொள்ளுங்கள்.",
  },
};

export default function ArtisanHomeScreen() {
  const [activeTab, setActiveTab] = useState<ArtisanTab>('home');
  const [stats, setStats] = useState({ products: 0, orders: 0, earnings: 0 });
  const [speakingKey, setSpeakingKey] = useState<string | null>(null);
  const [isSpeechSupported, setIsSpeechSupported] = useState(false);
  const [hasLanguageChosen, setHasLanguageChosen] = useState<boolean | null>(null);
  const [currentAppLang, setCurrentAppLang] = useState<AppLanguage>('en');

  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { session, user, profile, isLoading, userRole } = useAuth();
  const { language: contextLang } = useLanguage();

  const [fontsLoaded] = useFonts({
    Poppins_600SemiBold,
    Poppins_700Bold,
    Inter_400Regular,
    Inter_500Medium,
    Inter_700Bold,
  });

  // Verify speech capability on device
  useEffect(() => {
    setIsSpeechSupported(checkSpeechSupported());
  }, []);

  // Sync chosen language status
  const refreshLanguage = useCallback(async () => {
    try {
      const chosen = await hasSelectedLanguage();
      const lang = await getSelectedLanguage();
      setHasLanguageChosen(chosen);
      setCurrentAppLang(lang);
    } catch {
      setHasLanguageChosen(true);
      setCurrentAppLang('en');
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      refreshLanguage();
    }, [refreshLanguage])
  );

  // Fetch quick stats for artisan summary
  const fetchStats = useCallback(async () => {
    try {
      const uid = user?.id;
      const [pRes, oRes] = await Promise.all([
        fetch(`${BACKEND_URL}/api/products?limit=100${uid ? `&artisan_id=${uid}` : ''}`),
        fetch(`${BACKEND_URL}/api/orders${uid ? `?artisan_id=${uid}` : ''}`),
      ]);
      if (pRes.ok) {
        const pd = await pRes.json();
        setStats(s => ({ ...s, products: pd.products?.length || 0 }));
      }
      if (oRes.ok) {
        const od = await oRes.json();
        const orders = od.orders || [];
        const earnings = orders.reduce((sum: number, o: any) => sum + (parseFloat(o.total_amount) || 0), 0);
        setStats(s => ({ ...s, orders: orders.length, earnings }));
      }
    } catch (_) {}
  }, [user?.id]);

  useFocusEffect(useCallback(() => { if (session) fetchStats(); }, [session, fetchStats]));

  // Clean up speech on unmount
  useEffect(() => {
    return () => {
      stopSpeech();
    };
  }, []);

  const handleToggleSpeech = async (key: string, fallbackText: string = '', e?: any) => {
    if (e && typeof e.stopPropagation === 'function') {
      e.stopPropagation();
    }

    if (speakingKey === key) {
      stopSpeech();
      setSpeakingKey(null);
      return;
    }

    setSpeakingKey(key);

    let textToSpeak = '';
    if (key === 'overview') {
      textToSpeak = HOME_PAGE_OVERVIEW_TEXTS[currentAppLang] || HOME_PAGE_OVERVIEW_TEXTS.en;
    } else if (SECTION_EXPLANATIONS_MULTILINGUAL[key]) {
      textToSpeak = SECTION_EXPLANATIONS_MULTILINGUAL[key][currentAppLang] || SECTION_EXPLANATIONS_MULTILINGUAL[key].en;
    } else {
      textToSpeak = fallbackText;
    }

    try {
      await centralSpeak(textToSpeak, currentAppLang, {
        onDone: () => setSpeakingKey(null),
        onStopped: () => setSpeakingKey(null),
        onError: () => setSpeakingKey(null),
      });
    } catch (err) {
      console.warn('[Home Speech] error:', err);
      setSpeakingKey(null);
    }
  };
  if (!fontsLoaded || isLoading || hasLanguageChosen === null) {
    return (
      <View style={styles.loadingRoot}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  // FIRST SCREEN GATE: Show 3-Option Language Selection screen on initial entry
  if (hasLanguageChosen === false) {
    return <SelectLanguageScreen />;
  }

  // Always show login if no active session or profile (QR scan → login page)
  if (!session && !profile) return <WelcomeScreen />;
  if (userRole === 'buyer') return <BuyerHomeScreen />;

  const handleTabChange = (tab: ArtisanTab) => {
    setActiveTab(tab);
    if (tab === 'home') router.push('/');
    if (tab === 'listings') router.push('/listings');
    if (tab === 'add') router.push('/add-product');
    if (tab === 'profile') router.push('/profile');
  };

  // ── Multilingual strings for display ─────────────────────────────────────────
  const greetingLocal =
    currentAppLang === 'ta' ? 'வணக்கம்!' :
    currentAppLang === 'hi' ? 'नमस्ते!' : 'Hello!';

  const questionLocal =
    currentAppLang === 'ta' ? 'என்ன செய்ய வேண்டும்?' :
    currentAppLang === 'hi' ? 'आप क्या करना चाहते हैं?' :
    'What would you like to do?';

  const sellTitleLocal =
    currentAppLang === 'ta' ? 'பொருளை விற்கவும்' :
    currentAppLang === 'hi' ? 'उत्पाद बेचें' :
    'SELL A PRODUCT';

  const sellSubtitleLocal =
    currentAppLang === 'ta' ? 'புகைப்படம் எடுத்து விற்கவும்' :
    currentAppLang === 'hi' ? 'फोटो खींचें और तुरंत लिस्टिंग बनाएं' :
    'Take a photo and list your craft';

  const myProductsLabelLocal =
    currentAppLang === 'ta' ? 'என் பொருட்கள்' :
    currentAppLang === 'hi' ? 'मेरे उत्पाद' :
    'My Products';

  const myProductsSubLocal =
    currentAppLang === 'ta' ? 'பொருட்களைப்\nபார்க்கவும்' :
    currentAppLang === 'hi' ? 'उत्पाद देखें व\nप्रबंधित करें' :
    'View & manage\nyour items';

  const helpLabelLocal =
    currentAppLang === 'ta' ? 'உதவி' :
    currentAppLang === 'hi' ? 'सहायता' :
    'Help';

  const helpSubLocal =
    currentAppLang === 'ta' ? 'எப்போது வேண்டுமானாலும்\nஉதவி பெறலாம்' :
    currentAppLang === 'hi' ? 'कभी भी सहायता\nप्राप्त करें' :
    'Get support\nanytime';

  const schemesTitleLocal =
    currentAppLang === 'ta' ? 'அரசு & தன்னார்வ நலத்திட்டங்கள்' :
    currentAppLang === 'hi' ? 'सरकारी और गैर-सरकारी योजनाएं' :
    'Government & NGO Schemes';

  const schemesSubLocal =
    currentAppLang === 'ta' ? 'கைவினைஞர்களுக்கான நிதி உதவி & மானியங்கள்' :
    currentAppLang === 'hi' ? 'कारीगरों के लिए वित्तीय सहायता व अनुदान' :
    'Financial aid, subsidies & grants for artisans';

  const artisanName = profile?.name?.split(' ')[0] || '';

  const mainListenTitleText =
    speakingKey === 'overview'
      ? (currentAppLang === 'ta' ? 'நிறுத்தவும்' : currentAppLang === 'hi' ? 'सुनना बंद करें' : 'Stop Listening')
      : (currentAppLang === 'ta' ? 'கேட்கவும்: இங்கே என்ன செய்ய முடியும்?' : currentAppLang === 'hi' ? 'सुनिए: मैं यहाँ क्या कर सकता हूँ?' : 'Listen: What Can I Do Here?');

  const mainListenSubText =
    speakingKey === 'overview'
      ? (currentAppLang === 'ta' ? 'நிறுத்த எங்கு வேண்டுமானாலும் தட்டவும்' : currentAppLang === 'hi' ? 'गाइड रोकने के लिए कहीं भी टैप करें' : 'Tap anywhere to stop the voice guide')
      : (currentAppLang === 'ta' ? '30 வினாடி ஆடியோ வழிகாட்டலைக் கேட்க தட்டவும்' : currentAppLang === 'hi' ? 'ऐप का 30 सेकंड का ऑडियो टूर सुनने के लिए टैप करें' : 'Tap to hear a 30-second tour of this app');

  const mainListenBadgeText =
    speakingKey === 'overview'
      ? (currentAppLang === 'ta' ? 'நிறுத்து' : currentAppLang === 'hi' ? 'रोकें' : 'STOP')
      : (currentAppLang === 'ta' ? 'கேட்க' : currentAppLang === 'hi' ? 'सुनें' : 'LISTEN');

  return (
    <View style={styles.root}>
      <StatusBar barStyle="dark-content" backgroundColor={BG} />

      {/* ── Header ─────────────────────────────────────────────────────── */}
      <View style={[styles.header, { paddingTop: insets.top + 20 }]}>
        <View style={styles.headerLeft}>
          <Text style={styles.greetingRed}>
            {greetingLocal}{artisanName ? ` ${artisanName}` : ''}
          </Text>
          <Text style={styles.questionText}>{questionLocal}</Text>
        </View>

        <View style={styles.headerRight}>
          {/* Change Language accessible button */}
          <TouchableOpacity
            style={styles.langPill}
            onPress={() => router.push({ pathname: '/select-language', params: { canGoBack: 'true' } })}
            activeOpacity={0.8}
            accessibilityLabel="Change Language"
          >
            <Globe size={15} color={Colors.primary} strokeWidth={2} />
            <Text style={styles.langPillText}>
              {currentAppLang === 'ta' ? 'தமிழ்' : currentAppLang === 'hi' ? 'हिंदी' : 'English'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.helpPill}
            onPress={() => router.push('/help-support' as any)}
            activeOpacity={0.8}
          >
            <Mic size={16} color={Colors.primary} strokeWidth={2} />
            <Text style={styles.helpPillText}>{helpLabelLocal}</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.profileBtn}
            onPress={() => router.push('/profile')}
            activeOpacity={0.8}
          >
            <UserIcon size={18} color={Colors.primary} strokeWidth={2} />
          </TouchableOpacity>
        </View>
      </View>

      {/* ── Scrollable Content ──────────────────────────────────────────── */}
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: NAV_HEIGHT + insets.bottom + 16 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* ── 1. Primary Audio Guide / Overview Listen Banner ──────────── */}
        {isSpeechSupported && (
          <TouchableOpacity
            style={[
              styles.mainListenBanner,
              speakingKey === 'overview' && styles.mainListenBannerActive,
            ]}
            onPress={(e) => handleToggleSpeech('overview', '', e)}
            activeOpacity={0.85}
            accessibilityLabel={mainListenTitleText}
            accessibilityRole="button"
          >
            <View
              style={[
                styles.mainListenIconCircle,
                speakingKey === 'overview' && styles.mainListenIconCircleActive,
              ]}
            >
              {speakingKey === 'overview' ? (
                <Square size={22} color="#FFFFFF" fill="#FFFFFF" />
              ) : (
                <Volume2 size={26} color="#FFFFFF" strokeWidth={2.3} />
              )}
            </View>
            <View style={styles.mainListenContent}>
              <Text style={styles.mainListenTitle}>
                {mainListenTitleText}
              </Text>
              <Text style={styles.mainListenSubtitle}>
                {mainListenSubText}
              </Text>
            </View>
            <View
              style={[
                styles.mainListenBadge,
                speakingKey === 'overview' && styles.mainListenBadgeActive,
              ]}
            >
              <Text
                style={[
                  styles.mainListenBadgeText,
                  speakingKey === 'overview' && styles.mainListenBadgeTextActive,
                ]}
              >
                {mainListenBadgeText}
              </Text>
            </View>
          </TouchableOpacity>
        )}

        {/* ── 2. Sell a Product — Large Card ─────────────────────────────── */}
        <TouchableOpacity
          style={styles.sellCard}
          onPress={() => router.push('/add-product')}
          activeOpacity={0.88}
        >
          {isSpeechSupported && (
            <TouchableOpacity
              style={[
                styles.sectionListenBtn,
                styles.sellCardListenPos,
                speakingKey === 'sell' && styles.sectionListenBtnActive,
              ]}
              onPress={(e) => handleToggleSpeech('sell', '', e)}
              activeOpacity={0.8}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              accessibilityLabel="Listen to Sell a Product explanation"
              accessibilityRole="button"
            >
              {speakingKey === 'sell' ? (
                <Square size={14} color="#FFFFFF" fill="#FFFFFF" />
              ) : (
                <Volume2 size={17} color="#FFFFFF" strokeWidth={2.2} />
              )}
            </TouchableOpacity>
          )}
          <Camera size={60} color={Colors.primary} strokeWidth={1.6} />
          <Text style={styles.sellCardTitle}>{sellTitleLocal}</Text>
          <Text style={styles.sellCardSub}>{sellSubtitleLocal}</Text>
        </TouchableOpacity>

        {/* ── 3. Quick Action Row (My Products & Help) ──────────────────── */}
        <View style={styles.quickRow}>
          <TouchableOpacity
            style={[styles.quickCard, { backgroundColor: '#F5EDE0' }]}
            onPress={() => router.push('/listings')}
            activeOpacity={0.85}
          >
            {isSpeechSupported && (
              <TouchableOpacity
                style={[
                  styles.sectionListenBtn,
                  styles.quickCardListenPos,
                  speakingKey === 'listings' && styles.sectionListenBtnActive,
                ]}
                onPress={(e) => handleToggleSpeech('listings', '', e)}
                activeOpacity={0.8}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                accessibilityLabel="Listen to My Products explanation"
                accessibilityRole="button"
              >
                {speakingKey === 'listings' ? (
                  <Square size={13} color="#FFFFFF" fill="#FFFFFF" />
                ) : (
                  <Volume2 size={16} color="#FFFFFF" strokeWidth={2.2} />
                )}
              </TouchableOpacity>
            )}
            <Package size={36} color={Colors.primary} strokeWidth={1.6} />
            <Text style={styles.quickLabel}>{myProductsLabelLocal}</Text>
            <Text style={styles.quickSub}>{myProductsSubLocal}</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.quickCard, { backgroundColor: '#EBEBEB' }]}
            onPress={() => router.push('/help-support' as any)}
            activeOpacity={0.85}
          >
            {isSpeechSupported && (
              <TouchableOpacity
                style={[
                  styles.sectionListenBtn,
                  styles.quickCardListenPos,
                  speakingKey === 'help' && styles.sectionListenBtnActive,
                ]}
                onPress={(e) => handleToggleSpeech('help', '', e)}
                activeOpacity={0.8}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                accessibilityLabel="Listen to Help explanation"
                accessibilityRole="button"
              >
                {speakingKey === 'help' ? (
                  <Square size={13} color="#FFFFFF" fill="#FFFFFF" />
                ) : (
                  <Volume2 size={16} color="#FFFFFF" strokeWidth={2.2} />
                )}
              </TouchableOpacity>
            )}
            <Mic size={36} color={Colors.primary} strokeWidth={1.6} />
            <Text style={styles.quickLabel}>{helpLabelLocal}</Text>
            <Text style={styles.quickSub}>{helpSubLocal}</Text>
          </TouchableOpacity>
        </View>

        {/* ── 4. Schemes Discovery Card ─────────────────────────────────── */}
        <TouchableOpacity
          style={styles.schemesBanner}
          onPress={() => router.push('/schemes')}
          activeOpacity={0.88}
        >
          <View style={styles.schemesBannerIcon}>
            <Building2 size={24} color="#1E40AF" />
          </View>
          <View style={styles.schemesBannerContent}>
            <Text style={styles.schemesBannerTitle}>{schemesTitleLocal}</Text>
            <Text style={styles.schemesBannerSub}>{schemesSubLocal}</Text>
          </View>
          {isSpeechSupported && (
            <TouchableOpacity
              style={[
                styles.sectionListenBtn,
                styles.schemeListenBtn,
                speakingKey === 'schemes' && styles.sectionListenBtnActive,
              ]}
              onPress={(e) => handleToggleSpeech('schemes', '', e)}
              activeOpacity={0.8}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              accessibilityLabel="Listen to Schemes explanation"
              accessibilityRole="button"
            >
              {speakingKey === 'schemes' ? (
                <Square size={14} color="#FFFFFF" fill="#FFFFFF" />
              ) : (
                <Volume2 size={17} color="#FFFFFF" strokeWidth={2.2} />
              )}
            </TouchableOpacity>
          )}
          <ChevronRight size={18} color="#6B7280" />
        </TouchableOpacity>

        {/* ── 5. Stats Strip (Dashboard Summary) ────────────────────────── */}
        <View style={styles.statsContainer}>
          <View style={styles.statsHeaderRow}>
            <Text style={styles.statsHeaderTitle}>
              {currentAppLang === 'ta' ? 'கடை சுருக்கம்' : currentAppLang === 'hi' ? 'दुकान का विवरण' : 'Shop Summary'}
            </Text>
            {isSpeechSupported && (
              <TouchableOpacity
                style={[
                  styles.sectionListenBtn,
                  styles.statsListenBtn,
                  speakingKey === 'stats' && styles.sectionListenBtnActive,
                ]}
                onPress={(e) => handleToggleSpeech('stats', '', e)}
                activeOpacity={0.8}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                accessibilityLabel="Listen to Shop Summary"
                accessibilityRole="button"
              >
                {speakingKey === 'stats' ? (
                  <Square size={12} color="#FFFFFF" fill="#FFFFFF" />
                ) : (
                  <Volume2 size={15} color="#FFFFFF" strokeWidth={2.2} />
                )}
              </TouchableOpacity>
            )}
          </View>
          <View style={styles.statsCard}>
            <View style={styles.statItem}>
              <Package size={18} color={Colors.primary} strokeWidth={1.8} />
              <Text style={styles.statNumber}>{stats.products}</Text>
              <Text style={styles.statLabel}>
                {currentAppLang === 'ta' ? 'பொருட்கள்' : currentAppLang === 'hi' ? 'उत्पाद' : 'Products'}
              </Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <ShoppingBag size={18} color={Colors.primary} strokeWidth={1.8} />
              <Text style={styles.statNumber}>{stats.orders}</Text>
              <Text style={styles.statLabel}>
                {currentAppLang === 'ta' ? 'ஆர்டர்கள்' : currentAppLang === 'hi' ? 'ऑर्डर' : 'Orders'}
              </Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <TrendingUp size={18} color={Colors.primary} strokeWidth={1.8} />
              <Text style={styles.statNumber}>
                ₹{stats.earnings > 999 ? `${(stats.earnings / 1000).toFixed(1)}k` : stats.earnings.toFixed(0)}
              </Text>
              <Text style={styles.statLabel}>
                {currentAppLang === 'ta' ? 'வருவாய்' : currentAppLang === 'hi' ? 'कमाई' : 'Earnings'}
              </Text>
            </View>
          </View>
        </View>
      </ScrollView>

      <ArtisanBottomNav activeTab={activeTab} onTabChange={handleTabChange} />
    </View>
  );
}

const styles = StyleSheet.create({
  loadingRoot: {
    flex: 1,
    backgroundColor: BG,
    justifyContent: 'center',
    alignItems: 'center',
  },
  root: { flex: 1, backgroundColor: BG },

  /* Header */
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 16,
  },
  headerLeft: { flex: 1, paddingRight: 10 },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  greetingRed: {
    fontSize: 28,
    fontWeight: '700',
    fontFamily: Fonts.headingBold,
    color: Colors.greetingRed,
    marginBottom: 2,
  },
  questionText: {
    fontSize: 14,
    fontFamily: Fonts.body,
    color: Colors.textDark,
    lineHeight: 20,
  },
  langPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#FFFFFF',
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderWidth: 1.5,
    borderColor: '#E7D8C4',
    ...Shadow.card,
  },
  langPillText: {
    fontSize: 12.5,
    fontFamily: Fonts.heading,
    fontWeight: '700',
    color: Colors.primary,
  },
  helpPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#FFFFFF',
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: Colors.border,
    ...Shadow.card,
  },
  helpPillText: {
    fontSize: 13,
    fontFamily: Fonts.bodyMedium,
    color: Colors.textDark,
    fontWeight: '500',
  },
  profileBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
    ...Shadow.card,
  },

  /* Scroll */
  scroll: { flex: 1 },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 20,
    gap: 14,
  },

  /* ── Main Audio Guide Banner ── */
  mainListenBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#059669', // Emerald green
    borderRadius: 18,
    paddingVertical: 14,
    paddingHorizontal: 16,
    gap: 12,
    minHeight: 64,
    borderWidth: 1,
    borderColor: '#047857',
    ...Platform.select({
      web: {
        cursor: 'pointer',
        boxShadow: '0 4px 14px rgba(5, 150, 105, 0.35)',
      },
      default: {
        ...Shadow.card,
      },
    }),
  },
  mainListenBannerActive: {
    backgroundColor: '#DC2626',
    borderColor: '#B91C1C',
    ...Platform.select({
      web: {
        boxShadow: '0 4px 16px rgba(220, 38, 38, 0.45)',
      },
    }),
  },
  mainListenIconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(255, 255, 255, 0.22)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  mainListenIconCircleActive: {
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
  },
  mainListenContent: {
    flex: 1,
  },
  mainListenTitle: {
    fontSize: 15,
    fontWeight: '700',
    fontFamily: Fonts.headingBold,
    color: '#FFFFFF',
    letterSpacing: 0.2,
  },
  mainListenSubtitle: {
    fontSize: 12,
    fontFamily: Fonts.body,
    color: 'rgba(255, 255, 255, 0.92)',
    marginTop: 2,
    lineHeight: 16,
  },
  mainListenBadge: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    backgroundColor: '#FFFFFF',
    borderRadius: 999,
  },
  mainListenBadgeActive: {
    backgroundColor: '#FFFFFF',
  },
  mainListenBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    fontFamily: Fonts.headingBold,
    color: '#059669',
    letterSpacing: 0.5,
  },
  mainListenBadgeTextActive: {
    color: '#DC2626',
  },

  /* ── Section Listen Button (Reusable across cards) ── */
  sectionListenBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#059669',
    justifyContent: 'center',
    alignItems: 'center',
    ...Platform.select({
      web: {
        cursor: 'pointer',
        boxShadow: '0 2px 8px rgba(5, 150, 105, 0.3)',
      },
      default: {
        elevation: 3,
      },
    }),
  },
  sectionListenBtnActive: {
    backgroundColor: '#DC2626',
    ...Platform.select({
      web: {
        boxShadow: '0 2px 8px rgba(220, 38, 38, 0.4)',
      },
    }),
  },
  sellCardListenPos: {
    position: 'absolute',
    top: 14,
    right: 14,
    zIndex: 10,
  },
  quickCardListenPos: {
    position: 'absolute',
    top: 12,
    right: 12,
    zIndex: 10,
  },
  schemeListenBtn: {
    marginRight: 4,
  },

  /* Sell Card */
  sellCard: {
    backgroundColor: SELL_CARD_BG,
    borderRadius: 24,
    paddingVertical: 28,
    paddingHorizontal: 20,
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1.3,
    minHeight: 180,
    gap: 12,
    position: 'relative',
  },
  sellCardTitle: {
    fontSize: 21,
    fontWeight: '700',
    fontFamily: Fonts.headingBold,
    color: Colors.primary,
    letterSpacing: 1.4,
  },
  sellCardSub: {
    fontSize: 14,
    fontFamily: Fonts.body,
    color: Colors.textSecondary,
    textAlign: 'center',
  },

  /* Quick Row */
  quickRow: {
    flexDirection: 'row',
    gap: 14,
    flex: 1.1,
    minHeight: 160,
  },
  quickCard: {
    flex: 1,
    borderRadius: 22,
    padding: 18,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    position: 'relative',
  },
  quickLabel: {
    fontSize: 15,
    fontWeight: '700',
    fontFamily: Fonts.headingBold,
    color: Colors.textPrimary,
    textAlign: 'center',
  },
  quickSub: {
    fontSize: 12.5,
    fontFamily: Fonts.body,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 18,
  },

  /* Schemes Banner */
  schemesBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EFF6FF',
    borderRadius: 18,
    padding: 14,
    borderWidth: 1,
    borderColor: '#DBEAFE',
    gap: 12,
  },
  schemesBannerIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#DBEAFE',
    justifyContent: 'center',
    alignItems: 'center',
  },
  schemesBannerContent: {
    flex: 1,
  },
  schemesBannerTitle: {
    fontSize: 14,
    fontWeight: '700',
    fontFamily: Fonts.headingBold,
    color: '#1E3A8A',
  },
  schemesBannerSub: {
    fontSize: 12,
    fontFamily: Fonts.body,
    color: '#3B82F6',
    marginTop: 2,
  },

  /* Stats Section */
  statsContainer: {
    gap: 8,
  },
  statsHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 4,
  },
  statsHeaderTitle: {
    fontSize: 13,
    fontWeight: '600',
    fontFamily: Fonts.heading,
    color: Colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  statsListenBtn: {
    width: 30,
    height: 30,
    borderRadius: 15,
  },
  statsCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    paddingVertical: 18,
    paddingHorizontal: 10,
    flexDirection: 'row',
    alignItems: 'center',
    ...Shadow.card,
  },
  statItem: { flex: 1, alignItems: 'center', gap: 4 },
  statDivider: { width: 1, height: 38, backgroundColor: Colors.border },
  statNumber: {
    fontSize: 19,
    fontWeight: '700',
    fontFamily: Fonts.headingBold,
    color: Colors.primary,
  },
  statLabel: {
    fontSize: 12,
    fontFamily: Fonts.body,
    color: Colors.textSecondary,
  },
});
