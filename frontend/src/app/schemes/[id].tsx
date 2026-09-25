import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Linking,
  StatusBar,
  Platform,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";
import {
  ArrowLeft,
  ShieldCheck,
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
  ListChecks,
  ExternalLink,
  Info,
  CheckSquare,
  Square,
  Phone,
  MapPin,
  ChevronRight,
} from "lucide-react-native";

import { api } from "@/services/api";
import { useAuth } from "@/context/AuthContext";
import { Fonts, Shadow } from "@/constants/artisan-theme";

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

// Preset configs per scheme
const SCHEME_CONFIGS: Record<string, {
  heroIcon: any;
  displayTitle: string;
  heroDesc: string;
  benefits: { title: string; sub: string; icon: any; iconBg: string; iconColor: string }[];
  officialDomain: string;
}> = {
  "pehchan-nhdp": {
    heroIcon: CreditCard,
    displayTitle: "PEHCHAN Artisan ID Card",
    heroDesc: "An official artisan ID card that gives you access to workshops, market stalls, insurance and more.",
    benefits: [
      { title: "Skill Training", sub: "Design & technology", icon: GraduationCap, iconBg: "#FEF9E7", iconColor: "#B45309" },
      { title: "Financial Support", sub: "Access to loans", icon: IndianRupee, iconBg: "#FEF3E8", iconColor: "#C2410C" },
      { title: "Insurance Support", sub: "Health & life insurance", icon: Shield, iconBg: "#EBF7EE", iconColor: "#165B33" },
      { title: "Recognition", sub: "National awards", icon: Award, iconBg: "#FDF0E8", iconColor: "#B45309" },
    ],
    officialDomain: "handicrafts.gov.in",
  },
  "pm-vishwakarma": {
    heroIcon: Coins,
    displayTitle: "PM Vishwakarma Yojana",
    heroDesc: "Collateral-free loans up to Rs3 lakh, a Rs15,000 toolkit voucher, and free skill training for 18 traditional trades.",
    benefits: [
      { title: "Skill Training", sub: "Rs500/day stipend", icon: GraduationCap, iconBg: "#FEF9E7", iconColor: "#B45309" },
      { title: "Financial Support", sub: "Up to Rs3L at 5% rate", icon: IndianRupee, iconBg: "#FEF3E8", iconColor: "#C2410C" },
      { title: "Toolkit Voucher", sub: "Rs15,000 modern tools", icon: Shield, iconBg: "#EBF7EE", iconColor: "#165B33" },
      { title: "Digital Incentive", sub: "Rs1 per digital sale", icon: Award, iconBg: "#FDF0E8", iconColor: "#B45309" },
    ],
    officialDomain: "pmvishwakarma.gov.in",
  },
  "cgtmse": {
    heroIcon: Briefcase,
    displayTitle: "Credit Guarantee Scheme",
    heroDesc: "Collateral-free bank loan coverage up to Rs5 Crore for registered micro and small craft enterprises.",
    benefits: [
      { title: "Zero Collateral", sub: "No property or gold", icon: Shield, iconBg: "#EBF7EE", iconColor: "#165B33" },
      { title: "Working Capital", sub: "Term loans & credit", icon: IndianRupee, iconBg: "#FEF3E8", iconColor: "#C2410C" },
      { title: "High Coverage", sub: "Up to 85% guarantee", icon: GraduationCap, iconBg: "#FEF9E7", iconColor: "#B45309" },
      { title: "Enterprise Growth", sub: "Scale beyond Mudra", icon: Award, iconBg: "#FDF0E8", iconColor: "#B45309" },
    ],
    officialDomain: "cgtmse.in",
  },
  "odop": {
    heroIcon: Users,
    displayTitle: "One District One Product (ODOP)",
    heroDesc: "Official district branding, shared common machines, national expo stalls, and state margin money subsidies.",
    benefits: [
      { title: "District Branding", sub: "Flagship craft badge", icon: Award, iconBg: "#FDF0E8", iconColor: "#B45309" },
      { title: "State Subsidy", sub: "Up to Rs6.25L margin", icon: IndianRupee, iconBg: "#FEF3E8", iconColor: "#C2410C" },
      { title: "Common Centers", sub: "Shared modern kilns", icon: Shield, iconBg: "#EBF7EE", iconColor: "#165B33" },
      { title: "Exhibition Access", sub: "Free stalls at expos", icon: GraduationCap, iconBg: "#FEF9E7", iconColor: "#B45309" },
    ],
    officialDomain: "odop.in",
  },
  "pm-mudra": {
    heroIcon: Coins,
    displayTitle: "Pradhan Mantri Mudra Yojana",
    heroDesc: "Collateral-free bank loans up to Rs10 Lakh across Shishu, Kishor, and Tarun tiers for small craft businesses.",
    benefits: [
      { title: "Collateral-Free", sub: "No security deposit", icon: Shield, iconBg: "#EBF7EE", iconColor: "#165B33" },
      { title: "Flexible Tiers", sub: "Rs50k up to Rs10 Lakh", icon: IndianRupee, iconBg: "#FEF3E8", iconColor: "#C2410C" },
      { title: "Mudra RuPay Card", sub: "Hassle-free withdrawal", icon: GraduationCap, iconBg: "#FEF9E7", iconColor: "#B45309" },
      { title: "Flexible Tenure", sub: "Repay over 5 years", icon: Award, iconBg: "#FDF0E8", iconColor: "#B45309" },
    ],
    officialDomain: "mudra.org.in",
  },
  "pmegp": {
    heroIcon: Store,
    displayTitle: "PMEGP Subsidy Scheme",
    heroDesc: "Set up a new micro-enterprise with a bank loan covering up to 95% of project cost and a government subsidy of 15-35%.",
    benefits: [
      { title: "Bank Loan", sub: "Up to 95% project cost", icon: IndianRupee, iconBg: "#FEF3E8", iconColor: "#C2410C" },
      { title: "Govt Subsidy", sub: "15% to 35% non-repayable", icon: Shield, iconBg: "#EBF7EE", iconColor: "#165B33" },
      { title: "Business Training", sub: "Free EDP workshops", icon: GraduationCap, iconBg: "#FEF9E7", iconColor: "#B45309" },
      { title: "CGTMSE Cover", sub: "Collateral-free credit", icon: Award, iconBg: "#FDF0E8", iconColor: "#B45309" },
    ],
    officialDomain: "kviconline.gov.in",
  },
};

/** Safely parse a JSON field that may be a string or already parsed */
function safeParse<T>(raw: any, fallback: T): T {
  if (!raw) return fallback;
  if (typeof raw !== "string") return raw as T;
  try { return JSON.parse(raw) as T; } catch { return fallback; }
}

/** Normalise items that may be strings OR {condition/name/label/detail, ...} objects */
function toStringList(raw: any): string[] {
  const arr = safeParse<any[]>(raw, []);
  return arr.map((item) => {
    if (typeof item === "string") return item;
    return (
      item?.condition ||
      item?.name ||
      item?.label ||
      item?.detail ||
      item?.step ||
      JSON.stringify(item)
    );
  });
}

/**
 * Full hardcoded fallback — used when the backend returns 404 for a scheme.
 * Keeps the app working offline / before DB is seeded.
 */
const HARDCODED_FALLBACK: Record<string, SchemeDetail> = {
  "pm-vishwakarma": {
    id: "pm-vishwakarma",
    name: "PM Vishwakarma Yojana",
    short_summary: "Credit support up to Rs3 lakh at 5% interest, free skill training, and a Rs15,000 toolkit for traditional artisans.",
    category: "loans",
    level: "central",
    ministry: "Ministry of Micro, Small and Medium Enterprises",
    max_benefit_amount: "Rs3,00,000",
    interest_rate: "5%",
    eligibility_json: JSON.stringify(["Traditional craftsperson or artisan in 18 listed trades", "Age 18 years or above", "One member per household", "Self-employed (not a salaried employee)"]),
    documents_json: JSON.stringify(["Aadhaar card (linked to mobile)", "Bank passbook / account details", "Ration card or family ID", "Craft / trade proof (photo of work)", "Passport-size photograph"]),
    apply_steps_json: JSON.stringify(["Visit nearest Common Service Centre (CSC) or pmvishwakarma.gov.in", "Complete biometric Aadhaar verification at CSC", "Gram Panchayat / Urban Local Body approves your application", "Attend free skill training and receive Rs500/day stipend", "Collect Rs15,000 toolkit voucher", "Apply for collateral-free loan up to Rs3 lakh at 5%"]),
    after_apply_note: "Loan disbursed in two tranches: Rs1 lakh first, then Rs2 lakh after repayment track record.",
    official_url: "https://pmvishwakarma.gov.in",
    helpline: "18002677777",
    last_verified_at: "2026-01-01",
    benefits_json: JSON.stringify([]),
  },
  "pm-mudra": {
    id: "pm-mudra",
    name: "PM MUDRA Yojana",
    short_summary: "Collateral-free business loans up to Rs10 lakh for small artisans and micro-entrepreneurs.",
    category: "loans",
    level: "central",
    ministry: "Ministry of Finance",
    max_benefit_amount: "Rs10,00,000",
    interest_rate: "8-12%",
    eligibility_json: JSON.stringify(["Micro or small business owner", "Non-farm income generating activity", "Valid Aadhaar and PAN card", "No loan default history"]),
    documents_json: JSON.stringify(["Aadhaar card", "PAN card", "Business proof or trade certificate", "Bank statement (last 6 months)", "Passport-size photograph", "Quotation for raw material or equipment"]),
    apply_steps_json: JSON.stringify(["Visit nearest bank, NBFC, or Micro Finance Institution", "Fill the MUDRA loan application form", "Submit documents along with business plan", "Bank reviews and sanctions the loan", "Loan disbursed within 7-10 working days"]),
    official_url: "https://www.mudra.org.in",
    helpline: "1800-180-1111",
    last_verified_at: "2026-01-01",
    benefits_json: JSON.stringify([]),
  },
  "pmegp": {
    id: "pmegp",
    name: "PMEGP",
    short_summary: "Government subsidy of 15-35% on project cost up to Rs50 lakh for new handicraft manufacturing enterprises.",
    category: "loans",
    level: "central",
    ministry: "Ministry of MSME (via KVIC)",
    max_benefit_amount: "Rs50,00,000 project",
    interest_rate: "Subsidy 15-35%",
    eligibility_json: JSON.stringify(["Age 18 years or above", "8th pass for projects above Rs10 lakh", "New business only (not existing enterprise)", "Any Indian citizen"]),
    documents_json: JSON.stringify(["Aadhaar card", "PAN card", "Educational certificate (8th pass)", "Project report / business plan", "Passport-size photograph", "Caste certificate (if SC/ST/OBC)", "Special category certificate (if applicable)"]),
    apply_steps_json: JSON.stringify(["Apply online on KVIC PMEGP e-portal: kviconline.gov.in/pmegpeportal", "Submit project report to District Industries Centre (DIC)", "Attend Entrepreneurship Development Programme (EDP) training", "DIC recommends your application to the bank", "Bank sanctions the loan", "Subsidy amount credited to loan account after 3 years"]),
    after_apply_note: "The subsidy is locked in your account for 3 years. After successful repayment, it is adjusted against your loan balance.",
    official_url: "https://www.kviconline.gov.in/pmegpeportal",
    helpline: "1800-3000-0888",
    last_verified_at: "2026-01-01",
    benefits_json: JSON.stringify([]),
  },
  "odop": {
    id: "odop",
    name: "ODOP - One District One Product",
    short_summary: "Financial and marketing support for artisans making the signature product of their district.",
    category: "marketing",
    level: "central",
    ministry: "Ministry of Food Processing Industries / State Governments",
    max_benefit_amount: "Rs2,50,000",
    eligibility_json: JSON.stringify(["Artisan making the officially notified district signature product", "Registered or informal craft unit", "Located and operating in the respective district"]),
    documents_json: JSON.stringify(["Aadhaar card", "Udyam registration certificate (preferred)", "Craft or product sample proof (photo)", "District residence proof", "Bank account details"]),
    apply_steps_json: JSON.stringify(["Confirm your district's ODOP product at District Industries Centre (DIC)", "Register under the ODOP scheme at DIC", "Submit product samples and business details", "Apply for support funds, branding, or trade fair slots"]),
    official_url: "https://odop.mofpi.gov.in",
    helpline: "011-26492263",
    last_verified_at: "2026-01-01",
    benefits_json: JSON.stringify([]),
  },
  "nhdp": {
    id: "nhdp",
    name: "National Handicrafts Development Programme",
    short_summary: "Design development, skill upgradation, infrastructure support, and market linkage for handicraft clusters.",
    category: "training",
    level: "central",
    ministry: "Ministry of Textiles - Office of DC Handicrafts",
    max_benefit_amount: "Rs1,00,000",
    eligibility_json: JSON.stringify(["Handicraft artisan", "Member of a recognized craft cluster", "Valid Artisan / Pahchan Card (preferred)"]),
    documents_json: JSON.stringify(["Aadhaar card", "Artisan / Pahchan card", "Bank account details", "Cluster membership proof"]),
    apply_steps_json: JSON.stringify(["Contact nearest DC Handicrafts regional office", "Enroll in the cluster programme", "Attend skill and design training sessions", "Participate in buyer-seller meets and exhibitions"]),
    official_url: "https://handicrafts.nic.in",
    helpline: "1800-208-9988",
    last_verified_at: "2026-01-01",
    benefits_json: JSON.stringify([]),
  },
  "pehchan-nhdp": {
    id: "pehchan-nhdp",
    name: "PEHCHAN Artisan ID Card",
    short_summary: "An official artisan ID card giving access to workshops, market stalls, insurance and multiple government benefits.",
    category: "training",
    level: "central",
    ministry: "Ministry of Textiles - Office of DC Handicrafts",
    eligibility_json: JSON.stringify(["Traditional artisan or craftsperson", "Age 18 years or above", "Active in a recognized craft"]),
    documents_json: JSON.stringify(["Aadhaar card", "Bank passbook / account details", "Ration card or family ID", "Craft proof (photo of work or trade certificate)", "Passport-size photograph"]),
    apply_steps_json: JSON.stringify(["Apply online at handicrafts.gov.in or visit nearest Handicrafts Service Centre (HSC)", "Submit documents and craft proof", "Verification by DC Handicrafts officer", "Receive PEHCHAN Artisan ID card"]),
    official_url: "https://handicrafts.nic.in",
    helpline: "1800-208-9988",
    last_verified_at: "2026-01-01",
    benefits_json: JSON.stringify([]),
  },
  "cgtmse": {
    id: "cgtmse",
    name: "Credit Guarantee Scheme (CGTMSE)",
    short_summary: "Collateral-free bank loan coverage up to Rs5 Crore for registered micro and small craft enterprises.",
    category: "loans",
    level: "central",
    ministry: "Ministry of MSME",
    eligibility_json: JSON.stringify(["Registered micro or small enterprise (Udyam)", "Seeking fresh bank credit (new or enhancement)", "Valid Aadhaar and PAN", "No existing NPA or loan default"]),
    documents_json: JSON.stringify(["Udyam MSME certificate", "PAN card", "Bank statements (6-12 months)", "Audited balance sheets (if turnover above Rs40 lakh)", "Project report for new enterprises"]),
    apply_steps_json: JSON.stringify(["Visit any CGTMSE member lending bank (SBI, Canara, PNB, etc.)", "Apply for loan under CGTMSE credit guarantee cover", "Bank submits guarantee request to CGTMSE on your behalf", "Loan sanctioned without requiring property collateral"]),
    official_url: "https://www.cgtmse.in",
    helpline: "022-67538500",
    last_verified_at: "2026-01-01",
    benefits_json: JSON.stringify([]),
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

  const userId = profile?.id || profile?.phone || "guest_artisan";

  useEffect(() => {
    if (!id) return;
    loadSchemeData(id);
  }, [id]);

  const loadSchemeData = async (schemeId: string) => {
    setLoading(true);
    try {
      const [detailRes, progRes] = await Promise.all([
        api.get(`/schemes/${schemeId}`),
        api
          .get(`/schemes/${schemeId}/progress`, { params: { user_id: userId } })
          .catch(() => ({ data: {} })),
      ]);
      const data = detailRes.data?.scheme || detailRes.data;
      // If API returned something useful, use it; otherwise fall back
      if (data && data.id) {
        setScheme(data);
      } else {
        setScheme(HARDCODED_FALLBACK[schemeId] ?? null);
      }
      const prog = progRes.data?.progress;
      if (prog) {
        if (Array.isArray(prog.checked_conditions)) setChecked(new Set(prog.checked_conditions));
        if (Array.isArray(prog.documents_gathered)) setGathered(new Set(prog.documents_gathered));
      }
    } catch (_err) {
      // API failed (404 / network) — use hardcoded data so page still renders
      setScheme(HARDCODED_FALLBACK[schemeId] ?? null);
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
    if (next.has(idx)) next.delete(idx); else next.add(idx);
    setChecked(next);
    persistProgress(next, gathered);
  };

  const toggleDoc = (docName: string) => {
    const next = new Set(gathered);
    if (next.has(docName)) next.delete(docName); else next.add(docName);
    setGathered(next);
    persistProgress(checked, next);
  };

  const openLink = (url?: string | null) => {
    if (url) Linking.openURL(url).catch(() => {});
  };

  // ── Loading / Error states ──────────────────────────────────────────────────
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

  // ── Parse data ──────────────────────────────────────────────────────────────
  const eligibilityList = toStringList(scheme.eligibility_json);
  const documentsList = toStringList(scheme.documents_json);
  const stepsList = toStringList(scheme.apply_steps_json);

  const config = SCHEME_CONFIGS[scheme.id] ?? {
    heroIcon: CreditCard,
    displayTitle: scheme.name,
    heroDesc: scheme.short_summary,
    benefits: [
      { title: "Skill Training", sub: "Design & technology", icon: GraduationCap, iconBg: "#FEF9E7", iconColor: "#B45309" },
      { title: "Financial Support", sub: "Access to loans", icon: IndianRupee, iconBg: "#FEF3E8", iconColor: "#C2410C" },
      { title: "Insurance", sub: "Health & life", icon: Shield, iconBg: "#EBF7EE", iconColor: "#165B33" },
      { title: "Recognition", sub: "National awards", icon: Award, iconBg: "#FDF0E8", iconColor: "#B45309" },
    ],
    officialDomain: (scheme.official_url ?? "").replace(/https?:\/\/(www\.)?/, "").split("/")[0] || "gov.in",
  };

  const HeroIcon = config.heroIcon;

  return (
    <View style={s.root}>
      <StatusBar barStyle="dark-content" backgroundColor="#F9F7F3" translucent={false} />

      {/* ── Top bar ──────────────────────────────────────────────────────────── */}
      <View style={[s.topBar, { paddingTop: insets.top + 8 }]}>
        <TouchableOpacity
          style={s.backBtn}
          onPress={() => router.back()}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
        >
          <ArrowLeft size={22} color="#111827" strokeWidth={2.2} />
        </TouchableOpacity>
        <View style={s.officialPill}>
          <ShieldCheck size={12} color="#165B33" strokeWidth={2.4} />
          <Text style={s.officialPillText}>Official Scheme</Text>
        </View>
      </View>

      <ScrollView
        style={s.scroll}
        contentContainerStyle={[s.scrollContent, { paddingBottom: insets.bottom + 48 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Title & ministry ───────────────────────────────────────────────── */}
        <Text style={s.schemeTitle}>{config.displayTitle}</Text>
        <Text style={s.ministryText}>{scheme.ministry}</Text>

        {/* ── Hero banner ────────────────────────────────────────────────────── */}
        <View style={s.heroBanner}>
          <View style={s.heroIconBox}>
            <HeroIcon size={26} color="#165B33" strokeWidth={2.2} />
          </View>
          <Text style={s.heroBannerText}>{config.heroDesc}</Text>
        </View>

        {/* ── Key benefits 2×2 ──────────────────────────────────────────────── */}
        <Text style={s.sectionLabel}>Key Benefits</Text>
        <View style={s.benefitsGrid}>
          {config.benefits.map((b, i) => {
            const BIcon = b.icon;
            return (
              <View key={i} style={s.benefitCard}>
                <View style={[s.benefitIconCircle, { backgroundColor: b.iconBg }]}>
                  <BIcon size={17} color={b.iconColor} strokeWidth={2.2} />
                </View>
                <Text style={s.benefitTitle}>{b.title}</Text>
                <Text style={s.benefitSub}>{b.sub}</Text>
              </View>
            );
          })}
        </View>

        {/* ══════════════════════════════════════════════════════════════════════
            SECTION 1 — ELIGIBILITY
        ══════════════════════════════════════════════════════════════════════ */}
        <View style={s.inlineSection}>
          {/* Header */}
          <View style={s.inlineSectionHeader}>
            <View style={[s.sectionIconCircle, { backgroundColor: "#E8F6ED" }]}>
              <Users size={16} color="#165B33" strokeWidth={2.2} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={s.inlineSectionTitle}>Who Can Apply?</Text>
              <Text style={s.inlineSectionSub}>Eligibility conditions</Text>
            </View>
            <View style={s.countBadge}>
              <Text style={s.countBadgeText}>{eligibilityList.length}</Text>
            </View>
          </View>

          {/* Items — tap to tick */}
          <View style={s.itemList}>
            {eligibilityList.map((item, idx) => {
              const ticked = checked.has(idx);
              return (
                <TouchableOpacity
                  key={idx}
                  style={[s.checkRow, ticked && s.checkRowTicked]}
                  activeOpacity={0.8}
                  onPress={() => toggleCheck(idx)}
                >
                  {ticked
                    ? <CheckSquare size={18} color="#1E3A24" strokeWidth={2.4} />
                    : <Square size={18} color="#9CA3AF" strokeWidth={1.8} />
                  }
                  <Text style={[s.checkRowText, ticked && s.checkRowTextTicked]}>{item}</Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Progress hint */}
          {eligibilityList.length > 0 && (
            <View style={s.progressHint}>
              <View style={s.progressBar}>
                <View style={[s.progressFill, { width: `${Math.round((checked.size / eligibilityList.length) * 100)}%` as any }]} />
              </View>
              <Text style={s.progressLabel}>
                {checked.size === eligibilityList.length && checked.size > 0
                  ? "Likely eligible!"
                  : `${checked.size} of ${eligibilityList.length} matched`}
              </Text>
            </View>
          )}
        </View>

        {/* ══════════════════════════════════════════════════════════════════════
            SECTION 2 — DOCUMENTS NEEDED
        ══════════════════════════════════════════════════════════════════════ */}
        <View style={s.inlineSection}>
          <View style={s.inlineSectionHeader}>
            <View style={[s.sectionIconCircle, { backgroundColor: "#FEF2E6" }]}>
              <FileText size={16} color="#B45309" strokeWidth={2.2} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={s.inlineSectionTitle}>Documents Needed</Text>
              <Text style={s.inlineSectionSub}>Tick off as you gather them</Text>
            </View>
            <View style={[s.countBadge, { backgroundColor: "#FEF3C7" }]}>
              <Text style={[s.countBadgeText, { color: "#92400E" }]}>{gathered.size}/{documentsList.length}</Text>
            </View>
          </View>

          <View style={s.itemList}>
            {documentsList.map((doc, idx) => {
              const ready = gathered.has(doc);
              return (
                <TouchableOpacity
                  key={idx}
                  style={[s.docRow, ready && s.docRowReady]}
                  activeOpacity={0.8}
                  onPress={() => toggleDoc(doc)}
                >
                  {ready
                    ? <CheckSquare size={18} color="#1E3A24" strokeWidth={2.4} />
                    : <Square size={18} color="#9CA3AF" strokeWidth={1.8} />
                  }
                  <Text style={[s.docRowText, ready && s.docRowTextReady]}>{doc}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* ══════════════════════════════════════════════════════════════════════
            SECTION 3 — HOW TO APPLY
        ══════════════════════════════════════════════════════════════════════ */}
        <View style={s.inlineSection}>
          <View style={s.inlineSectionHeader}>
            <View style={[s.sectionIconCircle, { backgroundColor: "#EFF6FF" }]}>
              <ListChecks size={16} color="#0369A1" strokeWidth={2.2} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={s.inlineSectionTitle}>How to Apply</Text>
              <Text style={s.inlineSectionSub}>Step-by-step guide</Text>
            </View>
          </View>

          <View style={s.stepsBox}>
            {stepsList.map((step, idx) => (
              <View key={idx} style={s.stepRow}>
                {/* Number bubble + connector */}
                <View style={s.stepNumCol}>
                  <View style={s.stepNumCircle}>
                    <Text style={s.stepNumText}>{idx + 1}</Text>
                  </View>
                  {idx < stepsList.length - 1 && <View style={s.stepConnector} />}
                </View>
                {/* Text */}
                <View style={s.stepTextCol}>
                  <Text style={s.stepText}>{step}</Text>
                </View>
              </View>
            ))}
          </View>

          {/* After-apply note */}
          {scheme.after_apply_note ? (
            <View style={s.afterNote}>
              <Info size={14} color="#0369A1" strokeWidth={2} />
              <Text style={s.afterNoteText}>{scheme.after_apply_note}</Text>
            </View>
          ) : null}
        </View>

        {/* ── Helpline ───────────────────────────────────────────────────────── */}
        {scheme.helpline ? (
          <TouchableOpacity style={s.helplineRow} onPress={() => Linking.openURL(`tel:${scheme.helpline}`)}>
            <Phone size={16} color="#165B33" strokeWidth={2} />
            <Text style={s.helplineText}>Call Helpline: {scheme.helpline}</Text>
            <ChevronRight size={15} color="#165B33" strokeWidth={2.4} />
          </TouchableOpacity>
        ) : null}

        {/* ── Official portal CTA ────────────────────────────────────────────── */}
        <TouchableOpacity style={s.portalBtn} activeOpacity={0.88} onPress={() => openLink(scheme.official_url)}>
          <ExternalLink size={16} color="#FFFFFF" strokeWidth={2.2} />
          <Text style={s.portalBtnText}>Visit Official Portal</Text>
        </TouchableOpacity>

        {/* ── Footer ────────────────────────────────────────────────────────── */}
        <View style={s.footerRow}>
          <Info size={13} color="#9CA3AF" strokeWidth={2} />
          <Text style={s.footerText}>Source: {config.officialDomain}  •  Verified 2026</Text>
        </View>
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#F9F7F3" },
  center: { justifyContent: "center", alignItems: "center", padding: 24, gap: 12 },
  loaderText: { fontSize: 13, fontFamily: Fonts.body, color: "#6B7280" },
  errorText: { fontSize: 14, fontFamily: Fonts.bodyMedium, color: "#B91C1C" },
  backBtnSmall: { marginTop: 8, backgroundColor: "#1E3A24", paddingHorizontal: 14, paddingVertical: 8, borderRadius: 10 },
  backBtnSmallText: { color: "#FFFFFF", fontSize: 12, fontWeight: "700" },

  /* Top bar */
  topBar: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingBottom: 8,
    backgroundColor: "#F9F7F3",
  },
  backBtn: { width: 36, height: 36, justifyContent: "center" },
  officialPill: {
    flexDirection: "row", alignItems: "center", gap: 4,
    backgroundColor: "#E8F6ED", paddingHorizontal: 10, paddingVertical: 5, borderRadius: 14,
  },
  officialPillText: { fontSize: 11, fontFamily: Fonts.headingBold, fontWeight: "700", color: "#165B33" },

  /* Scroll */
  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: 20, paddingTop: 6 },

  /* Title */
  schemeTitle: { fontSize: 24, fontFamily: Fonts.headingBold, fontWeight: "800", color: "#111827", letterSpacing: -0.4, marginBottom: 4 },
  ministryText: { fontSize: 12.5, fontFamily: Fonts.body, color: "#6B7280", marginBottom: 16 },

  /* Hero banner */
  heroBanner: {
    flexDirection: "row", alignItems: "center", gap: 14,
    backgroundColor: "#EAF5EE", borderRadius: 18, padding: 16, marginBottom: 22,
  },
  heroIconBox: {
    width: 52, height: 52, borderRadius: 14,
    backgroundColor: "#D7EBDC", justifyContent: "center", alignItems: "center",
  },
  heroBannerText: { flex: 1, fontSize: 13, fontFamily: Fonts.body, color: "#1E293B", lineHeight: 19 },

  /* Benefits grid */
  sectionLabel: { fontSize: 15, fontFamily: Fonts.headingBold, fontWeight: "700", color: "#111827", marginBottom: 10 },
  benefitsGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10, marginBottom: 24 },
  benefitCard: {
    width: "48.3%", backgroundColor: "#FFFFFF", borderRadius: 16, padding: 14,
    borderWidth: 1, borderColor: "#EEEBE6", ...Shadow.card,
  },
  benefitIconCircle: { width: 34, height: 34, borderRadius: 17, justifyContent: "center", alignItems: "center", marginBottom: 8 },
  benefitTitle: { fontSize: 13, fontFamily: Fonts.headingBold, fontWeight: "700", color: "#111827" },
  benefitSub: { fontSize: 11.5, fontFamily: Fonts.body, color: "#6B7280", marginTop: 2 },

  /* Inline section card */
  inlineSection: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#EEEBE6",
    padding: 18,
    marginBottom: 16,
    ...Shadow.card,
  },
  inlineSectionHeader: {
    flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 14,
  },
  sectionIconCircle: { width: 38, height: 38, borderRadius: 19, justifyContent: "center", alignItems: "center" },
  inlineSectionTitle: { fontSize: 15, fontFamily: Fonts.headingBold, fontWeight: "700", color: "#111827" },
  inlineSectionSub: { fontSize: 12, fontFamily: Fonts.body, color: "#6B7280", marginTop: 1 },
  countBadge: {
    backgroundColor: "#E8F6ED", paddingHorizontal: 9, paddingVertical: 3, borderRadius: 20,
  },
  countBadgeText: { fontSize: 12, fontFamily: Fonts.headingBold, fontWeight: "700", color: "#165B33" },

  /* Item list */
  itemList: { gap: 8 },

  /* Eligibility check rows */
  checkRow: {
    flexDirection: "row", alignItems: "flex-start", gap: 10,
    backgroundColor: "#F9F7F3", borderRadius: 12, padding: 12,
    borderWidth: 1, borderColor: "#EEEBE6",
  },
  checkRowTicked: { backgroundColor: "#EFF8F2", borderColor: "#D1FAE5" },
  checkRowText: { flex: 1, fontSize: 13, fontFamily: Fonts.body, color: "#374151", lineHeight: 18 },
  checkRowTextTicked: { color: "#1E3A24", fontWeight: "600" },

  /* Progress bar */
  progressHint: { marginTop: 12, gap: 4 },
  progressBar: { height: 5, backgroundColor: "#E5E7EB", borderRadius: 3, overflow: "hidden" },
  progressFill: { height: "100%", backgroundColor: "#1E3A24", borderRadius: 3 },
  progressLabel: { fontSize: 11.5, fontFamily: Fonts.bodyMedium, color: "#165B33", fontWeight: "600" },

  /* Document rows */
  docRow: {
    flexDirection: "row", alignItems: "center", gap: 10,
    backgroundColor: "#F9F7F3", borderRadius: 12, padding: 12,
    borderWidth: 1, borderColor: "#EEEBE6",
  },
  docRowReady: { backgroundColor: "#EFF8F2", borderColor: "#D1FAE5" },
  docRowText: { flex: 1, fontSize: 13, fontFamily: Fonts.bodyMedium, color: "#374151" },
  docRowTextReady: { color: "#1E3A24", fontWeight: "700" },

  /* Steps */
  stepsBox: { gap: 0 },
  stepRow: { flexDirection: "row", gap: 12 },
  stepNumCol: { alignItems: "center", width: 28 },
  stepNumCircle: {
    width: 28, height: 28, borderRadius: 14,
    backgroundColor: "#1E3A24", justifyContent: "center", alignItems: "center",
  },
  stepNumText: { color: "#FFFFFF", fontSize: 12, fontWeight: "700" },
  stepConnector: { width: 2, flex: 1, backgroundColor: "#D1FAE5", marginVertical: 4, minHeight: 14 },
  stepTextCol: { flex: 1, paddingBottom: 16, paddingTop: 4 },
  stepText: { fontSize: 13, fontFamily: Fonts.body, color: "#374151", lineHeight: 19 },

  /* After-apply note */
  afterNote: {
    flexDirection: "row", alignItems: "flex-start", gap: 8,
    backgroundColor: "#EFF6FF", borderRadius: 12, padding: 12, marginTop: 4,
  },
  afterNoteText: { flex: 1, fontSize: 12.5, fontFamily: Fonts.body, color: "#1D4ED8", lineHeight: 18 },

  /* Helpline */
  helplineRow: {
    flexDirection: "row", alignItems: "center", gap: 10,
    backgroundColor: "#EAF5EE", borderRadius: 14, padding: 14,
    marginBottom: 16, borderWidth: 1, borderColor: "#D1FAE5",
  },
  helplineText: { flex: 1, fontSize: 13.5, fontFamily: Fonts.headingBold, fontWeight: "700", color: "#165B33" },

  /* Portal CTA */
  portalBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8,
    backgroundColor: "#1E3A24", borderRadius: 16, paddingVertical: 15, marginBottom: 14,
  },
  portalBtnText: { fontSize: 15, fontFamily: Fonts.headingBold, fontWeight: "700", color: "#FFFFFF" },

  /* Footer */
  footerRow: { flexDirection: "row", alignItems: "center", gap: 6, justifyContent: "center" },
  footerText: { fontSize: 11.5, fontFamily: Fonts.body, color: "#9CA3AF" },
});