import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, Pressable, Switch, ActivityIndicator, Alert, StyleSheet } from 'react-native';
import * as WebBrowser from 'expo-web-browser';
import { Link2, CheckCircle2, Trash2 } from 'lucide-react-native';
import { InstagramIcon } from '@/components/ui/InstagramIcon';
import { api } from '@/services/api';
import { useLanguage } from '@/context/LanguageContext';

type Status = {
  linked: boolean;
  username?: string;
  account_type?: string;
  auto_post_enabled?: boolean;
};

export default function LinkInstagramCard() {
  const { t } = useLanguage();
  const [status, setStatus] = useState<Status>({ linked: false });
  const [loading, setLoading] = useState(true);
  const [linking, setLinking] = useState(false);

  const load = useCallback(async () => {
    try {
      const { data } = await api.get('/api/instagram/status');
      setStatus(data);
    } catch (_) {
      // Fallback
      setStatus({ linked: false });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const handleLink = async () => {
    setLinking(true);
    try {
      const { data } = await api.get('/api/instagram/auth-url');
      const result = await WebBrowser.openAuthSessionAsync(data.auth_url);
      if (result.type === 'success' || result.type === 'dismiss') {
        await new Promise((r) => setTimeout(r, 900));
        await load();
      }
    } catch (e: any) {
      Alert.alert(t('error') || 'Error', e?.message || 'Could not open Instagram');
    } finally {
      setLinking(false);
    }
  };

  const handleDemoLink = async () => {
    setLinking(true);
    try {
      const { data } = await api.post('/api/instagram/connect-demo');
      if (data) {
        setStatus(data);
        Alert.alert('Instagram Connected', 'Linked as @artisan_crafts_india with auto-post enabled.');
      }
    } catch (e: any) {
      Alert.alert(t('error') || 'Error', e?.message || 'Could not link demo account');
    } finally {
      setLinking(false);
    }
  };

  const toggleConsent = async (value: boolean) => {
    if (value) {
      Alert.alert(
        t('ig.consentTitle') || 'Allow posting?',
        t('ig.consentBody') || 'The app will post a short video ad to your Instagram each time you publish a product with Instagram turned on. You can switch this off at any time.',
        [
          { text: t('common_cancel') || 'Cancel', style: 'cancel' },
          {
            text: t('ig.allow') || 'Allow',
            onPress: async () => {
              try {
                await api.post('/api/instagram/consent', null, { params: { enabled: true } });
                setStatus((s) => ({ ...s, auto_post_enabled: true }));
              } catch (_) {}
            },
          },
        ],
      );
    } else {
      try {
        await api.post('/api/instagram/consent', null, { params: { enabled: false } });
        setStatus((s) => ({ ...s, auto_post_enabled: false }));
      } catch (_) {}
    }
  };

  const handleUnlink = () => {
    Alert.alert(
      t('ig.unlinkTitle') || 'Disconnect Instagram?',
      t('ig.unlinkBody') || 'We will stop posting reels. Posts already on Instagram stay there.',
      [
        { text: t('common_cancel') || 'Cancel', style: 'cancel' },
        {
          text: t('ig.unlink') || 'Disconnect',
          style: 'destructive',
          onPress: async () => {
            try {
              await api.delete('/api/instagram/unlink');
              setStatus({ linked: false });
            } catch (_) {}
          },
        },
      ],
    );
  };

  if (loading) {
    return (
      <View style={s.card}>
        <ActivityIndicator color="#C2410C" />
      </View>
    );
  }

  return (
    <View style={s.card}>
      <View style={s.headerRow}>
        <View style={s.iconWrap}>
          <InstagramIcon size={24} color="#FFFFFF" />
        </View>
        <View style={{ flex: 1, marginLeft: 12 }}>
          <Text style={s.title}>{t('ig.title') || 'Marketplace Instagram'}</Text>
          <Text style={s.subtitle}>
            {status.linked ? `@${status.username || 'arti_sanproducts'} (Official Channel)` : (t('ig.subtitle') || 'Not connected')}
          </Text>
        </View>
        {status.linked && (
          <View style={s.badge}>
            <CheckCircle2 size={13} color="#15803D" />
            <Text style={s.badgeText}>{t('ig.connected') || 'Active'}</Text>
          </View>
        )}
      </View>

      {!status.linked ? (
        <>
          <Text style={s.blurb}>
            {t('ig.pitch') || 'Connect your Instagram and we will turn every product you upload into a professional ad reel — with your voice, in your language.'}
          </Text>
          <Pressable style={s.primaryBtn} onPress={handleLink} disabled={linking}>
            {linking ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <>
                <Link2 size={18} color="#FFFFFF" />
                <Text style={s.primaryBtnText}>{t('ig.connectBtn') || 'Connect Instagram'}</Text>
              </>
            )}
          </Pressable>

          <Pressable style={s.demoBtn} onPress={handleDemoLink} disabled={linking}>
            <Text style={s.demoBtnText}>⚡ 1-Tap Quick Link (Demo Account)</Text>
          </Pressable>

          <Text style={s.note}>
            {t('ig.businessNote') || 'Requires a Professional (Business or Creator) Instagram account'}
          </Text>
        </>
      ) : (
        <>
          <View style={s.consentRow}>
            <View style={{ flex: 1, paddingRight: 12 }}>
              <Text style={s.consentTitle}>{t('ig.autoPost') || 'Auto-post reels'}</Text>
              <Text style={s.consentSub}>
                {t('ig.autoPostSub') || 'Let the app post AI-made ad reels for your products to your Instagram'}
              </Text>
            </View>
            <Switch
              value={!!status.auto_post_enabled}
              onValueChange={toggleConsent}
              trackColor={{ false: '#E5E0D8', true: '#FDBA74' }}
              thumbColor={status.auto_post_enabled ? '#C2410C' : '#FFFFFF'}
            />
          </View>
          <Pressable onPress={handleUnlink} style={s.unlinkBtn}>
            <Trash2 size={14} color="#DC2626" style={{ marginRight: 4 }} />
            <Text style={s.unlinkText}>{t('ig.unlink') || 'Disconnect'}</Text>
          </Pressable>
        </>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 18,
    marginHorizontal: 16,
    marginVertical: 8,
    borderWidth: 1,
    borderColor: '#F0EBE3',
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  headerRow: { flexDirection: 'row', alignItems: 'center' },
  iconWrap: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: '#C13584',
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: { fontSize: 16, fontWeight: '700', color: '#1A1A1A' },
  subtitle: { fontSize: 13, color: '#6B6B6B', marginTop: 2 },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
    gap: 4,
  },
  badgeText: { fontSize: 11, color: '#15803D', fontWeight: '600' },
  blurb: { fontSize: 13, color: '#6B6B6B', lineHeight: 19, marginTop: 14 },
  primaryBtn: {
    flexDirection: 'row',
    backgroundColor: '#C13584',
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 14,
  },
  primaryBtnText: { color: '#FFFFFF', fontWeight: '700', fontSize: 15 },
  demoBtn: {
    backgroundColor: '#FAF5FF',
    borderWidth: 1.5,
    borderColor: '#D8B4FE',
    borderRadius: 14,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 10,
  },
  demoBtnText: { color: '#7E22CE', fontWeight: '700', fontSize: 13 },
  note: { fontSize: 11, color: '#9A9A9A', marginTop: 10, textAlign: 'center' },
  consentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#F0EBE3',
  },
  consentTitle: { fontSize: 14, fontWeight: '600', color: '#1A1A1A' },
  consentSub: { fontSize: 12, color: '#6B6B6B', marginTop: 2, lineHeight: 17 },
  unlinkBtn: {
    flexDirection: 'row',
    marginTop: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  unlinkText: { color: '#DC2626', fontSize: 13, fontWeight: '600' },
});
