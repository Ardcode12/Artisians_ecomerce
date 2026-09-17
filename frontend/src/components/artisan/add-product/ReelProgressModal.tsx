import React, { useEffect, useRef, useState } from 'react';
import {
  Modal,
  View,
  Text,
  Pressable,
  ActivityIndicator,
  Linking,
  StyleSheet,
  Animated,
  Easing,
  Platform,
  Share,
} from 'react-native';
import { useVideoPlayer, VideoView } from 'expo-video';
import {
  Sparkles,
  PenTool,
  Mic,
  Film,
  CloudUpload,
  CheckCircle2,
  Video,
  AlertCircle,
  Share2,
  ExternalLink,
  RotateCcw,
} from 'lucide-react-native';
import { InstagramIcon } from '@/components/ui/InstagramIcon';
import { api } from '@/services/api';
import { useLanguage } from '@/context/LanguageContext';

const STAGES = [
  { key: 'WRITING_SCRIPT', label: 'Writing your ad script', Icon: PenTool },
  { key: 'GENERATING_VOICE', label: 'Recording the voiceover', Icon: Mic },
  { key: 'RENDERING_VIDEO', label: 'Editing your 9:16 reel', Icon: Film },
  { key: 'UPLOADING', label: 'Uploading to cloud', Icon: CloudUpload },
  { key: 'PUBLISHING_INSTAGRAM', label: 'Posting to Instagram', Icon: InstagramIcon },
];

function ReelVideoPlayer({ videoUrl }: { videoUrl: string }) {
  if (!videoUrl) return null;

  try {
    const player = useVideoPlayer(videoUrl, (p) => {
      p.loop = true;
      p.play();
    });

    return (
      <View style={s.playerContainer}>
        <VideoView
          style={s.player}
          player={player}
        />
      </View>
    );
  } catch (_) {
    return (
      <View style={[s.player, { justifyContent: 'center', alignItems: 'center' }]}>
        <Video size={36} color="#FFFFFF" />
        <Text style={{ color: '#FFFFFF', fontSize: 12, marginTop: 8 }}>Reel Ready</Text>
      </View>
    );
  }
}

export function ReelProgressModal({
  jobId,
  visible,
  onClose,
}: {
  jobId: string | null;
  visible: boolean;
  onClose: () => void;
}) {
  const { t } = useLanguage();
  const [job, setJob] = useState<any>(null);
  const timer = useRef<any>(null);
  const bar = useRef(new Animated.Value(0.05)).current;

  useEffect(() => {
    if (!jobId || !visible) {
      if (timer.current) clearInterval(timer.current);
      return;
    }

    const poll = async () => {
      try {
        const { data } = await api.get(`/api/reels/job/${jobId}`);
        if (data) {
          setJob(data);
          const prog = Math.max(0.05, Math.min(1.0, (data.progress || 5) / 100));
          Animated.timing(bar, {
            toValue: prog,
            duration: 600,
            easing: Easing.out(Easing.cubic),
            useNativeDriver: false,
          }).start();

          if (['COMPLETED', 'VIDEO_READY', 'FAILED'].includes(data.status)) {
            if (timer.current) clearInterval(timer.current);
          }
        }
      } catch (_) { }
    };

    poll();
    timer.current = setInterval(poll, 2500);
    return () => {
      if (timer.current) clearInterval(timer.current);
    };
  }, [jobId, visible]);

  const status = job?.status ?? 'QUEUED';
  const done = status === 'COMPLETED';
  const partial = status === 'VIDEO_READY';
  const failed = status === 'FAILED';
  const busy = !done && !partial && !failed;

  const currentIdx = STAGES.findIndex((st) => st.key === status);

  const handleShare = async () => {
    if (job?.video_url) {
      try {
        await Share.share({
          message: `${job.caption || 'Check out our authentic handcrafted product!'}\n\nWatch Reel: ${job.video_url}`,
          url: job.video_url,
        });
      } catch (_) { }
    }
  };

  const handleRetry = async () => {
    if (jobId) {
      try {
        await api.post(`/api/reels/job/${jobId}/retry`);
        setJob((prev: any) => ({ ...prev, status: 'QUEUED', stage: 'Retrying reel generation...' }));
      } catch (_) { }
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide">
      <View style={s.backdrop}>
        <View style={s.sheet}>
          <View style={s.grabber} />

          {busy && (
            <>
              <View style={s.headerIconWrap}>
                <Sparkles size={28} color="#C2410C" />
              </View>
              <Text style={s.title}>{t('reel.creating') || 'Creating your AI Ad-Reel'}</Text>
              <Text style={s.sub}>{job?.stage ?? 'Preparing video & voiceover...'}</Text>

              {/* Progress track */}
              <View style={s.track}>
                <Animated.View
                  style={[
                    s.fill,
                    {
                      width: bar.interpolate({
                        inputRange: [0, 1],
                        outputRange: ['0%', '100%'],
                      }),
                    },
                  ]}
                />
              </View>

              {/* Stage checklist */}
              <View style={s.stageList}>
                {STAGES.map((st, i) => {
                  const active = i === currentIdx;
                  const passed = currentIdx > i;
                  const Icon = st.Icon;
                  return (
                    <View key={st.key} style={s.stageRow}>
                      <View style={[s.dot, passed && s.dotDone, active && s.dotActive]}>
                        {passed ? (
                          <CheckCircle2 size={14} color="#FFFFFF" />
                        ) : active ? (
                          <ActivityIndicator size="small" color="#FFFFFF" />
                        ) : (
                          <Icon size={12} color="#8E8E93" />
                        )}
                      </View>
                      <Text
                        style={[
                          s.stageText,
                          (active || passed) && { color: '#1A1A1A', fontWeight: '600' },
                        ]}
                      >
                        {st.label}
                      </Text>
                    </View>
                  );
                })}
              </View>

              <Text style={s.hint}>
                You can minimize this modal — generation will proceed in the background.
              </Text>
            </>
          )}

          {(done || partial) && (
            <>
              <View style={s.successIcon}>
                <CheckCircle2 size={46} color={done ? '#15803D' : '#C2410C'} />
              </View>
              <Text style={s.title}>
                {done
                  ? (t('reel.done') || 'Your Reel is Live!')
                  : (t('reel.savedAnyway') || 'Your Reel is Ready')}
              </Text>
              <Text style={s.sub}>
                {done
                  ? 'Successfully posted to your linked Instagram account'
                  : 'Reel generated successfully! You can watch or share on WhatsApp/Socials.'}
              </Text>

              {/* Video Player */}
              {job?.video_url && <ReelVideoPlayer videoUrl={job.video_url} />}

              {/* Action Buttons */}
              <View style={s.actionsCol}>
                {done && job?.ig_permalink && (
                  <Pressable
                    style={s.igBtn}
                    onPress={() => Linking.openURL(job.ig_permalink)}
                  >
                    <InstagramIcon size={18} color="#FFFFFF" />
                    <Text style={s.igBtnText}>{t('reel.viewOnIg') || 'View on Instagram'}</Text>
                    <ExternalLink size={16} color="#FFFFFF" style={{ marginLeft: 4 }} />
                  </Pressable>
                )}

                <Pressable style={s.shareBtn} onPress={handleShare}>
                  <Share2 size={16} color="#0D0D0D" />
                  <Text style={s.shareBtnText}>{t('reel.share') || 'Share Reel'}</Text>
                </Pressable>

                <Pressable style={s.ghostBtn} onPress={onClose}>
                  <Text style={s.ghostText}>{t('common_done') || 'Done'}</Text>
                </Pressable>
              </View>
            </>
          )}

          {failed && (
            <>
              <AlertCircle size={46} color="#DC2626" />
              <Text style={s.title}>{t('reel.failed') || 'Could not create reel'}</Text>
              <Text style={s.sub}>{job?.error || 'A temporary processing issue occurred.'}</Text>

              <Pressable style={s.retryBtn} onPress={handleRetry}>
                <RotateCcw size={16} color="#FFFFFF" />
                <Text style={s.retryBtnText}>Try Again</Text>
              </Pressable>

              <Pressable style={s.ghostBtn} onPress={onClose}>
                <Text style={s.ghostText}>{t('common_cancel') || 'Close'}</Text>
              </Pressable>
            </>
          )}
        </View>
      </View>
    </Modal>
  );
}

const s = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.52)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: '#FDFBF7',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    padding: 24,
    paddingBottom: 36,
    alignItems: 'center',
    maxHeight: '92%',
  },
  grabber: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#DDD6CC',
    marginBottom: 16,
  },
  headerIconWrap: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#C2410C14',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  title: { fontSize: 20, fontWeight: '800', color: '#1A1A1A', textAlign: 'center' },
  sub: { fontSize: 13, color: '#6B6B6B', marginTop: 6, textAlign: 'center', paddingHorizontal: 12 },
  track: {
    width: '100%',
    height: 6,
    borderRadius: 3,
    backgroundColor: '#EFEAE2',
    marginTop: 20,
    overflow: 'hidden',
  },
  fill: { height: '100%', backgroundColor: '#C2410C', borderRadius: 3 },
  stageList: { width: '100%', marginTop: 20, gap: 14 },
  stageRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  dot: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#E5E0D8',
    alignItems: 'center',
    justifyContent: 'center',
  },
  dotActive: { backgroundColor: '#C2410C' },
  dotDone: { backgroundColor: '#15803D' },
  stageText: { fontSize: 14, color: '#9A9A9A' },
  hint: { fontSize: 12, color: '#9A9A9A', marginTop: 20, textAlign: 'center' },
  successIcon: { marginTop: 4, marginBottom: 8 },
  playerContainer: {
    width: 170,
    height: 300,
    borderRadius: 16,
    overflow: 'hidden',
    marginTop: 14,
    backgroundColor: '#000000',
    borderWidth: 1,
    borderColor: '#E5E0D8',
  },
  player: { width: '100%', height: '100%' },
  actionsCol: { width: '100%', marginTop: 18, gap: 10, alignItems: 'center' },
  igBtn: {
    flexDirection: 'row',
    backgroundColor: '#C13584',
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 24,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    width: '100%',
  },
  igBtnText: { color: '#FFFFFF', fontWeight: '700', fontSize: 15 },
  shareBtn: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E0D8',
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 24,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    width: '100%',
  },
  shareBtnText: { color: '#0D0D0D', fontWeight: '700', fontSize: 14 },
  retryBtn: {
    flexDirection: 'row',
    backgroundColor: '#C2410C',
    borderRadius: 14,
    paddingVertical: 13,
    paddingHorizontal: 24,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    width: '100%',
    marginTop: 18,
  },
  retryBtnText: { color: '#FFFFFF', fontWeight: '700', fontSize: 15 },
  ghostBtn: { paddingVertical: 8 },
  ghostText: { color: '#6B6B6B', fontWeight: '600', fontSize: 14 },
});
export default ReelProgressModal;
