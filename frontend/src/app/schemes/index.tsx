import React, { useCallback, useEffect, useState, useMemo } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  TextInput,
  StatusBar,
  Platform,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
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
  X,
  Volume2,
  Square,
} from "lucide-react-native";

import { api } from "@/services/api";
import { useAuth } from "@/context/AuthContext";
import { Fonts } from "@/constants/artisan-theme";
import { isSpeechSupported, stopSpeech } from "@/utils/speech";
import {
  getSelectedLanguage,
  speak as centralSpeak,
  AppLanguage,
} from "@/utils/language-utils";

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
  { key: "all", label: "All" },
  { key: "loans", label: "Loans" },
  { key: "training", label: "Training" },
  { key: "tools", label: "Tools" },
  { key: "marketing", label: "Marketing" },
];

const HARDCODED_SCHEMES: Scheme[] = [
  {
    id: "pm-vishwakarma",
    name: "PM Vishwakarma Yojana",
    short_summary:
      "Credit support up to Rs3 lakh at just 5% interest, free skill training, and a Rs15,000 modern toolkit kit for traditional artisans and craftspeople.",
    simple_summary:
      "Get Rs3 lakh loan at 5%, free skill training and Rs15,000 toolkit.",
    category: "loans",
    level: "central",
    ministry: "Ministry of Micro, Small and Medium Enterprises",
    max_benefit_amount: "Rs3,00,000",
    interest_rate: "5%",
    benefits_json: JSON.stringify([
      "Rs15,000 toolkit grant",
      "Skill training with Rs500/day stipend",
      "Collateral-free loan up to Rs3 lakh @ 5%",
      "Digital payment incentive",
    ]),
    eligibility_json: JSON.stringify([
      "Traditional craftsperson or artisan",
      "Age 18 or above",
      "One member per household",
    ]),
    documents_json: JSON.stringify([
      "Aadhaar card",
      "Bank passbook",
      "Craft/trade proof",
    ]),
    apply_steps_json: JSON.stringify([
      "Visit nearest CSC (Common Service Centre)",
      "Register with Aadhaar",
      "Complete skill assessment",
      "Receive toolkit grant and apply for loan",
    ]),
    official_url: "https://pmvishwakarma.gov.in",
    helpline: "18002677777",
    last_verified_at: "2026-01-01",
    match_score: 95,
    match_reasons: ["Traditional craftsperson", "Eligible for toolkit grant"],
  },
  {
    id: "pm-mudra",
    name: "PM MUDRA Yojana",
    short_summary:
      "Collateral-free business loans from Rs50,000 up to Rs10 lakh for small artisans and micro-entrepreneurs to expand their craft business.",
    simple_summary: "Get up to Rs10 lakh business loan without collateral.",
    category: "loans",
    level: "central",
    ministry: "Ministry of Finance",
    max_benefit_amount: "Rs10,00,000",
    interest_rate: "8-12%",
    benefits_json: JSON.stringify([
      "Shishu: up to Rs50,000",
      "Kishor: Rs50,000 to Rs5 lakh",
      "Tarun: Rs5 lakh to Rs10 lakh",
      "No collateral required",
    ]),
    eligibility_json: JSON.stringify([
      "Micro or small business owner",
      "Non-farm income generating activity",
      "Valid Aadhaar and PAN",
    ]),
    documents_json: JSON.stringify([
      "Aadhaar card",
      "PAN card",
      "Business proof",
      "Bank statement (6 months)",
    ]),
    apply_steps_json: JSON.stringify([
      "Visit nearest bank or NBFC",
      "Fill MUDRA loan application",
      "Submit documents",
      "Loan disbursed within 7-10 days",
    ]),
    official_url: "https://www.mudra.org.in",
    helpline: "1800-180-1111",
    last_verified_at: "2026-01-01",
    match_score: 88,
    match_reasons: ["Micro enterprise eligible", "No collateral needed"],
  },
  {
    id: "pmegp",
    name: "PMEGP",
    short_summary:
      "Government subsidy of 15-35% on project cost up to Rs50 lakh for new manufacturing or service enterprises in handicrafts and cottage industries.",
    simple_summary: "Up to 35% subsidy to start or expand your craft business.",
    category: "loans",
    level: "central",
    ministry: "Ministry of MSME (via KVIC)",
    max_benefit_amount: "Rs50,00,000 project",
    interest_rate: "Subsidy 15-35%",
    benefits_json: JSON.stringify([
      "15% subsidy urban, 25% rural (general)",
      "25% urban, 35% rural (SC/ST/Women)",
      "Project up to Rs50 lakh manufacturing",
      "No income tax for first 3 years",
    ]),
    eligibility_json: JSON.stringify([
      "Age 18 or above",
      "8th pass for projects above Rs10 lakh",
      "New business only (not existing)",
    ]),
    documents_json: JSON.stringify([
      "Aadhaar card",
      "Educational certificate",
      "Project report",
      "Passport photo",
    ]),
    apply_steps_json: JSON.stringify([
      "Apply on PMEGP portal",
      "Submit project report",
      "Bank sanctions loan",
      "Subsidy credited after 3 years",
    ]),
    official_url: "https://www.kviconline.gov.in/pmegpeportal",
    helpline: "1800-3000-0888",
    last_verified_at: "2026-01-01",
    match_score: 82,
    match_reasons: ["Cottage industry eligible", "Rural subsidy available"],
  },
  {
    id: "odop",
    name: "ODOP - One District One Product",
    short_summary:
      "Financial and marketing support for artisans making the signature product of their district - packaging, branding, and trade fair participation.",
    simple_summary:
      "Support for your district signature craft - funds, branding and fairs.",
    category: "marketing",
    level: "central",
    ministry: "Ministry of Food Processing Industries / State Governments",
    max_benefit_amount: "Rs2,50,000",
    benefits_json: JSON.stringify([
      "Common facility centre access",
      "Packaging and branding support",
      "Trade fair and exhibition support",
      "Skill training for local craft",
    ]),
    eligibility_json: JSON.stringify([
      "Artisan making district ODOP product",
      "Registered or informal unit",
      "Located in the respective district",
    ]),
    documents_json: JSON.stringify([
      "Aadhaar card",
      "Craft/trade proof",
      "District residence proof",
    ]),
    apply_steps_json: JSON.stringify([
      "Contact District Industries Centre (DIC)",
      "Register under ODOP scheme",
      "Submit product samples",
      "Apply for support funds",
    ]),
    official_url: "https://odop.mofpi.gov.in",
    helpline: "011-26492263",
    last_verified_at: "2026-01-01",
    match_score: 78,
    match_reasons: ["Marketing and branding support", "District-level craft support"],
  },
  {
    id: "nhdp",
    name: "National Handicrafts Development",
    short_summary:
      "Design development, skill upgradation, infrastructure support, and market linkage for handicraft clusters under Office of DC (Handicrafts), Ministry of Textiles.",
    simple_summary:
      "Cluster support, design training and market linkage for handicraft artisans.",
    category: "training",
    level: "central",
    ministry: "Ministry of Textiles - Office of DC Handicrafts",
    max_benefit_amount: "Rs1,00,000",
    benefits_json: JSON.stringify([
      "Design and skill training workshops",
      "Common facility centre in clusters",
      "Market linkage and buyer-seller meets",
      "Export promotion support",
    ]),
    eligibility_json: JSON.stringify([
      "Handicraft artisan",
      "Member of a recognized craft cluster",
      "Valid Artisan / Pahchan Card preferred",
    ]),
    documents_json: JSON.stringify([
      "Aadhaar card",
      "Artisan / Pahchan card",
      "Bank account details",
    ]),
    apply_steps_json: JSON.stringify([
      "Contact nearest DC Handicrafts office",
      "Enroll in the cluster programme",
      "Attend skill and design training",
      "Participate in buyer-seller meets",
    ]),
    official_url: "https://handicrafts.nic.in",
    helpline: "1800-208-9988",
    last_verified_at: "2026-01-01",
    match_score: 75,
    match_reasons: [
      "Handicraft artisan eligible",
      "Training and cluster support",
    ],
  },
];

const PRIORITY_ORDER = [
  "pm-vishwakarma",
  "pm-mudra",
  "pmegp",
  "odop",
  "nhdp",
  "pehchan-nhdp",
  "cgtmse",
];

function getSchemeVisuals(id: string) {
  switch (id) {
    case "pehchan-nhdp":
      return {
        Icon: CreditCard,
        iconBg: "#1A4731",
        iconColor: "#FFFFFF",
        tag: "Identity Card",
        tagBg: "#DCF5E8",
        tagColor: "#166534",
        isBestMatch: true,
      };
    case "pm-vishwakarma":
      return {
        Icon: Coins,
        iconBg: "#78350F",
        iconColor: "#FFFFFF",
        tag: "Rs3L at 5%",
        tagBg: "#FEF3C7",
        tagColor: "#92400E",
        isBestMatch: false,
      };
    case "cgtmse":
      return {
        Icon: Briefcase,
        iconBg: "#134E4A",
        iconColor: "#FFFFFF",
        tag: "No Collateral",
        tagBg: "#CCFBF1",
        tagColor: "#0F766E",
        isBestMatch: false,
      };
    case "odop":
      return {
        Icon: Users,
        iconBg: "#1A4731",
        iconColor: "#FFFFFF",
        tag: "Marketing",
        tagBg: "#DCF5E8",
        tagColor: "#166534",
        isBestMatch: false,
      };
    case "pm-mudra":
      return {
        Icon: Sprout,
        iconBg: "#1E3A24",
        iconColor: "#FFFFFF",
        tag: "Rs10L Loan",
        tagBg: "#DCFCE7",
        tagColor: "#166534",
        isBestMatch: false,
      };
    case "pmegp":
      return {
        Icon: Store,
        iconBg: "#7C2D12",
        iconColor: "#FFFFFF",
        tag: "35% Subsidy",
        tagBg: "#FEF3C7",
        tagColor: "#92400E",
        isBestMatch: false,
      };
    default:
      return {
        Icon: BarChart3,
        iconBg: "#1E3A24",
        iconColor: "#FFFFFF",
        tag: "Scheme",
        tagBg: "#DCFCE7",
        tagColor: "#166534",
        isBestMatch: false,
      };
  }
}

export default function SchemesListScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { profile } = useAuth();

  const [allSchemes, setAllSchemes] = useState<Scheme[]>([]);
  const [category, setCategory] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(true);
  const [speakingSchemeId, setSpeakingSchemeId] = useState<string | null>(null);

  const craftName =
    profile?.craft_type || profile?.craft_custom || "Wood Carving";
  const stateName = profile?.location || "Tamil Nadu";

  useEffect(() => {
    return () => {
      stopSpeech();
    };
  }, []);

  const loadSchemes = useCallback(async () => {
    setLoading(true);
    try {
      const matchedRes = await api.get("/schemes/matched", {
        params: { craft_type: craftName, state: stateName },
      });
      let list: Scheme[] = matchedRes.data?.schemes || [];
      if (list.length === 0) {
        const allRes = await api.get("/schemes/", {});
        list = allRes.data?.schemes || [];
      }
      if (list.length === 0) list = HARDCODED_SCHEMES;
      const sorted = [...list].sort((a, b) => {
        const idxA = PRIORITY_ORDER.indexOf(a.id);
        const idxB = PRIORITY_ORDER.indexOf(b.id);
        if (idxA !== -1 && idxB !== -1) return idxA - idxB;
        if (idxA !== -1) return -1;
        if (idxB !== -1) return 1;
        return 0;
      });
      setAllSchemes(sorted);
    } catch (_err) {
      setAllSchemes(HARDCODED_SCHEMES);
    } finally {
      setLoading(false);
    }
  }, [craftName, stateName]);

  useEffect(() => {
    loadSchemes();
  }, [loadSchemes]);

  const handleToggleSpeech = useCallback(
    (scheme: Scheme) => {
      if (!isSpeechSupported()) return;
      if (speakingSchemeId === scheme.id) {
        stopSpeech();
        setSpeakingSchemeId(null);
        return;
      }
      stopSpeech();
      const currentLang = (getSelectedLanguage() || "en") as AppLanguage;
      const summary =
        scheme.short_summary || scheme.simple_summary || scheme.name;
      setSpeakingSchemeId(scheme.id);
      centralSpeak(`${scheme.name}. ${summary}`, currentLang, {
        rate: 0.95,
        pitch: 1.0,
        onDone: () => setSpeakingSchemeId(null),
        onStopped: () => setSpeakingSchemeId(null),
        onError: () => setSpeakingSchemeId(null),
      });
    },
    [speakingSchemeId]
  );

  const filteredSchemes = useMemo(() => {
    return allSchemes.filter((item) => {
      if (category === "loans" && item.category !== "loans") return false;
      if (
        category === "training" &&
        !item.category.includes("training") &&
        item.id !== "pm-vishwakarma" &&
        item.id !== "pehchan-nhdp"
      )
        return false;
      if (
        category === "tools" &&
        item.id !== "pm-vishwakarma" &&
        item.id !== "odop"
      )
        return false;
      if (
        category === "marketing" &&
        item.category !== "marketing" &&
        item.id !== "pehchan-nhdp"
      )
        return false;
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase().trim();
      return (
        item.name.toLowerCase().includes(q) ||
        item.short_summary.toLowerCase().includes(q) ||
        item.ministry.toLowerCase().includes(q)
      );
    });
  }, [allSchemes, category, searchQuery]);

  return (
    <View style={s.root}>
      <StatusBar
        barStyle="dark-content"
        backgroundColor="#F9F7F3"
        translucent={false}
      />

      {/* Header */}
      <View style={[s.header, { paddingTop: insets.top + 10 }]}>
        <TouchableOpacity
          style={s.backBtn}
          onPress={() => router.back()}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
        >
          <ArrowLeft size={22} color="#111827" strokeWidth={2.2} />
        </TouchableOpacity>
        <Text style={s.pageTitle}>Govt. Schemes</Text>
        <Text style={s.pageSubtitle}>Support and benefits for artisans</Text>
      </View>

      {/* Search */}
      <View style={s.searchWrap}>
        <View style={s.searchBar}>
          <Search size={17} color="#9CA3AF" strokeWidth={2} />
          <TextInput
            style={s.searchInput}
            placeholder="Search schemes..."
            placeholderTextColor="#9CA3AF"
            value={searchQuery}
            onChangeText={setSearchQuery}
            returnKeyType="search"
            autoCorrect={false}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity
              onPress={() => setSearchQuery("")}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <X size={15} color="#6B7280" />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Filter Chips */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={s.chipsRow}
        style={s.chipsScroll}
        keyboardShouldPersistTaps="handled"
      >
        {CATEGORY_CHIPS.map((chip) => {
          const active = category === chip.key;
          return (
            <TouchableOpacity
              key={chip.key}
              style={[s.chip, active && s.chipActive]}
              onPress={() => setCategory(chip.key)}
              activeOpacity={0.8}
            >
              <Text style={[s.chipText, active && s.chipTextActive]}>
                {chip.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* Content */}
      {loading ? (
        <View style={s.loaderWrap}>
          <ActivityIndicator size="large" color="#1E3A24" />
          <Text style={s.loaderText}>Loading schemes...</Text>
        </View>
      ) : (
        <ScrollView
          style={s.scroll}
          contentContainerStyle={[
            s.scrollContent,
            { paddingBottom: insets.bottom + 40 },
          ]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {filteredSchemes.length === 0 ? (
            <View style={s.emptyBox}>
              <Text style={s.emptyTitle}>No schemes found</Text>
              <Text style={s.emptyText}>
                No results for &quot;{searchQuery}&quot;
              </Text>
              <TouchableOpacity
                style={s.clearBtn}
                onPress={() => {
                  setCategory("all");
                  setSearchQuery("");
                }}
              >
                <Text style={s.clearBtnText}>Show All</Text>
              </TouchableOpacity>
            </View>
          ) : (
            filteredSchemes.map((scheme) => {
              const v = getSchemeVisuals(scheme.id);
              const { Icon } = v;
              const isSpeaking = speakingSchemeId === scheme.id;
              return (
                <TouchableOpacity
                  key={scheme.id}
                  style={s.bigCard}
                  activeOpacity={0.88}
                  onPress={() =>
                    router.push(`/schemes/${scheme.id}` as any)
                  }
                >
                  {/* Top row: icon + audio */}
                  <View style={s.cardTopRow}>
                    <View
                      style={[s.bigIconBox, { backgroundColor: v.iconBg }]}
                    >
                      <Icon size={28} color={v.iconColor} strokeWidth={2} />
                    </View>

                    <View style={s.cardTopRight}>
                      {v.isBestMatch && (
                        <View style={s.bestBadge}>
                          <Sparkles
                            size={10}
                            color="#C2410C"
                            strokeWidth={2.2}
                          />
                          <Text style={s.bestBadgeText}>Best match</Text>
                        </View>
                      )}
                      <TouchableOpacity
                        style={[s.audioBtn, isSpeaking && s.audioBtnActive]}
                        onPress={() => handleToggleSpeech(scheme)}
                        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                      >
                        {isSpeaking ? (
                          <Square size={14} color="#DC2626" fill="#DC2626" />
                        ) : (
                          <Volume2
                            size={16}
                            color="#165B33"
                            strokeWidth={2}
                          />
                        )}
                      </TouchableOpacity>
                    </View>
                  </View>

                  {/* Title */}
                  <Text style={s.cardTitle}>{scheme.name}</Text>

                  {/* Summary */}
                  <Text style={s.cardSummary} numberOfLines={2}>
                    {scheme.simple_summary || scheme.short_summary}
                  </Text>

                  {/* Bottom row */}
                  <View style={s.cardBottom}>
                    <View style={[s.tag, { backgroundColor: v.tagBg }]}>
                      <Text style={[s.tagText, { color: v.tagColor }]}>
                        {v.tag}
                      </Text>
                    </View>
                    <View style={s.viewBtn}>
                      <Text style={s.viewBtnText}>View details</Text>
                      <ChevronRight
                        size={14}
                        color="#165B33"
                        strokeWidth={2.5}
                      />
                    </View>
                  </View>
                </TouchableOpacity>
              );
            })
          )}
        </ScrollView>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#F9F7F3" },

  /* Header */
  header: {
    paddingHorizontal: 20,
    paddingBottom: 14,
    backgroundColor: "#F9F7F3",
  },
  backBtn: {
    width: 36,
    height: 36,
    justifyContent: "center",
    marginBottom: 10,
  },
  pageTitle: {
    fontSize: 28,
    fontFamily: Fonts.headingBold,
    fontWeight: "800",
    color: "#111827",
    letterSpacing: -0.6,
  },
  pageSubtitle: {
    fontSize: 13.5,
    fontFamily: Fonts.body,
    color: "#6B7280",
    marginTop: 3,
  },

  /* Search */
  searchWrap: { paddingHorizontal: 20, marginBottom: 12 },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    paddingHorizontal: 14,
    height: 46,
    gap: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    fontFamily: Fonts.body,
    color: "#111827",
    paddingVertical: Platform.OS === "ios" ? 0 : 4,
  },

  /* Chips */
  chipsScroll: {
    marginBottom: 16,
    flexGrow: 0,
    flexShrink: 0,
    width: "100%",
    maxHeight: 50,
  },
  chipsRow: {
    paddingHorizontal: 20,
    gap: 8,
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "nowrap",
  },
  chip: {
    paddingHorizontal: 18,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    alignSelf: "flex-start",
  },
  chipActive: { backgroundColor: "#1E3A24", borderColor: "#1E3A24" },
  chipText: {
    fontSize: 13,
    fontFamily: Fonts.bodyMedium,
    color: "#4B5563",
    fontWeight: "500",
  },
  chipTextActive: { color: "#FFFFFF", fontWeight: "700" },

  /* Loader */
  loaderWrap: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    gap: 12,
  },
  loaderText: { fontSize: 13, fontFamily: Fonts.body, color: "#6B7280" },

  /* Scroll */
  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: 20, gap: 14 },

  /* Big Card */
  bigCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: "#EEEBE6",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  cardTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 14,
  },
  bigIconBox: {
    width: 56,
    height: 56,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
  },
  cardTopRight: { alignItems: "flex-end", gap: 6 },
  bestBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FEEAD8",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    gap: 4,
  },
  bestBadgeText: {
    fontSize: 10,
    fontFamily: Fonts.headingBold,
    fontWeight: "700",
    color: "#C2410C",
  },
  audioBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: "#F0FDF4",
    borderWidth: 1,
    borderColor: "#D1FAE5",
    justifyContent: "center",
    alignItems: "center",
  },
  audioBtnActive: { backgroundColor: "#FEE2E2", borderColor: "#FECACA" },
  cardTitle: {
    fontSize: 17,
    fontFamily: Fonts.headingBold,
    fontWeight: "800",
    color: "#111827",
    letterSpacing: -0.3,
    marginBottom: 6,
  },
  cardSummary: {
    fontSize: 13.5,
    fontFamily: Fonts.body,
    color: "#6B7280",
    lineHeight: 20,
    marginBottom: 16,
  },
  cardBottom: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  tag: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  tagText: { fontSize: 12, fontFamily: Fonts.headingBold, fontWeight: "700" },
  viewBtn: { flexDirection: "row", alignItems: "center", gap: 3 },
  viewBtnText: {
    fontSize: 13,
    fontFamily: Fonts.headingBold,
    fontWeight: "700",
    color: "#165B33",
  },

  /* Empty */
  emptyBox: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 32,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#EEEBE6",
    gap: 6,
  },
  emptyTitle: {
    fontSize: 15,
    fontFamily: Fonts.headingBold,
    fontWeight: "700",
    color: "#111827",
  },
  emptyText: {
    fontSize: 13,
    fontFamily: Fonts.body,
    color: "#6B7280",
    textAlign: "center",
  },
  clearBtn: {
    marginTop: 10,
    backgroundColor: "#1E3A24",
    paddingHorizontal: 20,
    paddingVertical: 9,
    borderRadius: 12,
  },
  clearBtnText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontFamily: Fonts.headingBold,
    fontWeight: "700",
  },
});