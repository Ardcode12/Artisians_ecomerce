import React, { useEffect, useState, useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  TextInput,
  StatusBar,
  Modal,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import {
  ArrowLeft,
  Search,
  ChevronRight,
  Sparkles,
  CreditCard,
  Coins,
  Briefcase,
  Users,
  Sprout,
  Store,
  BarChart3,
  Lightbulb,
  X,
  CheckCircle2,
  Volume2,
  Square,
} from 'lucide-react-native';

import { api } from '@/services/api';
import { useAuth } from '@/context/AuthContext';
import { Fonts, Shadow } from '@/constants/artisan-theme';
import { isSpeechSupported, stopSpeech } from '@/utils/speech';
import { getSelectedLanguage, speak as centralSpeak, AppLanguage } from '@/utils/language-utils';

interface Scheme {
  id: string;
  name: string;
  short_summary: string;
  category: string;
  level: string;
  state?: string | null;
  ministry: string;
  max_benefit_amount?: string;
  interest_rate?: string;
  processing_cost?: string;
  benefits_json: string;
  eligibility_json: string;
  eligible_trades_json?: string | null;
  documents_json: string;
  apply_steps_json: string;
  after_apply_note?: string | null;
  official_url: string;
  helpline?: string | null;
  last_verified_at: string;
  match_score?: number;
  match_reasons?: string[];
  simple_summary?: string;
}

const CATEGORY_CHIPS = [
  { key: 'all', label: 'All' },
  { key: 'loans', label: 'Loans' },
  { key: 'training', label: 'Training' },
  { key: 'tools', label: 'Tools' },
  { key: 'marketing', label: 'Marketing' },
];

// ── 5 verified government schemes — always shown as fallback ─────────────────
const HARDCODED_SCHEMES: Scheme[] = [
  {
    id: 'pm-vishwakarma',
    name: 'PM Vishwakarma Yojana',
    short_summary: 'Credit support up to ₹3 lakh at just 5% interest, free skill training, and a ₹15,000 modern toolkit kit for traditional artisans and craftspeople.',
    simple_summary: 'Get ₹3 lakh loan at 5%, free skill training & ₹15,000 toolkit.',
    category: 'loans',
    level: 'central',
    ministry: 'Ministry of Micro, Small and Medium Enterprises',
    max_benefit_amount: '₹3,00,000',
    interest_rate: '5%',
    benefits_json: JSON.stringify(['₹15,000 toolkit grant', 'Skill training with ₹500/day stipend', 'Collateral-free loan up to ₹3 lakh @ 5%', 'Digital payment incentive']),
    eligibility_json: JSON.stringify(['Traditional craftsperson or artisan', 'Age 18 or above', 'One member per household']),
    documents_json: JSON.stringify(['Aadhaar card', 'Bank passbook', 'Craft/trade proof']),
    apply_steps_json: JSON.stringify(['Visit nearest CSC (Common Service Centre)', 'Register with Aadhaar', 'Complete skill assessment', 'Receive toolkit grant & apply for loan']),
    official_url: 'https://pmvishwakarma.gov.in',
    helpline: '18002677777',
    last_verified_at: '2026-01-01',
    match_score: 95,
    match_reasons: ['Traditional craftsperson', 'Eligible for toolkit grant'],
  },
  {
    id: 'pm-mudra',
    name: 'PM MUDRA Yojana',
    short_summary: 'Collateral-free business loans from ₹50,000 up to ₹10 lakh for small artisans and micro-entrepreneurs to expand their craft business.',
    simple_summary: 'Get up to ₹10 lakh business loan without collateral.',
    category: 'loans',
    level: 'central',
    ministry: 'Ministry of Finance',
    max_benefit_amount: '₹10,00,000',
    interest_rate: '8–12%',
    benefits_json: JSON.stringify(['Shishu: up to ₹50,000', 'Kishor: ₹50,000 – ₹5 lakh', 'Tarun: ₹5 lakh – ₹10 lakh', 'No collateral required']),
    eligibility_json: JSON.stringify(['Micro or small business owner', 'Non-farm income generating activity', 'Valid Aadhaar and PAN']),
    documents_json: JSON.stringify(['Aadhaar card', 'PAN card', 'Business proof', 'Bank statement (6 months)']),
    apply_steps_json: JSON.stringify(['Visit nearest bank or NBFC', 'Fill MUDRA loan application', 'Submit documents', 'Loan disbursed within 7–10 days']),
    official_url: 'https://www.mudra.org.in',
    helpline: '1800-180-1111',
    last_verified_at: '2026-01-01',
    match_score: 88,
    match_reasons: ['Micro enterprise eligible', 'No collateral needed'],
  },
  {
    id: 'pmegp',
    name: 'PMEGP – Employment Generation Programme',
    short_summary: 'Government subsidy of 15–35% on project cost up to ₹50 lakh for new manufacturing or service enterprises in handicrafts and cottage industries.',
    simple_summary: 'Up to 35% subsidy to start or expand your craft business.',
    category: 'loans',
    level: 'central',
    ministry: 'Ministry of MSME (via KVIC)',
    max_benefit_amount: '₹50,00,000 project',
    interest_rate: 'Subsidy 15–35%',
    benefits_json: JSON.stringify(['15% subsidy urban, 25% rural (general)', '25% urban, 35% rural (SC/ST/Women)', 'Project up to ₹50 lakh manufacturing', 'No income tax for first 3 years']),
    eligibility_json: JSON.stringify(['Age 18 or above', '8th pass for projects above ₹10 lakh', 'New business only (not existing)']),
    documents_json: JSON.stringify(['Aadhaar card', 'Educational certificate', 'Project report', 'Passport photo']),
    apply_steps_json: JSON.stringify(['Apply on PMEGP portal', 'Submit project report', 'Bank sanctions loan', 'Subsidy credited after 3 years']),
    official_url: 'https://www.kviconline.gov.in/pmegpeportal',
    helpline: '1800-3000-0888',
    last_verified_at: '2026-01-01',
    match_score: 82,
    match_reasons: ['Cottage industry eligible', 'Rural subsidy available'],
  },
  {
    id: 'odop',
    name: 'ODOP – One District One Product',
    short_summary: 'Financial and marketing support for artisans making the signature product of their district — packaging development, branding, and trade fair participation.',
    simple_summary: "Support for your district's signature craft — funds, branding & fairs.",
    category: 'marketing',
    level: 'central',
    ministry: 'Ministry of Food Processing Industries / State Governments',
    max_benefit_amount: '₹2,50,000',
    benefits_json: JSON.stringify(['Common facility centre access', 'Packaging & branding support', 'Trade fair & exhibition support', 'Skill training for local craft']),
    eligibility_json: JSON.stringify(["Artisan making district's ODOP product", 'Registered or informal unit', 'Located in the respective district']),
    documents_json: JSON.stringify(['Aadhaar card', 'Craft/trade proof', 'District residence proof']),
    apply_steps_json: JSON.stringify(['Contact District Industries Centre (DIC)', 'Register under ODOP scheme', 'Submit product samples', 'Apply for support funds']),
    official_url: 'https://odop.mofpi.gov.in',
    helpline: '011-26492263',
    last_verified_at: '2026-01-01',
    match_score: 78,
    match_reasons: ['Marketing & branding support', 'District-level craft support'],
  },
  {
    id: 'nhdp',
    name: 'National Handicrafts Development Programme',
    short_summary: 'Design development, skill upgradation, infrastructure support, and market linkage for handicraft clusters under Office of DC (Handicrafts), Ministry of Textiles.',
    simple_summary: 'Cluster support, design training & market linkage for handicraft artisans.',
    category: 'training',
    level: 'central',
    ministry: 'Ministry of Textiles – Office of DC Handicrafts',
    max_benefit_amount: '₹1,00,000',
    benefits_json: JSON.stringify(['Design & skill training workshops', 'Common facility centre in clusters', 'Market linkage & buyer-seller meets', 'Export promotion support']),
    eligibility_json: JSON.stringify(['Handicraft artisan', 'Member of a recognized craft cluster', 'Valid Artisan / Pahchan Card preferred']),
    documents_json: JSON.stringify(['Aadhaar card', 'Artisan / Pahchan card', 'Bank account details']),
    apply_steps_json: JSON.stringify(['Contact nearest DC Handicrafts office', 'Enroll in the cluster programme', 'Attend skill & design training', 'Participate in buyer-seller meets']),
    official_url: 'https://handicrafts.nic.in',
    helpline: '1800-208-9988',
    last_verified_at: '2026-01-01',
    match_score: 75,
    match_reasons: ['Handicraft artisan eligible', 'Training & cluster support'],
  },
];

export default function SchemesListScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { profile } = useAuth();

  const [allSchemes, setAllSchemes] = useState<Scheme[]>([]);
  const [category, setCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(true);
  const [quizModalVisible, setQuizModalVisible] = useState<boolean>(false);
  const [speakingSchemeId, setSpeakingSchemeId] = useState<string | null>(null);

  useEffect(() => {
    return () => {
      stopSpeech();
    };
  }, []);

  const handleToggleSpeech = (scheme: Scheme) => {
    if (!isSpeechSupported()) return;

    if (speakingSchemeId === scheme.id) {
      stopSpeech();
      setSpeakingSchemeId(null);
      return;
    }

    stopSpeech();
    const currentLang = (getSelectedLanguage() || 'en') as AppLanguage;
    const summary = scheme.short_summary || scheme.simple_summary || scheme.name;
    const textToRead = `${scheme.name}. ${summary}`;

    setSpeakingSchemeId(scheme.id);
    centralSpeak(textToRead, currentLang, {
      rate: 0.95,
      pitch: 1.0,
      onDone: () => setSpeakingSchemeId(null),
      onStopped: () => setSpeakingSchemeId(null),
      onError: () => setSpeakingSchemeId(null),
    });
  };

  const craftName = profile?.craft_type || profile?.craft_custom || 'Wood Carving';
  const stateName = profile?.location || 'Tamil Nadu';

  useEffect(() => {
    loadSchemes();
  }, [profile]);


  const loadSchemes = async () => {
    setLoading(true);
    try {
      // Primary: fetch personalized matched schemes using artisan profile
      const matchedRes = await api.get('/schemes/matched', {
        params: { craft_type: craftName, state: stateName },
      });
      let list: Scheme[] = matchedRes.data?.schemes || [];

      // Secondary: if matched returns empty, fetch all schemes
      if (list.length === 0) {
        const allRes = await api.get('/schemes/', {});
        list = allRes.data?.schemes || [];
      }

      // Final fallback: always show hardcoded schemes if API returns nothing
      if (list.length === 0) {
        list = HARDCODED_SCHEMES;
      }

      // Sort with high-priority flagship schemes first
      const priorityOrder = ['pm-vishwakarma', 'pm-mudra', 'pmegp', 'odop', 'nhdp', 'pehchan-nhdp', 'cgtmse'];
      const sorted = [...list].sort((a, b) => {
        const idxA = priorityOrder.indexOf(a.id);
        const idxB = priorityOrder.indexOf(b.id);
        if (idxA !== -1 && idxB !== -1) return idxA - idxB;
        if (idxA !== -1) return -1;
        if (idxB !== -1) return 1;
        return 0;
      });

      setAllSchemes(sorted);
    } catch (err) {
      console.warn('Error loading schemes, using hardcoded fallback:', err);
      setAllSchemes(HARDCODED_SCHEMES);
    } finally {
      setLoading(false);
    }
  };

  const filteredSchemes = useMemo(() => {
    return allSchemes.filter((item) => {
      // Category filter
      if (category === 'loans' && item.category !== 'loans') return false;
      if (category === 'training' && !item.category.includes('training') && item.id !== 'pm-vishwakarma' && item.id !== 'pehchan-nhdp') return false;
      if (category === 'tools' && item.id !== 'pm-vishwakarma' && item.id !== 'odop') return false;
      if (category === 'marketing' && item.category !== 'marketing' && item.id !== 'pehchan-nhdp') return false;

      // Keyword search
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase().trim();
      return (
        item.name.toLowerCase().includes(q) ||
        item.short_summary.toLowerCase().includes(q) ||
        item.ministry.toLowerCase().includes(q)
      );
    });
  }, [allSchemes, category, searchQuery]);

  // Helper to render distinct icon & styling per scheme matching the reference mockup
  const getSchemeVisuals = (id: string, name: string) => {
    switch (id) {
      case 'pehchan-nhdp':
        return {
          icon: CreditCard,
          iconBg: '#E8F6ED',
          iconColor: '#165B33',
          displayTitle: 'PEHCHAN Artisan ID Card',
          oneLiner: 'Official identity and access to multiple benefits',
          isBestMatch: true,
        };
      case 'pm-vishwakarma':
        return {
          icon: Coins,
          iconBg: '#FEF0E2',
          iconColor: '#B45309',
          displayTitle: 'PM Vishwakarma',
          oneLiner: 'Skill training, tools and credit support',
          isBestMatch: false,
        };
      case 'cgtmse':
        return {
          icon: Briefcase,
          iconBg: '#E6F5F1',
          iconColor: '#0F766E',
          displayTitle: 'Credit Guarantee Scheme',
          oneLiner: 'Collateral-free loans for small businesses',
          isBestMatch: false,
        };
      case 'odop':
        return {
          icon: Users,
          iconBg: '#E8F6ED',
          iconColor: '#165B33',
          displayTitle: 'One District One Product (ODOP)',
          oneLiner: 'Branding, shared machines and state subsidies',
          isBestMatch: false,
        };
      case 'pm-mudra':
        return {
          icon: Sprout,
          iconBg: '#E8F4EC',
          iconColor: '#165B33',
          displayTitle: 'PM Mudra Loan Scheme',
          oneLiner: 'Collateral-free credit up to ₹10 Lakh',
          isBestMatch: false,
        };
      case 'pmegp':
        return {
          icon: Store,
          iconBg: '#FEF6E6',
          iconColor: '#B45309',
          displayTitle: 'PMEGP',
          oneLiner: 'Financial support to start new enterprise',
          isBestMatch: false,
        };
      default:
        return {
          icon: BarChart3,
          iconBg: '#EBF5ED',
          iconColor: '#165B33',
          displayTitle: name,
          oneLiner: 'Explore Central & State artisan benefits',
          isBestMatch: false,
        };
    }
  };

  return (
    <View style={s.root}>
      <StatusBar barStyle="dark-content" backgroundColor="#FAF8F5" />

      <View style={s.container}>
        {/* ── Top Bar with Back Arrow ─────────────────────────────────── */}
        <View style={[s.headerWrap, { paddingTop: insets.top + 8 }]}>
          <TouchableOpacity
            style={s.backBtn}
            onPress={() => router.back()}
            activeOpacity={0.7}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          >
            <ArrowLeft size={22} color="#0F172A" strokeWidth={2.2} />
          </TouchableOpacity>

          <Text style={s.pageTitle}>Govt. Schemes</Text>
          <Text style={s.pageSubtitle}>Support and benefits for artisans</Text>
        </View>

        {/* ── Search Bar ─────────────────────────────────────────────── */}
        <View style={s.searchWrap}>
          <View style={s.searchBar}>
            <Search size={18} color="#94A3B8" strokeWidth={2} />
            <TextInput
              style={s.searchInput}
              placeholder="Search schemes..."
              placeholderTextColor="#94A3B8"
              value={searchQuery}
              onChangeText={setSearchQuery}
              returnKeyType="search"
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => setSearchQuery('')} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <X size={16} color="#64748B" />
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* ── Horizontal Filter Chips ────────────────────────────────── */}
        <View style={s.chipsWrap}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={s.chipsScroll}
          >
            {CATEGORY_CHIPS.map((chip) => {
              const isActive = category === chip.key;
              return (
                <TouchableOpacity
                  key={chip.key}
                  style={[s.chip, isActive && s.chipActive]}
                  onPress={() => setCategory(chip.key)}
                  activeOpacity={0.8}
                >
                  <Text style={[s.chipText, isActive && s.chipTextActive]}>
                    {chip.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>

        {loading ? (
          <View style={s.loaderWrap}>
            <ActivityIndicator size="large" color="#1E3A24" />
            <Text style={s.loaderText}>Loading artisan schemes...</Text>
          </View>
        ) : (
          <ScrollView
            style={s.scroll}
            contentContainerStyle={[s.scrollContent, { paddingBottom: insets.bottom + 36 }]}
            showsVerticalScrollIndicator={false}
          >
            {/* ── Verified From Official Sources Card ──────────────────── */}
            <TouchableOpacity
              style={s.verifiedCard}
              activeOpacity={0.85}
              onPress={() => setCategory('all')}
            >
              <View style={s.verifiedIconCircle}>
                <Sprout size={20} color="#165B33" strokeWidth={2.2} />
              </View>
              <View style={s.verifiedTextWrap}>
                <Text style={s.verifiedTitle}>Verified from official Government sources</Text>
                <Text style={s.verifiedSubtitle}>Central & State schemes</Text>
              </View>
              <ChevronRight size={18} color="#4F7E62" strokeWidth={2.4} />
            </TouchableOpacity>

            {/* ── Recommended Section Header ─────────────────────────── */}
            <View style={s.sectionHeader}>
              <Text style={s.sectionTitle}>Recommended for you</Text>
              <Text style={s.sectionSubtitle}>
                Based on your profile ({craftName} · {stateName})
              </Text>
            </View>

            {/* ── Minimal Scheme Cards List ──────────────────────────── */}
            <View style={s.listContainer}>
              {filteredSchemes.length === 0 ? (
                <View style={s.emptyBox}>
                  <Text style={s.emptyTitle}>No schemes found</Text>
                  <Text style={s.emptyText}>No results match "{searchQuery}".</Text>
                  <TouchableOpacity
                    style={s.clearBtn}
                    onPress={() => {
                      setCategory('all');
                      setSearchQuery('');
                    }}
                  >
                    <Text style={s.clearBtnText}>Show All Schemes</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                filteredSchemes.map((scheme) => {
                  const visual = getSchemeVisuals(scheme.id, scheme.name);
                  const IconComp = visual.icon;

                  return (
                    <TouchableOpacity
                      key={scheme.id}
                      style={s.card}
                      activeOpacity={0.85}
                      onPress={() => router.push(`/schemes/${scheme.id}` as any)}
                    >
                      {/* Icon Squircle */}
                      <View style={[s.iconBox, { backgroundColor: visual.iconBg }]}>
                        <IconComp size={22} color={visual.iconColor} strokeWidth={2.2} />
                      </View>

                      {/* Content */}
                      <View style={s.cardContent}>
                        {visual.isBestMatch && (
                          <View style={s.bestMatchBadge}>
                            <Sparkles size={11} color="#C2410C" strokeWidth={2.2} />
                            <Text style={s.bestMatchText}>Best match</Text>
                          </View>
                        )}
                        <Text style={s.cardTitle} numberOfLines={1}>
                          {visual.displayTitle}
                        </Text>
                        <Text style={s.cardSubtitle} numberOfLines={1}>
                          {visual.oneLiner}
                        </Text>
                      </View>

                      {/* Speech Audio Button */}
                      <TouchableOpacity
                        style={s.audioBtn}
                        onPress={(e) => {
                          e.stopPropagation();
                          handleToggleSpeech(scheme);
                        }}
                        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                      >
                        {speakingSchemeId === scheme.id ? (
                          <Square size={15} color="#DC2626" fill="#DC2626" />
                        ) : (
                          <Volume2 size={17} color="#165B33" />
                        )}
                      </TouchableOpacity>

                      {/* Chevron */}
                      <ChevronRight size={18} color="#94A3B8" strokeWidth={2.4} />
                    </TouchableOpacity>
                  );
                })
              )}

              {/* Extra More Schemes Card if filtered */}
              {category !== 'all' && (
                <TouchableOpacity
                  style={s.card}
                  activeOpacity={0.85}
                  onPress={() => {
                    setCategory('all');
                    setSearchQuery('');
                  }}
                >
                  <View style={[s.iconBox, { backgroundColor: '#EBF5ED' }]}>
                    <BarChart3 size={22} color="#165B33" strokeWidth={2.2} />
                  </View>
                  <View style={s.cardContent}>
                    <Text style={s.cardTitle}>More Schemes</Text>
                    <Text style={s.cardSubtitle}>Explore all Central & State schemes</Text>
                  </View>
                  <ChevronRight size={18} color="#94A3B8" strokeWidth={2.4} />
                </TouchableOpacity>
              )}
            </View>

            {/* ── Quiz Helper Bottom Card ────────────────────────────── */}
            <TouchableOpacity
              style={s.quizCard}
              activeOpacity={0.85}
              onPress={() => setQuizModalVisible(true)}
            >
              <View style={s.quizIconCircle}>
                <Lightbulb size={20} color="#165B33" strokeWidth={2.2} />
              </View>
              <View style={s.quizTextWrap}>
                <Text style={s.quizTitle}>Not sure which scheme is right for you?</Text>
                <Text style={s.quizLink}>Take a short quiz →</Text>
              </View>
            </TouchableOpacity>
          </ScrollView>
        )}
      </View>

      {/* ── Quick Recommendation Quiz Modal ──────────────────────── */}
      <Modal
        visible={quizModalVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setQuizModalVisible(false)}
      >
        <View style={s.modalOverlay}>
          <View style={s.modalSheet}>
            <View style={s.modalHeader}>
              <Text style={s.modalHeaderTitle}>Find Your Best Scheme</Text>
              <TouchableOpacity onPress={() => setQuizModalVisible(false)}>
                <X size={20} color="#64748B" />
              </TouchableOpacity>
            </View>

            <Text style={s.modalDesc}>
              What does your craft business need most right now?
            </Text>

            <TouchableOpacity
              style={s.quizOption}
              onPress={() => {
                setQuizModalVisible(false);
                router.push('/schemes/pm-vishwakarma' as any);
              }}
            >
              <View style={[s.quizOptionIcon, { backgroundColor: '#FEF0E2' }]}>
                <Coins size={18} color="#B45309" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={s.quizOptionTitle}>Toolkits & Low-Interest Loan</Text>
                <Text style={s.quizOptionSub}>PM Vishwakarma (₹15k toolkit + ₹3L at 5%)</Text>
              </View>
              <ChevronRight size={16} color="#94A3B8" />
            </TouchableOpacity>

            <TouchableOpacity
              style={s.quizOption}
              onPress={() => {
                setQuizModalVisible(false);
                router.push('/schemes/pehchan-nhdp' as any);
              }}
            >
              <View style={[s.quizOptionIcon, { backgroundColor: '#E8F6ED' }]}>
                <CreditCard size={18} color="#165B33" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={s.quizOptionTitle}>Official Artisan ID & Exhibition Stalls</Text>
                <Text style={s.quizOptionSub}>Pehchan Card & NHDP workshops</Text>
              </View>
              <ChevronRight size={16} color="#94A3B8" />
            </TouchableOpacity>

            <TouchableOpacity
              style={s.quizOption}
              onPress={() => {
                setQuizModalVisible(false);
                router.push('/schemes/pmegp' as any);
              }}
            >
              <View style={[s.quizOptionIcon, { backgroundColor: '#FEF6E6' }]}>
                <Store size={18} color="#B45309" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={s.quizOptionTitle}>Subsidy to Open a Production Unit</Text>
                <Text style={s.quizOptionSub}>PMEGP (up to 35% government subsidy)</Text>
              </View>
              <ChevronRight size={16} color="#94A3B8" />
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const s = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#FAF8F5',
  },
  container: {
    flex: 1,
    width: '100%',
    maxWidth: 480,
    alignSelf: 'center',
  },

  /* Header */
  headerWrap: {
    paddingHorizontal: 20,
    paddingBottom: 8,
  },
  backBtn: {
    width: 36,
    height: 36,
    justifyContent: 'center',
    marginBottom: 8,
  },
  pageTitle: {
    fontSize: 27,
    fontFamily: Fonts.headingBold,
    fontWeight: '800',
    color: '#0F172A',
    letterSpacing: -0.5,
  },
  pageSubtitle: {
    fontSize: 14,
    fontFamily: Fonts.body,
    color: '#64748B',
    marginTop: 3,
  },

  /* Search */
  searchWrap: {
    paddingHorizontal: 20,
    marginTop: 12,
    marginBottom: 10,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingHorizontal: 14,
    height: 46,
    gap: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    fontFamily: Fonts.body,
    color: '#0F172A',
    height: '100%',
  },

  /* Chips */
  chipsWrap: {
    marginBottom: 12,
  },
  chipsScroll: {
    paddingHorizontal: 20,
    gap: 8,
  },
  chip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  chipActive: {
    backgroundColor: '#1E3A24',
    borderColor: '#1E3A24',
  },
  chipText: {
    fontSize: 13,
    fontFamily: Fonts.bodyMedium,
    color: '#475569',
    fontWeight: '500',
  },
  chipTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },

  loaderWrap: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
  },
  loaderText: {
    fontSize: 13,
    fontFamily: Fonts.body,
    color: '#64748B',
  },

  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
  },

  /* Verified Banner Card */
  verifiedCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EBF6EE',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: '#D7EBDC',
    marginBottom: 18,
    gap: 12,
  },
  verifiedIconCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#D7EBDC',
    justifyContent: 'center',
    alignItems: 'center',
  },
  verifiedTextWrap: {
    flex: 1,
  },
  verifiedTitle: {
    fontSize: 13.5,
    fontFamily: Fonts.headingBold,
    fontWeight: '700',
    color: '#165B33',
    lineHeight: 18,
  },
  verifiedSubtitle: {
    fontSize: 12,
    fontFamily: Fonts.body,
    color: '#4F7E62',
    marginTop: 2,
  },

  /* Section Header */
  sectionHeader: {
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 16,
    fontFamily: Fonts.headingBold,
    fontWeight: '700',
    color: '#0F172A',
  },
  sectionSubtitle: {
    fontSize: 12,
    fontFamily: Fonts.body,
    color: '#64748B',
    marginTop: 2,
  },

  /* List of Scheme Cards */
  listContainer: {
    gap: 10,
    marginBottom: 16,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    gap: 12,
    ...Shadow.card,
  },
  iconBox: {
    width: 44,
    height: 44,
    borderRadius: 13,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardContent: {
    flex: 1,
    justifyContent: 'center',
  },
  bestMatchBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: '#FEEAD8',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    gap: 3,
    marginBottom: 3,
  },
  bestMatchText: {
    fontSize: 10,
    fontFamily: Fonts.headingBold,
    fontWeight: '700',
    color: '#C2410C',
  },
  cardTitle: {
    fontSize: 14.5,
    fontFamily: Fonts.headingBold,
    fontWeight: '700',
    color: '#0F172A',
  },
  cardSubtitle: {
    fontSize: 12,
    fontFamily: Fonts.body,
    color: '#64748B',
    marginTop: 2,
  },
  audioBtn: {
    padding: 7,
    borderRadius: 20,
    backgroundColor: '#F0FDF4',
    borderWidth: 1,
    borderColor: '#DCFCE7',
    marginRight: 4,
  },

  /* Quiz Card */
  quizCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0F8F3',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: '#D9EEDE',
    gap: 12,
    marginTop: 4,
    marginBottom: 10,
  },
  quizIconCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#D9EEDE',
    justifyContent: 'center',
    alignItems: 'center',
  },
  quizTextWrap: {
    flex: 1,
  },
  quizTitle: {
    fontSize: 12.5,
    fontFamily: Fonts.bodyMedium,
    color: '#334155',
  },
  quizLink: {
    fontSize: 13,
    fontFamily: Fonts.headingBold,
    fontWeight: '700',
    color: '#165B33',
    marginTop: 2,
  },

  /* Empty State */
  emptyBox: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#F1F5F9',
    gap: 6,
  },
  emptyTitle: {
    fontSize: 15,
    fontFamily: Fonts.headingBold,
    fontWeight: '700',
    color: '#0F172A',
  },
  emptyText: {
    fontSize: 12.5,
    fontFamily: Fonts.body,
    color: '#64748B',
    textAlign: 'center',
  },
  clearBtn: {
    marginTop: 8,
    backgroundColor: '#1E3A24',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 10,
  },
  clearBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontFamily: Fonts.headingBold,
    fontWeight: '700',
  },

  /* Quiz Modal */
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    paddingBottom: 36,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  modalHeaderTitle: {
    fontSize: 17,
    fontFamily: Fonts.headingBold,
    fontWeight: '700',
    color: '#0F172A',
  },
  modalDesc: {
    fontSize: 13,
    fontFamily: Fonts.body,
    color: '#64748B',
    marginBottom: 16,
  },
  quizOption: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 10,
    gap: 12,
  },
  quizOptionIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  quizOptionTitle: {
    fontSize: 13.5,
    fontFamily: Fonts.headingBold,
    fontWeight: '700',
    color: '#0F172A',
  },
  quizOptionSub: {
    fontSize: 11.5,
    fontFamily: Fonts.body,
    color: '#64748B',
    marginTop: 1,
  },
});
