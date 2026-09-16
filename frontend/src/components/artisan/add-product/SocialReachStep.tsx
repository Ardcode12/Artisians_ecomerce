import React, { useEffect, useState } from 'react';
import { View, Text, Pressable, Switch, StyleSheet, Image } from 'react-native';
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
  const { t } = useLanguage();
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

  return (
    <View style={s.wrap}>
      <Text style={s.h1}>{t('reel.stepTitle') || 'Reach more buyers'}</Text>
      <Text style={s.h2}>{t('reel.stepSubtitle') || 'Turn this product into a 15–20 second AI ad reel'}</Text>

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
          {[
            { Icon: Mic, label: 'AI voiceover in your language' },
            { Icon: Subtitles, label: 'Burned-in Indic captions' },
            { Icon: Music, label: 'Acoustic background music' },
            { Icon: Clock, label: '15–20s reel for Instagram' },
          ].map(({ Icon, label }) => (
            <View key={label} style={s.featRow}>
              <Icon size={16} color="#C2410C" />
              <Text style={s.featText}>{label}</Text>
            </View>
          ))}
        </View>
      </View>

      {/* Style selector */}
      <Text style={s.label}>{t('reel.styleLabel') || 'Choose a mood'}</Text>
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
                {t(st.labelKey) || st.fallback}
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
          <Text style={s.igTitle}>{t('reel.postToIg') || 'Post reel to Instagram'}</Text>
          <Text style={s.igSub}>
            {`Featured on @${ig.username || 'arti_sanproducts'} (Marketplace Channel)`}
          </Text>
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
          <Text style={s.continueBtnText}>{t('auth_continue') || 'Continue to Review'}</Text>
          <ChevronRight size={18} color="#FFFFFF" />
        </Pressable>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  wrap: { padding: 20 },
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
    borderColor: '#F0EBE3',
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
    backgroundColor: '#0D0D0D',
    borderRadius: 16,
    paddingVertical: 15,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 24,
    gap: 6,
  },
  continueBtnText: { color: '#FFFFFF', fontWeight: '700', fontSize: 15 },
});
export default SocialReachStep;
