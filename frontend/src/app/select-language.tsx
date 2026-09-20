import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  StatusBar,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Volume2, Check, ArrowLeft, Globe } from 'lucide-react-native';
import { Colors, Fonts, Radius, Shadow } from '@/constants/artisan-theme';
import {
  AppLanguage,
  SUPPORTED_LANGUAGES,
  getSelectedLanguage,
  setSelectedLanguage,
  speak,
  stopSpeech,
} from '@/utils/language-utils';
import { useLanguage } from '@/context/LanguageContext';

const BG = '#F5F0E8';

export default function SelectLanguageScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const params = useLocalSearchParams();
  const { setLanguage: syncLanguageContext } = useLanguage();

  const [activeLang, setActiveLang] = useState<AppLanguage>(getSelectedLanguage() || 'en');
  const [playingAudioCode, setPlayingAudioCode] = useState<string | null>(null);

  // Stop speech when unmounting
  useEffect(() => {
    return () => {
      stopSpeech();
    };
  }, []);

  const handlePlaySampleAudio = (langCode: AppLanguage, sampleText: string, e: any) => {
    if (e) {
      if (typeof e.stopPropagation === 'function') e.stopPropagation();
      if (typeof e.preventDefault === 'function') e.preventDefault();
    }

    setPlayingAudioCode(langCode);
    speak(sampleText, langCode, {
      rate: 0.9,
      onDone: () => setPlayingAudioCode(null),
      onStopped: () => setPlayingAudioCode(null),
      onError: () => setPlayingAudioCode(null),
    });
  };

  const handleSelectLanguage = async (code: AppLanguage) => {
    stopSpeech();
    setActiveLang(code);
    await setSelectedLanguage(code);
    syncLanguageContext(code as any);

    // If navigated from home page "change language", go back; otherwise go to root home
    if (params.canGoBack === 'true' && router.canGoBack()) {
      router.back();
    } else {
      router.replace('/');
    }
  };

  return (
    <View style={[styles.root, { paddingTop: insets.top, paddingBottom: Math.max(insets.bottom, 24) }]}>
      <StatusBar barStyle="dark-content" backgroundColor={BG} />

      {/* Optional Top Bar if user opened from settings / change language */}
      <View style={styles.topBar}>
        {params.canGoBack === 'true' ? (
          <TouchableOpacity
            style={styles.backBtn}
            onPress={() => router.back()}
            activeOpacity={0.7}
            accessibilityLabel="Go back"
          >
            <ArrowLeft size={20} color={Colors.primary} />
          </TouchableOpacity>
        ) : (
          <View style={{ width: 40 }} />
        )}

        <View style={styles.badgePill}>
          <Globe size={15} color={Colors.primary} />
          <Text style={styles.badgePillText}>Select Language</Text>
        </View>

        <View style={{ width: 40 }} />
      </View>

      {/* Main Container */}
      <View style={styles.content}>
        {/* Header Title */}
        <View style={styles.headerBox}>
          <Text style={styles.mainTitle}>Choose Your Language</Text>
          <Text style={styles.mainTitleTrans}>மொழி / भाषा चुनिए</Text>
          <Text style={styles.subtitle}>
            Tap your language below. Read-aloud voice and text will be in your chosen language.
          </Text>
        </View>

        {/* 3 Large Language Cards */}
        <View style={styles.cardsList}>
          {SUPPORTED_LANGUAGES.map((item) => {
            const isSelected = activeLang === item.code;
            const isPlaying = playingAudioCode === item.code;

            return (
              <TouchableOpacity
                key={item.code}
                style={[styles.langCard, isSelected && styles.langCardSelected]}
                onPress={() => handleSelectLanguage(item.code)}
                activeOpacity={0.88}
                accessibilityRole="button"
                accessibilityLabel={`Select ${item.name}`}
              >
                {/* Left accent bar when selected */}
                {isSelected && <View style={styles.selectedAccentBar} />}

                {/* Main Label: Native Script prominently displayed */}
                <View style={styles.textContainer}>
                  <Text style={[styles.nativeNameText, isSelected && styles.nativeNameTextSelected]}>
                    {item.nativeName}
                  </Text>
                  <Text style={styles.romanizedText}>
                    ({item.name})
                  </Text>
                </View>

                {/* Right side: Audio Preview Button & Selection Checkmark */}
                <View style={styles.actionsContainer}>
                  {/* Speaker Preview Icon Button */}
                  <TouchableOpacity
                    style={[styles.audioPreviewBtn, isPlaying && styles.audioPreviewBtnPlaying]}
                    onPress={(e) => handlePlaySampleAudio(item.code, item.sampleAudioText, e)}
                    activeOpacity={0.75}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    accessibilityLabel={`Hear sample pronunciation for ${item.name}`}
                  >
                    <Volume2
                      size={20}
                      color={isPlaying ? '#FFFFFF' : '#059669'}
                      strokeWidth={2.2}
                    />
                  </TouchableOpacity>

                  {/* Radio / Checkmark indicator */}
                  <View style={[styles.radioCircle, isSelected && styles.radioCircleSelected]}>
                    {isSelected && <Check size={16} color="#FFFFFF" strokeWidth={3} />}
                  </View>
                </View>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Informational reassurance footer */}
        <View style={styles.footerNote}>
          <Text style={styles.footerNoteText}>
            💡 You can change this language at any time from the home page.
          </Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: BG,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E7D8C4',
  },
  badgePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#EFE7DA',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#DFD2BE',
  },
  badgePillText: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.primary,
    fontFamily: Fonts.heading,
  },
  content: {
    flex: 1,
    paddingHorizontal: 22,
    justifyContent: 'center',
    maxWidth: 520,
    alignSelf: 'center',
    width: '100%',
  },
  headerBox: {
    alignItems: 'center',
    marginBottom: 32,
  },
  mainTitle: {
    fontSize: 26,
    fontWeight: '700',
    fontFamily: Fonts.headingBold,
    color: '#1C1917',
    textAlign: 'center',
  },
  mainTitleTrans: {
    fontSize: 20,
    fontWeight: '600',
    fontFamily: Fonts.heading,
    color: Colors.greetingRed,
    marginTop: 4,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 14,
    fontFamily: Fonts.body,
    color: '#6B7280',
    textAlign: 'center',
    marginTop: 10,
    lineHeight: 20,
    paddingHorizontal: 12,
  },
  cardsList: {
    gap: 16,
  },
  langCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    paddingVertical: 20,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 2,
    borderColor: '#EAE1D3',
    position: 'relative',
    overflow: 'hidden',
    minHeight: 88,
    ...Platform.select({
      web: {
        cursor: 'pointer',
        boxShadow: '0 4px 14px rgba(0, 0, 0, 0.04)',
      },
      default: {
        ...Shadow.card,
      },
    }),
  },
  langCardSelected: {
    borderColor: Colors.primary,
    backgroundColor: '#FFFDF9',
    ...Platform.select({
      web: {
        boxShadow: '0 6px 20px rgba(181, 80, 47, 0.18)',
      },
    }),
  },
  selectedAccentBar: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 6,
    backgroundColor: Colors.primary,
  },
  textContainer: {
    flex: 1,
    paddingLeft: 6,
  },
  nativeNameText: {
    fontSize: 24,
    fontWeight: '700',
    fontFamily: Fonts.headingBold,
    color: '#1C1917',
  },
  nativeNameTextSelected: {
    color: Colors.primary,
  },
  romanizedText: {
    fontSize: 14,
    fontFamily: Fonts.bodyMedium,
    color: '#78716C',
    marginTop: 2,
  },
  actionsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  audioPreviewBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#ECFDF5',
    borderWidth: 1,
    borderColor: '#A7F3D0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  audioPreviewBtnPlaying: {
    backgroundColor: '#059669',
    borderColor: '#047857',
  },
  radioCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: '#D6D3D1',
    justifyContent: 'center',
    alignItems: 'center',
  },
  radioCircleSelected: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  footerNote: {
    marginTop: 28,
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.65)',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E7DCCB',
    alignItems: 'center',
  },
  footerNoteText: {
    fontSize: 13,
    fontFamily: Fonts.body,
    color: '#57534E',
    textAlign: 'center',
    lineHeight: 18,
  },
});
