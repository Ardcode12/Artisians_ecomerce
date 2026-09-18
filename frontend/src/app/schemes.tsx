import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  ActivityIndicator,
  RefreshControl,
  Linking,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import {
  ArrowLeft,
  Search,
  ExternalLink,
  ShieldCheck,
  AlertCircle,
  RefreshCw,
  Building2,
  Award,
  Sparkles,
  Volume2,
  Square,
} from 'lucide-react-native';
import { BACKEND_URL } from '@/config/api';
import { Colors, Fonts, Radius, Shadow } from '@/constants/artisan-theme';
import { isSpeechSupported, stopSpeech } from '@/utils/speech';
import { getSelectedLanguage, speak as centralSpeak, AppLanguage } from '@/utils/language-utils';
import { Globe } from 'lucide-react-native';

interface Scheme {
  id: string;
  scheme_name: string;
  provider_name: string;
  provider_type: 'government' | 'ngo' | 'private';
  scheme_category?: string | null;
  eligibility_summary?: string | null;
  benefits_offered?: string | null;
  application_process?: string | null;
  application_deadline?: string | null;
  official_source_url: string;
  source_type?: string | null;
  review_flagged?: number | boolean;
  is_active?: number | boolean;
  last_verified_date?: string;
  simple_summary?: string | null;
  simple_summary_en?: string | null;
  simple_summary_hi?: string | null;
  simple_summary_ta?: string | null;
}

const CATEGORY_CHIPS = ['All', 'Financial Aid', 'Market Access', 'Training', 'Welfare'];

export default function SchemesScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const [schemes, setSchemes] = useState<Scheme[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [speakingSchemeId, setSpeakingSchemeId] = useState<string | null>(null);

  const activeLang = (getSelectedLanguage() || 'en') as AppLanguage;

  const getSchemeSummary = (scheme: Scheme, lang: AppLanguage = activeLang) => {
    if (lang === 'ta' && scheme.simple_summary_ta) return scheme.simple_summary_ta;
    if (lang === 'hi' && scheme.simple_summary_hi) return scheme.simple_summary_hi;
    return scheme.simple_summary_en || scheme.simple_summary || scheme.benefits_offered || '';
  };

  const handleToggleSpeech = (scheme: Scheme) => {
    if (!isSpeechSupported()) return;

    if (speakingSchemeId === scheme.id) {
      stopSpeech();
      setSpeakingSchemeId(null);
      return;
    }

    stopSpeech();
    const currentLang = getSelectedLanguage();
    const summary = getSchemeSummary(scheme, currentLang);
    const textToRead = `${scheme.scheme_name}. ${summary}`;

    setSpeakingSchemeId(scheme.id);
    centralSpeak(textToRead, currentLang, {
      rate: 0.95,
      pitch: 1.0,
      onDone: () => setSpeakingSchemeId(null),
      onStopped: () => setSpeakingSchemeId(null),
      onError: () => setSpeakingSchemeId(null),
    });
  };

  useEffect(() => {
    return () => {
      stopSpeech();
    };
  }, []);

  const fetchSchemes = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch(`${BACKEND_URL}/api/schemes`);
      if (res.ok) {
        const data = await res.json();
        setSchemes(data.schemes || []);
      }
    } catch (err) {
      console.warn('Failed to fetch schemes:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchSchemes();
  }, [fetchSchemes]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchSchemes();
  };

  const handleOpenSource = async (url?: string) => {
    if (!url) return;
    try {
      await Linking.openURL(url);
    } catch (err) {
      console.warn('Could not open URL:', err);
    }
  };

  // Filter schemes
  const filteredSchemes = schemes.filter((s) => {
    const matchesSearch =
      s.scheme_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.provider_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (s.benefits_offered && s.benefits_offered.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (s.eligibility_summary && s.eligibility_summary.toLowerCase().includes(searchQuery.toLowerCase()));

    if (selectedCategory === 'All') return matchesSearch;
    const cat = (s.scheme_category || '').toLowerCase();
    const target = selectedCategory.toLowerCase();
    return matchesSearch && cat.includes(target);
  });

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* ── Top Header ──────────────────────────────────────────────── */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => router.back()}
          activeOpacity={0.7}
        >
          <ArrowLeft size={20} color="#0D0D0D" />
        </TouchableOpacity>
        <View style={styles.headerTitles}>
          <Text style={styles.title}>
            {activeLang === 'ta' ? 'அரசு & தன்னார்வ நலத்திட்டங்கள்' : activeLang === 'hi' ? 'सरकारी और गैर-सरकारी योजनाएं' : 'Government & NGO Schemes'}
          </Text>
          <Text style={styles.subtitle}>
            {activeLang === 'ta' ? 'நிதி உதவி, மானியங்கள் மற்றும் சந்தை வாய்ப்புகள்' : activeLang === 'hi' ? 'वित्तीय सहायता, सब्सिडी और बाजार के अवसर' : 'Financial aid, subsidies & market linkages'}
          </Text>
        </View>
        <TouchableOpacity
          style={styles.langPill}
          onPress={() => router.push({ pathname: '/select-language', params: { canGoBack: 'true' } })}
          activeOpacity={0.7}
          accessibilityLabel="Change Language"
        >
          <Globe size={13} color="#B5502F" />
          <Text style={styles.langPillText}>
            {activeLang === 'ta' ? 'தமிழ்' : activeLang === 'hi' ? 'हिंदी' : 'EN'}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.refreshBtn}
          onPress={onRefresh}
          activeOpacity={0.7}
        >
          <RefreshCw size={18} color="#B5502F" />
        </TouchableOpacity>
      </View>

      {/* ── Search Bar ──────────────────────────────────────────────── */}
      <View style={styles.searchContainer}>
        <Search size={18} color="#9CA3AF" style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search schemes, benefits, or trades..."
          placeholderTextColor="#9CA3AF"
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
      </View>

      {/* ── Category Chips ──────────────────────────────────────────── */}
      <View style={styles.chipsRow}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipsScroll}>
          {CATEGORY_CHIPS.map((cat) => {
            const isSelected = selectedCategory === cat;
            return (
              <TouchableOpacity
                key={cat}
                style={[styles.chip, isSelected && styles.chipActive]}
                onPress={() => setSelectedCategory(cat)}
                activeOpacity={0.8}
              >
                <Text style={[styles.chipText, isSelected && styles.chipTextActive]}>{cat}</Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* ── Content List ────────────────────────────────────────────── */}
      {loading ? (
        <View style={styles.loaderContainer}>
          <ActivityIndicator size="large" color="#B5502F" />
          <Text style={styles.loaderText}>Discovering active schemes...</Text>
        </View>
      ) : filteredSchemes.length === 0 ? (
        <ScrollView
          contentContainerStyle={styles.emptyContainer}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#B5502F']} />}
        >
          <AlertCircle size={44} color="#9CA3AF" strokeWidth={1.5} />
          <Text style={styles.emptyTitle}>No matching schemes</Text>
          <Text style={styles.emptyText}>Try changing your search term or category filter.</Text>
        </ScrollView>
      ) : (
        <ScrollView
          contentContainerStyle={[styles.listScroll, { paddingBottom: Math.max(insets.bottom + 20, 40) }]}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#B5502F']} />}
          showsVerticalScrollIndicator={false}
        >
          {filteredSchemes.map((scheme) => {
            const isGov = scheme.provider_type === 'government';
            const isNgo = scheme.provider_type === 'ngo';

            return (
              <View key={scheme.id} style={styles.schemeCard}>
                {/* Header row with provider badge & category */}
                <View style={styles.cardHeader}>
                  <View style={[styles.providerBadge, isGov ? styles.badgeGov : styles.badgeNgo]}>
                    <Building2 size={12} color={isGov ? '#1E40AF' : '#15803D'} />
                    <Text style={[styles.providerText, isGov ? styles.textGov : styles.textNgo]}>
                      {scheme.provider_type.toUpperCase()}
                    </Text>
                  </View>

                  {scheme.scheme_category && (
                    <View style={styles.categoryBadge}>
                      <Text style={styles.categoryBadgeText}>{scheme.scheme_category}</Text>
                    </View>
                  )}
                </View>

                {/* Scheme Name & Provider */}
                <Text style={styles.schemeName}>{scheme.scheme_name}</Text>
                <Text style={styles.providerName}>Provided by: {scheme.provider_name}</Text>

                {/* Plain-Language Summary (Multilingual based on selected language) */}
                {(() => {
                  const summaryText = getSchemeSummary(scheme, activeLang);
                  if (!summaryText) return null;
                  const summaryHeaderTitle =
                    activeLang === 'ta' ? 'எளிய சுருக்கம் (தமிழ்)' :
                    activeLang === 'hi' ? 'सरल सारांश (हिंदी)' :
                    'Plain-Language Summary';
                  return (
                    <View style={styles.summaryBox}>
                      <View style={styles.summaryHeader}>
                        <Sparkles size={13} color="#B5502F" />
                        <Text style={styles.summaryTitle}>{summaryHeaderTitle}</Text>
                      </View>
                      <Text style={styles.summaryText}>{summaryText}</Text>
                    </View>
                  );
                })()}

                {/* Benefits Section */}
                {scheme.benefits_offered && (
                  <View style={styles.detailBlock}>
                    <View style={styles.sectionLabelRow}>
                      <Award size={14} color="#B5502F" />
                      <Text style={styles.sectionLabel}>Key Benefits & Incentives</Text>
                    </View>
                    <Text style={styles.detailContent}>{scheme.benefits_offered}</Text>
                  </View>
                )}

                {/* Eligibility Section */}
                {scheme.eligibility_summary && (
                  <View style={styles.detailBlock}>
                    <View style={styles.sectionLabelRow}>
                      <ShieldCheck size={14} color="#2F6B4F" />
                      <Text style={styles.sectionLabel}>Eligibility</Text>
                    </View>
                    <Text style={styles.detailContent}>{scheme.eligibility_summary}</Text>
                  </View>
                )}

                {/* Listen Read-Aloud Button */}
                {isSpeechSupported() && (
                  <TouchableOpacity
                    style={[
                      styles.listenBtn,
                      speakingSchemeId === scheme.id && styles.listenBtnActive,
                    ]}
                    onPress={() => handleToggleSpeech(scheme)}
                    activeOpacity={0.85}
                  >
                    {speakingSchemeId === scheme.id ? (
                      <>
                        <Square size={14} color="#FFFFFF" fill="#FFFFFF" />
                        <Text style={styles.listenBtnText}>
                          {activeLang === 'ta' ? 'நிறுத்து' : activeLang === 'hi' ? 'रोकें' : 'Stop Reading'}
                        </Text>
                      </>
                    ) : (
                      <>
                        <Volume2 size={15} color="#FFFFFF" />
                        <Text style={styles.listenBtnText}>
                          {activeLang === 'ta' ? 'கேட்கவும்' : activeLang === 'hi' ? 'सुनिए' : 'Listen'}
                        </Text>
                      </>
                    )}
                  </TouchableOpacity>
                )}

                {/* Card Action Footer */}
                <View style={styles.cardFooter}>
                  {scheme.review_flagged ? (
                    <View style={styles.flaggedNotice}>
                      <AlertCircle size={12} color="#D97706" />
                      <Text style={styles.flaggedText}>Check portal for complete rules</Text>
                    </View>
                  ) : (
                    <View style={styles.verifiedNotice}>
                      <ShieldCheck size={12} color="#15803D" />
                      <Text style={styles.verifiedText}>Verified Source</Text>
                    </View>
                  )}

                  <TouchableOpacity
                    style={styles.openBtn}
                    onPress={() => handleOpenSource(scheme.official_source_url)}
                    activeOpacity={0.85}
                  >
                    <Text style={styles.openBtnText}>Apply / Details</Text>
                    <ExternalLink size={13} color="#FFFFFF" />
                  </TouchableOpacity>
                </View>
              </View>
            );
          })}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FDF8F3',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#EFEAE3',
    backgroundColor: '#FFFFFF',
    gap: 12,
  },
  backBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitles: {
    flex: 1,
  },
  title: {
    fontSize: 17,
    fontWeight: '700',
    fontFamily: Fonts.headingBold,
    color: '#0D0D0D',
  },
  subtitle: {
    fontSize: 12,
    fontFamily: Fonts.body,
    color: '#6B7280',
    marginTop: 1,
  },
  refreshBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#FFF1EC',
    justifyContent: 'center',
    alignItems: 'center',
  },
  langPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#FFF7ED',
    borderWidth: 1,
    borderColor: '#FED7AA',
    borderRadius: 16,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  langPillText: {
    fontSize: 11.5,
    fontFamily: Fonts.headingBold,
    color: '#B5502F',
    fontWeight: '700',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    marginHorizontal: 16,
    marginTop: 12,
    marginBottom: 8,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E8DCC8',
    height: 44,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    fontFamily: Fonts.body,
    color: '#0D0D0D',
  },
  chipsRow: {
    paddingVertical: 6,
  },
  chipsScroll: {
    paddingHorizontal: 16,
    gap: 8,
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  chipActive: {
    backgroundColor: '#0D0D0D',
    borderColor: '#0D0D0D',
  },
  chipText: {
    fontSize: 12,
    fontFamily: Fonts.bodyMedium,
    color: '#4B5563',
  },
  chipTextActive: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  listScroll: {
    paddingHorizontal: 16,
    paddingTop: 8,
    gap: 14,
  },
  loaderContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 10,
  },
  loaderText: {
    fontSize: 13,
    fontFamily: Fonts.body,
    color: '#6B7280',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
    gap: 8,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '700',
    fontFamily: Fonts.headingBold,
    color: '#374151',
    marginTop: 8,
  },
  emptyText: {
    fontSize: 13,
    fontFamily: Fonts.body,
    color: '#9CA3AF',
    textAlign: 'center',
  },
  schemeCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#EFEAE3',
    ...Shadow.card,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  providerBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    gap: 4,
  },
  badgeGov: {
    backgroundColor: '#EFF6FF',
  },
  badgeNgo: {
    backgroundColor: '#F0FDF4',
  },
  providerText: {
    fontSize: 10,
    fontWeight: '700',
    fontFamily: Fonts.headingBold,
  },
  textGov: {
    color: '#1D4ED8',
  },
  textNgo: {
    color: '#15803D',
  },
  categoryBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    backgroundColor: '#F5F5F5',
  },
  categoryBadgeText: {
    fontSize: 11,
    fontFamily: Fonts.bodyMedium,
    color: '#6B7280',
    textTransform: 'capitalize',
  },
  schemeName: {
    fontSize: 16,
    fontWeight: '700',
    fontFamily: Fonts.headingBold,
    color: '#0D0D0D',
    marginBottom: 2,
  },
  providerName: {
    fontSize: 12,
    fontFamily: Fonts.body,
    color: '#6B7280',
    marginBottom: 12,
  },
  detailBlock: {
    backgroundColor: '#FAFAF9',
    borderRadius: 10,
    padding: 10,
    marginBottom: 10,
  },
  sectionLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginBottom: 4,
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: '600',
    fontFamily: Fonts.heading,
    color: '#374151',
  },
  detailContent: {
    fontSize: 12,
    fontFamily: Fonts.body,
    color: '#4B5563',
    lineHeight: 18,
  },
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 4,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  flaggedNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  flaggedText: {
    fontSize: 11,
    fontFamily: Fonts.body,
    color: '#B45309',
  },
  verifiedNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  verifiedText: {
    fontSize: 11,
    fontFamily: Fonts.body,
    color: '#15803D',
  },
  openBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#B5502F',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 8,
    gap: 5,
  },
  openBtnText: {
    fontSize: 12,
    fontWeight: '600',
    fontFamily: Fonts.heading,
    color: '#FFFFFF',
  },
  summaryBox: {
    backgroundColor: '#FEF3C7',
    borderRadius: 10,
    padding: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#FDE68A',
  },
  summaryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  summaryTitle: {
    fontSize: 11,
    fontWeight: '700',
    fontFamily: Fonts.headingBold,
    color: '#92400E',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  summaryText: {
    fontSize: 13,
    fontFamily: Fonts.body,
    color: '#78350F',
    lineHeight: 19,
    fontWeight: '500',
  },
  listenBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#059669',
    paddingVertical: 9,
    paddingHorizontal: 14,
    borderRadius: 10,
    gap: 7,
    marginBottom: 12,
  },
  listenBtnActive: {
    backgroundColor: '#DC2626',
  },
  listenBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '600',
    fontFamily: Fonts.heading,
  },
});
