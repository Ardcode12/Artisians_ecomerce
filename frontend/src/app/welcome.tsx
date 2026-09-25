import React, { useRef, useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  StatusBar,
  Dimensions,
  ScrollView,
  NativeSyntheticEvent,
  NativeScrollEvent,
  Platform,
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
} from '@expo-google-fonts/inter';
import { Volume2, Square, Globe } from 'lucide-react-native';
import { Colors, Fonts, Shadow } from '@/constants/artisan-theme';
import { isSpeechSupported, stopSpeech } from '@/utils/speech';
import { getSelectedLanguage, speak as centralSpeak, AppLanguage } from '@/utils/language-utils';

const { width } = Dimensions.get('window');
const BG = '#F5F0E8';

const WELCOME_SPOKEN_TEXTS: Record<string, string> = {
  en: "Welcome to Craft Bridge! Empowering Craft, Expanding Markets. This app helps artisans like you sell your handmade products and find money, loans, and training programs for your craft. Tap the Get Started button below to begin.",
  hi: "क्राफ्ट ब्रिज में आपका स्वागत है! शिल्प को सशक्त बनाना, बाजारों का विस्तार करना। यह ऐप आप जैसे कारीगरों को अपने हस्तनिर्मित उत्पाद बेचने और ऋण व सहायता खोजने में मदद करता है। शुरू करने के लिए नीचे दिए गए बटन पर टैप करें।",
  ta: "கிராஃப்ட் பிரிட்ஜிற்கு நல்வரவு! கைவினைக்கு அதிகாரம், சந்தைகளை விரிவாக்குதல். இந்த செயலி உங்களைப் போன்ற கைவினைஞர்கள் தங்கள் தயாரிப்புகளை விற்கவும் திட்டங்களைப் பெறவும் உதவுகிறது. தொடங்க கீழே உள்ள பொத்தானைத் தட்டவும்.",
};

// ── Plant / Leaf Logo (SVG-style shapes) ─────────────────────────────────────
function PlantLogo({ size = 80 }: { size?: number }) {
  const s = size / 80;
  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      {/* Stem */}
      <View style={{
        position: 'absolute',
        bottom: size * 0.1,
        width: 3 * s,
        height: size * 0.55,
        backgroundColor: Colors.primary,
        borderRadius: 4,
      }} />
      {/* Left big leaf */}
      <View style={{
        position: 'absolute',
        bottom: size * 0.35,
        left: size * 0.08,
        width: size * 0.38,
        height: size * 0.22,
        backgroundColor: Colors.primary,
        borderRadius: size * 0.12,
        transform: [{ rotate: '-35deg' }],
      }} />
      {/* Right big leaf */}
      <View style={{
        position: 'absolute',
        bottom: size * 0.5,
        right: size * 0.08,
        width: size * 0.38,
        height: size * 0.22,
        backgroundColor: Colors.primary,
        borderRadius: size * 0.12,
        transform: [{ rotate: '35deg' }],
      }} />
      {/* Top small leaf */}
      <View style={{
        position: 'absolute',
        top: size * 0.04,
        width: size * 0.22,
        height: size * 0.14,
        backgroundColor: '#C0392B',
        borderRadius: size * 0.08,
        transform: [{ rotate: '-10deg' }],
      }} />
      {/* Pot base */}
      <View style={{
        position: 'absolute',
        bottom: 0,
        width: size * 0.42,
        height: size * 0.18,
        backgroundColor: Colors.primarySoft,
        borderRadius: size * 0.06,
      }} />
    </View>
  );
}

// ── Artisan Illustration (loom + fabric) ─────────────────────────────────────
function ArtisanIllustration() {
  return (
    <View style={illStyles.container}>
      {/* Blob 1 — terracotta */}
      <View style={illStyles.blob1} />
      {/* Blob 2 — beige */}
      <View style={illStyles.blob2} />
      {/* Loom frame */}
      <View style={illStyles.loom}>
        <View style={illStyles.loomTop} />
        <View style={illStyles.loomBottom} />
        <View style={illStyles.loomLeft} />
        <View style={illStyles.loomRight} />
        {/* Warp threads */}
        {[0, 1, 2, 3, 4].map(i => (
          <View
            key={i}
            style={[illStyles.warpThread, { left: 14 + i * 10 }]}
          />
        ))}
      </View>
      {/* Fabric swatch */}
      <View style={illStyles.fabric} />
      {/* Hand shape left */}
      <View style={illStyles.handLeft} />
    </View>
  );
}

const illStyles = StyleSheet.create({
  container: {
    width: width * 0.72,
    height: width * 0.52,
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  blob1: {
    position: 'absolute',
    bottom: 10,
    left: 0,
    width: 110,
    height: 80,
    backgroundColor: '#E8C4A0',
    borderRadius: 60,
    opacity: 0.6,
  },
  blob2: {
    position: 'absolute',
    bottom: 20,
    right: 10,
    width: 80,
    height: 60,
    backgroundColor: '#D4A080',
    borderRadius: 50,
    opacity: 0.4,
  },
  loom: {
    width: 90,
    height: 70,
    position: 'relative',
    marginBottom: 10,
  },
  loomTop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 6,
    backgroundColor: Colors.primary,
    borderRadius: 3,
  },
  loomBottom: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 6,
    backgroundColor: Colors.primary,
    borderRadius: 3,
  },
  loomLeft: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: 6,
    bottom: 0,
    backgroundColor: Colors.primary,
    borderRadius: 3,
  },
  loomRight: {
    position: 'absolute',
    top: 0,
    right: 0,
    width: 6,
    bottom: 0,
    backgroundColor: Colors.primary,
    borderRadius: 3,
  },
  warpThread: {
    position: 'absolute',
    top: 6,
    bottom: 6,
    width: 2,
    backgroundColor: Colors.primaryLight,
  },
  fabric: {
    position: 'absolute',
    right: 20,
    top: 10,
    width: 50,
    height: 90,
    backgroundColor: '#C0392B',
    borderRadius: 8,
    opacity: 0.75,
    transform: [{ skewX: '-5deg' }],
  },
  handLeft: {
    position: 'absolute',
    left: 10,
    bottom: 12,
    width: 40,
    height: 28,
    backgroundColor: '#D4956A',
    borderRadius: 14,
    opacity: 0.8,
  },
});

// ── Slide data ────────────────────────────────────────────────────────────────
const SLIDES = [
  {
    key: 'slide1',
    title: 'CRAFT BRIDGE',
    subtitle: 'Empowering Craft,\nExpanding Markets.',
  },
  {
    key: 'slide2',
    title: 'CRAFT BRIDGE',
    subtitle: 'Sell your craft\nto the world.',
  },
  {
    key: 'slide3',
    title: 'CRAFT BRIDGE',
    subtitle: 'AI tools that\nwork for you.',
  },
];

export default function WelcomeScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [activeSlide, setActiveSlide] = useState(0);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const scrollRef = useRef<ScrollView>(null);

  const [fontsLoaded] = useFonts({
    Poppins_600SemiBold,
    Poppins_700Bold,
    Inter_400Regular,
    Inter_500Medium,
  });

  const supported = isSpeechSupported();

  const handleToggleSpeech = () => {
    if (!supported) return;

    if (isSpeaking) {
      stopSpeech();
      setIsSpeaking(false);
      return;
    }

    const currentLang = getSelectedLanguage();
    const spokenText = WELCOME_SPOKEN_TEXTS[currentLang] || WELCOME_SPOKEN_TEXTS.en;
    setIsSpeaking(true);
    centralSpeak(spokenText, currentLang, {
      rate: 0.95,
      pitch: 1.0,
      onDone: () => setIsSpeaking(false),
      onStopped: () => setIsSpeaking(false),
      onError: () => setIsSpeaking(false),
    });
  };

  useEffect(() => {
    return () => {
      stopSpeech();
    };
  }, []);

  const handleScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const idx = Math.round(e.nativeEvent.contentOffset.x / width);
    setActiveSlide(idx);
  };

  const handleGetStarted = () => {
    stopSpeech();
    router.push('/auth/language');
  };

  if (!fontsLoaded) return null;

  return (
    <View style={[styles.root, { paddingBottom: Math.max(insets.bottom, 24) }]}>
      <StatusBar barStyle="dark-content" backgroundColor={BG} />

      {/* ── Top Bar with Language Selector and Audio Guide ── */}
      <View style={[styles.welcomeTopBar, { top: insets.top + 14 }]}>
        <TouchableOpacity
          style={styles.welcomeLangPill}
          onPress={() => router.push({ pathname: '/select-language', params: { canGoBack: 'true' } })}
          activeOpacity={0.85}
          accessibilityLabel="Change Language"
        >
          <Globe size={15} color={Colors.primary} strokeWidth={2} />
          <Text style={styles.welcomeLangText}>
            {getSelectedLanguage() === 'ta' ? 'தமிழ்' : getSelectedLanguage() === 'hi' ? 'हिंदी' : 'English'}
          </Text>
        </TouchableOpacity>

        {supported && (
          <TouchableOpacity
            style={[
              styles.welcomeListenPill,
              isSpeaking && styles.welcomeListenPillActive,
            ]}
            onPress={handleToggleSpeech}
            activeOpacity={0.85}
            accessibilityLabel={
              isSpeaking ? 'Stop listening to introduction' : 'Listen to app voice introduction'
            }
            accessibilityRole="button"
          >
            {isSpeaking ? (
              <Square size={15} color="#FFFFFF" fill="#FFFFFF" />
            ) : (
              <Volume2 size={18} color="#FFFFFF" strokeWidth={2.3} />
            )}
            <Text style={styles.welcomeListenText}>
              {isSpeaking
                ? (getSelectedLanguage() === 'ta' ? 'நிறுத்து' : getSelectedLanguage() === 'hi' ? 'रोकें' : 'Stop')
                : (getSelectedLanguage() === 'ta' ? 'கேட்க' : getSelectedLanguage() === 'hi' ? 'सुनें' : 'Listen')}
            </Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Paged slides */}
      <ScrollView
        ref={scrollRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={handleScroll}
        style={styles.slidesScroll}
        contentContainerStyle={styles.slidesContent}
      >
        {SLIDES.map((slide, idx) => (
          <View key={slide.key} style={[styles.slide, { width }]}>

            {/* Logo */}
            <View style={[styles.logoArea, { paddingTop: insets.top + 40 }]}>
              <PlantLogo size={80} />
              <Text style={styles.brandName}>{slide.title}</Text>
              <Text style={styles.tagline}>{slide.subtitle}</Text>
            </View>

            {/* Illustration */}
            <View style={styles.illustrationArea}>
              <ArtisanIllustration />
            </View>
          </View>
        ))}
      </ScrollView>

      {/* Pagination dots */}
      <View style={styles.dotsRow}>
        {SLIDES.map((_, i) => (
          <View
            key={i}
            style={[
              styles.dot,
              i === activeSlide ? styles.dotActive : styles.dotInactive,
            ]}
          />
        ))}
      </View>

      {/* Get Started button */}
      <View style={styles.bottomSection}>
        <TouchableOpacity
          style={styles.getStartedBtn}
          onPress={handleGetStarted}
          activeOpacity={0.88}
        >
          <Text style={styles.getStartedText}>Get Started</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.loginLink}
          onPress={() => router.push('/auth/phone')}
          activeOpacity={0.7}
        >
          <Text style={styles.loginLinkText}>
            Already have an account?{' '}
            <Text style={styles.loginLinkBold}>Log in</Text>
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: BG,
  },
  slidesScroll: {
    flex: 1,
  },
  slidesContent: {
    // paging handled by ScrollView
  },
  slide: {
    flex: 1,
    alignItems: 'center',
  },

  /* Logo Area */
  logoArea: {
    alignItems: 'center',
    paddingHorizontal: 32,
    gap: 12,
  },
  brandName: {
    fontSize: 32,
    fontFamily: Fonts.headingBold,
    fontWeight: '700',
    color: Colors.primary,
    letterSpacing: 2,
    marginTop: 8,
  },
  tagline: {
    fontSize: 17,
    fontFamily: Fonts.body,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 26,
  },

  /* Illustration */
  illustrationArea: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },

  /* Dots */
  dotsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    marginBottom: 28,
  },
  dot: {
    height: 8,
    borderRadius: 4,
  },
  dotActive: {
    width: 20,
    backgroundColor: Colors.primary,
  },
  dotInactive: {
    width: 8,
    backgroundColor: Colors.border,
  },

  /* Bottom */
  bottomSection: {
    paddingHorizontal: 24,
    gap: 14,
    alignItems: 'center',
    marginBottom: 8,
  },
  getStartedBtn: {
    width: '100%',
    backgroundColor: Colors.primary,
    borderRadius: 14,
    height: 56,
    justifyContent: 'center',
    alignItems: 'center',
    ...Shadow.hero,
  },
  getStartedText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
    fontFamily: Fonts.headingBold,
    letterSpacing: 0.3,
  },
  loginLink: {
    paddingVertical: 8,
  },
  loginLinkText: {
    fontSize: 14,
    fontFamily: Fonts.body,
    color: Colors.textSecondary,
  },
  loginLinkBold: {
    color: Colors.primary,
    fontFamily: Fonts.heading,
    fontWeight: '600',
  },
  welcomeTopBar: {
    position: 'absolute',
    right: 20,
    zIndex: 99,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  welcomeLangPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: '#E2D5C3',
    minHeight: 44,
    ...Platform.select({
      web: {
        cursor: 'pointer',
        boxShadow: '0 3px 8px rgba(0, 0, 0, 0.08)',
      },
      default: {
        ...Shadow.card,
      },
    }),
  },
  welcomeLangText: {
    fontSize: 13,
    fontWeight: '700',
    fontFamily: Fonts.headingBold,
    color: Colors.primary,
  },
  welcomeListenPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#059669',
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 20,
    minHeight: 44,
    ...Platform.select({
      web: {
        cursor: 'pointer',
        boxShadow: '0 3px 10px rgba(5, 150, 105, 0.35)',
      },
      default: {
        ...Shadow.card,
      },
    }),
  },
  welcomeListenPillActive: {
    backgroundColor: '#DC2626',
    ...Platform.select({
      web: {
        boxShadow: '0 3px 10px rgba(220, 38, 38, 0.45)',
      },
    }),
  },
  welcomeListenText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
    fontFamily: Fonts.headingBold,
  },
});
