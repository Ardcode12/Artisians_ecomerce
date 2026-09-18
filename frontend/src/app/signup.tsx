import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StatusBar,
  ActivityIndicator,
  Image,
  Platform,
  Alert,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import {
  useFonts,
  Poppins_600SemiBold,
  Poppins_700Bold,
} from '@expo-google-fonts/poppins';
import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
} from '@expo-google-fonts/inter';
import {
  ArrowLeft,
  Mic,
  Volume2,
  Square,
  Check,
  RotateCcw,
  Camera,
  MapPin,
  Sparkles,
  Globe,
  ChevronRight,
  Edit3,
  Briefcase,
  Store,
  Phone,
  Search,
  AlertCircle,
  Navigation,
} from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';

import { Colors, Fonts, Shadow } from '@/constants/artisan-theme';
import { useAuth } from '@/context/AuthContext';
import {
  getSelectedLanguage,
  setSelectedLanguage,
  speak as centralSpeak,
  stopSpeech,
  AppLanguage,
} from '@/utils/language-utils';
import {
  startSpeechRecognition,
  stopSpeechRecognition,
  isSpeechRecognitionSupported,
  SpeechRecognitionState,
} from '@/utils/speech-recognition';
import {
  detectUserLocationAccurate,
  searchArtisanClusters,
  HANDICRAFT_REGIONS,
  DetectedLocation,
} from '@/utils/location-utils';
import { BACKEND_URL } from '@/config/api';

const BG = '#F5F0E8';
const EMERALD = '#059669';
const EMERALD_DARK = '#047857';

// ── Step Translations & Audio Prompts ──────────────────────────────────────────
const PROMPTS: Record<
  string,
  Record<AppLanguage, { title: string; subtitle: string; audio: string }>
> = {
  step1_phone: {
    en: {
      title: 'Your Phone Number',
      subtitle: 'Please enter your 10-digit mobile number',
      audio: 'Please enter your phone number to continue.',
    },
    ta: {
      title: 'உங்கள் தொலைபேசி எண்',
      subtitle: 'உங்கள் 10 இலக்க மொபைல் எண்ணை உள்ளிடவும்',
      audio: 'தொடர உங்கள் தொலைபேசி எண்ணை உள்ளிடவும்.',
    },
    hi: {
      title: 'आपका मोबाइल नंबर',
      subtitle: 'कृपया अपना 10 अंकों का मोबाइल नंबर दर्ज करें',
      audio: 'आगे बढ़ने के लिए अपना मोबाइल नंबर दर्ज करें।',
    },
  },
  step2_name: {
    en: {
      title: 'What is your name?',
      subtitle: 'Tap the microphone and say your full name',
      audio: 'Please say your name.',
    },
    ta: {
      title: 'உங்கள் பெயர் என்ன?',
      subtitle: 'மைக் பட்டனைத் தட்டி உங்கள் பெயரைச் சொல்லுங்கள்',
      audio: 'தயவுசெய்து உங்கள் பெயரைச் சொல்லுங்கள்.',
    },
    hi: {
      title: 'आपका नाम क्या है?',
      subtitle: 'माइक पर टैप करें और अपना नाम बोलें',
      audio: 'कृपया अपना नाम बताएं।',
    },
  },
  step3_craft: {
    en: {
      title: 'What do you make or sell?',
      subtitle: 'Tap your craft below, or tap Other to type',
      audio:
        'What do you make? Baskets. Pottery. Cloth weaving. Woodwork. Metal craft. Jewelry. Tap one, or tap Other.',
    },
    ta: {
      title: 'நீங்கள் என்ன செய்கிறீர்கள் அல்லது விற்கிறீர்கள்?',
      subtitle: 'கீழே உங்கள் கைவினைப் பிரிவைத் தட்டவும்',
      audio:
        'நீங்கள் என்ன செய்கிறீர்கள்? கூடைகள், மண்பாண்டங்கள், நெசவு, மர வேலைப்பாடு, உலோகப் பொருட்கள், நகைகள். ஒன்றைத் தட்டவும், அல்லது மற்றவை என்பதைத் தேர்ந்தெடுக்கவும்.',
    },
    hi: {
      title: 'आप क्या बनाते या बेचते हैं?',
      subtitle: 'नीचे अपने शिल्प पर टैप करें, या अन्य चुनें',
      audio:
        'आप क्या बनाते हैं? टोकरियाँ, मिट्टी के बर्तन, कपड़ा बुनाई, लकड़ी का काम, धातु शिल्प, गहने। एक पर टैप करें, या अन्य चुनें।',
    },
  },
  step4_location: {
    en: {
      title: 'Where are you located?',
      subtitle: 'Tap Find My Location or search your town below',
      audio: 'Where are you located? Tap Find My Location to detect your area, or search your town below.',
    },
    ta: {
      title: 'உங்கள் ஊர் அல்லது மாவட்டம் எது?',
      subtitle: 'கண்டறிய தட்டவும் அல்லது கீழே தேர்ந்தெடுக்கவும்',
      audio: 'உங்கள் ஊர் அல்லது மாவட்டம் எது? இருப்பிடத்தைக் கண்டறிய தட்டவும், அல்லது கீழே தேர்வு செய்யவும்.',
    },
    hi: {
      title: 'आप कहाँ रहते हैं?',
      subtitle: 'स्थान खोजने के लिए टैप करें या नीचे चुनें',
      audio: 'आप कहाँ रहते हैं? अपना स्थान खोजने के लिए टैप करें, या नीचे चुनें।',
    },
  },
  step5_experience: {
    en: {
      title: 'How long have you been doing this craft?',
      subtitle: 'Select your craft experience below',
      audio:
        'How long have you been doing this craft? Tap one of the four options: Less than one year, one to five years, five to ten years, or more than ten years.',
    },
    ta: {
      title: 'இந்த தொழிலில் உங்களுக்கு எவ்வளவு கால அனுபவம் உள்ளது?',
      subtitle: 'கீழே உள்ள விருப்பங்களில் ஒன்றைத் தேர்ந்தெடுக்கவும்',
      audio:
        'இந்த தொழிலில் உங்களுக்கு எவ்வளவு அனுபவம் உள்ளது? நான்கு விருப்பங்களில் ஒன்றைத் தட்டவும்: ஒரு வருடத்திற்கும் குறைவாக, ஒன்று முதல் ஐந்து ஆண்டுகள், ஐந்து முதல் பத்து ஆண்டுகள், அல்லது பத்து ஆண்டுகளுக்கு மேல்.',
    },
    hi: {
      title: 'आप यह शिल्प कितने समय से कर रहे हैं?',
      subtitle: 'नीचे दिए गए विकल्पों में से अपना अनुभव चुनें',
      audio:
        'आप यह शिल्प कितने समय से कर रहे हैं? चार विकल्पों में से एक चुनें: एक साल से कम, एक से पाँच साल, पाँच से दस साल, या दस साल से अधिक।',
    },
  },
  step6_photo: {
    en: {
      title: 'Add a photo (Optional)',
      subtitle: 'Take a photo of yourself or your handmade work',
      audio:
        'You can take a photo of yourself or your work. This is optional. Tap Camera to take a photo, or tap Skip to continue.',
    },
    ta: {
      title: 'ஒரு புகைப்படம் சேர்க்கவும் (விருப்பத்தேர்வு)',
      subtitle: 'உங்கள் அல்லது உங்கள் கைவினைப் பொருளின் புகைப்படத்தை எடுக்கவும்',
      audio:
        'நீங்கள் உங்கள் அல்லது உங்கள் பொருளின் புகைப்படத்தை எடுக்கலாம். இது விருப்பத்தேர்வு. படம் எடுக்க கேமரா தட்டவும், அல்லது தவிர்க்கலாம்.',
    },
    hi: {
      title: 'एक फोटो जोड़ें (वैकल्पिक)',
      subtitle: 'अपनी या अपने काम की एक तस्वीर लें',
      audio:
        'आप अपनी या अपने काम की तस्वीर ले सकते हैं। यह वैकल्पिक है। फोटो लेने के लिए कैमरा दबाएं, या आगे बढ़ने के लिए छोड़ें पर टैप करें।',
    },
  },
  step7_brand: {
    en: {
      title: 'Shop or Brand Name (Optional)',
      subtitle: 'If you have a shop or workshop name, enter it here',
      audio:
        'If you have a shop name, you can add it here. This is optional. Enter the name, or tap Skip.',
    },
    ta: {
      title: 'கடை அல்லது பிராண்ட் பெயர் (விருப்பத்தேர்வு)',
      subtitle: 'உங்களிடம் கடை பெயர் இருந்தால் இங்கு உள்ளிடவும்',
      audio:
        'உங்களிடம் கடை அல்லது பிராண்ட் பெயர் இருந்தால் இங்கு உள்ளிடலாம். இது விருப்பத்தேர்வு.',
    },
    hi: {
      title: 'दुकान या ब्रांड का नाम (वैकल्पिक)',
      subtitle: 'यदि आपके पास दुकान का नाम है, तो यहाँ दर्ज करें',
      audio:
        'यदि आपके पास कोई दुकान या ब्रांड का नाम है, तो आप इसे यहाँ जोड़ सकते हैं। यह वैकल्पिक है।',
    },
  },
  step8_review: {
    en: {
      title: 'Check Your Details',
      subtitle: 'Listen to your summary and tap Submit to finish',
      audio: 'Please listen to your signup summary and tap Submit to finish.',
    },
    ta: {
      title: 'உங்கள் விவரங்களைச் சரிபார்க்கவும்',
      subtitle: 'விவரங்களைக் கேட்டு, முடிக்க சமர்ப்பிக்கவும்',
      audio:
        'உங்கள் பதிவு விவரங்களைக் கேட்டு, பதிவு முடிக்க சமர்ப்பிக்கவும் என்பதைத் தட்டவும்.',
    },
    hi: {
      title: 'अपने विवरण की जांच करें',
      subtitle: 'अपना विवरण सुनें और पूरा करने के लिए सबमिट दबाएं',
      audio: 'कृपया अपना विवरण सुनें और पूरा करने के लिए सबमिट पर टैप करें।',
    },
  },
};

const EXPERIENCE_OPTIONS: { id: string; en: string; ta: string; hi: string }[] = [
  {
    id: '<1_year',
    en: 'Less than 1 year',
    ta: '1 வருடத்திற்கு குறைவு',
    hi: '1 साल से कम',
  },
  {
    id: '1-5_years',
    en: '1 – 5 years',
    ta: '1 முதல் 5 ஆண்டுகள்',
    hi: '1 से 5 साल',
  },
  {
    id: '5-10_years',
    en: '5 – 10 years',
    ta: '5 முதல் 10 ஆண்டுகள்',
    hi: '5 से 10 साल',
  },
  {
    id: '>10_years',
    en: 'More than 10 years',
    ta: '10 ஆண்டுகளுக்கு மேல்',
    hi: '10 साल से अधिक',
  },
];

export interface CraftCategoryOption {
  id: string;
  icon: string;
  en: string;
  ta: string;
  hi: string;
  value: string;
}

export const CRAFT_CATEGORIES: CraftCategoryOption[] = [
  {
    id: 'bamboo',
    icon: '🧺',
    en: 'Bamboo & Basket Weaving',
    ta: 'கூடை & மூங்கில் நெசவு',
    hi: 'टोकरी और बांस बुनाई',
    value: 'Bamboo & Basket Weaving',
  },
  {
    id: 'pottery',
    icon: '🏺',
    en: 'Pottery & Clay Work',
    ta: 'மண்பாண்டங்கள் & களிமண்',
    hi: 'मिट्टी के बर्तन और मूर्तियाँ',
    value: 'Pottery & Clay Work',
  },
  {
    id: 'textiles',
    icon: '🧵',
    en: 'Textiles & Handloom',
    ta: 'துணிகள் & கைத்தறி நெசவு',
    hi: 'कपड़ा और हथकरघा बुनाई',
    value: 'Textiles & Handloom Weaving',
  },
  {
    id: 'woodwork',
    icon: '🪵',
    en: 'Woodwork & Carvings',
    ta: 'மர வேலைப்பாடுகள்',
    hi: 'लकड़ी का काम और नक्काशी',
    value: 'Woodwork & Carvings',
  },
  {
    id: 'metalwork',
    icon: '🪔',
    en: 'Metalwork & Brassware',
    ta: 'உலோகப் பொருட்கள்',
    hi: 'धातु शिल्प और पीतल',
    value: 'Metalwork & Brassware',
  },
  {
    id: 'jewelry',
    icon: '💍',
    en: 'Jewelry & Beadwork',
    ta: 'நகைகள் & மணி மாலைகள்',
    hi: 'गहने और मोती शिल्प',
    value: 'Jewelry & Beadwork',
  },
  {
    id: 'embroidery',
    icon: '🪡',
    en: 'Embroidery & Needlecraft',
    ta: 'தையல் & எம்பிராய்டரி',
    hi: 'कढ़ाई और सुई का काम',
    value: 'Embroidery & Needlecraft',
  },
  {
    id: 'painting',
    icon: '🎨',
    en: 'Traditional Folk Art',
    ta: 'பாரம்பரிய ஓவியங்கள்',
    hi: 'पारंपरिक लोक चित्रकला',
    value: 'Traditional Folk Art',
  },
  {
    id: 'leather',
    icon: '👞',
    en: 'Leather Goods',
    ta: 'தோல் கைவினைப் பொருட்கள்',
    hi: 'हस्तनिर्मित चमड़े का सामान',
    value: 'Leather Goods',
  },
  {
    id: 'other',
    icon: '✨',
    en: 'Other Craft',
    ta: 'மற்ற கைவினைப் பொருள்',
    hi: 'अन्य हस्तशिल्प',
    value: 'Other',
  },
];

export default function VoiceSignupScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { setPhone, refreshProfile, establishArtisanSession } = useAuth();

  const [currentStep, setCurrentStep] = useState(1); // 1 to 8 (8 is review)
  const totalSteps = 7;

  const [currentLang, setCurrentLang] = useState<AppLanguage>(getSelectedLanguage());
  const [isSpeaking, setIsSpeaking] = useState(false);

  // Form State
  const [phoneInput, setPhoneInput] = useState('');
  const [nameInput, setNameInput] = useState('');
  const [craftInput, setCraftInput] = useState('');
  const [locationInput, setLocationInput] = useState('');
  const [experienceInput, setExperienceInput] = useState('');
  const [photoUri, setPhotoUri] = useState('');
  const [brandInput, setBrandInput] = useState('');

  // ── Step 3 Craft Selection Picker State (Part 2) ──────────────────────────
  const [selectedCraftId, setSelectedCraftId] = useState<string>('');
  const [customCraftText, setCustomCraftText] = useState('');

  // ── Voice Recognition Detailed State (Part 2 - Name Step Only) ────────────
  const [voiceState, setVoiceState] = useState<SpeechRecognitionState>('idle');
  const [voiceStatusText, setVoiceStatusText] = useState('');
  const [voiceHeardText, setVoiceHeardText] = useState('');
  const [showVoiceConfirm, setShowVoiceConfirm] = useState(false);
  const [permissionBlocked, setPermissionBlocked] = useState(false);

  // ── Location Detailed State (Part 3) ───────────────────────────────────────
  type LocationStepState = 'prompt' | 'locating' | 'detected' | 'denied' | 'failed';
  const [locationState, setLocationState] = useState<LocationStepState>('prompt');
  const [locationSearchQuery, setLocationSearchQuery] = useState('');
  const [filteredClusters, setFilteredClusters] = useState(HANDICRAFT_REGIONS.slice(0, 8));

  // Submission state
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');

  const [fontsLoaded] = useFonts({
    Poppins_600SemiBold,
    Poppins_700Bold,
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
  });

  // Keep language in sync and firmly stored
  useEffect(() => {
    const lang = getSelectedLanguage();
    setCurrentLang(lang);
    setSelectedLanguage(lang).catch(() => {});
  }, []);

  // Filter clusters when search query changes
  useEffect(() => {
    setFilteredClusters(searchArtisanClusters(locationSearchQuery).slice(0, 10));
  }, [locationSearchQuery]);

  // ── Auto-speak prompt on step entry ───────────────────────────────────────
  const speakCurrentPrompt = useCallback(
    (stepNum: number, customText?: string) => {
      stopSpeech();
      setIsSpeaking(true);

      const stepKeys = [
        'step1_phone',
        'step2_name',
        'step3_craft',
        'step4_location',
        'step5_experience',
        'step6_photo',
        'step7_brand',
        'step8_review',
      ];
      const key = stepKeys[stepNum - 1] || 'step1_phone';
      const promptObj = PROMPTS[key]?.[currentLang] || PROMPTS[key]?.en;
      const textToSpeak = customText || promptObj?.audio || promptObj?.title;

      centralSpeak(textToSpeak, currentLang, {
        onDone: () => setIsSpeaking(false),
        onStopped: () => setIsSpeaking(false),
        onError: () => setIsSpeaking(false),
      });
    },
    [currentLang]
  );

  // Auto-play question on step load
  useEffect(() => {
    const timer = setTimeout(() => {
      if (currentStep === 8) {
        speakReviewSummary();
      } else {
        speakCurrentPrompt(currentStep);
      }
    }, 350);

    return () => {
      clearTimeout(timer);
      stopSpeech();
      stopSpeechRecognition();
    };
  }, [currentStep, currentLang]);

  // Clean up on unmount
  useEffect(() => {
    return () => {
      stopSpeech();
      stopSpeechRecognition();
    };
  }, []);

  // ── Voice Capture Helper for Step 2 (Name) ─────────────────────────────────
  const handleVoiceResult = (transcript: string) => {
    const clean = transcript.trim().replace(/[.,]$/, '');
    if (!clean) return;
    setVoiceState('idle');
    setVoiceHeardText(clean);
    setNameInput(clean);
    setShowVoiceConfirm(true);

    const confirmSpoken =
      currentLang === 'ta'
        ? `நாங்கள் கேட்டது: ${clean}. இது சரியானதா?`
        : currentLang === 'hi'
        ? `हमने सुना: ${clean}। क्या यह सही है?`
        : `We heard: ${clean}. Is this correct?`;

    centralSpeak(confirmSpoken, currentLang);
  };

  const toggleListeningForName = async () => {
    stopSpeech();
    setIsSpeaking(false);

    if (voiceState === 'listening' || voiceState === 'requesting_permission') {
      // User tapped while listening -> Stop immediately and transcribe!
      setVoiceState('processing');
      setVoiceStatusText(
        currentLang === 'ta'
          ? 'ஆடியோ ஆராய்கிறது...'
          : currentLang === 'hi'
          ? 'आवाज़ पहचानी जा रही है...'
          : 'Transcribing speech...'
      );
      await stopSpeechRecognition((transcript) => {
        if (transcript) {
          handleVoiceResult(transcript);
        }
      });
      return;
    }

    setVoiceHeardText('');
    setShowVoiceConfirm(false);
    setPermissionBlocked(false);

    const supported = isSpeechRecognitionSupported();
    if (!supported) {
      setVoiceState('error');
      setVoiceStatusText(
        currentLang === 'ta'
          ? 'இந்த சாதனத்தில் மைக் ஆதரவு இல்லை. கீழே தட்டச்சு செய்யவும்.'
          : currentLang === 'hi'
          ? 'माइक उपलब्ध नहीं है। कृपया नीचे टाइप करें।'
          : 'Microphone is not supported on this device. Please type below.'
      );
      return;
    }

    setVoiceState('requesting_permission');
    setVoiceStatusText(
      currentLang === 'ta'
        ? 'மைக் அணுகல் சரிபார்க்கிறது...'
        : currentLang === 'hi'
        ? 'माइक अनुमति जाँची जा रही है...'
        : 'Accessing microphone...'
    );

    const started = await startSpeechRecognition(
      {
        onStateChange: (state, message) => {
          setVoiceState(state);
          if (message) setVoiceStatusText(message);
        },
        onResult: (transcript: string) => {
          handleVoiceResult(transcript);
        },
        onError: (errorType, rawError) => {
          console.warn('[Speech Recognition Error]:', errorType, rawError);

          if (errorType === 'permission_denied') {
            setPermissionBlocked(true);
            setVoiceState('permission_denied');
            const permMsg =
              currentLang === 'ta'
                ? 'மைக் அனுமதி மறுக்கப்பட்டது. உலாவி அமைப்பில் மைக் அனுமதிக்கவும் அல்லது கீழே எழுதவும்.'
                : currentLang === 'hi'
                ? 'माइक की अनुमति नहीं मिली। कृपया ब्राउज़र में अनुमति दें या नीचे टाइप करें।'
                : 'Microphone permission blocked. Please allow microphone in browser settings or type below.';
            centralSpeak(permMsg, currentLang);
          } else if (errorType === 'timeout' || errorType === 'no_speech') {
            setVoiceState('no_speech');
            const retryMsg =
              currentLang === 'ta'
                ? 'நாங்கள் கேட்கவில்லை. மைக்-ஐ மீண்டும் தட்டிப் பேசவும்.'
                : currentLang === 'hi'
                ? 'सुनाई नहीं दिया। कृपया माइक दबाकर फिर से बोलें।'
                : "Didn't catch that. Please tap the microphone and speak again.";
            centralSpeak(retryMsg, currentLang);
          } else {
            setVoiceState('error');
          }
        },
        onEnd: () => {
          setVoiceState((prev) => (prev === 'listening' || prev === 'processing' ? 'idle' : prev));
        },
      },
      currentLang,
      9500
    );

    if (!started) {
      setVoiceState('error');
    }
  };

  const handleVoiceConfirmYes = (_field?: 'name' | 'craft') => {
    stopSpeech();
    setNameInput(voiceHeardText || nameInput);
    setShowVoiceConfirm(false);
    setVoiceHeardText('');
    setVoiceState('idle');
    goToNextStep();
  };

  const handleVoiceRetry = (_field?: 'name' | 'craft') => {
    stopSpeech();
    setShowVoiceConfirm(false);
    setVoiceHeardText('');
    setVoiceState('idle');
    toggleListeningForName();
  };

  // ── Step 3 Craft Picker Handlers (Part 2) ──────────────────────────────────
  const handleSelectCraftCategory = (category: CraftCategoryOption) => {
    stopSpeech();
    setSelectedCraftId(category.id);

    if (category.id === 'other') {
      setCraftInput(customCraftText);
      const otherPrompt =
        currentLang === 'ta'
          ? 'உங்கள் கைவினைப் பொருளின் பெயரை கீழே தட்டச்சு செய்யவும்.'
          : currentLang === 'hi'
          ? 'कृपया अपने शिल्प का नाम नीचे टाइप करें।'
          : 'Please type what you make below.';
      centralSpeak(otherPrompt, currentLang);
    } else {
      setCraftInput(category.value);
      const categoryLabel = category[currentLang] || category.en;
      const confirmSpoken =
        currentLang === 'ta'
          ? `${categoryLabel} தேர்ந்தெடுக்கப்பட்டது. தொடர அடுத்தது என்பதைத் தட்டவும்.`
          : currentLang === 'hi'
          ? `${categoryLabel} चुना गया। आगे बढ़ने के लिए अगला पर टैप करें।`
          : `Selected: ${categoryLabel}. Tap Next to continue.`;
      centralSpeak(confirmSpoken, currentLang);
    }
  };

  const handleCustomCraftChange = (text: string) => {
    setCustomCraftText(text);
    setCraftInput(text);
  };

  // ── Improved Location Detection (Part 3 Fixes) ─────────────────────────────
  const triggerAccurateLocation = async () => {
    stopSpeech();
    setLocationState('locating');

    const searchingText =
      currentLang === 'ta'
        ? 'உங்கள் ஊரைக் கண்டறிகிறது... தயவுசெய்து காத்திருக்கவும்.'
        : currentLang === 'hi'
        ? 'आपका स्थान खोजा जा रहा है... कृपया प्रतीक्षा करें।'
        : 'Detecting your location... please wait.';
    centralSpeak(searchingText, currentLang);

    const result = await detectUserLocationAccurate(12000); // 12-second high accuracy timeout

    if (result.success && result.location) {
      setLocationInput(result.location.displayName);
      setLocationState('detected');

      const confirmSpoken =
        currentLang === 'ta'
          ? `உங்கள் இருப்பிடம் கண்டறியப்பட்டது: ${result.location.displayName}. இது சரியானதா?`
          : currentLang === 'hi'
          ? `हमें आपका स्थान मिला: ${result.location.displayName}। क्या यह सही है?`
          : `We found your location: ${result.location.displayName}. Is this correct?`;

      centralSpeak(confirmSpoken, currentLang);
    } else {
      if (result.errorType === 'permission_denied') {
        setLocationState('denied');
        const deniedMsg =
          currentLang === 'ta'
            ? 'இருப்பிட அனுமதி மறுக்கப்பட்டது. கீழே உங்கள் மாவட்டம் அல்லது ஊரைத் தேர்ந்தெடுக்கவும்.'
            : currentLang === 'hi'
            ? 'स्थान की अनुमति नहीं दी गई। कृपया नीचे अपना ज़िला या गाँव चुनें।'
            : 'Location permission was denied. Please select your district or town below.';
        centralSpeak(deniedMsg, currentLang);
      } else {
        setLocationState('failed');
        const failMsg =
          currentLang === 'ta'
            ? 'இருப்பிடத்தைக் கண்டறிய முடியவில்லை. தயவுசெய்து கீழே உங்கள் ஊரைத் தேர்ந்தெடுக்கவும்.'
            : currentLang === 'hi'
            ? 'स्थान का पता नहीं चल सका। कृपया नीचे अपना ज़िला चुनें।'
            : 'Could not detect location. Please select your district or town below.';
        centralSpeak(failMsg, currentLang);
      }
    }
  };

  // ── Step 6 Camera Capture ──────────────────────────────────────────────────
  const handleCapturePhoto = async () => {
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(
          'Permission Needed',
          'Camera permission is needed to take a photo.'
        );
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ['images'],
        quality: 0.8,
        allowsEditing: false,
      });

      if (!result.canceled && result.assets[0]) {
        setPhotoUri(result.assets[0].uri);
        const feedback =
          currentLang === 'ta'
            ? 'புகைப்படம் சேர்க்கப்பட்டது. தொடர அடுத்தது என்பதைத் தட்டவும்.'
            : currentLang === 'hi'
            ? 'फोटो जोड़ दिया गया है। आगे बढ़ने के लिए अगला पर टैप करें।'
            : 'Photo captured! Tap Next to continue.';
        centralSpeak(feedback, currentLang);
      }
    } catch (err) {
      console.warn('[Camera error]:', err);
    }
  };

  // ── Step 8 Spoken Summary ──────────────────────────────────────────────────
  const buildSummaryText = () => {
    const expObj = EXPERIENCE_OPTIONS.find((e) => e.id === experienceInput);
    const expText = expObj ? expObj[currentLang] || expObj.en : experienceInput;

    if (currentLang === 'ta') {
      return `உங்கள் பெயர் ${nameInput || 'வழங்கப்படவில்லை'}. நீங்கள் செய்வது ${
        craftInput || 'கைவினை'
      }. உங்கள் ஊர் ${locationInput}. உங்களுக்கு ${expText} அனுபவம் உள்ளது. பதிவு செய்ய சமர்ப்பிக்கவும் என்பதைத் தட்டவும்.`;
    }
    if (currentLang === 'hi') {
      return `आपका नाम ${nameInput || 'नहीं बताया'} है। आप ${
        craftInput || 'हस्तशिल्प'
      } बनाते हैं। आपका स्थान ${locationInput} है। आपके पास ${expText} का अनुभव है। पूरा करने के लिए सबमिट दबाएं।`;
    }
    return `Your name is ${nameInput}, you sell ${craftInput}, you are located in ${locationInput}, with ${expText} experience. Tap Submit to finish your registration.`;
  };

  const speakReviewSummary = () => {
    stopSpeech();
    setIsSpeaking(true);
    const summary = buildSummaryText();
    centralSpeak(summary, currentLang, {
      onDone: () => setIsSpeaking(false),
      onStopped: () => setIsSpeaking(false),
      onError: () => setIsSpeaking(false),
    });
  };

  // ── Navigation Between Steps ───────────────────────────────────────────────
  const canGoNext = (): boolean => {
    switch (currentStep) {
      case 1:
        return phoneInput.trim().replace(/[^0-9]/g, '').length >= 10;
      case 2:
        return nameInput.trim().length >= 2;
      case 3:
        return craftInput.trim().length >= 2;
      case 4:
        return locationInput.trim().length >= 2;
      case 5:
        return experienceInput.length > 0;
      case 6:
        return true; // Optional photo
      case 7:
        return true; // Optional brand name
      case 8:
        return true; // Review
      default:
        return false;
    }
  };

  const goToNextStep = () => {
    stopSpeech();
    stopSpeechRecognition();
    setShowVoiceConfirm(false);
    setVoiceHeardText('');
    setVoiceState('idle');

    if (currentStep < 8) {
      setCurrentStep((prev) => prev + 1);
    } else {
      handleSubmitProfile();
    }
  };

  const goToPrevStep = () => {
    stopSpeech();
    stopSpeechRecognition();
    setShowVoiceConfirm(false);
    setVoiceHeardText('');
    setVoiceState('idle');

    if (currentStep > 1) {
      setCurrentStep((prev) => prev - 1);
    }
  };

  // ── Final Profile Submission ───────────────────────────────────────────────
  const handleSubmitProfile = async () => {
    setIsSubmitting(true);
    setSubmitError('');

    try {
      const cleanPhone = phoneInput.trim().replace(/[^0-9]/g, '');
      const expObj = EXPERIENCE_OPTIONS.find((e) => e.id === experienceInput);
      const experienceLabel = expObj ? expObj.en : experienceInput;

      const payload = {
        phone: cleanPhone,
        name: nameInput.trim(),
        shop_name: brandInput.trim() || undefined,
        role: 'artisan',
        craft_type: craftInput.trim(),
        craft_custom: craftInput.trim(),
        location: locationInput.trim(),
        bio: `Experience: ${experienceLabel}`,
        avatar_url: photoUri || undefined,
        language: currentLang === 'ta' ? 'Tamil' : currentLang === 'hi' ? 'Hindi' : 'English',
        is_onboarded: 1,
      };

      const resp = await fetch(`${BACKEND_URL}/api/profiles`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify(payload),
      });

      const data = await resp.json();
      if (!resp.ok) {
        throw new Error(data.error || data.detail || 'Failed to save profile');
      }

      setPhone(cleanPhone);

      // Part 3 Fix: Lock in language selection so language selector is never shown again
      await setSelectedLanguage(currentLang);

      // Part 3 Fix: Establish authenticated artisan session in AuthContext & AsyncStorage
      await establishArtisanSession({
        id: data.profile?.id || data.id,
        phone: cleanPhone,
        name: nameInput.trim(),
        shop_name: brandInput.trim() || undefined,
        craft_type: craftInput.trim(),
        craft_custom: craftInput.trim(),
        location: locationInput.trim(),
        bio: `Experience: ${experienceLabel}`,
        avatar_url: photoUri || undefined,
        language: currentLang === 'ta' ? 'Tamil' : currentLang === 'hi' ? 'Hindi' : 'English',
        is_onboarded: true,
      });

      await refreshProfile();

      const successMsg =
        currentLang === 'ta'
          ? 'உங்கள் பதிவு வெற்றிகரமாக முடிந்தது! நல்வரவு!'
          : currentLang === 'hi'
          ? 'आपका पंजीकरण सफलतापूर्वक पूरा हुआ! कला उद्यम में आपका स्वागत है!'
          : 'Your account is ready! Welcome to Kala Udyam!';

      centralSpeak(successMsg, currentLang, {
        onDone: () => router.replace('/'),
      });

      setTimeout(() => {
        router.replace('/');
      }, 1800);
    } catch (err: any) {
      console.warn('[Signup submit error]:', err);
      setSubmitError(err?.message || 'Something went wrong. Please retry.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!fontsLoaded) return null;

  // ── Helper Text ────────────────────────────────────────────────────────────
  const stepKey = [
    'step1_phone',
    'step2_name',
    'step3_craft',
    'step4_location',
    'step5_experience',
    'step6_photo',
    'step7_brand',
    'step8_review',
  ][currentStep - 1];
  const promptData = PROMPTS[stepKey]?.[currentLang] || PROMPTS[stepKey]?.en;

  const nextBtnLabel =
    currentStep === 8
      ? currentLang === 'ta'
        ? 'பதிவு முடித்து சமர்ப்பிக்கவும்'
        : currentLang === 'hi'
        ? 'सबमिट करें'
        : 'Confirm & Submit'
      : currentLang === 'ta'
      ? 'அடுத்தது →'
      : currentLang === 'hi'
      ? 'अगला →'
      : 'Next →';

  const skipBtnLabel =
    currentLang === 'ta' ? 'தவிர்க்கவும்' : currentLang === 'hi' ? 'छोड़ें' : 'Skip';

  return (
    <SafeAreaView style={styles.root}>
      <StatusBar barStyle="dark-content" backgroundColor={BG} />

      {/* ── Top Bar ──────────────────────────────────────────────────────── */}
      <View style={[styles.topBar, { paddingTop: insets.top + 8 }]}>
        <View style={styles.topLeft}>
          {currentStep > 1 && (
            <TouchableOpacity
              style={styles.backBtn}
              onPress={goToPrevStep}
              activeOpacity={0.7}
              accessibilityLabel="Back to previous step"
            >
              <ArrowLeft size={22} color="#1A1A1A" strokeWidth={2.2} />
            </TouchableOpacity>
          )}
          <View style={styles.stepBadge}>
            <Text style={styles.stepBadgeText}>
              {currentStep <= 7
                ? `${
                    currentLang === 'ta'
                      ? 'படி'
                      : currentLang === 'hi'
                      ? 'चरण'
                      : 'Step'
                  } ${currentStep} / ${totalSteps}`
                : currentLang === 'ta'
                ? 'சரிபார்த்தல்'
                : currentLang === 'hi'
                ? 'पुष्टि'
                : 'Review'}
            </Text>
          </View>
        </View>

        <View style={styles.topRight}>
          {/* Audio repeat button */}
          <TouchableOpacity
            style={[
              styles.audioRepeatBtn,
              isSpeaking && styles.audioRepeatBtnActive,
            ]}
            onPress={() => {
              if (isSpeaking) {
                stopSpeech();
                setIsSpeaking(false);
              } else {
                if (currentStep === 8) speakReviewSummary();
                else speakCurrentPrompt(currentStep);
              }
            }}
            activeOpacity={0.8}
            accessibilityLabel="Listen again"
          >
            {isSpeaking ? (
              <Square size={16} color="#FFFFFF" fill="#FFFFFF" />
            ) : (
              <Volume2 size={18} color="#FFFFFF" strokeWidth={2.2} />
            )}
            <Text style={styles.audioRepeatText}>
              {isSpeaking
                ? currentLang === 'ta'
                  ? 'நிறுத்து'
                  : currentLang === 'hi'
                  ? 'रोकें'
                  : 'Stop'
                : currentLang === 'ta'
                ? 'கேட்க'
                : currentLang === 'hi'
                ? 'सुनें'
                : 'Listen'}
            </Text>
          </TouchableOpacity>

          {/* Change Language accessible pill */}
          <TouchableOpacity
            style={styles.langPill}
            onPress={() =>
              router.push({
                pathname: '/select-language',
                params: { canGoBack: 'true' },
              })
            }
            activeOpacity={0.8}
            accessibilityLabel="Change Language"
          >
            <Globe size={14} color="#3D3428" strokeWidth={2} />
            <Text style={styles.langPillText}>
              {currentLang === 'ta'
                ? 'தமிழ்'
                : currentLang === 'hi'
                ? 'हिंदी'
                : 'English'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* ── Progress Bar ─────────────────────────────────────────────────── */}
      <View style={styles.progressTrack}>
        <View
          style={[
            styles.progressFill,
            { width: `${Math.min(100, (currentStep / totalSteps) * 100)}%` },
          ]}
        />
      </View>

      {/* ── Main Step Content ────────────────────────────────────────────── */}
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: insets.bottom + 100 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* Step Question Header */}
        <View style={styles.questionHeader}>
          <Text style={styles.questionTitle}>{promptData?.title}</Text>
          <Text style={styles.questionSub}>{promptData?.subtitle}</Text>
        </View>

        {/* ════════════ STEP 1: PHONE NUMBER ════════════ */}
        {currentStep === 1 && (
          <View style={styles.cardContainer}>
            <View style={styles.inputCard}>
              <View style={styles.phoneInputRow}>
                <View style={styles.countryPrefix}>
                  <Text style={styles.countryPrefixText}>🇮🇳 +91</Text>
                </View>
                <TextInput
                  style={styles.largePhoneInput}
                  placeholder="98765 43210"
                  placeholderTextColor="#9CA3AF"
                  keyboardType="phone-pad"
                  value={phoneInput}
                  onChangeText={setPhoneInput}
                  maxLength={10}
                  autoFocus
                />
              </View>
            </View>
            <Text style={styles.hintText}>
              {currentLang === 'ta'
                ? 'உங்கள் கணக்கை உருவாக்க இந்த எண் பயன்படுத்தப்படும்.'
                : currentLang === 'hi'
                ? 'यह नंबर आपके कारीगर खाते के लिए उपयोग किया जाएगा।'
                : 'This number will be used to create your artisan account.'}
            </Text>
          </View>
        )}

        {/* ════════════ STEP 2: NAME (VOICE + TEXT INPUT) ════════════ */}
        {currentStep === 2 && (
          <View style={styles.cardContainer}>
            {!showVoiceConfirm && (
              <View style={styles.voicePromptCard}>
                {/* Visual Mic Button with Tap-to-Start / Tap-to-Stop */}
                <TouchableOpacity
                  style={[
                    styles.largeMicButton,
                    (voiceState === 'listening' || voiceState === 'requesting_permission') && styles.largeMicButtonActive,
                    voiceState === 'processing' && styles.largeMicButtonProcessing,
                    (voiceState === 'no_speech' || voiceState === 'permission_denied') && styles.largeMicButtonError,
                  ]}
                  onPress={toggleListeningForName}
                  activeOpacity={0.85}
                  accessibilityLabel={voiceState === 'listening' ? 'Tap to finish speaking' : 'Tap to speak your name'}
                >
                  {voiceState === 'processing' ? (
                    <ActivityIndicator size="large" color="#FFFFFF" />
                  ) : voiceState === 'listening' ? (
                    <Square size={38} color="#FFFFFF" fill="#FFFFFF" />
                  ) : (
                    <Mic
                      size={46}
                      color="#FFFFFF"
                      strokeWidth={2.4}
                    />
                  )}
                </TouchableOpacity>

                {/* State Label Message */}
                <View style={styles.stateMessageContainer}>
                  {voiceState === 'listening' && (
                    <View style={styles.listeningBadge}>
                      <View style={styles.pulseDot} />
                      <Text style={styles.listeningBadgeText}>
                        {currentLang === 'ta'
                          ? 'கேட்கிறது... பேசி முடித்ததும் தட்டவும் ⏹️'
                          : currentLang === 'hi'
                          ? 'सुन रहा है... बोलने के बाद यहाँ टैप करें ⏹️'
                          : 'Listening... Tap here when done speaking ⏹️'}
                      </Text>
                    </View>
                  )}

                  {voiceState === 'processing' && (
                    <Text style={styles.processingStateText}>
                      {currentLang === 'ta'
                        ? 'ஒலி பதிவு செய்யப்படுகிறது...'
                        : currentLang === 'hi'
                        ? 'आवाज़ पहचानी जा रही है...'
                        : 'Transcribing speech...'}
                    </Text>
                  )}

                  {voiceState === 'no_speech' && (
                    <View style={styles.retryPromptBox}>
                      <AlertCircle size={18} color="#C0392B" />
                      <Text style={styles.retryPromptText}>
                        {currentLang === 'ta'
                          ? 'கேட்கவில்லை — மீண்டும் மைக் தட்டவும்'
                          : currentLang === 'hi'
                          ? 'सुनाई नहीं दिया — फिर से बोलें'
                          : "Didn't catch that — tap mic to try again"}
                      </Text>
                    </View>
                  )}

                  {voiceState === 'permission_denied' && (
                    <View style={styles.permErrorBox}>
                      <AlertCircle size={18} color="#C0392B" />
                      <Text style={styles.permErrorText}>
                        {currentLang === 'ta'
                          ? 'மைக் அணுகல் தடுக்கப்பட்டுள்ளது. உலாவி அமைப்பில் அனுமதிக்கவும் அல்லது கீழே எழுதவும்.'
                          : currentLang === 'hi'
                          ? 'माइक की अनुमति नहीं मिली। कृपया ब्राउज़र में अनुमति दें या नीचे लिखें।'
                          : 'Microphone permission blocked. Please enable it in browser or type below.'}
                      </Text>
                    </View>
                  )}

                  {voiceState === 'idle' && (
                    <Text style={styles.micStatusText}>
                      {currentLang === 'ta'
                        ? 'பெயர் சொல்ல மைக்-ஐத் தட்டவும்'
                        : currentLang === 'hi'
                        ? 'नाम बोलने के लिए माइक दबाएं'
                        : 'Tap microphone to speak'}
                    </Text>
                  )}
                </View>

                {/* Always-visible direct keyboard fallback input */}
                <View style={styles.inlineTypeCard}>
                  <View style={styles.typeHeaderRow}>
                    <Edit3 size={15} color="#524636" />
                    <Text style={styles.typeHeaderLabel}>
                      {currentLang === 'ta'
                        ? 'அல்லது தட்டச்சு செய்யவும்:'
                        : currentLang === 'hi'
                        ? 'या कीबोर्ड से लिखें:'
                        : 'Or type your name below:'}
                    </Text>
                  </View>
                  <TextInput
                    style={styles.cleanTextInput}
                    placeholder={
                      currentLang === 'ta'
                        ? 'உங்கள் முழுப் பெயர்'
                        : currentLang === 'hi'
                        ? 'आपका पूरा नाम'
                        : 'Your Full Name'
                    }
                    placeholderTextColor="#9CA3AF"
                    value={nameInput}
                    onChangeText={setNameInput}
                  />
                </View>
              </View>
            )}

            {/* Voice Confirmation Card: "We heard: Ram Kumar — is this correct?" */}
            {showVoiceConfirm && (
              <View style={styles.confirmCard}>
                <Text style={styles.confirmLabel}>
                  {currentLang === 'ta'
                    ? 'நாங்கள் கேட்டது:'
                    : currentLang === 'hi'
                    ? 'हमने सुना:'
                    : 'We heard:'}
                </Text>
                <View style={styles.heardBox}>
                  <Text style={styles.heardText}>"{voiceHeardText}"</Text>
                </View>
                <Text style={styles.confirmQuestion}>
                  {currentLang === 'ta'
                    ? 'இது சரியானதா?'
                    : currentLang === 'hi'
                    ? 'क्या यह सही है?'
                    : 'Is this correct?'}
                </Text>

                <View style={styles.confirmBtnRow}>
                  <TouchableOpacity
                    style={styles.retryBtn}
                    onPress={() => handleVoiceRetry('name')}
                    activeOpacity={0.8}
                  >
                    <RotateCcw size={18} color="#C0392B" strokeWidth={2.2} />
                    <Text style={styles.retryBtnText}>
                      {currentLang === 'ta'
                        ? 'மீண்டும் சொல்ல'
                        : currentLang === 'hi'
                        ? 'फिर से बोलें'
                        : 'Retry'}
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.yesBtn}
                    onPress={() => handleVoiceConfirmYes('name')}
                    activeOpacity={0.85}
                  >
                    <Check size={20} color="#FFFFFF" strokeWidth={2.4} />
                    <Text style={styles.yesBtnText}>
                      {currentLang === 'ta'
                        ? 'ஆம், சரியானது'
                        : currentLang === 'hi'
                        ? 'हाँ, सही है'
                        : 'Yes, Correct'}
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}
          </View>
        )}

        {/* ════════════ STEP 3: WHAT THEY SELL (VISUAL PICKER + OTHER) ════════════ */}
        {currentStep === 3 && (
          <View style={styles.cardContainer}>
            {/* Header with audio prompt button */}
            <View style={styles.categoryHeaderCard}>
              <Text style={styles.categorySectionTitle}>
                {currentLang === 'ta'
                  ? 'ஒரு கைவினைப் பிரிவைத் தேர்ந்தெடுக்கவும்:'
                  : currentLang === 'hi'
                  ? 'एक शिल्प श्रेणी चुनें:'
                  : 'Choose your craft category:'}
              </Text>
              <TouchableOpacity
                style={styles.categoryListenBtn}
                onPress={() => speakCurrentPrompt(3)}
                activeOpacity={0.7}
                accessibilityLabel="Listen to categories"
              >
                <Volume2 size={16} color={EMERALD} />
                <Text style={styles.categoryListenText}>
                  {currentLang === 'ta' ? 'கேட்க' : currentLang === 'hi' ? 'सुनें' : 'Listen'}
                </Text>
              </TouchableOpacity>
            </View>

            {/* Grid of large tappable craft categories */}
            <View style={styles.craftGrid}>
              {CRAFT_CATEGORIES.map((cat) => {
                const isSelected = selectedCraftId === cat.id;
                const titleText = cat[currentLang] || cat.en;
                const subText = currentLang !== 'en' ? cat.en : '';

                return (
                  <TouchableOpacity
                    key={cat.id}
                    style={[
                      styles.craftCard,
                      isSelected && styles.craftCardSelected,
                    ]}
                    onPress={() => handleSelectCraftCategory(cat)}
                    activeOpacity={0.8}
                    accessibilityLabel={titleText}
                    accessibilityRole="button"
                    accessibilityState={{ selected: isSelected }}
                  >
                    {isSelected && (
                      <View style={styles.craftSelectedBadge}>
                        <Check size={14} color="#FFFFFF" strokeWidth={3} />
                      </View>
                    )}
                    <Text style={styles.craftEmoji}>{cat.icon}</Text>
                    <Text
                      style={[
                        styles.craftCardTitle,
                        isSelected && styles.craftCardTitleSelected,
                      ]}
                      numberOfLines={2}
                    >
                      {titleText}
                    </Text>
                    {subText ? (
                      <Text
                        style={[
                          styles.craftCardSub,
                          isSelected && styles.craftCardSubSelected,
                        ]}
                        numberOfLines={1}
                      >
                        {subText}
                      </Text>
                    ) : null}
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* When "Other" is selected: Reveal simple text input box */}
            {selectedCraftId === 'other' && (
              <View style={styles.otherInputCard}>
                <View style={styles.otherInputHeaderRow}>
                  <Edit3 size={18} color={EMERALD} />
                  <Text style={styles.otherInputLabel}>
                    {currentLang === 'ta'
                      ? 'உங்கள் கைவினைப் பொருளின் பெயரை எழுதவும்:'
                      : currentLang === 'hi'
                      ? 'अपने शिल्प का नाम यहाँ टाइप करें:'
                      : 'Type your craft name below:'}
                  </Text>
                </View>
                <TextInput
                  style={styles.otherTextInput}
                  placeholder={
                    currentLang === 'ta'
                      ? 'எ.கா. சோழமண்டல ஓவியங்கள், பாய் முடைதல்...'
                      : currentLang === 'hi'
                      ? 'उदा. टेराकोटा मूर्तियां, दरी बुनाई...'
                      : 'e.g. Terracotta toys, Wool shawls...'
                  }
                  placeholderTextColor="#9CA3AF"
                  value={customCraftText}
                  onChangeText={handleCustomCraftChange}
                  autoFocus
                  returnKeyType="done"
                />
              </View>
            )}
          </View>
        )}

        {/* ════════════ STEP 4: LOCATION (ACCURATE + SEARCHABLE) ════════════ */}
        {currentStep === 4 && (
          <View style={styles.cardContainer}>
            {/* Auto-detect trigger button (Does not intrusive-prompt on entry) */}
            <View style={styles.locationActionCard}>
              {locationState === 'locating' ? (
                <View style={styles.locatingBox}>
                  <ActivityIndicator size="large" color={EMERALD} />
                  <Text style={styles.locatingText}>
                    {currentLang === 'ta'
                      ? 'துல்லியமான இருப்பிடத்தைக் கண்டறிகிறது...'
                      : currentLang === 'hi'
                      ? 'सटीक स्थान का पता लगाया जा रहा है...'
                      : 'Finding your exact location with GPS...'}
                  </Text>
                </View>
              ) : (
                <TouchableOpacity
                  style={styles.findLocationBigBtn}
                  onPress={triggerAccurateLocation}
                  activeOpacity={0.88}
                >
                  <View style={styles.findLocIconCircle}>
                    <Navigation size={26} color="#FFFFFF" strokeWidth={2.3} />
                  </View>
                  <View style={styles.findLocTextCol}>
                    <Text style={styles.findLocTitle}>
                      {currentLang === 'ta'
                        ? '📍 என் ஊரைக் கண்டுபிடி'
                        : currentLang === 'hi'
                        ? '📍 मेरा स्थान खोजें'
                        : '📍 Find My Location'}
                    </Text>
                    <Text style={styles.findLocSub}>
                      {currentLang === 'ta'
                        ? 'ஜிபிஎஸ் மூலம் உங்கள் கிராமம் / மாவட்டத்தைக் கண்டறிய'
                        : currentLang === 'hi'
                        ? 'जीपीएस से अपने गाँव या ज़िले का पता लगाएं'
                        : 'Auto-detect village & district via GPS'}
                    </Text>
                  </View>
                </TouchableOpacity>
              )}

              {/* Location Detected Success Box */}
              {locationState === 'detected' && locationInput && (
                <View style={styles.detectedSuccessBox}>
                  <View style={styles.detectedHeaderRow}>
                    <View style={styles.locCheckCircle}>
                      <Check size={16} color="#FFFFFF" strokeWidth={3} />
                    </View>
                    <Text style={styles.detectedHeaderLabel}>
                      {currentLang === 'ta'
                        ? 'கண்டறியப்பட்ட இருப்பிடம்:'
                        : currentLang === 'hi'
                        ? 'पाया गया स्थान:'
                        : 'Detected Location:'}
                    </Text>
                  </View>
                  <Text style={styles.detectedPlaceName}>{locationInput}</Text>
                  <Text style={styles.detectedHint}>
                    {currentLang === 'ta'
                      ? 'இது தவறாக இருந்தால், கீழே மாற்றலாம்.'
                      : currentLang === 'hi'
                      ? 'यदि यह गलत है, तो आप नीचे बदल सकते हैं।'
                      : 'If this is inaccurate, select or type your area below.'}
                  </Text>
                </View>
              )}

              {/* Permission Denied Notice */}
              {locationState === 'denied' && (
                <View style={styles.locAlertNotice}>
                  <AlertCircle size={18} color="#C0392B" />
                  <Text style={styles.locAlertNoticeText}>
                    {currentLang === 'ta'
                      ? 'இருப்பிட அனுமதி மறுக்கப்பட்டது. கீழே உங்கள் மாவட்டம் அல்லது ஊரைத் தேர்ந்தெடுக்கவும்.'
                      : currentLang === 'hi'
                      ? 'स्थान अनुमति अस्वीकृत। कृपया नीचे अपना ज़िला चुनें।'
                      : 'Location permission denied. Please choose your district below.'}
                  </Text>
                </View>
              )}

              {/* Timeout / GPS Weak Notice */}
              {locationState === 'failed' && (
                <View style={styles.locAlertNotice}>
                  <AlertCircle size={18} color="#C0392B" />
                  <Text style={styles.locAlertNoticeText}>
                    {currentLang === 'ta'
                      ? 'ஜிபிஎஸ் தாமதமானது. கீழே உள்ள பட்டியலில் உங்கள் பகுதியைத் தேர்ந்தெடுக்கவும்.'
                      : currentLang === 'hi'
                      ? 'जीपीएस संकेत धीमा है। कृपया नीचे सूची में से चुनें।'
                      : 'GPS timed out or unavailable. Please select your area below.'}
                  </Text>
                </View>
              )}
            </View>

            {/* Always Visible Searchable District / Village Picker */}
            <View style={styles.manualLocationSection}>
              <Text style={styles.manualLocSectionTitle}>
                {currentLang === 'ta'
                  ? 'ஊர் அல்லது மாவட்டம் தேர்வு செய்க:'
                  : currentLang === 'hi'
                  ? 'गाँव या ज़िला चुनें / खोजें:'
                  : 'Select or Search Your Craft Region:'}
              </Text>

              {/* Search Box */}
              <View style={styles.searchBarWrap}>
                <Search size={18} color="#7A6F62" />
                <TextInput
                  style={styles.searchBarInput}
                  placeholder={
                    currentLang === 'ta'
                      ? 'ஊர் அல்லது மாவட்டம் தேடுக (எ.கா. தஞ்சாவூர்)...'
                      : currentLang === 'hi'
                      ? 'ज़िला या गाँव खोजें (उदा. बनारस, जयपुर)...'
                      : 'Search district or craft (e.g. Thanjavur, Varanasi)...'
                  }
                  placeholderTextColor="#9CA3AF"
                  value={locationSearchQuery}
                  onChangeText={(txt) => {
                    setLocationSearchQuery(txt);
                    setLocationInput(txt);
                  }}
                />
              </View>

              {/* Filtered Clusters Pills */}
              <View style={styles.clusterPillsContainer}>
                {filteredClusters.map((cluster) => {
                  const isMatch = locationInput.toLowerCase().includes(cluster.name.toLowerCase());
                  return (
                    <TouchableOpacity
                      key={cluster.name}
                      style={[
                        styles.clusterOptionPill,
                        isMatch && styles.clusterOptionPillActive,
                      ]}
                      onPress={() => {
                        const newPlace = `${cluster.name}, ${cluster.state}`;
                        setLocationInput(newPlace);
                        centralSpeak(newPlace, currentLang);
                      }}
                      activeOpacity={0.8}
                    >
                      <MapPin
                        size={13}
                        color={isMatch ? '#FFFFFF' : EMERALD}
                        strokeWidth={2}
                      />
                      <Text
                        style={[
                          styles.clusterOptionText,
                          isMatch && styles.clusterOptionTextActive,
                        ]}
                      >
                        {cluster.name}
                      </Text>
                      <Text
                        style={[
                          styles.clusterCraftSub,
                          isMatch && styles.clusterCraftSubActive,
                        ]}
                      >
                        ({cluster.craft})
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              {/* Selected Location Confirmation Feedback */}
              {locationInput ? (
                <View style={styles.selectedLocCard}>
                  <Text style={styles.selectedLocLabel}>
                    {currentLang === 'ta' ? 'தேர்ந்தெடுக்கப்பட்ட ஊர்:' : currentLang === 'hi' ? 'चुना गया स्थान:' : 'Selected Location:'}
                  </Text>
                  <Text style={styles.selectedLocVal}>{locationInput}</Text>
                </View>
              ) : null}
            </View>
          </View>
        )}

        {/* ════════════ STEP 5: EXPERIENCE (TAPPABLE CARDS) ════════════ */}
        {currentStep === 5 && (
          <View style={styles.cardContainer}>
            <View style={styles.expGrid}>
              {EXPERIENCE_OPTIONS.map((opt) => {
                const isSelected = experienceInput === opt.id;
                const label = opt[currentLang] || opt.en;

                return (
                  <TouchableOpacity
                    key={opt.id}
                    style={[
                      styles.expCard,
                      isSelected && styles.expCardSelected,
                    ]}
                    onPress={() => {
                      setExperienceInput(opt.id);
                      centralSpeak(label, currentLang);
                    }}
                    activeOpacity={0.85}
                  >
                    <View style={styles.expIconRow}>
                      <Briefcase
                        size={22}
                        color={isSelected ? EMERALD : '#7A6F62'}
                      />
                      <View
                        style={[
                          styles.radioCircle,
                          isSelected && styles.radioCircleActive,
                        ]}
                      >
                        {isSelected && <View style={styles.radioDot} />}
                      </View>
                    </View>
                    <Text
                      style={[
                        styles.expCardText,
                        isSelected && styles.expCardTextSelected,
                      ]}
                    >
                      {label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        )}

        {/* ════════════ STEP 6: PHOTO (OPTIONAL) ════════════ */}
        {currentStep === 6 && (
          <View style={styles.cardContainer}>
            <View style={styles.photoContainerCard}>
              {photoUri ? (
                <View style={styles.photoPreviewWrap}>
                  <Image source={{ uri: photoUri }} style={styles.photoImg} />
                  <TouchableOpacity
                    style={styles.retakePhotoBtn}
                    onPress={handleCapturePhoto}
                    activeOpacity={0.8}
                  >
                    <RotateCcw size={16} color="#FFFFFF" />
                    <Text style={styles.retakeText}>
                      {currentLang === 'ta'
                        ? 'மீண்டும் படம் எடுக்க'
                        : currentLang === 'hi'
                        ? 'फिर से फोटो लें'
                        : 'Retake'}
                    </Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <TouchableOpacity
                  style={styles.cameraBox}
                  onPress={handleCapturePhoto}
                  activeOpacity={0.85}
                >
                  <View style={styles.cameraIconCircle}>
                    <Camera size={40} color="#FFFFFF" strokeWidth={2} />
                  </View>
                  <Text style={styles.cameraBoxTitle}>
                    {currentLang === 'ta'
                      ? 'கேமராவைத் திறக்கவும்'
                      : currentLang === 'hi'
                      ? 'कैमरा खोलें'
                      : 'Open Camera'}
                  </Text>
                  <Text style={styles.cameraBoxSub}>
                    {currentLang === 'ta'
                      ? 'உங்கள் அல்லது பொருளின் படம் எடுக்க தட்டவும்'
                      : currentLang === 'hi'
                      ? 'फोटो लेने के लिए यहाँ टैप करें'
                      : 'Tap to snap a quick photo'}
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        )}

        {/* ════════════ STEP 7: BRAND NAME (OPTIONAL) ════════════ */}
        {currentStep === 7 && (
          <View style={styles.cardContainer}>
            <View style={styles.inputCard}>
              <View style={styles.brandRow}>
                <Store size={22} color={EMERALD} />
                <TextInput
                  style={styles.largeTextInput}
                  placeholder={
                    currentLang === 'ta'
                      ? 'எ.கா. காவேரி கைவினைக்கூடம்'
                      : currentLang === 'hi'
                      ? 'उदा. बनारस कला केंद्र'
                      : 'e.g. Kaveri Handicrafts'
                  }
                  placeholderTextColor="#9CA3AF"
                  value={brandInput}
                  onChangeText={setBrandInput}
                  autoFocus
                />
              </View>
            </View>
            <Text style={styles.hintText}>
              {currentLang === 'ta'
                ? 'உங்களிடம் கடை பெயர் இல்லையென்றால், தவிர்க்கலாம்.'
                : currentLang === 'hi'
                ? 'यदि आपकी कोई दुकान नहीं है, तो आप इसे छोड़ सकते हैं।'
                : 'If you do not have a shop name, feel free to skip this step.'}
            </Text>
          </View>
        )}

        {/* ════════════ STEP 8: FINAL REVIEW SCREEN ════════════ */}
        {currentStep === 8 && (
          <View style={styles.cardContainer}>
            <View style={styles.reviewSummaryCard}>
              <View style={styles.reviewRow}>
                <Text style={styles.reviewLabel}>
                  {currentLang === 'ta'
                    ? 'பெயர்:'
                    : currentLang === 'hi'
                    ? 'नाम:'
                    : 'Name:'}
                </Text>
                <Text style={styles.reviewValue}>{nameInput}</Text>
              </View>

              <View style={styles.reviewDivider} />

              <View style={styles.reviewRow}>
                <Text style={styles.reviewLabel}>
                  {currentLang === 'ta'
                    ? 'கைவினை:'
                    : currentLang === 'hi'
                    ? 'शिल्प:'
                    : 'Craft:'}
                </Text>
                <Text style={styles.reviewValue}>{craftInput}</Text>
              </View>

              <View style={styles.reviewDivider} />

              <View style={styles.reviewRow}>
                <Text style={styles.reviewLabel}>
                  {currentLang === 'ta'
                    ? 'இருப்பிடம்:'
                    : currentLang === 'hi'
                    ? 'स्थान:'
                    : 'Location:'}
                </Text>
                <Text style={styles.reviewValue}>{locationInput}</Text>
              </View>

              <View style={styles.reviewDivider} />

              <View style={styles.reviewRow}>
                <Text style={styles.reviewLabel}>
                  {currentLang === 'ta'
                    ? 'அனுபவம்:'
                    : currentLang === 'hi'
                    ? 'अनुभव:'
                    : 'Experience:'}
                </Text>
                <Text style={styles.reviewValue}>
                  {EXPERIENCE_OPTIONS.find((e) => e.id === experienceInput)?.[
                    currentLang
                  ] ||
                    EXPERIENCE_OPTIONS.find((e) => e.id === experienceInput)
                      ?.en ||
                    experienceInput}
                </Text>
              </View>

              {brandInput ? (
                <>
                  <View style={styles.reviewDivider} />
                  <View style={styles.reviewRow}>
                    <Text style={styles.reviewLabel}>
                      {currentLang === 'ta'
                        ? 'பிராண்ட்:'
                        : currentLang === 'hi'
                        ? 'ब्रांड:'
                        : 'Brand:'}
                    </Text>
                    <Text style={styles.reviewValue}>{brandInput}</Text>
                  </View>
                </>
              ) : null}

              <View style={styles.reviewDivider} />

              <View style={styles.reviewRow}>
                <Text style={styles.reviewLabel}>
                  {currentLang === 'ta'
                    ? 'மொபைல்:'
                    : currentLang === 'hi'
                    ? 'मोबाइल:'
                    : 'Phone:'}
                </Text>
                <Text style={styles.reviewValue}>+91 {phoneInput}</Text>
              </View>
            </View>

            {submitError ? (
              <View style={styles.errorBox}>
                <Text style={styles.errorText}>{submitError}</Text>
              </View>
            ) : null}
          </View>
        )}
      </ScrollView>

      {/* ── Fixed Bottom Bar ─────────────────────────────────────────────── */}
      <View
        style={[
          styles.bottomBar,
          { paddingBottom: Math.max(insets.bottom, 16) },
        ]}
      >
        {/* Optional Skip Button on steps 6 & 7 */}
        {(currentStep === 6 || currentStep === 7) && (
          <TouchableOpacity
            style={styles.skipBtn}
            onPress={goToNextStep}
            activeOpacity={0.7}
          >
            <Text style={styles.skipBtnText}>{skipBtnLabel}</Text>
          </TouchableOpacity>
        )}

        {/* Primary Action Button */}
        <TouchableOpacity
          style={[
            styles.nextBtn,
            !canGoNext() && styles.nextBtnDisabled,
            isSubmitting && styles.nextBtnDisabled,
          ]}
          onPress={goToNextStep}
          disabled={!canGoNext() || isSubmitting}
          activeOpacity={0.88}
        >
          {isSubmitting ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <Text style={styles.nextBtnText}>{nextBtnLabel}</Text>
          )}
        </TouchableOpacity>
      </View>
    </SafeAreaView>
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
    paddingBottom: 10,
    backgroundColor: BG,
  },
  topLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  backBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#EAE3D2',
    justifyContent: 'center',
    alignItems: 'center',
  },
  stepBadge: {
    backgroundColor: '#E0D8C3',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
  },
  stepBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    fontFamily: Fonts.headingBold,
    color: '#3D3428',
  },
  topRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  audioRepeatBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: EMERALD,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    ...Shadow.card,
  },
  audioRepeatBtnActive: {
    backgroundColor: '#DC2626',
  },
  audioRepeatText: {
    fontSize: 12,
    fontWeight: '700',
    fontFamily: Fonts.headingBold,
    color: '#FFFFFF',
  },
  langPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#EAE3D2',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
  },
  langPillText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#3D3428',
  },

  /* Progress */
  progressTrack: {
    height: 4,
    backgroundColor: '#EAE3D2',
    width: '100%',
  },
  progressFill: {
    height: '100%',
    backgroundColor: EMERALD,
  },

  /* Scroll */
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 24,
  },

  /* Question Header */
  questionHeader: {
    marginBottom: 20,
    gap: 8,
  },
  questionTitle: {
    fontSize: 24,
    fontWeight: '700',
    fontFamily: Fonts.headingBold,
    color: '#1A1A1A',
    letterSpacing: -0.3,
    lineHeight: 32,
  },
  questionSub: {
    fontSize: 15,
    fontFamily: Fonts.body,
    color: '#6B7280',
    lineHeight: 22,
  },

  /* Card Containers */
  cardContainer: {
    gap: 16,
  },
  inputCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: '#EAE3D2',
    ...Shadow.card,
  },
  hintText: {
    fontSize: 13,
    fontFamily: Fonts.body,
    color: '#7A6F62',
    textAlign: 'center',
    paddingHorizontal: 10,
  },

  /* Phone input */
  phoneInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  countryPrefix: {
    backgroundColor: '#F5F0E8',
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderRadius: 14,
  },
  countryPrefixText: {
    fontSize: 16,
    fontWeight: '700',
    fontFamily: Fonts.headingBold,
    color: '#1A1A1A',
  },
  largePhoneInput: {
    flex: 1,
    fontSize: 22,
    fontWeight: '700',
    fontFamily: Fonts.headingBold,
    color: '#1A1A1A',
    letterSpacing: 2,
    paddingVertical: 8,
  },

  /* Step 3 Craft Category Selection Picker */
  categoryHeaderCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  categorySectionTitle: {
    fontSize: 15,
    fontFamily: Fonts.headingBold,
    fontWeight: '700',
    color: '#1F2937',
  },
  categoryListenBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#A7F3D0',
  },
  categoryListenText: {
    fontSize: 12,
    fontFamily: Fonts.headingBold,
    fontWeight: '700',
    color: EMERALD,
  },
  craftGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    rowGap: 12,
  },
  craftCard: {
    width: '48%',
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    paddingVertical: 16,
    paddingHorizontal: 12,
    minHeight: 112,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
    position: 'relative',
    ...Shadow.card,
  },
  craftCardSelected: {
    borderColor: EMERALD,
    backgroundColor: '#F0FDF4',
    borderWidth: 2.5,
    ...Platform.select({
      web: {
        boxShadow: '0 4px 14px rgba(5, 150, 105, 0.25)',
      },
      default: {
        elevation: 4,
      },
    }),
  },
  craftSelectedBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: EMERALD,
    alignItems: 'center',
    justifyContent: 'center',
  },
  craftEmoji: {
    fontSize: 32,
    marginBottom: 6,
  },
  craftCardTitle: {
    fontSize: 13.5,
    fontFamily: Fonts.headingBold,
    fontWeight: '700',
    color: '#1F2937',
    textAlign: 'center',
    lineHeight: 18,
  },
  craftCardTitleSelected: {
    color: EMERALD_DARK,
  },
  craftCardSub: {
    fontSize: 11,
    fontFamily: Fonts.body,
    color: '#6B7280',
    textAlign: 'center',
    marginTop: 2,
  },
  craftCardSubSelected: {
    color: '#047857',
  },
  otherInputCard: {
    marginTop: 6,
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 16,
    borderWidth: 1.5,
    borderColor: EMERALD,
    gap: 8,
    ...Shadow.card,
  },
  otherInputHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  otherInputLabel: {
    fontSize: 14,
    fontFamily: Fonts.headingBold,
    fontWeight: '700',
    color: '#1F2937',
  },
  otherTextInput: {
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: '#111827',
    fontFamily: Fonts.body,
  },

  /* Voice Prompt Card */
  voicePromptCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    paddingVertical: 28,
    paddingHorizontal: 20,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#EAE3D2',
    gap: 16,
    ...Shadow.card,
  },
  largeMicButton: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: EMERALD,
    justifyContent: 'center',
    alignItems: 'center',
    ...Platform.select({
      web: {
        cursor: 'pointer',
        boxShadow: '0 8px 24px rgba(5, 150, 105, 0.4)',
      },
      default: {
        elevation: 6,
      },
    }),
  },
  largeMicButtonActive: {
    backgroundColor: '#DC2626',
    transform: [{ scale: 1.08 }],
    ...Platform.select({
      web: {
        boxShadow: '0 8px 28px rgba(220, 38, 38, 0.5)',
      },
    }),
  },
  largeMicButtonProcessing: {
    backgroundColor: '#2563EB',
  },
  largeMicButtonError: {
    backgroundColor: '#B45309',
  },
  stateMessageContainer: {
    width: '100%',
    alignItems: 'center',
    minHeight: 36,
  },
  listeningBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#FEE2E2',
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 16,
  },
  pulseDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#DC2626',
  },
  listeningBadgeText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#DC2626',
  },
  processingStateText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2563EB',
  },
  retryPromptBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  retryPromptText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#92400E',
  },
  permErrorBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 6,
    backgroundColor: '#FEE2E2',
    padding: 10,
    borderRadius: 12,
    maxWidth: '94%',
  },
  permErrorText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#991B1B',
    flex: 1,
    lineHeight: 17,
  },
  micStatusText: {
    fontSize: 15,
    fontWeight: '600',
    fontFamily: Fonts.heading,
    color: '#4B5563',
    textAlign: 'center',
  },

  /* Inline Type fallback */
  inlineTypeCard: {
    width: '100%',
    backgroundColor: '#FAF7F2',
    borderRadius: 16,
    padding: 12,
    borderWidth: 1,
    borderColor: '#EAE3D2',
    marginTop: 6,
    gap: 6,
  },
  typeHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  typeHeaderLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#524636',
  },
  cleanTextInput: {
    fontSize: 16,
    fontFamily: Fonts.body,
    color: '#1A1A1A',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: '#EAE3D2',
  },

  /* Voice Confirmation Card */
  confirmCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#EAE3D2',
    gap: 14,
    ...Shadow.card,
  },
  confirmLabel: {
    fontSize: 14,
    fontWeight: '600',
    fontFamily: Fonts.heading,
    color: '#6B7280',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  heardBox: {
    backgroundColor: '#F0FDF4',
    borderWidth: 1.5,
    borderColor: '#BBF7D0',
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 20,
    width: '100%',
    alignItems: 'center',
  },
  heardText: {
    fontSize: 22,
    fontWeight: '700',
    fontFamily: Fonts.headingBold,
    color: EMERALD_DARK,
    textAlign: 'center',
  },
  confirmQuestion: {
    fontSize: 16,
    fontWeight: '600',
    fontFamily: Fonts.heading,
    color: '#1A1A1A',
  },
  confirmBtnRow: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
    marginTop: 8,
  },
  retryBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 14,
    borderRadius: 16,
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FECACA',
  },
  retryBtnText: {
    fontSize: 14,
    fontWeight: '700',
    fontFamily: Fonts.headingBold,
    color: '#C0392B',
  },
  yesBtn: {
    flex: 1.4,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 14,
    borderRadius: 16,
    backgroundColor: EMERALD,
    ...Shadow.card,
  },
  yesBtnText: {
    fontSize: 15,
    fontWeight: '700',
    fontFamily: Fonts.headingBold,
    color: '#FFFFFF',
  },

  /* Manual text input */
  largeTextInput: {
    fontSize: 18,
    fontFamily: Fonts.body,
    color: '#1A1A1A',
    paddingVertical: 8,
    flex: 1,
  },

  /* Location Step (Part 3) */
  locationActionCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 22,
    padding: 16,
    borderWidth: 1,
    borderColor: '#EAE3D2',
    gap: 14,
    ...Shadow.card,
  },
  findLocationBigBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    backgroundColor: '#F0FDF4',
    borderWidth: 1.5,
    borderColor: '#BBF7D0',
    borderRadius: 18,
    padding: 16,
  },
  findLocIconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: EMERALD,
    justifyContent: 'center',
    alignItems: 'center',
  },
  findLocTextCol: {
    flex: 1,
  },
  findLocTitle: {
    fontSize: 17,
    fontWeight: '700',
    fontFamily: Fonts.headingBold,
    color: EMERALD_DARK,
  },
  findLocSub: {
    fontSize: 12.5,
    fontFamily: Fonts.body,
    color: '#4B5563',
    marginTop: 2,
  },
  locatingBox: {
    alignItems: 'center',
    paddingVertical: 20,
    gap: 10,
  },
  locatingText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#4B5563',
  },
  detectedSuccessBox: {
    backgroundColor: '#F0FDF4',
    borderWidth: 1.5,
    borderColor: '#86EFAC',
    borderRadius: 16,
    padding: 16,
    gap: 6,
  },
  detectedHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  locCheckCircle: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: EMERALD,
    justifyContent: 'center',
    alignItems: 'center',
  },
  detectedHeaderLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: EMERALD_DARK,
    textTransform: 'uppercase',
  },
  detectedPlaceName: {
    fontSize: 18,
    fontWeight: '700',
    fontFamily: Fonts.headingBold,
    color: '#1A1A1A',
    marginTop: 2,
  },
  detectedHint: {
    fontSize: 12,
    fontFamily: Fonts.body,
    color: '#6B7280',
  },
  locAlertNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FECACA',
    borderRadius: 14,
    padding: 12,
  },
  locAlertNoticeText: {
    fontSize: 13,
    color: '#991B1B',
    flex: 1,
    lineHeight: 18,
  },

  /* Manual Location Searchable */
  manualLocationSection: {
    backgroundColor: '#FFFFFF',
    borderRadius: 22,
    padding: 18,
    borderWidth: 1,
    borderColor: '#EAE3D2',
    gap: 12,
    ...Shadow.card,
  },
  manualLocSectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    fontFamily: Fonts.headingBold,
    color: '#1A1A1A',
  },
  searchBarWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#F5F0E8',
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  searchBarInput: {
    flex: 1,
    fontSize: 14,
    color: '#1A1A1A',
  },
  clusterPillsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 4,
  },
  clusterOptionPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#F5F0E8',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#EAE3D2',
  },
  clusterOptionPillActive: {
    backgroundColor: EMERALD,
    borderColor: EMERALD_DARK,
  },
  clusterOptionText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#374151',
  },
  clusterOptionTextActive: {
    color: '#FFFFFF',
  },
  clusterCraftSub: {
    fontSize: 11,
    color: '#6B7280',
  },
  clusterCraftSubActive: {
    color: 'rgba(255, 255, 255, 0.85)',
  },
  selectedLocCard: {
    backgroundColor: '#F0FDF4',
    borderRadius: 12,
    padding: 10,
    marginTop: 4,
  },
  selectedLocLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: EMERALD_DARK,
  },
  selectedLocVal: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1A1A1A',
    marginTop: 2,
  },

  /* Experience options */
  expGrid: {
    gap: 12,
  },
  expCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 18,
    borderWidth: 1.5,
    borderColor: '#EAE3D2',
    gap: 10,
    ...Shadow.card,
  },
  expCardSelected: {
    borderColor: EMERALD,
    backgroundColor: '#F0FDF4',
  },
  expIconRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  radioCircle: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: '#D1D5DB',
    justifyContent: 'center',
    alignItems: 'center',
  },
  radioCircleActive: {
    borderColor: EMERALD,
  },
  radioDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: EMERALD,
  },
  expCardText: {
    fontSize: 17,
    fontWeight: '700',
    fontFamily: Fonts.headingBold,
    color: '#1A1A1A',
  },
  expCardTextSelected: {
    color: EMERALD_DARK,
  },

  /* Photo Step */
  photoContainerCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 24,
    borderWidth: 1,
    borderColor: '#EAE3D2',
    alignItems: 'center',
    ...Shadow.card,
  },
  cameraBox: {
    width: '100%',
    paddingVertical: 36,
    borderRadius: 20,
    backgroundColor: '#F5F0E8',
    borderWidth: 2,
    borderColor: '#D8CEBF',
    borderStyle: 'dashed',
    alignItems: 'center',
    gap: 12,
  },
  cameraIconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: EMERALD,
    justifyContent: 'center',
    alignItems: 'center',
    ...Shadow.card,
  },
  cameraBoxTitle: {
    fontSize: 18,
    fontWeight: '700',
    fontFamily: Fonts.headingBold,
    color: '#1A1A1A',
  },
  cameraBoxSub: {
    fontSize: 13,
    fontFamily: Fonts.body,
    color: '#6B7280',
  },
  photoPreviewWrap: {
    width: '100%',
    alignItems: 'center',
    gap: 14,
  },
  photoImg: {
    width: 200,
    height: 200,
    borderRadius: 16,
  },
  retakePhotoBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#374151',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 14,
  },
  retakeText: {
    fontSize: 13,
    fontWeight: '700',
    fontFamily: Fonts.headingBold,
    color: '#FFFFFF',
  },

  /* Brand step */
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },

  /* Review Step */
  reviewSummaryCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 20,
    borderWidth: 1,
    borderColor: '#EAE3D2',
    gap: 12,
    ...Shadow.card,
  },
  reviewRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 12,
  },
  reviewLabel: {
    fontSize: 14,
    fontWeight: '600',
    fontFamily: Fonts.heading,
    color: '#6B7280',
    flex: 1,
  },
  reviewValue: {
    fontSize: 16,
    fontWeight: '700',
    fontFamily: Fonts.headingBold,
    color: '#1A1A1A',
    flex: 1.8,
    textAlign: 'right',
  },
  reviewDivider: {
    height: 1,
    backgroundColor: '#F3F4F6',
  },
  errorBox: {
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FECACA',
    borderRadius: 14,
    padding: 12,
    alignItems: 'center',
  },
  errorText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#DC2626',
  },

  /* Bottom Bar */
  bottomBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 12,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#EAE3D2',
    gap: 12,
  },
  skipBtn: {
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 16,
    backgroundColor: '#F5EDE0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  skipBtnText: {
    fontSize: 14,
    fontWeight: '700',
    fontFamily: Fonts.headingBold,
    color: '#524636',
  },
  nextBtn: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 18,
    backgroundColor: EMERALD,
    alignItems: 'center',
    justifyContent: 'center',
    ...Platform.select({
      web: {
        cursor: 'pointer' as any,
        boxShadow: '0 4px 14px rgba(5, 150, 105, 0.35)',
      },
      default: {
        elevation: 3,
      },
    }),
  },
  nextBtnDisabled: {
    backgroundColor: '#9CA3AF',
    ...Platform.select({
      web: {
        cursor: 'not-allowed' as any,
        boxShadow: 'none',
      },
      default: {
        elevation: 0,
      },
    }),
  },
  nextBtnText: {
    fontSize: 16,
    fontWeight: '700',
    fontFamily: Fonts.headingBold,
    color: '#FFFFFF',
    letterSpacing: 0.3,
  },
});
