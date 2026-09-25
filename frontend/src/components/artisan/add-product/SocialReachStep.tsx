import React, { useEffect, useState } from 'react';
import { View, Text, Pressable, Switch, StyleSheet, Image, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import {
  Play,
  Mic,
  Subtitles,
  Music,
  Clock,
  Sparkles,
  Flower2,
  Leaf,
  ChevronRight,
} from 'lucide-react-native';
import { InstagramIcon } from '@/components/ui/InstagramIcon';
import { api } from '@/services/api';
import { useLanguage } from '@/context/LanguageContext';

const STYLES = [
  { key: 'heritage', labelKey: 'reel.style.heritage', fallback: 'Heritage', Icon: Flower2, color: '#C2410C' },
  { key: 'festive', labelKey: 'reel.style.festive', fallback: 'Festive', Icon: Sparkles, color: '#B45309' },
  { key: 'minimal', labelKey: 'reel.style.minimal', fallback: 'Minimal', Icon: Leaf, color: '#4D7C0F' },
] as const;

type Props = {
  postToIg: boolean;
  setPostToIg: (v: boolean) => void;
  reelStyle: string;
  setReelStyle: (v: string) => void;
  previewImage?: string;
  onNext?: () => void;
};

export function SocialReachStep({
  postToIg,
  setPostToIg,
  reelStyle,
  setReelStyle,
  previewImage,
  onNext,
}: Props) {
  const { t, language } = useLanguage();
  const router = useRouter();
  const [ig, setIg] = useState<{
    linked: boolean;
    username?: string;
    auto_post_enabled?: boolean;
  }>({ linked: false });

  useEffect(() => {
    api.get('/api/instagram/status')
      .then(({ data }) => {
        if (data) {
          setIg(data);
          if (data.linked && data.auto_post_enabled) {
            setPostToIg(true);
          }
        }
      })
      .catch(() => {});
  }, [setPostToIg]);

  const canPost = ig.linked && ig.auto_post_enabled;

  const title = language === 'ta' ? 'அதிக வாங்குபவர்களை சென்றடையுங்கள்' : language === 'hi' ? 'अधिक खरीदारों तक पहुँचें' : 'Reach more buyers';
  const subtitle = language === 'ta' ? 'இந்த தயாரிப்பை 15–20 வினாடி AI விளம்பர ரீலாக மாற்றவும்' : language === 'hi' ? 'इस उत्पाद को 15–20 सेकंड के AI विज्ञापन रील में बदलें' : 'Turn this product into a 15–20 second AI ad reel';
  const moodLabel = language === 'ta' ? 'ஒரு பாணியைத் தேர்ந்தெடுக்கவும்' : language === 'hi' ? 'एक शैली चुनें' : 'Choose a mood';
  const postIgLabel = language === 'ta' ? 'ரீலை இன்ஸ்டாகிராமில் பகிரவும்' : language === 'hi' ? 'रील को इंस्टाग्राम पर पोस्ट करें' : 'Post reel to Instagram';
  const featuredSub = language === 'ta'
    ? `@${ig.username || 'arti_sanproducts'} இல் இடம்பெறும் (சந்தை சேனல்)`
    : language === 'hi'
      ? `@${ig.username || 'arti_sanproducts'} पर प्रदर्शित (मार्केटप्लेस चैनल)`
      : `Featured on @${ig.username || 'arti_sanproducts'} (Marketplace Channel)`;
  const continueLabel = language === 'ta' ? 'மதிப்பாய்வுக்கு தொடரவும்' : language === 'hi' ? 'समीक्षा के लिए आगे बढ़ें' : 'Continue to Review';

  const features = [
    { Icon: Mic, label: language === 'ta' ? 'உங்கள் மொழியில் AI குரல் பதிவு' : language === 'hi' ? 'आपकी भाषा में AI वॉयसओवर' : 'AI voiceover in your language' },
    { Icon: Subtitles, label: language === 'ta' ? 'இந்திய மொழி வரிகள்' : language === 'hi' ? 'भारतीय भाषाई कैप्शन' : 'Burned-in Indic captions' },
    { Icon: Music, label: language === 'ta' ? 'இனிய பின்னணி இசை' : language === 'hi' ? 'पारंपरिक पृष्ठभूमि संगीत' : 'Acoustic background music' },
    { Icon: Clock, label: language === 'ta' ? 'இன்ஸ்டாகிராமிற்கான 15–20 வினாடி ரீல்' : language === 'hi' ? 'इंस्टाग्राम के लिए 15–20 सेकंड की रील' : '15–20s reel for Instagram' },
  ];

  const getStyleLabel = (key: string, fallback: string) => {
    if (key === 'heritage') return language === 'ta' ? 'பாரம்பரியம்' : language === 'hi' ? 'विरासत' : fallback;
    if (key === 'festive') return language === 'ta' ? 'திருவிழா' : language === 'hi' ? 'उत्सव' : fallback;
    if (key === 'minimal') return language === 'ta' ? 'எளிமையானது' : language === 'hi' ? 'न्यूनतम' : fallback;
    return fallback;
  };

  return (
    <ScrollView style={s.scroll} contentContainerStyle={s.wrap} showsVerticalScrollIndicator={false}>
      <Text style={s.h1}>{title}</Text>
      <Text style={s.h2}>{subtitle}</Text>

      {/* Phone-frame preview mock */}
      <View style={s.previewRow}>
        <View style={s.phone}>
          {previewImage ? (
            <Image source={{ uri: previewImage }} style={s.phoneImg} resizeMode="cover" />
          ) : (
            <View style={[s.phoneImg, { backgroundColor: '#F0EBE3' }]} />
          )}
          <View style={s.phoneOverlay}>
            <View style={s.playCircle}>
              <Play size={20} color="#FFFFFF" fill="#FFFFFF" />
            </View>
          </View>
          <View style={s.phoneCaption}>
            <View style={s.capLine} />
            <View style={[s.capLine, { width: '65%' }]} />
          </View>
        </View>

        <View style={{ flex: 1, marginLeft: 16 }}>
          {features.map(({ Icon, label }) => (
            <View key={label} style={s.featRow}>
              <Icon size={16} color="#1B6B3C" />
              <Text style={s.featText}>{label}</Text>
            </View>
          ))}
        </View>
      </View>

      {/* Style selector */}
      <Text style={s.label}>{moodLabel}</Text>
      <View style={s.styleRow}>
        {STYLES.map((st) => {
          const active = reelStyle === st.key;
          const Icon = st.Icon;
          return (
            <Pressable
              key={st.key}
              onPress={() => setReelStyle(st.key)}
              style={[
                s.styleChip,
                active && { borderColor: st.color, backgroundColor: st.color + '12' },
              ]}
            >
              <Icon size={20} color={active ? st.color : '#9A9A9A'} />
              <Text style={[s.styleText, active && { color: st.color, fontWeight: '700' }]}>
                {getStyleLabel(st.key, st.fallback)}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {/* Instagram toggle card */}
      <View style={s.igCard}>
        <View style={s.igIcon}>
          <InstagramIcon size={20} color="#FFFFFF" />
        </View>
        <View style={{ flex: 1, marginLeft: 12 }}>
          <Text style={s.igTitle}>{postIgLabel}</Text>
          <Text style={s.igSub}>{featuredSub}</Text>
        </View>
        <Switch
          value={postToIg}
          onValueChange={setPostToIg}
          trackColor={{ false: '#E5E0D8', true: '#FDBA74' }}
          thumbColor={postToIg ? '#C2410C' : '#FFFFFF'}
        />
      </View>

      {onNext && (
        <Pressable style={s.continueBtn} onPress={onNext}>
          <Text style={s.continueBtnText}>{continueLabel}</Text>
          <ChevronRight size={18} color="#FFFFFF" />
        </Pressable>
      )}
    </ScrollView>
  );
}

const s = StyleSheet.create({
  scroll: { flex: 1, backgroundColor: '#F5F0E8' },
  wrap: { padding: 20, paddingBottom: 40 },
  h1: { fontSize: 22, fontWeight: '800', color: '#1A1A1A' },
  h2: { fontSize: 14, color: '#6B6B6B', marginTop: 4, marginBottom: 20 },
  previewRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 24 },
  phone: {
    width: 108,
    height: 180,
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: '#000000',
    borderWidth: 3,
    borderColor: '#1A1A1A',
  },
  phoneImg: { width: '100%', height: '100%' },
  phoneOverlay: {
    ...StyleSheet.absoluteFill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.18)',
  },
  playCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingLeft: 3,
  },
  phoneCaption: { position: 'absolute', bottom: 12, left: 10, right: 10, gap: 4 },
  capLine: { height: 4, borderRadius: 2, backgroundColor: 'rgba(255,255,255,0.8)' },
  featRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
  featText: { fontSize: 13, color: '#3A3A3A', flex: 1 },
  label: { fontSize: 13, fontWeight: '700', color: '#3A3A3A', marginBottom: 10 },
  styleRow: { flexDirection: 'row', gap: 10, marginBottom: 22 },
  styleChip: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 14,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: '#E5E0D8',
    backgroundColor: '#FFFFFF',
    gap: 6,
  },
  styleText: { fontSize: 12, color: '#6B6B6B' },
  igCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E8E2D9',
  },
  igIcon: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: '#C13584',
    alignItems: 'center',
    justifyContent: 'center',
  },
  igTitle: { fontSize: 14, fontWeight: '700', color: '#1A1A1A' },
  igSub: { fontSize: 12, color: '#6B6B6B', marginTop: 2 },
  linkBtn: {
    backgroundColor: '#C13584',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
  },
  linkBtnText: { color: '#FFFFFF', fontSize: 12, fontWeight: '700' },
  continueBtn: {
    flexDirection: 'row',
    backgroundColor: '#2D6A4F',
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 24,
    gap: 6,
  },
  continueBtnText: { color: '#FFFFFF', fontWeight: '700', fontSize: 15 },
});
export default SocialReachStep;
