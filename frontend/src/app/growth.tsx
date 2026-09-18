import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  StatusBar,
  Modal,
  Linking,
  Alert,
  Image,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import {
  ArrowLeft,
  ArrowRight,
  Lightbulb,
  ShoppingCart,
  FileText,
  TrendingUp,
  X,
  Phone,
  ExternalLink,
  Calendar,
  CheckCircle2,
  Tag,
  Clock,
  Layers,
} from 'lucide-react-native';

import { Fonts, Shadow, NAV_HEIGHT } from '@/constants/artisan-theme';
import { ArtisanBottomNav, ArtisanTab } from '@/components/artisan/ArtisanBottomNav';

const CARD_GAP = 12;
const HORIZONTAL_PADDING = 18;

// ── Color Schemes & Visual Images for the 4 Grid Cards ─────────────────────
const CARDS_CONFIG = [
  {
    id: 'design',
    title: 'Design Ideas',
    vernacular: 'नए डिज़ाइन • புது வடிவமைப்பு',
    subtitle: 'Modern fusion trends & creative product ideas.',
    imageUrl: 'https://images.unsplash.com/photo-1565193566173-7a0ee3dbe261?w=400&q=80',
    icon: Lightbulb,
    cardBg: '#EFF7F1',         // Soft pastel mint
    borderCol: '#DDF0E1',
    iconBg: '#D6EFE0',
    iconCol: '#1B6A3B',
    arrowBg: '#D6EFE0',
    arrowCol: '#1B6A3B',
  },
  {
    id: 'materials',
    title: 'Raw Materials & Tools',
    vernacular: 'कच्चा माल • மூலப்பொருள்',
    subtitle: 'Trusted bulk suppliers for yarn, clay & equipment.',
    imageUrl: 'https://images.unsplash.com/photo-1584992236310-6edddc08acff?w=400&q=80',
    icon: ShoppingCart,
    cardBg: '#FDF5ED',         // Soft warm peach
    borderCol: '#FCECDD',
    iconBg: '#FDE7D2',
    iconCol: '#B45309',
    arrowBg: '#FDE7D2',
    arrowCol: '#B45309',
  },
  {
    id: 'schemes',
    title: 'Govt. Schemes',
    vernacular: 'सरकारी योजना • அரசு திட்டம்',
    subtitle: 'Subsidies, loans & PM Vishwakarma support.',
    imageUrl: 'https://images.unsplash.com/photo-1450133064473-71024230f91b?w=400&q=80',
    icon: FileText,
    cardBg: '#EFF5FA',         // Soft pastel sky blue
    borderCol: '#DDE9F5',
    iconBg: '#DBE9F7',
    iconCol: '#1D4ED8',
    arrowBg: '#DBE9F7',
    arrowCol: '#1D4ED8',
  },
  {
    id: 'forecast',
    title: 'Demand Forecast',
    vernacular: 'त्यौहार मांग • திருவிழா தேவை',
    subtitle: 'Festive season peaks & advance stock planning.',
    imageUrl: 'https://images.unsplash.com/photo-1605117815565-91e842c70f87?w=400&q=80',
    icon: TrendingUp,
    cardBg: '#FDF1EF',         // Soft pastel blush / coral
    borderCol: '#FCE4E0',
    iconBg: '#FCE0DA',
    iconCol: '#B91C1C',
    arrowBg: '#FCE0DA',
    arrowCol: '#B91C1C',
  },
];

export default function GrowthHubScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const [activeTab, setActiveTab] = useState<ArtisanTab>('growth');
  const [selectedModal, setSelectedModal] = useState<string | null>(null);

  const handleTabChange = (tab: ArtisanTab) => {
    setActiveTab(tab);
    if (tab === 'home') router.push('/');
    if (tab === 'listings') router.push('/listings');
    if (tab === 'growth') router.push('/growth');
    if (tab === 'profile') router.push('/profile');
  };

  const handleDialSupplier = (phone: string) => {
    Linking.openURL(`tel:${phone}`).catch(() => {
      Alert.alert('Supplier Contact', `Direct phone: ${phone}`);
    });
  };

  const renderCard = (card: (typeof CARDS_CONFIG)[0]) => {
    const IconComp = card.icon;
    return (
      <TouchableOpacity
        key={card.id}
        style={[
          styles.card,
          { backgroundColor: card.cardBg, borderColor: card.borderCol },
        ]}
        onPress={() => {
          if (card.id === 'schemes') {
            router.push('/schemes' as any);
          } else if (card.id === 'design') {
            router.push('/design-ideas' as any);
          } else if (card.id === 'forecast') {
            router.push('/demand-forecast' as any);
          } else if (card.id === 'materials') {
            router.push('/materials' as any);
          } else {
            setSelectedModal(card.id);
          }
        }}
        activeOpacity={0.85}
      >
        {/* Visual Picture Container with Overlay Badge */}
        <View style={styles.imageContainer}>
          <Image
            source={{ uri: card.imageUrl }}
            style={styles.cardImage}
            resizeMode="cover"
          />
          <View style={[styles.floatingIconBadge, { backgroundColor: card.iconBg }]}>
            <IconComp size={15} color={card.iconCol} strokeWidth={2.4} />
          </View>
        </View>

        {/* Card Text Content with Vernacular Cue */}
        <View style={styles.cardTextWrap}>
          <Text style={styles.cardTitle} numberOfLines={1}>
            {card.title}
          </Text>
          <View style={[styles.vernacularBadge, { backgroundColor: card.iconBg }]}>
            <Text style={[styles.vernacularText, { color: card.iconCol }]} numberOfLines={1}>
              {card.vernacular}
            </Text>
          </View>
          <Text style={styles.cardSubtitle} numberOfLines={2}>
            {card.subtitle}
          </Text>
        </View>

        {/* Bottom Arrow Indicator */}
        <View style={styles.cardBottomRow}>
          <View style={[styles.arrowCircle, { backgroundColor: card.arrowBg }]}>
            <ArrowRight size={14} color={card.arrowCol} strokeWidth={2.4} />
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.root}>
      <StatusBar barStyle="dark-content" backgroundColor="#FAF8F5" />

      <View
        style={[
          styles.body,
          {
            paddingTop: insets.top + 8,
            paddingBottom: NAV_HEIGHT + insets.bottom + 10,
          },
        ]}
      >
        {/* ── Top Header matching reference image ─────────────────────── */}
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backBtn}
            onPress={() => router.push('/')}
            activeOpacity={0.75}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          >
            <ArrowLeft size={22} color="#1E293B" strokeWidth={2.2} />
          </TouchableOpacity>

          <Text style={styles.title}>Growth Hub</Text>
          <Text style={styles.subtitle}>
            Tools and support to grow your craft business
          </Text>
        </View>

        {/* ── 2x2 Grid of Growth Hub Cards (Full Fitted Viewport) ─────── */}
        <View style={styles.gridContainer}>
          <View style={styles.gridRow}>
            {renderCard(CARDS_CONFIG[0])}
            {renderCard(CARDS_CONFIG[1])}
          </View>
          <View style={styles.gridRow}>
            {renderCard(CARDS_CONFIG[2])}
            {renderCard(CARDS_CONFIG[3])}
          </View>
        </View>
      </View>

      {/* ── Interactive Modals for Each Growth Section ──────────────── */}

      {/* 1. Design Innovation Modal */}
      <Modal
        visible={selectedModal === 'design'}
        animationType="slide"
        transparent
        onRequestClose={() => setSelectedModal(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <View style={styles.modalHeader}>
              <View style={styles.modalHeaderTitleGroup}>
                <View style={[styles.modalHeaderIcon, { backgroundColor: '#D6EFE0' }]}>
                  <Lightbulb size={20} color="#1B6A3B" strokeWidth={2.2} />
                </View>
                <View>
                  <Text style={styles.modalTitle}>Design Innovation</Text>
                  <Text style={styles.modalSubtitle}>Modern trends for traditional crafts</Text>
                </View>
              </View>
              <TouchableOpacity onPress={() => setSelectedModal(null)} style={styles.closeBtn}>
                <X size={20} color="#64748B" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalScroll} showsVerticalScrollIndicator={false}>
              <Text style={styles.sectionHeading}>🔥 High-Demand Fusion Concepts</Text>

              <View style={styles.ideaCard}>
                <View style={styles.ideaTagRow}>
                  <Tag size={13} color="#1B6A3B" />
                  <Text style={styles.ideaTag}>Terracotta & Ceramics</Text>
                  <Text style={styles.demandBadge}>+45% Urban Demand</Text>
                </View>
                <Text style={styles.ideaTitle}>Minimalist Indoor Planters & Dining Sets</Text>
                <Text style={styles.ideaDesc}>
                  Urban buyers look for unglazed matte terracotta pots with clean geometric rims and ribbed textures for modern balcony gardens.
                </Text>
              </View>

              <View style={styles.ideaCard}>
                <View style={styles.ideaTagRow}>
                  <Tag size={13} color="#1B6A3B" />
                  <Text style={styles.ideaTag}>Handloom & Textiles</Text>
                  <Text style={styles.demandBadge}>Export Trend</Text>
                </View>
                <Text style={styles.ideaTitle}>Pastel Linen Stoles & Laptop Sleeves</Text>
                <Text style={styles.ideaDesc}>
                  Weaving traditional border motifs onto sage green, dusty rose, and raw ecru tones appeals strongly to youth and corporate gifting.
                </Text>
              </View>

              <View style={styles.ideaCard}>
                <View style={styles.ideaTagRow}>
                  <Tag size={13} color="#1B6A3B" />
                  <Text style={styles.ideaTag}>Woodcraft & Metal</Text>
                  <Text style={styles.demandBadge}>Festive Favorite</Text>
                </View>
                <Text style={styles.ideaTitle}>Brass Accents on Reclaimed Teak Trays</Text>
                <Text style={styles.ideaDesc}>
                  Combining engraved brass corners on polished natural wood gives a luxury heritage touch with high profit margins.
                </Text>
              </View>

              <Text style={[styles.sectionHeading, { marginTop: 14 }]}>🎨 Trending Season Palettes</Text>
              <View style={styles.paletteRow}>
                <View style={[styles.paletteChip, { backgroundColor: '#E07A5F' }]}>
                  <Text style={styles.paletteText}>Terracotta</Text>
                </View>
                <View style={[styles.paletteChip, { backgroundColor: '#819B7C' }]}>
                  <Text style={styles.paletteText}>Sage Leaf</Text>
                </View>
                <View style={[styles.paletteChip, { backgroundColor: '#3D5A80' }]}>
                  <Text style={styles.paletteText}>Indigo Blue</Text>
                </View>
                <View style={[styles.paletteChip, { backgroundColor: '#F4A261' }]}>
                  <Text style={styles.paletteText}>Raw Honey</Text>
                </View>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* 2. Raw Materials & Equipment Modal */}
      <Modal
        visible={selectedModal === 'materials'}
        animationType="slide"
        transparent
        onRequestClose={() => setSelectedModal(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <View style={styles.modalHeader}>
              <View style={styles.modalHeaderTitleGroup}>
                <View style={[styles.modalHeaderIcon, { backgroundColor: '#FDE7D2' }]}>
                  <ShoppingCart size={20} color="#B45309" strokeWidth={2.2} />
                </View>
                <View>
                  <Text style={styles.modalTitle}>Materials & Tools</Text>
                  <Text style={styles.modalSubtitle}>Trusted, subsidized bulk suppliers</Text>
                </View>
              </View>
              <TouchableOpacity onPress={() => setSelectedModal(null)} style={styles.closeBtn}>
                <X size={20} color="#64748B" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalScroll} showsVerticalScrollIndicator={false}>
              <Text style={styles.sectionHeading}>📦 Verified Artisan Suppliers</Text>

              <View style={styles.supplierCard}>
                <View style={styles.supplierTop}>
                  <View>
                    <Text style={styles.supplierName}>National Handloom Development Corp</Text>
                    <Text style={styles.supplierLocation}>State Depot • Hank Yarn Subsidy</Text>
                  </View>
                  <View style={styles.discountBadge}>
                    <Text style={styles.discountText}>15% Govt Subsidy</Text>
                  </View>
                </View>
                <Text style={styles.supplierDesc}>
                  Pure organic cotton yarn (40s-80s count), Mulberry silk cones, and azo-free natural mineral dyes.
                </Text>
                <TouchableOpacity
                  style={styles.supplierCallBtn}
                  onPress={() => handleDialSupplier('18002081999')}
                >
                  <Phone size={15} color="#FFFFFF" />
                  <Text style={styles.supplierCallText}>Call NHDC Helpline</Text>
                </TouchableOpacity>
              </View>

              <View style={styles.supplierCard}>
                <View style={styles.supplierTop}>
                  <View>
                    <Text style={styles.supplierName}>Clay & Ceramic Guild Cooperative</Text>
                    <Text style={styles.supplierLocation}>Direct Pottery Clays • Salem & Khurja</Text>
                  </View>
                  <View style={styles.discountBadge}>
                    <Text style={styles.discountText}>Wholesale Rate</Text>
                  </View>
                </View>
                <Text style={styles.supplierDesc}>
                  Pre-washed terracotta clay, food-grade transparent glazes, and energy-efficient electric potter wheels.
                </Text>
                <TouchableOpacity
                  style={styles.supplierCallBtn}
                  onPress={() => handleDialSupplier('+919842100022')}
                >
                  <Phone size={15} color="#FFFFFF" />
                  <Text style={styles.supplierCallText}>Contact Supplier</Text>
                </TouchableOpacity>
              </View>

              <View style={styles.supplierCard}>
                <View style={styles.supplierTop}>
                  <View>
                    <Text style={styles.supplierName}>Artisan Precision Tooling Hub</Text>
                    <Text style={styles.supplierLocation}>Hand Carving & Weaving Shuttles</Text>
                  </View>
                  <View style={styles.discountBadge}>
                    <Text style={styles.discountText}>Vishwakarma Kit</Text>
                  </View>
                </View>
                <Text style={styles.supplierDesc}>
                  Hardened steel chisels, wood lathes, brass inlay wire, and flying shuttles compliant with PM Vishwakarma toolkit vouchers.
                </Text>
                <TouchableOpacity
                  style={styles.supplierCallBtn}
                  onPress={() => handleDialSupplier('+919443211188')}
                >
                  <Phone size={15} color="#FFFFFF" />
                  <Text style={styles.supplierCallText}>Inquire for Toolkits</Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* 3. Government Schemes Modal */}
      <Modal
        visible={selectedModal === 'schemes'}
        animationType="slide"
        transparent
        onRequestClose={() => setSelectedModal(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <View style={styles.modalHeader}>
              <View style={styles.modalHeaderTitleGroup}>
                <View style={[styles.modalHeaderIcon, { backgroundColor: '#DBE9F7' }]}>
                  <FileText size={20} color="#1D4ED8" strokeWidth={2.2} />
                </View>
                <View>
                  <Text style={styles.modalTitle}>Government Schemes</Text>
                  <Text style={styles.modalSubtitle}>Empowering Indian craftspeople</Text>
                </View>
              </View>
              <TouchableOpacity onPress={() => setSelectedModal(null)} style={styles.closeBtn}>
                <X size={20} color="#64748B" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalScroll} showsVerticalScrollIndicator={false}>
              <View style={styles.schemeCard}>
                <View style={styles.schemeBadgeRow}>
                  <Text style={styles.schemeCategory}>Flagship Scheme</Text>
                  <Text style={styles.schemeAmount}>₹15,000 + ₹3 Lakh</Text>
                </View>
                <Text style={styles.schemeName}>PM Vishwakarma Yojana</Text>
                <Text style={styles.schemeDesc}>
                  Includes ₹15,000 free toolkit e-voucher, skill upgrade training with ₹500/day stipend, and collateral-free loan at subsidized 5% interest rate.
                </Text>
                <View style={styles.schemeHighlights}>
                  <View style={styles.highlightRow}>
                    <CheckCircle2 size={15} color="#166534" />
                    <Text style={styles.highlightText}>Recognized Artisan ID Card</Text>
                  </View>
                  <View style={styles.highlightRow}>
                    <CheckCircle2 size={15} color="#166534" />
                    <Text style={styles.highlightText}>Digital transaction incentives (₹1/tx)</Text>
                  </View>
                </View>
                <TouchableOpacity
                  style={styles.schemeActionBtn}
                  onPress={() => Linking.openURL('https://pmvishwakarma.gov.in/')}
                >
                  <Text style={styles.schemeActionText}>Apply on Official Portal</Text>
                  <ExternalLink size={15} color="#1D4ED8" />
                </TouchableOpacity>
              </View>

              <View style={styles.schemeCard}>
                <View style={styles.schemeBadgeRow}>
                  <Text style={styles.schemeCategory}>Export & Exhibitions</Text>
                  <Text style={styles.schemeAmount}>Free Stalls & Subsidies</Text>
                </View>
                <Text style={styles.schemeName}>One District One Product (ODOP)</Text>
                <Text style={styles.schemeDesc}>
                  Identifies unique district crafts to provide international marketing, free stalls at national expos (Dilli Haat, Surajkund), and packaging support.
                </Text>
                <TouchableOpacity
                  style={styles.schemeActionBtn}
                  onPress={() => Linking.openURL('https://www.odop.in/')}
                >
                  <Text style={styles.schemeActionText}>View District Crafts</Text>
                  <ExternalLink size={15} color="#1D4ED8" />
                </TouchableOpacity>
              </View>

              <View style={styles.schemeCard}>
                <View style={styles.schemeBadgeRow}>
                  <Text style={styles.schemeCategory}>Official Recognition</Text>
                  <Text style={styles.schemeAmount}>Pehchan Card</Text>
                </View>
                <Text style={styles.schemeName}>Development Commissioner (Handicrafts)</Text>
                <Text style={styles.schemeDesc}>
                  Free photo identity card enabling direct health insurance, railway travel concessions for fairs, and access to raw material depots.
                </Text>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* 4. Festival Demand Forecasting Modal */}
      <Modal
        visible={selectedModal === 'forecast'}
        animationType="slide"
        transparent
        onRequestClose={() => setSelectedModal(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <View style={styles.modalHeader}>
              <View style={styles.modalHeaderTitleGroup}>
                <View style={[styles.modalHeaderIcon, { backgroundColor: '#FCE0DA' }]}>
                  <TrendingUp size={20} color="#B91C1C" strokeWidth={2.2} />
                </View>
                <View>
                  <Text style={styles.modalTitle}>Demand Forecast</Text>
                  <Text style={styles.modalSubtitle}>Prepare seasonal production in advance</Text>
                </View>
              </View>
              <TouchableOpacity onPress={() => setSelectedModal(null)} style={styles.closeBtn}>
                <X size={20} color="#64748B" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalScroll} showsVerticalScrollIndicator={false}>
              <Text style={styles.sectionHeading}>📅 Upcoming High-Demand Seasons</Text>

              <View style={styles.forecastCard}>
                <View style={styles.forecastHeader}>
                  <View style={styles.forecastTitleWrap}>
                    <Calendar size={16} color="#B91C1C" />
                    <Text style={styles.forecastSeason}>Diwali & Dussehra Festive Peak</Text>
                  </View>
                  <View style={styles.surgeBadge}>
                    <Text style={styles.surgeText}>+180% Demand</Text>
                  </View>
                </View>
                <View style={styles.leadTimeRow}>
                  <Clock size={13} color="#64748B" />
                  <Text style={styles.leadTimeText}>Start production 45 days prior</Text>
                </View>
                <Text style={styles.forecastItems}>
                  Top Items: Terracotta Diyas, Brass Urli, Silk Dupattas, Torans, Handcrafted Gift Boxes.
                </Text>
                <View style={styles.recommendationBox}>
                  <Text style={styles.recommendationText}>
                    💡 Recommendation: Stock 2.5x standard units. Pre-bundle with festival packaging.
                  </Text>
                </View>
              </View>

              <View style={styles.forecastCard}>
                <View style={styles.forecastHeader}>
                  <View style={styles.forecastTitleWrap}>
                    <Calendar size={16} color="#B91C1C" />
                    <Text style={styles.forecastSeason}>Winter Wedding & NRI Season</Text>
                  </View>
                  <View style={styles.surgeBadge}>
                    <Text style={styles.surgeText}>+120% Demand</Text>
                  </View>
                </View>
                <View style={styles.leadTimeRow}>
                  <Clock size={13} color="#64748B" />
                  <Text style={styles.leadTimeText}>High ticket items • Custom orders</Text>
                </View>
                <Text style={styles.forecastItems}>
                  Top Items: Zari & Handloom Sarees, Brass Pooja Thalis, Carved Wooden Return Gifts.
                </Text>
                <View style={styles.recommendationBox}>
                  <Text style={styles.recommendationText}>
                    💡 Recommendation: Enable inquiries and offer personalized name engravings for wedding party bulk orders.
                  </Text>
                </View>
              </View>

              <View style={styles.forecastCard}>
                <View style={styles.forecastHeader}>
                  <View style={styles.forecastTitleWrap}>
                    <Calendar size={16} color="#B91C1C" />
                    <Text style={styles.forecastSeason}>Pongal / Sankranti / New Year</Text>
                  </View>
                  <View style={styles.surgeBadge}>
                    <Text style={styles.surgeText}>+85% Demand</Text>
                  </View>
                </View>
                <View style={styles.leadTimeRow}>
                  <Clock size={13} color="#64748B" />
                  <Text style={styles.leadTimeText}>January Harvest Celebrations</Text>
                </View>
                <Text style={styles.forecastItems}>
                  Top Items: Painted Mud Cooking Pots, Cotton Dhotis, Cane & Bamboo Kitchenware.
                </Text>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* ── Bottom Navigation ───────────────────────────────────────── */}
      <ArtisanBottomNav activeTab={activeTab} onTabChange={handleTabChange} />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#FAF8F5',
  },
  body: {
    flex: 1,
    paddingHorizontal: HORIZONTAL_PADDING,
  },

  /* ── Header ──────────────────────────────────────────────────────── */
  header: {
    marginBottom: 14,
  },
  backBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E8E5DF',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
    ...Shadow.card,
  },
  title: {
    fontSize: 26,
    fontFamily: Fonts.headingBold,
    fontWeight: '800',
    color: '#0F2537',
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 13,
    fontFamily: Fonts.body,
    color: '#64748B',
    marginTop: 3,
    lineHeight: 18,
  },

  /* ── 2x2 Grid Layout (Full Fitted Viewport) ──────────────────────── */
  gridContainer: {
    flex: 1,
    justifyContent: 'space-between',
    gap: CARD_GAP,
    marginBottom: 6,
  },
  gridRow: {
    flex: 1,
    flexDirection: 'row',
    gap: CARD_GAP,
  },
  card: {
    flex: 1,
    borderRadius: 20,
    borderWidth: 1,
    padding: 8,
    justifyContent: 'space-between',
    ...Shadow.card,
  },
  imageContainer: {
    width: '100%',
    height: '44%',
    borderRadius: 13,
    overflow: 'hidden',
    position: 'relative',
    backgroundColor: '#E2E8F0',
  },
  cardImage: {
    width: '100%',
    height: '100%',
  },
  floatingIconBadge: {
    position: 'absolute',
    top: 6,
    left: 6,
    width: 26,
    height: 26,
    borderRadius: 13,
    justifyContent: 'center',
    alignItems: 'center',
    ...Shadow.card,
  },
  cardTextWrap: {
    flex: 1,
    justifyContent: 'center',
    paddingTop: 4,
  },
  cardTitle: {
    fontSize: 13.5,
    fontFamily: Fonts.headingBold,
    fontWeight: '700',
    color: '#0F2537',
    lineHeight: 16.5,
  },
  vernacularBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: 5,
    marginTop: 2,
    marginBottom: 2,
  },
  vernacularText: {
    fontSize: 9.5,
    fontFamily: Fonts.headingBold,
    fontWeight: '700',
  },
  cardSubtitle: {
    fontSize: 10,
    fontFamily: Fonts.body,
    color: '#4B5563',
    lineHeight: 13.5,
  },
  cardBottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    marginTop: 2,
  },
  arrowCircle: {
    width: 26,
    height: 26,
    borderRadius: 13,
    justifyContent: 'center',
    alignItems: 'center',
  },

  /* ── Modal Sheet ─────────────────────────────────────────────────── */
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    maxHeight: '84%',
    paddingTop: 20,
    paddingHorizontal: 20,
    paddingBottom: 36,
    ...Shadow.hero,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  modalHeaderTitleGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  modalHeaderIcon: {
    width: 42,
    height: 42,
    borderRadius: 21,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalTitle: {
    fontSize: 18,
    fontFamily: Fonts.headingBold,
    fontWeight: '700',
    color: '#0F2537',
  },
  modalSubtitle: {
    fontSize: 12,
    fontFamily: Fonts.body,
    color: '#64748B',
    marginTop: 2,
  },
  closeBtn: {
    padding: 6,
  },
  modalScroll: {
    marginTop: 16,
  },
  sectionHeading: {
    fontSize: 14,
    fontFamily: Fonts.headingBold,
    fontWeight: '700',
    color: '#334155',
    marginBottom: 12,
  },

  /* ── Design Idea Card ────────────────────────────────────────────── */
  ideaCard: {
    backgroundColor: '#F8FAF9',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 14,
    marginBottom: 12,
  },
  ideaTagRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 6,
  },
  ideaTag: {
    fontSize: 11,
    fontFamily: Fonts.headingBold,
    fontWeight: '600',
    color: '#1B6A3B',
  },
  demandBadge: {
    fontSize: 10,
    fontFamily: Fonts.headingBold,
    fontWeight: '700',
    backgroundColor: '#DCFCE7',
    color: '#166534',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 8,
    marginLeft: 'auto',
  },
  ideaTitle: {
    fontSize: 14,
    fontFamily: Fonts.headingBold,
    fontWeight: '700',
    color: '#0F2537',
    marginBottom: 4,
  },
  ideaDesc: {
    fontSize: 12,
    fontFamily: Fonts.body,
    color: '#4B5563',
    lineHeight: 17,
  },
  paletteRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 6,
    marginBottom: 18,
  },
  paletteChip: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 12,
    alignItems: 'center',
  },
  paletteText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontFamily: Fonts.headingBold,
    fontWeight: '700',
  },

  /* ── Supplier Card ───────────────────────────────────────────────── */
  supplierCard: {
    backgroundColor: '#FDFBF7',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#EFE7DB',
    padding: 14,
    marginBottom: 12,
  },
  supplierTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 6,
  },
  supplierName: {
    fontSize: 14,
    fontFamily: Fonts.headingBold,
    fontWeight: '700',
    color: '#0F2537',
  },
  supplierLocation: {
    fontSize: 11,
    fontFamily: Fonts.body,
    color: '#64748B',
    marginTop: 2,
  },
  discountBadge: {
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  discountText: {
    fontSize: 10,
    fontFamily: Fonts.headingBold,
    fontWeight: '700',
    color: '#92400E',
  },
  supplierDesc: {
    fontSize: 12,
    fontFamily: Fonts.body,
    color: '#4B5563',
    lineHeight: 17,
    marginBottom: 12,
  },
  supplierCallBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#B45309',
    borderRadius: 12,
    paddingVertical: 8,
  },
  supplierCallText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontFamily: Fonts.headingBold,
    fontWeight: '600',
  },

  /* ── Scheme Card ─────────────────────────────────────────────────── */
  schemeCard: {
    backgroundColor: '#F8FAFC',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 14,
    marginBottom: 12,
  },
  schemeBadgeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  schemeCategory: {
    fontSize: 11,
    fontFamily: Fonts.headingBold,
    fontWeight: '600',
    color: '#1D4ED8',
  },
  schemeAmount: {
    fontSize: 11,
    fontFamily: Fonts.headingBold,
    fontWeight: '700',
    color: '#166534',
  },
  schemeName: {
    fontSize: 15,
    fontFamily: Fonts.headingBold,
    fontWeight: '700',
    color: '#0F2537',
    marginBottom: 6,
  },
  schemeDesc: {
    fontSize: 12,
    fontFamily: Fonts.body,
    color: '#4B5563',
    lineHeight: 18,
    marginBottom: 10,
  },
  schemeHighlights: {
    gap: 4,
    marginBottom: 10,
  },
  highlightRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  highlightText: {
    fontSize: 11.5,
    fontFamily: Fonts.body,
    color: '#1E293B',
  },
  schemeActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: '#BFDBFE',
    borderRadius: 10,
    backgroundColor: '#EFF6FF',
  },
  schemeActionText: {
    fontSize: 12,
    fontFamily: Fonts.headingBold,
    fontWeight: '600',
    color: '#1D4ED8',
  },

  /* ── Forecast Card ───────────────────────────────────────────────── */
  forecastCard: {
    backgroundColor: '#FEF9F9',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#FEE2E2',
    padding: 14,
    marginBottom: 12,
  },
  forecastHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  forecastTitleWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flex: 1,
  },
  forecastSeason: {
    fontSize: 14,
    fontFamily: Fonts.headingBold,
    fontWeight: '700',
    color: '#0F2537',
  },
  surgeBadge: {
    backgroundColor: '#FEE2E2',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  surgeText: {
    fontSize: 10,
    fontFamily: Fonts.headingBold,
    fontWeight: '700',
    color: '#B91C1C',
  },
  leadTimeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 6,
  },
  leadTimeText: {
    fontSize: 11.5,
    fontFamily: Fonts.body,
    color: '#64748B',
  },
  forecastItems: {
    fontSize: 12,
    fontFamily: Fonts.body,
    color: '#334155',
    lineHeight: 17,
    marginBottom: 8,
  },
  recommendationBox: {
    backgroundColor: '#FFFBEB',
    borderRadius: 10,
    padding: 8,
  },
  recommendationText: {
    fontSize: 11,
    fontFamily: Fonts.body,
    color: '#92400E',
    lineHeight: 16,
  },
});
