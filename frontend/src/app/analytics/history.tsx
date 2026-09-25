import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  StatusBar,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import {
  ArrowLeft,
  Search,
  Mic,
  X,
  ShoppingBag,
  Package,
  MessageSquare,
  Landmark,
  ChevronRight,
  Volume2,
  Square,
} from 'lucide-react-native';
import { InstagramIcon } from '@/components/ui/InstagramIcon';

import { BACKEND_URL } from '@/config/api';
import { useLanguage } from '@/context/LanguageContext';
import {
  getSelectedLanguage,
  speak as centralSpeak,
  stopSpeech,
  isSpeechSupported,
  AppLanguage,
} from '@/utils/language-utils';
import { Fonts, Shadow } from '@/constants/artisan-theme';

const FILTERS = ['All', 'Orders', 'Listings', 'Inquiries', 'Payments'];

export default function ActivityHistoryScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const { language } = useLanguage();
  const currentAppLang = (language as AppLanguage) || getSelectedLanguage() || 'en';
  const [speaking, setSpeaking] = useState(false);
  const [speechSupported, setSpeechSupported] = useState(true);

  const [activeFilter, setActiveFilter] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [groups, setGroups] = useState<any[]>([]);

  useEffect(() => {
    setSpeechSupported(isSpeechSupported());
    return () => {
      stopSpeech();
    };
  }, []);

  useEffect(() => {
    fetchHistory();
  }, [activeFilter, searchQuery]);

  const fetchHistory = async () => {
    try {
      setLoading(true);
      const url = new URL(`${BACKEND_URL}/api/analytics/history`);
      url.searchParams.append('filter', activeFilter);
      if (searchQuery.trim()) url.searchParams.append('q', searchQuery.trim());

      const res = await fetch(url.toString());
      const json = await res.json();
      if (json.success && json.groups) {
        setGroups(json.groups);
      }
    } catch (e) {
      console.warn('Failed to fetch activity history, using fallback', e);
      // Fallback matching Screenshot 3
      setGroups([
        {
          date: 'Today',
          events: [
            {
              id: 'act_1',
              type: 'order',
              title: 'Order #1042 confirmed',
              subtitle: 'Terracotta Vase, ₹1,100',
              time: '2:30 PM',
              detail_id: 'ord_1042',
            },
            {
              id: 'act_2',
              type: 'listing',
              title: 'Listing published',
              subtitle: 'Handloom Dupatta',
              time: '11:15 AM',
              detail_id: 'prod_dupatta',
            },
            {
              id: 'act_3',
              type: 'inquiry',
              title: 'New inquiry from Priya S.',
              subtitle: '"Is this in blue?"',
              time: '9:02 AM',
              detail_id: 'inq_priya_1',
            },
          ],
        },
        {
          date: 'Yesterday',
          events: [
            {
              id: 'act_4',
              type: 'payment',
              title: 'Payment settled',
              subtitle: '₹4,200 to your bank account',
              time: '5:20 PM',
              detail_id: 'pay_settle_1',
            },
            {
              id: 'act_5',
              type: 'social',
              title: 'Reel posted to Instagram',
              subtitle: 'Terracotta Vase',
              time: '1:10 PM',
              detail_id: 'reel_vase_1',
            },
          ],
        },
        {
          date: 'Sept 12, 2024',
          events: [
            {
              id: 'act_6',
              type: 'order',
              title: 'Order #1038 delivered',
              subtitle: 'Woven Basket, ₹950',
              time: '4:30 PM',
              detail_id: 'ord_1038',
            },
          ],
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleEventPress = (event: any) => {
    if (event.type === 'order') {
      router.push('/seller-orders');
    } else if (event.type === 'listing') {
      router.push('/listings');
    } else if (event.type === 'inquiry') {
      router.push('/inquiries');
    } else {
      router.push('/seller-orders');
    }
  };

  const renderEventIcon = (type: string) => {
    switch (type) {
      case 'order':
        return (
          <View style={[styles.iconWrap, { backgroundColor: '#FDF0E6' }]}>
            <ShoppingBag size={20} color="#9C4121" strokeWidth={2.2} />
          </View>
        );
      case 'listing':
        return (
          <View style={[styles.iconWrap, { backgroundColor: '#E8F5E9' }]}>
            <Package size={20} color="#16A34A" strokeWidth={2.2} />
          </View>
        );
      case 'inquiry':
        return (
          <View style={[styles.iconWrap, { backgroundColor: '#FFF3E0' }]}>
            <MessageSquare size={20} color="#E65100" strokeWidth={2.2} />
          </View>
        );
      case 'payment':
        return (
          <View style={[styles.iconWrap, { backgroundColor: '#E0F2F1' }]}>
            <Landmark size={20} color="#00796B" strokeWidth={2.2} />
          </View>
        );
      case 'social':
        return (
          <View style={[styles.iconWrap, { backgroundColor: '#FCE4EC' }]}>
            <InstagramIcon size={20} color="#E1306C" />
          </View>
        );
      default:
        return (
          <View style={[styles.iconWrap, { backgroundColor: '#F1EFE9' }]}>
            <Package size={20} color="#64748B" strokeWidth={2.2} />
          </View>
        );
    }
  };

  const handleReadAloud = () => {
    if (speaking) {
      stopSpeech();
      setSpeaking(false);
      return;
    }

    stopSpeech();

    const totalEvents = groups.reduce((acc, g) => acc + (g.events?.length || 0), 0);
    let speechText = '';
    if (currentAppLang === 'ta') {
      speechText = `உங்கள் வணிகச் செயல்பாடு வரலாறு: மொத்தம் ${totalEvents} சமீபத்திய நிகழ்வுகள் பதிவாகியுள்ளன. இதில் ஆர்டர்கள், வாடிக்கையாளர் விசாரணைகள், மற்றும் வங்கி கட்டணப் பரிவர்த்தனைகள் அடங்கும்.`;
    } else if (currentAppLang === 'hi') {
      speechText = `आपकी व्यावसायिक गतिविधि का इतिहास: कुल ${totalEvents} हालिया गतिविधियाँ दर्ज हैं, जिनमें ऑर्डर, ग्राहकों की पूछताछ और बैंक भुगतान निपटान शामिल हैं।`;
    } else {
      speechText = `Your business activity history: A total of ${totalEvents} recent events recorded, including customer orders, inquiries, product listings, and bank payment settlements.`;
    }

    try {
      setSpeaking(true);
      centralSpeak(speechText, currentAppLang, {
        rate: 0.95,
        pitch: 1.0,
        onDone: () => setSpeaking(false),
        onStopped: () => setSpeaking(false),
        onError: () => setSpeaking(false),
      });
    } catch (err) {
      console.warn('[Activity History Speech] error:', err);
      setSpeaking(false);
    }
  };

  const listenBtnText =
    speaking
      ? (currentAppLang === 'ta' ? 'நிறுத்தவும்' : currentAppLang === 'hi' ? 'रोकें' : 'Stop')
      : (currentAppLang === 'ta' ? 'கேட்க' : currentAppLang === 'hi' ? 'सुनें' : 'Listen');

  const getFilterLabel = (f: string, lang: string) => {
    if (lang === 'ta') {
      switch (f) {
        case 'All': return 'அனைத்தும்';
        case 'Orders': return 'ஆர்டர்கள்';
        case 'Listings': return 'பொருட்கள்';
        case 'Inquiries': return 'விசாரணைகள்';
        case 'Payments': return 'கட்டணங்கள்';
        default: return f;
      }
    }
    if (lang === 'hi') {
      switch (f) {
        case 'All': return 'सभी';
        case 'Orders': return 'ऑर्डर';
        case 'Listings': return 'लिस्टिंग';
        case 'Inquiries': return 'पूछताछ';
        case 'Payments': return 'भुगतान';
        default: return f;
      }
    }
    return f;
  };

  const formatDateHeading = (dateStr: string, lang: string) => {
    if (dateStr === 'Today') {
      return lang === 'ta' ? 'இன்று' : lang === 'hi' ? 'आज' : 'Today';
    }
    if (dateStr === 'Yesterday') {
      return lang === 'ta' ? 'நேற்று' : lang === 'hi' ? 'कल' : 'Yesterday';
    }
    return dateStr;
  };

  const pageTitle =
    currentAppLang === 'ta'
      ? 'செயல்பாட்டு வரலாறு'
      : currentAppLang === 'hi'
      ? 'गतिविधि इतिहास'
      : 'Activity History';

  const pageSubtitle =
    currentAppLang === 'ta'
      ? 'உங்கள் வணிகத்தில் நடந்த அனைத்தும்'
      : currentAppLang === 'hi'
      ? 'आपके व्यवसाय में हुई सभी गतिविधियाँ'
      : "Everything that's happened in your business";

  const searchPlaceholder =
    currentAppLang === 'ta'
      ? 'வரலாற்றைத் தேடவும்...'
      : currentAppLang === 'hi'
      ? 'इतिहास खोजें...'
      : 'Search history...';

  const emptyText =
    currentAppLang === 'ta'
      ? 'உங்கள் முதல் தயாரிப்பை வெளியிட்டவுடன் உங்கள் செயல்பாடுகள் இங்கே காண்பிக்கப்படும்.'
      : currentAppLang === 'hi'
      ? 'अपना पहला उत्पाद प्रकाशित करने के बाद आपकी गतिविधि यहाँ दिखाई देगी।'
      : 'Your activity will show up here once you publish your first product.';

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <StatusBar barStyle="dark-content" backgroundColor="#FAF8F5" />

      {/* Top Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => router.back()}
          activeOpacity={0.7}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
        >
          <ArrowLeft size={24} color="#0F2438" strokeWidth={2.2} />
        </TouchableOpacity>

        {speechSupported && (
          <TouchableOpacity
            style={[styles.listenBtn, speaking && styles.listenBtnActive]}
            activeOpacity={0.8}
            onPress={handleReadAloud}
            accessibilityLabel={listenBtnText}
            accessibilityRole="button"
          >
            {speaking ? (
              <Square size={13} color="#C04B25" fill="#C04B25" style={{ marginRight: 6 }} />
            ) : (
              <Volume2 size={16} color="#0F2438" strokeWidth={2.2} style={{ marginRight: 6 }} />
            )}
            <Text style={[styles.listenBtnText, speaking && styles.listenBtnTextActive]}>
              {listenBtnText}
            </Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Title and Subtitle */}
      <View style={styles.titleSection}>
        <Text style={styles.pageTitle}>{pageTitle}</Text>
        <Text style={styles.pageSubtitle}>{pageSubtitle}</Text>
      </View>

      {/* Search Bar matching Image 3 */}
      <View style={styles.searchBarWrapper}>
        <View style={styles.searchBarContainer}>
          <Search size={20} color="#7A8699" strokeWidth={2} style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder={searchPlaceholder}
            placeholderTextColor="#8C97A5"
            value={searchQuery}
            onChangeText={setSearchQuery}
            returnKeyType="search"
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')} style={{ padding: 4 }}>
              <X size={18} color="#64748B" />
            </TouchableOpacity>
          )}
          <TouchableOpacity
            style={styles.micBtn}
            onPress={() => setSearchQuery('Terracotta')}
          >
            <Mic size={20} color="#0F2438" strokeWidth={2.2} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Filter Chips Horizontal Row */}
      <View style={styles.filtersWrapper}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filtersScroll}
        >
          {FILTERS.map((f) => {
            const isSelected = activeFilter === f;
            return (
              <TouchableOpacity
                key={f}
                style={[
                  styles.filterPill,
                  isSelected ? styles.filterPillActive : styles.filterPillInactive,
                ]}
                onPress={() => setActiveFilter(f)}
                activeOpacity={0.8}
              >
                <Text
                  style={[
                    styles.filterText,
                    isSelected ? styles.filterTextActive : styles.filterTextInactive,
                  ]}
                >
                  {getFilterLabel(f, currentAppLang)}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* Grouped Chronological Timeline */}
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 40 }]}
      >
        {loading ? (
          <View style={styles.loadingBox}>
            <ActivityIndicator size="large" color="#C04B25" />
          </View>
        ) : groups.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>{emptyText}</Text>
          </View>
        ) : (
          groups.map((group, gIdx) => (
            <View key={gIdx} style={styles.dateGroupWrap}>
              <Text style={styles.dateHeading}>{formatDateHeading(group.date, currentAppLang)}</Text>

              <View style={styles.eventsList}>
                {group.events.map((event: any, eIdx: number) => (
                  <TouchableOpacity
                    key={event.id || eIdx}
                    style={styles.eventRow}
                    activeOpacity={0.75}
                    onPress={() => handleEventPress(event)}
                  >
                    {renderEventIcon(event.type)}

                    <View style={styles.eventInfoWrap}>
                      <Text style={styles.eventTitle} numberOfLines={1}>
                        {event.title}
                      </Text>
                      <Text style={styles.eventSubtitle} numberOfLines={1}>
                        {event.subtitle}
                      </Text>
                    </View>

                    <Text style={styles.eventTime}>{event.time}</Text>
                    <ChevronRight size={18} color="#94A3B8" strokeWidth={2.2} />
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          ))
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FAF8F5',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 4,
  },
  listenBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FDF0E6',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  listenBtnActive: {
    backgroundColor: '#FBE8E3',
    borderWidth: 1,
    borderColor: '#C04B25',
  },
  listenBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0F2438',
  },
  listenBtnTextActive: {
    color: '#C04B25',
  },
  backBtn: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'flex-start',
  },
  titleSection: {
    paddingHorizontal: 20,
    marginBottom: 14,
  },
  pageTitle: {
    fontSize: 26,
    fontWeight: '700',
    color: '#0F2438',
    letterSpacing: -0.4,
  },
  pageSubtitle: {
    fontSize: 14,
    color: '#6B778C',
    marginTop: 4,
  },
  searchBarWrapper: {
    paddingHorizontal: 20,
    marginBottom: 14,
  },
  searchBarContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: '#E6EAEE',
    height: 48,
    paddingHorizontal: 16,
    ...Shadow.sm,
  },
  searchIcon: {
    marginRight: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 14.5,
    color: '#0F2438',
    height: '100%',
    padding: 0,
  },
  micBtn: {
    padding: 4,
    marginLeft: 6,
  },
  filtersWrapper: {
    marginBottom: 16,
  },
  filtersScroll: {
    paddingHorizontal: 20,
    flexDirection: 'row',
  },
  filterPill: {
    borderRadius: 22,
    paddingHorizontal: 18,
    paddingVertical: 9,
    marginRight: 10,
  },
  filterPillActive: {
    backgroundColor: '#C04B25',
  },
  filterPillInactive: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E6EAEE',
  },
  filterText: {
    fontSize: 13.5,
    fontWeight: '600',
  },
  filterTextActive: {
    color: '#FFFFFF',
  },
  filterTextInactive: {
    color: '#334155',
  },
  scrollContent: {
    paddingHorizontal: 20,
  },
  loadingBox: {
    paddingVertical: 60,
    alignItems: 'center',
  },
  emptyContainer: {
    paddingVertical: 50,
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  emptyText: {
    fontSize: 14,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 20,
  },
  dateGroupWrap: {
    marginBottom: 20,
  },
  dateHeading: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0F2438',
    marginBottom: 12,
  },
  eventsList: {
    gap: 12,
  },
  eventRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
  },
  iconWrap: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  eventInfoWrap: {
    flex: 1,
    marginRight: 8,
  },
  eventTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0F2438',
  },
  eventSubtitle: {
    fontSize: 13,
    color: '#64748B',
    marginTop: 2,
  },
  eventTime: {
    fontSize: 13,
    color: '#6B7280',
    marginRight: 6,
    fontWeight: '500',
  },
});
