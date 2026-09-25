import React, { useEffect, useState, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  StatusBar,
  Animated,
  Alert,
} from 'react-native';
import { Image } from 'expo-image';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import {
  ArrowLeft,
  Sparkles,
  CheckCircle2,
  Bookmark,
  ChevronLeft,
  ChevronRight,
  PlusCircle,
  RefreshCw,
  Share2,
} from 'lucide-react-native';

import { BACKEND_URL, normalizeImageUrl } from '@/config/api';
import { Fonts, Shadow } from '@/constants/artisan-theme';

interface GrowthProduct {
  id: string;
  artisan_id?: string;
  title: string;
  category: string;
  craft_type?: string;
  price: string;
  image_url: string;
  status: string;
  description_en?: string;
}

interface DesignIdea {
  id: number;
  product_id: string;
  concept_name: string;
  pitch: string;
  target_customer?: string;
  improvements: string[];
  generated_image_path: string;
  status: string;
  created_at?: string;
}

type ViewState = 'detail' | 'loading' | 'results';

export default function ProductDesignIdeasScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const params = useLocalSearchParams<{ productId: string }>();
  const productId = params.productId || 'prod-woven-basket';

  const [product, setProduct] = useState<GrowthProduct | null>(null);
  const [ideas, setIdeas] = useState<DesignIdea[]>([]);
  const [currentIdeaIndex, setCurrentIdeaIndex] = useState(0);
  const [viewState, setViewState] = useState<ViewState>('detail');
  const [selectedImageTab, setSelectedImageTab] = useState<'original' | 'reimagined'>('reimagined');
  const [savedIdeas, setSavedIdeas] = useState<Record<number, boolean>>({});
  const [pageLoading, setPageLoading] = useState(true);
  const [imageLoadError, setImageLoadError] = useState(false);

  // Animation states for the loading screen
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const step1Anim = useRef(new Animated.Value(0)).current;
  const step2Anim = useRef(new Animated.Value(0)).current;
  const step3Anim = useRef(new Animated.Value(0)).current;

  // Fetch product info & existing design ideas
  useEffect(() => {
    let isMounted = true;

    async function loadData() {
      try {
        setPageLoading(true);
        // 1. Fetch Product
        const prodRes = await fetch(`${BACKEND_URL}/growth/products/${productId}`);
        if (prodRes.ok) {
          const prodData = await prodRes.json();
          if (isMounted) setProduct(prodData.product);
        }

        // 2. Fetch Existing Ideas
        const ideasRes = await fetch(`${BACKEND_URL}/growth/design-ideas/${productId}`);
        if (ideasRes.ok) {
          const ideasData = await ideasRes.json();
          if (isMounted && ideasData.ideas && ideasData.ideas.length > 0) {
            setIdeas(ideasData.ideas);
          }
        }
      } catch (e) {
        console.warn('Error loading product design ideas data:', e);
      } finally {
        if (isMounted) setPageLoading(false);
      }
    }

    loadData();
    return () => {
      isMounted = false;
    };
  }, [productId]);

  // Loading animation sequence
  useEffect(() => {
    if (viewState === 'loading') {
      // Pulse animation
      const pulse = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.12,
            duration: 800,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 800,
            useNativeDriver: true,
          }),
        ])
      );
      pulse.start();

      // Sequential checklist reveals
      step1Anim.setValue(0);
      step2Anim.setValue(0);
      step3Anim.setValue(0);

      Animated.sequence([
        Animated.timing(step1Anim, { toValue: 1, duration: 600, useNativeDriver: true }),
        Animated.timing(step2Anim, { toValue: 1, duration: 600, useNativeDriver: true }),
        Animated.timing(step3Anim, { toValue: 1, duration: 600, useNativeDriver: true }),
      ]).start();

      return () => {
        pulse.stop();
      };
    }
  }, [viewState]);

  // Handler to trigger generation
  const handleGenerateIdeas = async (forceRefresh: boolean | any = false) => {
    const isForce = forceRefresh === true;
    setViewState('loading');

    try {
      const res = await fetch(`${BACKEND_URL}/growth/design-ideas/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ product_id: String(productId), force_refresh: isForce }),
      });

      // Give artisan at least 2.2 seconds to experience the elegant progress checklist
      await new Promise((resolve) => setTimeout(resolve, 2200));

      if (res.ok) {
        const data = await res.json();
        if (data.ideas && data.ideas.length > 0) {
          setIdeas(data.ideas);
          setCurrentIdeaIndex(0);
          setSelectedImageTab('reimagined');
          setImageLoadError(false);
          setViewState('results');
          return;
        }
      }

      // If backend had fallback or already existing ideas
      if (ideas.length > 0) {
        setCurrentIdeaIndex(0);
        setSelectedImageTab('reimagined');
        setImageLoadError(false);
        setViewState('results');
      } else {
        Alert.alert('Notice', 'Unable to generate design ideas right now. Please try again.');
        setViewState('detail');
      }
    } catch (e) {
      console.warn('Error generating ideas:', e);
      if (ideas.length > 0) {
        setViewState('results');
      } else {
        Alert.alert('Notice', 'Network error. Please check your connection.');
        setViewState('detail');
      }
    }
  };

  // Handler to save idea
  const handleSaveIdea = async (idea: DesignIdea) => {
    try {
      const isAlreadySaved = !!savedIdeas[idea.id];
      const nextSaved = !isAlreadySaved;

      setSavedIdeas((prev) => ({ ...prev, [idea.id]: nextSaved }));

      if (nextSaved) {
        await fetch(`${BACKEND_URL}/growth/design-ideas/${idea.id}/save`, {
          method: 'POST',
        });
      }
    } catch (err) {
      console.warn('Error saving idea:', err);
    }
  };

  // Handler to convert idea to new listing
  const handleCreateListing = async (idea: DesignIdea) => {
    try {
      const res = await fetch(`${BACKEND_URL}/growth/design-ideas/${idea.id}/convert-to-listing`, {
        method: 'POST',
      });
      if (res.ok) {
        const payload = await res.json();
        router.push({
          pathname: '/add-product',
          params: {
            prefillTitle: payload.listing_draft.title,
            prefillDescription: payload.listing_draft.description_en,
            prefillImage: payload.listing_draft.image_url,
            prefillCategory: payload.listing_draft.category,
          },
        } as any);
      } else {
        router.push('/add-product' as any);
      }
    } catch {
      router.push('/add-product' as any);
    }
  };

  if (pageLoading && !product) {
    return (
      <View style={[styles.root, styles.centerBox]}>
        <StatusBar barStyle="dark-content" backgroundColor="#FAF8F5" />
        <ActivityIndicator size="large" color="#1E4E2C" />
      </View>
    );
  }

  const currentIdea = ideas[currentIdeaIndex] || ideas[0];
  const originalImageUrl = normalizeImageUrl(product?.image_url);
  const reimaginedImageUrl = currentIdea
    ? normalizeImageUrl(currentIdea.generated_image_path)
    : originalImageUrl;

  const displayImageUrl =
    selectedImageTab === 'original' ? originalImageUrl : reimaginedImageUrl;

  return (
    <View style={styles.root}>
      <StatusBar barStyle="dark-content" backgroundColor="#FAF8F5" />

      <View style={[styles.container, { paddingTop: Math.max(insets.top, 16) }]}>
        {/* ========================================================= */}
        {/* SCREEN B: PRODUCT DESIGN DETAIL (Initial View)            */}
        {/* ========================================================= */}
        {viewState === 'detail' && (
          <>
            {/* Top Bar */}
            <View style={styles.topBar}>
              <TouchableOpacity
                style={styles.backBtn}
                onPress={() => router.back()}
                activeOpacity={0.7}
              >
                <ArrowLeft size={22} color="#0F2438" strokeWidth={2.4} />
              </TouchableOpacity>
            </View>

            <ScrollView
              contentContainerStyle={styles.detailScroll}
              showsVerticalScrollIndicator={false}
            >
              {/* Product Hero Image */}
              <View style={styles.heroImageWrap}>
                <Image
                  source={{ uri: originalImageUrl }}
                  style={styles.heroImage}
                  contentFit="cover"
                  transition={200}
                  cachePolicy="memory-disk"
                />
              </View>

              {/* Title & Price & Status */}
              <View style={styles.detailInfoBox}>
                <Text style={styles.detailTitle}>{product?.title || 'Woven Basket'}</Text>

                <View style={styles.priceRow}>
                  <Text style={styles.detailPrice}>{product?.price || '₹ 850'}</Text>
                  <View style={styles.activeBadge}>
                    <Text style={styles.activeBadgeText}>Active</Text>
                  </View>
                </View>

                {/* Category */}
                <View style={styles.metaSection}>
                  <Text style={styles.metaLabel}>Category</Text>
                  <Text style={styles.metaValue}>
                    {product?.category || 'Baskets & Storage'}
                  </Text>
                </View>

                {/* Description */}
                <Text style={styles.detailDesc}>
                  {product?.description_en ||
                    'Handwoven basket made with natural grass. Traditional design from our region.'}
                </Text>
              </View>

              {/* If existing ideas are present, offer instant view */}
              {ideas.length > 0 && (
                <TouchableOpacity
                  style={styles.viewExistingBtn}
                  onPress={() => {
                    setCurrentIdeaIndex(0);
                    setSelectedImageTab('reimagined');
                    setViewState('results');
                  }}
                  activeOpacity={0.8}
                >
                  <Sparkles size={16} color="#1E4E2C" />
                  <Text style={styles.viewExistingText}>
                    View {ideas.length} previously generated ideas
                  </Text>
                  <ChevronRight size={16} color="#1E4E2C" />
                </TouchableOpacity>
              )}
            </ScrollView>

            {/* Bottom Sticky CTA */}
            <View style={[styles.bottomBar, { paddingBottom: Math.max(insets.bottom, 16) }]}>
              <TouchableOpacity
                style={styles.primaryCta}
                onPress={() => handleGenerateIdeas(false)}
                activeOpacity={0.88}
              >
                <Sparkles size={18} color="#FFFFFF" strokeWidth={2.4} />
                <Text style={styles.primaryCtaText}>
                  {ideas.length > 0 ? '✨ Generate More Design Ideas' : '✨ Generate Design Ideas'}
                </Text>
              </TouchableOpacity>
            </View>
          </>
        )}

        {/* ========================================================= */}
        {/* SCREEN C: GENERATING IDEAS (Loading State)               */}
        {/* ========================================================= */}
        {viewState === 'loading' && (
          <View style={styles.loadingContainer}>
            {/* Top Bar with Back */}
            <View style={styles.topBar}>
              <TouchableOpacity
                style={styles.backBtn}
                onPress={() => setViewState('detail')}
                activeOpacity={0.7}
              >
                <ArrowLeft size={22} color="#0F2438" strokeWidth={2.4} />
              </TouchableOpacity>
            </View>

            <View style={styles.loadingCenterContent}>
              {/* Circular Sparkle Badge */}
              <Animated.View
                style={[
                  styles.sparkleCircle,
                  { transform: [{ scale: pulseAnim }] },
                ]}
              >
                <Sparkles size={46} color="#1E7E34" strokeWidth={2.2} />
              </Animated.View>

              {/* Main Headline */}
              <Text style={styles.loadingHeadline}>
                Creating new ideas{'\n'}for you...
              </Text>

              {/* Sequential Checklist */}
              <View style={styles.loadingChecklist}>
                <Animated.View style={[styles.loadingCheckRow, { opacity: step1Anim }]}>
                  <CheckCircle2 size={22} color="#1E7E34" strokeWidth={2.4} />
                  <Text style={styles.loadingCheckText}>Analyzing your product</Text>
                </Animated.View>

                <Animated.View style={[styles.loadingCheckRow, { opacity: step2Anim }]}>
                  <CheckCircle2 size={22} color="#1E7E34" strokeWidth={2.4} />
                  <Text style={styles.loadingCheckText}>Finding modern trends</Text>
                </Animated.View>

                <Animated.View style={[styles.loadingCheckRow, { opacity: step3Anim }]}>
                  <CheckCircle2 size={22} color="#1E7E34" strokeWidth={2.4} />
                  <Text style={styles.loadingCheckText}>Designing new concepts</Text>
                </Animated.View>
              </View>

              {/* Footnote */}
              <Text style={styles.loadingFootnote}>
                This may take a few seconds
              </Text>
            </View>
          </View>
        )}

        {/* ========================================================= */}
        {/* SCREEN D: IDEA RESULT CARD (1/3, 2/3, 3/3)                */}
        {/* ========================================================= */}
        {viewState === 'results' && currentIdea && (
          <>
            {/* Top Bar with Counter */}
            <View style={styles.resultTopBar}>
              <TouchableOpacity
                style={styles.backBtn}
                onPress={() => setViewState('detail')}
                activeOpacity={0.7}
              >
                <ArrowLeft size={22} color="#0F2438" strokeWidth={2.4} />
              </TouchableOpacity>

              <Text style={styles.counterText}>
                {currentIdeaIndex + 1} / {ideas.length}
              </Text>
            </View>

            <ScrollView
              contentContainerStyle={styles.resultScroll}
              showsVerticalScrollIndicator={false}
            >
              {/* Segmented Control Pill Toggle [ Normal Product | Design Idea ] */}
              <View style={styles.segmentedControl}>
                <TouchableOpacity
                  style={[
                    styles.segmentBtn,
                    selectedImageTab === 'original' && styles.segmentBtnActive,
                  ]}
                  onPress={() => {
                    setSelectedImageTab('original');
                    setImageLoadError(false);
                  }}
                  activeOpacity={0.8}
                >
                  <Text
                    style={[
                      styles.segmentText,
                      selectedImageTab === 'original' && styles.segmentTextActive,
                    ]}
                  >
                    Normal Product
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.segmentBtn,
                    selectedImageTab === 'reimagined' && styles.segmentBtnActive,
                  ]}
                  onPress={() => {
                    setSelectedImageTab('reimagined');
                    setImageLoadError(false);
                  }}
                  activeOpacity={0.8}
                >
                  <Text
                    style={[
                      styles.segmentText,
                      selectedImageTab === 'reimagined' && styles.segmentTextActive,
                    ]}
                  >
                    ✨ Design Idea
                  </Text>
                </TouchableOpacity>
              </View>

              {/* Concept Image */}
              <View style={styles.ideaImageWrap}>
                {!imageLoadError && displayImageUrl ? (
                  <Image
                    source={{ uri: displayImageUrl }}
                    style={styles.ideaImage}
                    contentFit="cover"
                    transition={200}
                    cachePolicy="memory-disk"
                    onError={() => setImageLoadError(true)}
                  />
                ) : (
                  <View style={styles.imageFallbackWrap}>
                    <Sparkles size={36} color="#1E4E2C" />
                    <Text style={styles.imageFallbackTitle}>{currentIdea.concept_name}</Text>
                    <Text style={styles.imageFallbackSub}>Modern Handcrafted Fusion Concept</Text>
                  </View>
                )}

                {/* Reimagined AI Badge Overlay */}
                {selectedImageTab === 'reimagined' && (
                  <View style={styles.imageOverlayBadge}>
                    <Sparkles size={12} color="#FFFFFF" strokeWidth={2.4} />
                    <Text style={styles.imageOverlayText}>✨ AI Design Idea</Text>
                  </View>
                )}
              </View>

              {/* Concept Title & Pitch */}
              <View style={styles.ideaBody}>
                <Text style={styles.ideaTitle}>{currentIdea.concept_name}</Text>
                <Text style={styles.ideaPitch}>{currentIdea.pitch}</Text>

                {/* "What you can improve" Green Box */}
                <View style={styles.improveBox}>
                  <Text style={styles.improveHeader}>What you can improve</Text>
                  {currentIdea.improvements.map((bullet, idx) => (
                    <View key={idx} style={styles.improveRow}>
                      <CheckCircle2 size={16} color="#1E7E34" strokeWidth={2.4} style={{ marginTop: 2 }} />
                      <Text style={styles.improveText}>{bullet}</Text>
                    </View>
                  ))}
                </View>

                {/* Navigation Between Concepts */}
                {ideas.length > 1 && (
                  <View style={styles.conceptNavRow}>
                    <TouchableOpacity
                      style={[
                        styles.navArrowBtn,
                        currentIdeaIndex === 0 && styles.navArrowDisabled,
                      ]}
                      disabled={currentIdeaIndex === 0}
                      onPress={() => {
                        setCurrentIdeaIndex((prev) => Math.max(0, prev - 1));
                        setSelectedImageTab('reimagined');
                        setImageLoadError(false);
                      }}
                      activeOpacity={0.75}
                    >
                      <ChevronLeft
                        size={18}
                        color={currentIdeaIndex === 0 ? '#CBD5E1' : '#0F2438'}
                      />
                      <Text
                        style={[
                          styles.navArrowText,
                          currentIdeaIndex === 0 && { color: '#CBD5E1' },
                        ]}
                      >
                        Previous Idea
                      </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[
                        styles.navArrowBtn,
                        currentIdeaIndex === ideas.length - 1 && styles.navArrowDisabled,
                      ]}
                      disabled={currentIdeaIndex === ideas.length - 1}
                      onPress={() => {
                        setCurrentIdeaIndex((prev) => Math.min(ideas.length - 1, prev + 1));
                        setSelectedImageTab('reimagined');
                        setImageLoadError(false);
                      }}
                      activeOpacity={0.75}
                    >
                      <Text
                        style={[
                          styles.navArrowText,
                          currentIdeaIndex === ideas.length - 1 && { color: '#CBD5E1' },
                        ]}
                      >
                        Next Idea
                      </Text>
                      <ChevronRight
                        size={18}
                        color={currentIdeaIndex === ideas.length - 1 ? '#CBD5E1' : '#0F2438'}
                      />
                    </TouchableOpacity>
                  </View>
                )}

                {/* Convert to New Listing Option */}
                <TouchableOpacity
                  style={styles.convertListingBtn}
                  onPress={() => handleCreateListing(currentIdea)}
                  activeOpacity={0.8}
                >
                  <PlusCircle size={17} color="#1E4E2C" />
                  <Text style={styles.convertListingText}>
                    Turn into new marketplace listing
                  </Text>
                </TouchableOpacity>

                {/* Re-generate Ideas with AI Button */}
                <TouchableOpacity
                  style={styles.regenerateBtn}
                  onPress={() => handleGenerateIdeas(true)}
                  activeOpacity={0.8}
                >
                  <RefreshCw size={15} color="#1E4E2C" />
                  <Text style={styles.regenerateBtnText}>
                    Re-generate Fresh Ideas with AI
                  </Text>
                </TouchableOpacity>
              </View>
            </ScrollView>

            {/* Bottom Primary Save Button */}
            <View style={[styles.bottomBar, { paddingBottom: Math.max(insets.bottom, 16) }]}>
              <TouchableOpacity
                style={[
                  styles.saveBtn,
                  savedIdeas[currentIdea.id] && styles.savedBtnActive,
                ]}
                onPress={() => handleSaveIdea(currentIdea)}
                activeOpacity={0.88}
              >
                <Bookmark
                  size={18}
                  color="#FFFFFF"
                  fill={savedIdeas[currentIdea.id] ? '#FFFFFF' : 'transparent'}
                />
                <Text style={styles.saveBtnText}>
                  {savedIdeas[currentIdea.id] ? 'Idea Saved' : 'Save Idea'}
                </Text>
              </TouchableOpacity>
            </View>
          </>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#FAF8F5',
  },
  container: {
    flex: 1,
    width: '100%',
    maxWidth: 480,
    alignSelf: 'center',
    backgroundColor: '#FAF8F5',
  },
  centerBox: {
    justifyContent: 'center',
    alignItems: 'center',
  },

  /* Top Bar */
  topBar: {
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 4,
  },
  resultTopBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 4,
  },
  backBtn: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'flex-start',
  },
  counterText: {
    fontSize: 14.5,
    fontFamily: Fonts.headingBold,
    fontWeight: '700',
    color: '#0F2438',
  },

  /* Screen B: Detail */
  detailScroll: {
    paddingHorizontal: 20,
    paddingBottom: 110,
  },
  heroImageWrap: {
    width: '100%',
    height: 260,
    borderRadius: 18,
    overflow: 'hidden',
    backgroundColor: '#F5F2EC',
    borderWidth: 1,
    borderColor: '#EFECE6',
    marginTop: 6,
    ...Shadow.card,
  },
  heroImage: {
    width: '100%',
    height: '100%',
  },
  detailInfoBox: {
    marginTop: 18,
  },
  detailTitle: {
    fontSize: 22,
    fontFamily: Fonts.headingBold,
    fontWeight: '800',
    color: '#0F2438',
    letterSpacing: -0.3,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  detailPrice: {
    fontSize: 20,
    fontFamily: Fonts.headingBold,
    fontWeight: '800',
    color: '#0F2438',
  },
  activeBadge: {
    backgroundColor: '#EAF5EE',
    paddingHorizontal: 12,
    paddingVertical: 4.5,
    borderRadius: 14,
  },
  activeBadgeText: {
    fontSize: 13,
    fontFamily: Fonts.headingBold,
    fontWeight: '700',
    color: '#1E7E34',
  },
  metaSection: {
    marginTop: 16,
  },
  metaLabel: {
    fontSize: 13,
    fontFamily: Fonts.body,
    color: '#64748B',
  },
  metaValue: {
    fontSize: 15,
    fontFamily: Fonts.bodyMedium,
    fontWeight: '600',
    color: '#334155',
    marginTop: 2,
  },
  detailDesc: {
    fontSize: 14,
    fontFamily: Fonts.body,
    color: '#475569',
    lineHeight: 21,
    marginTop: 14,
  },
  viewExistingBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#EFF7F1',
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginTop: 20,
    borderWidth: 1,
    borderColor: '#DDF0E1',
  },
  viewExistingText: {
    fontSize: 13.5,
    fontFamily: Fonts.bodyMedium,
    fontWeight: '600',
    color: '#1E4E2C',
    flex: 1,
    marginLeft: 8,
  },

  /* Bottom Primary CTA */
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#FAF8F5',
    paddingHorizontal: 20,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#F0ECE4',
  },
  primaryCta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#1E4E2C',
    borderRadius: 14,
    paddingVertical: 15,
    gap: 8,
    ...Shadow.elevated,
  },
  primaryCtaText: {
    fontSize: 15.5,
    fontFamily: Fonts.headingBold,
    fontWeight: '700',
    color: '#FFFFFF',
  },

  /* Screen C: Loading State */
  loadingContainer: {
    flex: 1,
  },
  loadingCenterContent: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
    marginTop: -40,
  },
  sparkleCircle: {
    width: 110,
    height: 110,
    borderRadius: 55,
    backgroundColor: '#EBF6EF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingHeadline: {
    fontSize: 22,
    fontFamily: Fonts.headingBold,
    fontWeight: '800',
    color: '#0F2438',
    textAlign: 'center',
    marginTop: 26,
    lineHeight: 28,
  },
  loadingChecklist: {
    marginTop: 32,
    alignSelf: 'center',
    gap: 16,
  },
  loadingCheckRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  loadingCheckText: {
    fontSize: 15,
    fontFamily: Fonts.bodyMedium,
    fontWeight: '600',
    color: '#334155',
  },
  loadingFootnote: {
    fontSize: 13,
    fontFamily: Fonts.body,
    color: '#8898AA',
    textAlign: 'center',
    marginTop: 42,
  },

  /* Screen D: Result Card */
  resultScroll: {
    paddingHorizontal: 20,
    paddingBottom: 110,
  },
  segmentedControl: {
    flexDirection: 'row',
    alignSelf: 'center',
    backgroundColor: '#ECEBE6',
    borderRadius: 20,
    padding: 3,
    width: 250,
    marginTop: 6,
    marginBottom: 10,
  },
  segmentBtn: {
    flex: 1,
    paddingVertical: 7,
    alignItems: 'center',
    borderRadius: 18,
  },
  segmentBtnActive: {
    backgroundColor: '#1E4E2C',
  },
  segmentText: {
    fontSize: 13.5,
    fontFamily: Fonts.bodyMedium,
    fontWeight: '600',
    color: '#556877',
  },
  segmentTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  ideaImageWrap: {
    width: '100%',
    height: 220,
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: '#F5F2EC',
    borderWidth: 1,
    borderColor: '#EFECE6',
    marginTop: 4,
    ...Shadow.card,
  },
  ideaImage: {
    width: '100%',
    height: '100%',
  },
  ideaBody: {
    marginTop: 16,
  },
  ideaTitle: {
    fontSize: 20,
    fontFamily: Fonts.headingBold,
    fontWeight: '800',
    color: '#0F2438',
    letterSpacing: -0.3,
  },
  ideaPitch: {
    fontSize: 14,
    fontFamily: Fonts.body,
    color: '#475569',
    lineHeight: 20,
    marginTop: 4,
  },
  improveBox: {
    backgroundColor: '#EBF6EE',
    borderRadius: 14,
    padding: 16,
    marginTop: 14,
  },
  improveHeader: {
    fontSize: 14.5,
    fontFamily: Fonts.headingBold,
    fontWeight: '700',
    color: '#1B4D2B',
    marginBottom: 10,
  },
  improveRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    marginBottom: 8,
  },
  improveText: {
    fontSize: 13.5,
    fontFamily: Fonts.bodyMedium,
    color: '#2D4030',
    lineHeight: 19,
    flex: 1,
  },
  conceptNavRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 16,
    paddingVertical: 6,
  },
  navArrowBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 6,
    paddingHorizontal: 8,
  },
  navArrowDisabled: {
    opacity: 0.5,
  },
  navArrowText: {
    fontSize: 13.5,
    fontFamily: Fonts.bodyMedium,
    fontWeight: '600',
    color: '#0F2438',
  },
  convertListingBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#DDF0E1',
    paddingVertical: 12,
    marginTop: 14,
    gap: 8,
  },
  convertListingText: {
    fontSize: 13.5,
    fontFamily: Fonts.headingBold,
    fontWeight: '600',
    color: '#1E4E2C',
  },
  saveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#1E4E2C',
    borderRadius: 14,
    paddingVertical: 15,
    gap: 8,
    ...Shadow.elevated,
  },
  savedBtnActive: {
    backgroundColor: '#164024',
  },
  saveBtnText: {
    fontSize: 15.5,
    fontFamily: Fonts.headingBold,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  imageFallbackWrap: {
    width: '100%',
    height: '100%',
    backgroundColor: '#F3EFE8',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    gap: 8,
  },
  imageFallbackTitle: {
    fontSize: 16,
    fontFamily: Fonts.headingBold,
    fontWeight: '700',
    color: '#0F2438',
    textAlign: 'center',
  },
  imageFallbackSub: {
    fontSize: 12.5,
    fontFamily: Fonts.body,
    color: '#64748B',
    textAlign: 'center',
  },
  imageOverlayBadge: {
    position: 'absolute',
    top: 10,
    left: 10,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(30, 78, 44, 0.9)',
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 5,
    gap: 6,
    ...Shadow.card,
  },
  imageOverlayText: {
    color: '#FFFFFF',
    fontSize: 11.5,
    fontFamily: Fonts.headingBold,
    fontWeight: '700',
  },
  regenerateBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#EFF7F1',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#DDF0E1',
    paddingVertical: 12,
    marginTop: 10,
    gap: 8,
  },
  regenerateBtnText: {
    fontSize: 13,
    fontFamily: Fonts.headingBold,
    fontWeight: '700',
    color: '#1E4E2C',
  },
});
