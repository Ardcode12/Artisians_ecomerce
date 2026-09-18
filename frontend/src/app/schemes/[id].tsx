import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Linking,
  StatusBar,
  Modal,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import {
  ArrowLeft,
  ArrowRight,
  ShieldCheck,
  ChevronRight,
  CreditCard,
  Coins,
  Store,
  Briefcase,
  GraduationCap,
  IndianRupee,
  Shield,
  Award,
  Users,
  FileText,
  MapPin,
  ListChecks,
  ExternalLink,
  Info,
  CheckSquare,
  Square,
  X,
  Lightbulb,
  Phone,
} from 'lucide-react-native';

import { api } from '@/services/api';
import { useAuth } from '@/context/AuthContext';
import { Fonts, Shadow } from '@/constants/artisan-theme';

interface EligibilityCondition {
  condition: string;
  hard_block?: boolean;
}

interface DocumentItem {
  name: string;
  fallback_note?: string | null;
}

interface ApplyStep {
  mode: 'in_person' | 'online' | 'helpline';
  label: string;
  detail: string;
  link?: string | null;
}

interface SchemeDetail {
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
}

// Preset visual configurations tailored to each scheme matching the reference design
const SCHEME_CONFIGS: Record<
  string,
  {
    heroIcon: any;
    heroBg: string;
    heroIconColor: string;
    displayTitle: string;
    heroDesc: string;
    benefits: { title: string; sub: string; icon: any; iconBg: string; iconColor: string }[];
    whoCanApplySub: string;
    docsSub: string;
    whereToApplySub: string;
    stepsSub: string;
    officialDomain: string;
  }
> = {
  'pehchan-nhdp': {
    heroIcon: CreditCard,
    heroBg: '#E8F6ED',
    heroIconColor: '#165B33',
    displayTitle: 'PEHCHAN Artisan ID Card',
    heroDesc:
      'An official artisan ID card that gives you access to workshops, market stalls, insurance and more.',
    benefits: [
      { title: 'Skill Training', sub: 'Design & technology', icon: GraduationCap, iconBg: '#FEF9E7', iconColor: '#B45309' },
      { title: 'Financial Support', sub: 'Access to loans', icon: IndianRupee, iconBg: '#FEF3E8', iconColor: '#C2410C' },
      { title: 'Insurance Support', sub: 'Health & life insurance', icon: Shield, iconBg: '#EBF7EE', iconColor: '#165B33' },
      { title: 'Recognition', sub: 'National awards', icon: Award, iconBg: '#FDF0E8', iconColor: '#B45309' },
    ],
    whoCanApplySub: 'Traditional artisans and craftspeople (18 years or above)',
    docsSub: 'Aadhaar, bank details, ration card and more',
    whereToApplySub: 'Online or at nearest Handicrafts Service Centre (HSC)',
    stepsSub: 'Simple step-by-step guide',
    officialDomain: 'handicrafts.gov.in',
  },
  'pm-vishwakarma': {
    heroIcon: Coins,
    heroBg: '#FEF0E2',
    heroIconColor: '#B45309',
    displayTitle: 'PM Vishwakarma Yojana',
    heroDesc:
      'Collateral-free loans up to ₹3 lakh, a ₹15,000 toolkit voucher, and free skill training for 18 traditional trades.',
    benefits: [
      { title: 'Skill Training', sub: '₹500/day stipend', icon: GraduationCap, iconBg: '#FEF9E7', iconColor: '#B45309' },
      { title: 'Financial Support', sub: 'Up to ₹3L at 5% rate', icon: IndianRupee, iconBg: '#FEF3E8', iconColor: '#C2410C' },
      { title: 'Toolkit Voucher', sub: '₹15,000 modern tools', icon: Shield, iconBg: '#EBF7EE', iconColor: '#165B33' },
      { title: 'Digital Incentive', sub: '₹1 per digital sale', icon: Award, iconBg: '#FDF0E8', iconColor: '#B45309' },
    ],
    whoCanApplySub: 'Self-employed artisans in 18 listed trades (Pottery, Carpentry, etc.)',
    docsSub: 'Aadhaar linked to mobile, bank passbook, ration card',
    whereToApplySub: 'Nearest Common Service Centre (CSC) or pmvishwakarma.gov.in',
    stepsSub: 'CSC biometric application → Gram Panchayat approval',
    officialDomain: 'pmvishwakarma.gov.in',
  },
  'cgtmse': {
    heroIcon: Briefcase,
    heroBg: '#E6F5F1',
    heroIconColor: '#0F766E',
    displayTitle: 'Credit Guarantee Scheme',
    heroDesc:
      'Collateral-free bank loan coverage up to ₹5 Crore for registered micro and small craft enterprises.',
    benefits: [
      { title: 'Zero Collateral', sub: 'No property or gold', icon: Shield, iconBg: '#EBF7EE', iconColor: '#165B33' },
      { title: 'Working Capital', sub: 'Term loans & credit', icon: IndianRupee, iconBg: '#FEF3E8', iconColor: '#C2410C' },
      { title: 'High Coverage', sub: 'Up to 85% guarantee', icon: GraduationCap, iconBg: '#FEF9E7', iconColor: '#B45309' },
      { title: 'Enterprise Growth', sub: 'Scale beyond Mudra', icon: Award, iconBg: '#FDF0E8', iconColor: '#B45309' },
    ],
    whoCanApplySub: 'Registered artisan enterprises seeking fresh bank credit',
    docsSub: 'Udyam MSME certificate, PAN, bank statements',
    whereToApplySub: 'Directly at any member bank (SBI, Canara, PNB, etc.)',
    stepsSub: 'Apply under CGTMSE cover at your lending bank branch',
    officialDomain: 'cgtmse.in',
  },
  'odop': {
    heroIcon: Users,
    heroBg: '#E8F6ED',
    heroIconColor: '#165B33',
    displayTitle: 'One District One Product (ODOP)',
    heroDesc:
      'Official district branding, shared common machines, national expo stalls, and state margin money subsidies.',
    benefits: [
      { title: 'District Branding', sub: 'Flagship craft badge', icon: Award, iconBg: '#FDF0E8', iconColor: '#B45309' },
      { title: 'State Subsidy', sub: 'Up to ₹6.25L margin', icon: IndianRupee, iconBg: '#FEF3E8', iconColor: '#C2410C' },
      { title: 'Common Centers', sub: 'Shared modern kilns', icon: Shield, iconBg: '#EBF7EE', iconColor: '#165B33' },
      { title: 'Exhibition Access', sub: 'Free stalls at expos', icon: GraduationCap, iconBg: '#FEF9E7', iconColor: '#B45309' },
    ],
    whoCanApplySub: 'Artisans making the officially notified district specialty craft',
    docsSub: 'Aadhaar, Udyam registration, craft sample proof',
    whereToApplySub: 'District Industries Centre (DIC) or State MSME portal',
    stepsSub: 'Confirm district product at DIC → Submit project sheet',
    officialDomain: 'odop.in',
  },
  'pm-mudra': {
    heroIcon: Coins,
    heroBg: '#FEF0E2',
    heroIconColor: '#B45309',
    displayTitle: 'Pradhan Mantri Mudra Yojana',
    heroDesc:
      'Collateral-free bank loans up to ₹10 Lakh across Shishu, Kishor, and Tarun tiers for small craft businesses.',
    benefits: [
      { title: 'Collateral-Free', sub: 'No security deposit', icon: Shield, iconBg: '#EBF7EE', iconColor: '#165B33' },
      { title: 'Flexible Tiers', sub: '₹50k up to ₹10 Lakh', icon: IndianRupee, iconBg: '#FEF3E8', iconColor: '#C2410C' },
      { title: 'Mudra RuPay Card', sub: 'Hassle-free withdrawal', icon: GraduationCap, iconBg: '#FEF9E7', iconColor: '#B45309' },
      { title: 'Flexible Tenure', sub: 'Repay over 5 years', icon: Award, iconBg: '#FDF0E8', iconColor: '#B45309' },
    ],
    whoCanApplySub: 'Small non-farm artisans and craft manufacturers with no defaults',
    docsSub: 'Mudra application form, Aadhaar/PAN, raw material quotation',
    whereToApplySub: 'Any nationalized, private, or regional rural bank branch',
    stepsSub: 'Walk in with craft quote → Quick bank credit approval',
    officialDomain: 'mudra.org.in',
  },
  'pmegp': {
    heroIcon: Store,
    heroBg: '#FEF6E6',
    heroIconColor: '#B45309',
    displayTitle: 'PMEGP Subsidy Scheme',
    heroDesc:
      'Set up a new micro-enterprise with a bank loan covering up to 95% of project cost and a government subsidy of 15–35%.',
    benefits: [
      { title: 'Bank Loan', sub: 'Up to 95% project cost', icon: IndianRupee, iconBg: '#FEF3E8', iconColor: '#C2410C' },
      { title: 'Govt Subsidy', sub: '15% to 35% non-repayable', icon: Shield, iconBg: '#EBF7EE', iconColor: '#165B33' },
      { title: 'Business Training', sub: 'Free EDP workshops', icon: GraduationCap, iconBg: '#FEF9E7', iconColor: '#B45309' },
      { title: 'CGTMSE Cover', sub: 'Collateral-free credit', icon: Award, iconBg: '#FDF0E8', iconColor: '#B45309' },
    ],
    whoCanApplySub: '18+ years, setting up new craft manufacturing unit (8th pass for > ₹10L)',
    docsSub: 'Aadhaar, PAN, simple project cost report, caste certificate',
    whereToApplySub: 'KVIC PMEGP e-portal (Online) or District Industries Centre (DIC)',
    stepsSub: 'Online application → DIC review → Bank subsidy credit',
    officialDomain: 'kviconline.gov.in',
  },
};

export default function SchemeDetailScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { profile } = useAuth();

  const [scheme, setScheme] = useState<SchemeDetail | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [checked, setChecked] = useState<Set<number>>(new Set());
  const [gathered, setGathered] = useState<Set<string>>(new Set());

  // Interactive Bottom Sheets / Modals
  const [eligibilityModalOpen, setEligibilityModalOpen] = useState<boolean>(false);
  const [documentsModalOpen, setDocumentsModalOpen] = useState<boolean>(false);
  const [whereToApplyModalOpen, setWhereToApplyModalOpen] = useState<boolean>(false);
  const [stepsModalOpen, setStepsModalOpen] = useState<boolean>(false);

  const userId = profile?.id || profile?.phone || 'guest_artisan';

  useEffect(() => {
    if (!id) return;
    loadSchemeData(id);
  }, [id]);

  const loadSchemeData = async (schemeId: string) => {
    setLoading(true);
    try {
      const [detailRes, progRes] = await Promise.all([
        api.get(`/schemes/${schemeId}`),
        api.get(`/schemes/${schemeId}/progress`, { params: { user_id: userId } }).catch(() => ({ data: {} })),
      ]);

      const data = detailRes.data?.scheme || detailRes.data;
      setScheme(data);

      const prog = progRes.data?.progress;
      if (prog) {
        if (Array.isArray(prog.checked_conditions)) {
          setChecked(new Set(prog.checked_conditions));
        }
        if (Array.isArray(prog.documents_gathered)) {
          setGathered(new Set(prog.documents_gathered));
        }
      }
    } catch (err) {
      console.warn('Error loading scheme details:', err);
    } finally {
      setLoading(false);
    }
  };

  const persistProgress = async (nextChecked: Set<number>, nextGathered: Set<string>) => {
    if (!scheme) return;
    try {
      await api.post(`/schemes/${scheme.id}/progress`, {
        user_id: userId,
        checked: Array.from(nextChecked),
        docs: Array.from(nextGathered),
      });
    } catch (_) {}
  };

  const toggleCheck = (idx: number) => {
    const next = new Set(checked);
    if (next.has(idx)) {
      next.delete(idx);
    } else {
      next.add(idx);
    }
    setChecked(next);
    persistProgress(next, gathered);
  };

  const toggleDoc = (docName: string) => {
    const next = new Set(gathered);
    if (next.has(docName)) {
      next.delete(docName);
    } else {
      next.add(docName);
    }
    setGathered(next);
    persistProgress(checked, next);
  };

  const handleOpenLink = (url?: string | null) => {
    if (!url) return;
    Linking.openURL(url).catch(() => {});
  };

  if (loading) {
    return (
      <View style={[s.root, s.center]}>
        <ActivityIndicator size="large" color="#1E3A24" />
        <Text style={s.loaderText}>Loading scheme details...</Text>
      </View>
    );
  }

  if (!scheme) {
    return (
      <View style={[s.root, s.center]}>
        <Text style={s.errorText}>Scheme details could not be found.</Text>
        <TouchableOpacity style={s.backBtnSmall} onPress={() => router.back()}>
          <Text style={s.backBtnSmallText}>Back to Schemes</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // Parse items
  let eligibilityList: EligibilityCondition[] = [];
  try {
    eligibilityList = typeof scheme.eligibility_json === 'string' ? JSON.parse(scheme.eligibility_json) : scheme.eligibility_json || [];
  } catch (_) {
    eligibilityList = [];
  }

  let documentsList: DocumentItem[] = [];
  try {
    documentsList = typeof scheme.documents_json === 'string' ? JSON.parse(scheme.documents_json) : scheme.documents_json || [];
  } catch (_) {
    documentsList = [];
  }

  let stepsList: ApplyStep[] = [];
  try {
    stepsList = typeof scheme.apply_steps_json === 'string' ? JSON.parse(scheme.apply_steps_json) : scheme.apply_steps_json || [];
  } catch (_) {
    stepsList = [];
  }

  const config = SCHEME_CONFIGS[scheme.id] || {
    heroIcon: CreditCard,
    heroBg: '#E8F6ED',
    heroIconColor: '#165B33',
    displayTitle: scheme.name,
    heroDesc: scheme.short_summary,
    benefits: [
      { title: 'Skill Training', sub: 'Design & technology', icon: GraduationCap, iconBg: '#FEF9E7', iconColor: '#B45309' },
      { title: 'Financial Support', sub: 'Access to loans', icon: IndianRupee, iconBg: '#FEF3E8', iconColor: '#C2410C' },
      { title: 'Insurance Support', sub: 'Health & life insurance', icon: Shield, iconBg: '#EBF7EE', iconColor: '#165B33' },
      { title: 'Recognition', sub: 'National awards', icon: Award, iconBg: '#FDF0E8', iconColor: '#B45309' },
    ],
    whoCanApplySub: 'Traditional artisans and craftspeople (18 years or above)',
    docsSub: 'Aadhaar, bank details, ration card and more',
    whereToApplySub: 'Online or at nearest government center',
    stepsSub: 'Simple step-by-step guide',
    officialDomain: scheme.official_url ? scheme.official_url.replace(/https?:\/\/(www\.)?/, '').split('/')[0] : 'gov.in',
  };

  const HeroIconComp = config.heroIcon;

  return (
    <View style={s.root}>
      <StatusBar barStyle="dark-content" backgroundColor="#FAF8F5" />

      <View style={s.container}>
        {/* ── Top Bar with Official Scheme Pill ──────────────────────── */}
        <View style={[s.topBar, { paddingTop: insets.top + 8 }]}>
          <TouchableOpacity
            style={s.backBtn}
            onPress={() => router.back()}
            activeOpacity={0.7}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          >
            <ArrowLeft size={22} color="#0F172A" strokeWidth={2.2} />
          </TouchableOpacity>

        <View style={s.officialPill}>
          <ShieldCheck size={13} color="#165B33" strokeWidth={2.4} />
          <Text style={s.officialPillText}>Official Scheme</Text>
        </View>
      </View>

      <ScrollView
        style={s.scroll}
        contentContainerStyle={[s.scrollContent, { paddingBottom: insets.bottom + 40 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Title & Ministry ──────────────────────────────────────── */}
        <View style={s.titleBox}>
          <Text style={s.schemeTitle}>{config.displayTitle}</Text>
          <Text style={s.ministryText}>{scheme.ministry}</Text>
        </View>

        {/* ── Hero Feature Card ─────────────────────────────────────── */}
        <View style={s.heroCard}>
          <View style={[s.heroIconBox, { backgroundColor: '#D7EBDC' }]}>
            <HeroIconComp size={28} color="#165B33" strokeWidth={2.2} />
          </View>
          <Text style={s.heroCardText}>{config.heroDesc}</Text>
        </View>

        {/* ── Key Benefits (2x2 Grid) ───────────────────────────────── */}
        <View style={s.sectionHeader}>
          <Text style={s.sectionTitle}>Key Benefits</Text>
        </View>

        <View style={s.benefitsGrid}>
          {config.benefits.map((b, idx) => {
            const BIcon = b.icon;
            return (
              <View key={`benefit-${idx}`} style={s.benefitCard}>
                <View style={[s.benefitIconCircle, { backgroundColor: b.iconBg }]}>
                  <BIcon size={18} color={b.iconColor} strokeWidth={2.2} />
                </View>
                <Text style={s.benefitCardTitle}>{b.title}</Text>
                <Text style={s.benefitCardSub}>{b.sub}</Text>
              </View>
            );
          })}
        </View>

        {/* ── Actionable Stacked Section Cards ───────────────────────── */}
        <View style={s.actionStack}>
          {/* 1. Who can apply? */}
          <TouchableOpacity
            style={s.actionRowCard}
            activeOpacity={0.8}
            onPress={() => setEligibilityModalOpen(true)}
          >
            <View style={[s.actionIconCircle, { backgroundColor: '#E8F6ED' }]}>
              <Users size={18} color="#165B33" strokeWidth={2.2} />
            </View>
            <View style={s.actionTextWrap}>
              <Text style={s.actionTitle}>Who can apply?</Text>
              <Text style={s.actionSub} numberOfLines={1}>
                {config.whoCanApplySub}
              </Text>
            </View>
            <ChevronRight size={18} color="#94A3B8" strokeWidth={2.4} />
          </TouchableOpacity>

          {/* 2. Documents needed */}
          <TouchableOpacity
            style={s.actionRowCard}
            activeOpacity={0.8}
            onPress={() => setDocumentsModalOpen(true)}
          >
            <View style={[s.actionIconCircle, { backgroundColor: '#FEF2E6' }]}>
              <FileText size={18} color="#B45309" strokeWidth={2.2} />
            </View>
            <View style={s.actionTextWrap}>
              <Text style={s.actionTitle}>Documents needed</Text>
              <Text style={s.actionSub} numberOfLines={1}>
                {config.docsSub}
              </Text>
            </View>
            <ChevronRight size={18} color="#94A3B8" strokeWidth={2.4} />
          </TouchableOpacity>

          {/* 3. Where to apply */}
          <TouchableOpacity
            style={s.actionRowCard}
            activeOpacity={0.8}
            onPress={() => setWhereToApplyModalOpen(true)}
          >
            <View style={[s.actionIconCircle, { backgroundColor: '#EFF6FF' }]}>
              <MapPin size={18} color="#0369A1" strokeWidth={2.2} />
            </View>
            <View style={s.actionTextWrap}>
              <Text style={s.actionTitle}>Where to apply</Text>
              <Text style={s.actionSub} numberOfLines={1}>
                {config.whereToApplySub}
              </Text>
            </View>
            <ChevronRight size={18} color="#94A3B8" strokeWidth={2.4} />
          </TouchableOpacity>

          {/* 4. Application steps */}
          <TouchableOpacity
            style={s.actionRowCard}
            activeOpacity={0.8}
            onPress={() => setStepsModalOpen(true)}
          >
            <View style={[s.actionIconCircle, { backgroundColor: '#F1F5F9' }]}>
              <ListChecks size={18} color="#334155" strokeWidth={2.2} />
            </View>
            <View style={s.actionTextWrap}>
              <Text style={s.actionTitle}>Application steps</Text>
              <Text style={s.actionSub} numberOfLines={1}>
                {config.stepsSub}
              </Text>
            </View>
            <ChevronRight size={18} color="#94A3B8" strokeWidth={2.4} />
          </TouchableOpacity>
        </View>

        {/* ── Action Buttons ────────────────────────────────────────── */}
        <View style={s.buttonsGroup}>
          <TouchableOpacity
            style={s.primaryBtn}
            activeOpacity={0.88}
            onPress={() => setEligibilityModalOpen(true)}
          >
            <Text style={s.primaryBtnText}>Check Eligibility</Text>
            <ArrowRight size={16} color="#FFFFFF" strokeWidth={2.4} />
          </TouchableOpacity>

          <TouchableOpacity
            style={s.secondaryBtn}
            activeOpacity={0.88}
            onPress={() => handleOpenLink(scheme.official_url)}
          >
            <ExternalLink size={16} color="#1E3A24" strokeWidth={2.2} />
            <Text style={s.secondaryBtnText}>Visit Official Portal</Text>
          </TouchableOpacity>
        </View>

        {/* ── Footer Info Strip ─────────────────────────────────────── */}
        <View style={s.infoCard}>
          <Info size={16} color="#64748B" strokeWidth={2} />
          <View style={{ flex: 1 }}>
            <Text style={s.infoCardText}>Information verified on 17 Sep 2026</Text>
            <Text style={s.infoCardSub}>Source: {config.officialDomain}</Text>
          </View>
        </View>
      </ScrollView>
      </View>

      {/* ── 1. Eligibility Checklist Modal / Drawer ────────────────── */}
      <Modal
        visible={eligibilityModalOpen}
        animationType="slide"
        transparent
        onRequestClose={() => setEligibilityModalOpen(false)}
      >
        <View style={s.modalOverlay}>
          <View style={s.modalSheet}>
            <View style={s.modalHeader}>
              <View>
                <Text style={s.modalTitle}>Who can apply?</Text>
                <Text style={s.modalSubtitle}>Tap conditions that apply to you</Text>
              </View>
              <TouchableOpacity onPress={() => setEligibilityModalOpen(false)}>
                <X size={20} color="#64748B" />
              </TouchableOpacity>
            </View>

            {/* Live Progress */}
            <View style={s.modalProgressRow}>
              <View style={s.modalProgressBar}>
                <View
                  style={[
                    s.modalProgressFill,
                    { width: `${Math.round((checked.size / (eligibilityList.length || 1)) * 100)}%` },
                  ]}
                />
              </View>
              <Text style={s.modalProgressLabel}>
                {checked.size} of {eligibilityList.length} — {checked.size === eligibilityList.length ? 'Likely eligible 🎉' : 'Tap to check'}
              </Text>
            </View>

            <ScrollView style={s.modalScroll} showsVerticalScrollIndicator={false}>
              {eligibilityList.map((item, idx) => {
                const isChecked = checked.has(idx);
                return (
                  <TouchableOpacity
                    key={`elig-item-${idx}`}
                    style={[s.checkRow, isChecked && s.checkRowActive]}
                    activeOpacity={0.8}
                    onPress={() => toggleCheck(idx)}
                  >
                    {isChecked ? (
                      <CheckSquare size={20} color="#1E3A24" strokeWidth={2.4} />
                    ) : (
                      <Square size={20} color="#94A3B8" strokeWidth={1.8} />
                    )}
                    <Text style={[s.checkText, isChecked && s.checkTextActive]}>
                      {item.condition}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            <TouchableOpacity
              style={s.modalCtaBtn}
              onPress={() => {
                setEligibilityModalOpen(false);
                setDocumentsModalOpen(true);
              }}
            >
              <Text style={s.modalCtaText}>Next: Check Required Documents →</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* ── 2. Documents Needed Modal / Drawer ──────────────────────── */}
      <Modal
        visible={documentsModalOpen}
        animationType="slide"
        transparent
        onRequestClose={() => setDocumentsModalOpen(false)}
      >
        <View style={s.modalOverlay}>
          <View style={s.modalSheet}>
            <View style={s.modalHeader}>
              <View>
                <Text style={s.modalTitle}>Documents Needed</Text>
                <Text style={s.modalSubtitle}>Tick off documents as you gather them</Text>
              </View>
              <TouchableOpacity onPress={() => setDocumentsModalOpen(false)}>
                <X size={20} color="#64748B" />
              </TouchableOpacity>
            </View>

            <Text style={s.modalDocsCounter}>
              {gathered.size} of {documentsList.length} ready
            </Text>

            <ScrollView style={s.modalScroll} showsVerticalScrollIndicator={false}>
              {documentsList.map((doc, idx) => {
                const isGathered = gathered.has(doc.name);
                return (
                  <View key={`doc-item-${idx}`} style={s.docItemCard}>
                    <TouchableOpacity
                      style={s.docTouchRow}
                      activeOpacity={0.8}
                      onPress={() => toggleDoc(doc.name)}
                    >
                      {isGathered ? (
                        <CheckSquare size={20} color="#165B33" strokeWidth={2.4} />
                      ) : (
                        <Square size={20} color="#94A3B8" strokeWidth={1.8} />
                      )}
                      <Text style={[s.docName, isGathered && s.docNameGathered]}>
                        {doc.name}
                      </Text>
                    </TouchableOpacity>
                    {doc.fallback_note && (
                      <View style={s.docFallbackTip}>
                        <Lightbulb size={13} color="#B45309" />
                        <Text style={s.docFallbackText}>{doc.fallback_note}</Text>
                      </View>
                    )}
                  </View>
                );
              })}
            </ScrollView>

            <TouchableOpacity
              style={s.modalCtaBtn}
              onPress={() => {
                setDocumentsModalOpen(false);
                setWhereToApplyModalOpen(true);
              }}
            >
              <Text style={s.modalCtaText}>Next: Where to Apply →</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* ── 3. Where to Apply Modal / Drawer ────────────────────────── */}
      <Modal
        visible={whereToApplyModalOpen}
        animationType="slide"
        transparent
        onRequestClose={() => setWhereToApplyModalOpen(false)}
      >
        <View style={s.modalOverlay}>
          <View style={s.modalSheet}>
            <View style={s.modalHeader}>
              <View>
                <Text style={s.modalTitle}>Where to Apply</Text>
                <Text style={s.modalSubtitle}>In person, online, or helpline</Text>
              </View>
              <TouchableOpacity onPress={() => setWhereToApplyModalOpen(false)}>
                <X size={20} color="#64748B" />
              </TouchableOpacity>
            </View>

            <ScrollView style={s.modalScroll} showsVerticalScrollIndicator={false}>
              {stepsList.map((step, idx) => (
                <View key={`apply-step-${idx}`} style={s.applyStepCard}>
                  <Text style={s.applyStepLabel}>{step.label}</Text>
                  <Text style={s.applyStepDetail}>{step.detail}</Text>
                  {step.link && (
                    <TouchableOpacity
                      style={s.applyStepLinkBtn}
                      onPress={() => handleOpenLink(step.link)}
                    >
                      <Text style={s.applyStepLinkText}>Open Link →</Text>
                    </TouchableOpacity>
                  )}
                </View>
              ))}

              {scheme.helpline && (
                <TouchableOpacity
                  style={s.helplineRow}
                  onPress={() => Linking.openURL(`tel:${scheme.helpline}`)}
                >
                  <Phone size={16} color="#165B33" />
                  <Text style={s.helplineText}>Call Helpline: {scheme.helpline}</Text>
                </TouchableOpacity>
              )}
            </ScrollView>

            <TouchableOpacity
              style={s.modalCtaBtn}
              onPress={() => handleOpenLink(scheme.official_url)}
            >
              <Text style={s.modalCtaText}>Visit Official Government Portal ↗</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* ── 4. Application Steps Modal / Drawer ─────────────────────── */}
      <Modal
        visible={stepsModalOpen}
        animationType="slide"
        transparent
        onRequestClose={() => setStepsModalOpen(false)}
      >
        <View style={s.modalOverlay}>
          <View style={s.modalSheet}>
            <View style={s.modalHeader}>
              <View>
                <Text style={s.modalTitle}>Application Steps</Text>
                <Text style={s.modalSubtitle}>Step-by-step guidance</Text>
              </View>
              <TouchableOpacity onPress={() => setStepsModalOpen(false)}>
                <X size={20} color="#64748B" />
              </TouchableOpacity>
            </View>

            <ScrollView style={s.modalScroll} showsVerticalScrollIndicator={false}>
              {scheme.after_apply_note && (
                <View style={s.timelineNotice}>
                  <Text style={s.timelineTitle}>What happens after you apply:</Text>
                  <Text style={s.timelineText}>{scheme.after_apply_note}</Text>
                </View>
              )}

              <View style={s.simpleStepsBox}>
                <View style={s.numStepRow}>
                  <View style={s.stepNum}><Text style={s.stepNumText}>1</Text></View>
                  <Text style={s.numStepText}>Collect required documents (Aadhaar, passbook, craft proof)</Text>
                </View>
                <View style={s.numStepRow}>
                  <View style={s.stepNum}><Text style={s.stepNumText}>2</Text></View>
                  <Text style={s.numStepText}>Visit your nearest Common Service Centre (CSC) or submit online</Text>
                </View>
                <View style={s.numStepRow}>
                  <View style={s.stepNum}><Text style={s.stepNumText}>3</Text></View>
                  <Text style={s.numStepText}>Receive official verification & recognized artisan certificate</Text>
                </View>
              </View>
            </ScrollView>

            <TouchableOpacity
              style={s.modalCtaBtn}
              onPress={() => setStepsModalOpen(false)}
            >
              <Text style={s.modalCtaText}>Close</Text>
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
  center: {
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    gap: 12,
  },
  loaderText: {
    fontSize: 13,
    fontFamily: Fonts.body,
    color: '#64748B',
  },
  errorText: {
    fontSize: 14,
    fontFamily: Fonts.bodyMedium,
    color: '#B91C1C',
  },
  backBtnSmall: {
    marginTop: 8,
    backgroundColor: '#1E3A24',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
  },
  backBtnSmallText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },

  /* Top Bar */
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 6,
  },
  backBtn: {
    width: 36,
    height: 36,
    justifyContent: 'center',
  },
  officialPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#E8F6ED',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 14,
  },
  officialPillText: {
    fontSize: 11,
    fontFamily: Fonts.headingBold,
    fontWeight: '700',
    color: '#165B33',
  },

  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 10,
  },

  /* Title Box */
  titleBox: {
    marginBottom: 16,
  },
  schemeTitle: {
    fontSize: 24,
    fontFamily: Fonts.headingBold,
    fontWeight: '800',
    color: '#0F172A',
    lineHeight: 30,
    letterSpacing: -0.4,
  },
  ministryText: {
    fontSize: 13,
    fontFamily: Fonts.body,
    color: '#64748B',
    marginTop: 4,
  },

  /* Hero Feature Card */
  heroCard: {
    flexDirection: 'row',
    backgroundColor: '#EAF5EE',
    borderRadius: 18,
    padding: 16,
    alignItems: 'center',
    gap: 14,
    marginBottom: 20,
  },
  heroIconBox: {
    width: 60,
    height: 60,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  heroCardText: {
    flex: 1,
    fontSize: 13,
    fontFamily: Fonts.body,
    color: '#1E293B',
    lineHeight: 19,
  },

  /* Section Header */
  sectionHeader: {
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontFamily: Fonts.headingBold,
    fontWeight: '700',
    color: '#0F172A',
  },

  /* 2x2 Benefits Grid */
  benefitsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 20,
  },
  benefitCard: {
    width: '48.3%',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: '#EFEBE4',
    ...Shadow.card,
  },
  benefitIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },
  benefitCardTitle: {
    fontSize: 13.5,
    fontFamily: Fonts.headingBold,
    fontWeight: '700',
    color: '#0F172A',
  },
  benefitCardSub: {
    fontSize: 11.5,
    fontFamily: Fonts.body,
    color: '#64748B',
    marginTop: 2,
  },

  /* Actionable Stack Cards */
  actionStack: {
    gap: 10,
    marginBottom: 22,
  },
  actionRowCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: '#EFEBE4',
    gap: 12,
    ...Shadow.card,
  },
  actionIconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  actionTextWrap: {
    flex: 1,
  },
  actionTitle: {
    fontSize: 14,
    fontFamily: Fonts.headingBold,
    fontWeight: '700',
    color: '#0F172A',
  },
  actionSub: {
    fontSize: 12,
    fontFamily: Fonts.body,
    color: '#64748B',
    marginTop: 2,
  },

  /* Buttons */
  buttonsGroup: {
    gap: 10,
    marginBottom: 18,
  },
  primaryBtn: {
    flexDirection: 'row',
    height: 50,
    backgroundColor: '#1E3A24',
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  primaryBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontFamily: Fonts.headingBold,
    fontWeight: '700',
  },
  secondaryBtn: {
    flexDirection: 'row',
    height: 50,
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: '#1E3A24',
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  secondaryBtnText: {
    color: '#1E3A24',
    fontSize: 15,
    fontFamily: Fonts.headingBold,
    fontWeight: '700',
  },

  /* Info Strip */
  infoCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F1F5F9',
    borderRadius: 12,
    padding: 12,
    gap: 10,
  },
  infoCardText: {
    fontSize: 11.5,
    fontFamily: Fonts.bodyMedium,
    color: '#334155',
  },
  infoCardSub: {
    fontSize: 10.5,
    fontFamily: Fonts.body,
    color: '#64748B',
    marginTop: 1,
  },

  /* Modals */
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
    maxHeight: '82%',
    maxWidth: 480,
    width: '100%',
    alignSelf: 'center',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 14,
  },
  modalTitle: {
    fontSize: 17,
    fontFamily: Fonts.headingBold,
    fontWeight: '700',
    color: '#0F172A',
  },
  modalSubtitle: {
    fontSize: 12,
    fontFamily: Fonts.body,
    color: '#64748B',
    marginTop: 2,
  },
  modalProgressRow: {
    marginBottom: 12,
  },
  modalProgressBar: {
    height: 6,
    backgroundColor: '#E2E8F0',
    borderRadius: 3,
    overflow: 'hidden',
  },
  modalProgressFill: {
    height: '100%',
    backgroundColor: '#1E3A24',
  },
  modalProgressLabel: {
    fontSize: 11.5,
    fontFamily: Fonts.bodyMedium,
    color: '#165B33',
    fontWeight: '600',
    marginTop: 4,
  },
  modalScroll: {
    maxHeight: 320,
    marginBottom: 16,
  },
  checkRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    padding: 12,
    borderRadius: 10,
    backgroundColor: '#F8FAFC',
    marginBottom: 8,
  },
  checkRowActive: {
    backgroundColor: '#EFF8F2',
  },
  checkText: {
    flex: 1,
    fontSize: 13,
    fontFamily: Fonts.body,
    color: '#334155',
    lineHeight: 18,
  },
  checkTextActive: {
    color: '#0F172A',
    fontWeight: '600',
  },
  modalCtaBtn: {
    backgroundColor: '#1E3A24',
    borderRadius: 14,
    paddingVertical: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalCtaText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontFamily: Fonts.headingBold,
    fontWeight: '700',
  },

  /* Docs Modal Styles */
  modalDocsCounter: {
    fontSize: 11.5,
    fontFamily: Fonts.headingBold,
    fontWeight: '700',
    color: '#165B33',
    marginBottom: 10,
  },
  docItemCard: {
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
  },
  docTouchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  docName: {
    flex: 1,
    fontSize: 13,
    fontFamily: Fonts.bodyMedium,
    color: '#0F172A',
  },
  docNameGathered: {
    color: '#165B33',
    fontWeight: '700',
  },
  docFallbackTip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 6,
    marginLeft: 30,
  },
  docFallbackText: {
    fontSize: 11,
    fontFamily: Fonts.body,
    color: '#B45309',
  },

  /* Apply Steps Modal */
  applyStepCard: {
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  applyStepLabel: {
    fontSize: 13.5,
    fontFamily: Fonts.headingBold,
    fontWeight: '700',
    color: '#0F172A',
  },
  applyStepDetail: {
    fontSize: 12.5,
    fontFamily: Fonts.body,
    color: '#475569',
    marginTop: 3,
    lineHeight: 17,
  },
  applyStepLinkBtn: {
    marginTop: 6,
    alignSelf: 'flex-start',
  },
  applyStepLinkText: {
    fontSize: 12,
    fontFamily: Fonts.headingBold,
    color: '#165B33',
    fontWeight: '700',
  },
  helplineRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#E8F6ED',
    padding: 12,
    borderRadius: 10,
    marginTop: 4,
  },
  helplineText: {
    fontSize: 13,
    fontFamily: Fonts.headingBold,
    color: '#165B33',
    fontWeight: '700',
  },
  timelineNotice: {
    backgroundColor: '#F0F8F3',
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
  },
  timelineTitle: {
    fontSize: 13,
    fontFamily: Fonts.headingBold,
    color: '#165B33',
    fontWeight: '700',
    marginBottom: 4,
  },
  timelineText: {
    fontSize: 12,
    fontFamily: Fonts.body,
    color: '#334155',
    lineHeight: 17,
  },
  simpleStepsBox: {
    gap: 10,
  },
  numStepRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#F8FAFC',
    padding: 12,
    borderRadius: 10,
  },
  stepNum: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#1E3A24',
    justifyContent: 'center',
    alignItems: 'center',
  },
  stepNumText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
  },
  numStepText: {
    flex: 1,
    fontSize: 12.5,
    fontFamily: Fonts.body,
    color: '#334155',
  },
});
