import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  StatusBar,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import {
  useFonts,
  Poppins_600SemiBold,
  Poppins_700Bold,
} from '@expo-google-fonts/poppins';
import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_700Bold,
} from '@expo-google-fonts/inter';
import {
  ArrowLeft,
  Package,
  Check,
  Truck,
  MapPin,
  Clock,
} from 'lucide-react-native';

import { Colors, Fonts, Shadow } from '@/constants/artisan-theme';
import { useLanguage } from '@/context/LanguageContext';

interface TimelineStep {
  label: string;
  date: string;
  time: string;
  isCompleted: boolean;
  isCurrent: boolean;
  Icon: any;
}

export default function OrderTrackingScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { language } = useLanguage();
  const params = useLocalSearchParams<{
    orderId: string;
    orderNumber: string;
    status: string;
    items: string;
    amount: string;
    productTitle: string;
    date: string;
  }>();

  const [fontsLoaded] = useFonts({
    Poppins_600SemiBold,
    Poppins_700Bold,
    Inter_400Regular,
    Inter_500Medium,
    Inter_700Bold,
  });

  if (!fontsLoaded) return null;

  const orderNumber = params.orderNumber || '#ORD1024';
  const items = params.items || '2';
  const amount = params.amount || '900';
  const status = (params.status || 'pending').toLowerCase();
  const orderDate = params.date ? new Date(params.date) : new Date();

  // Build timeline based on status
  const statusIndex =
    status === 'completed' ? 4 :
    status === 'shipped' ? 3 :
    status === 'processing' || status === 'packed' ? 2 :
    status === 'confirmed' ? 1 : 0;

  const stepPlacedLabel = language === 'ta' ? 'ஆர்டர் செய்யப்பட்டது' : language === 'hi' ? 'ऑर्डर दिया गया' : 'Order Placed';
  const stepPackedLabel = language === 'ta' ? 'பேக் செய்யப்பட்டது' : language === 'hi' ? 'पैक किया गया' : 'Packed';
  const stepShippedLabel = language === 'ta' ? 'அனுப்பப்பட்டது' : language === 'hi' ? 'भेज दिया गया' : 'Shipped';
  const stepOutLabel = language === 'ta' ? 'டெலிவரிக்கு புறப்பட்டது' : language === 'hi' ? 'डिलीवरी के लिए निकला' : 'Out for Delivery';
  const stepDeliveredLabel = language === 'ta' ? 'டெலிவரி செய்யப்பட்டது' : language === 'hi' ? 'डिलीवर किया गया' : 'Delivered';

  const screenTitle = language === 'ta' ? 'ஆர்டர் கண்காணிப்பு' : language === 'hi' ? 'ऑर्डर ट्रैकिंग' : 'Order Tracking';

  const TIMELINE: TimelineStep[] = [
    {
      label: stepPlacedLabel,
      date: orderDate.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }),
      time: orderDate.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true }),
      isCompleted: statusIndex >= 0,
      isCurrent: statusIndex === 0,
      Icon: Package,
    },
    {
      label: stepPackedLabel,
      date: statusIndex >= 1 ? new Date(orderDate.getTime() + 86400000).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '',
      time: statusIndex >= 1 ? '01:15 PM' : '',
      isCompleted: statusIndex >= 1,
      isCurrent: statusIndex === 1,
      Icon: Package,
    },
    {
      label: stepShippedLabel,
      date: statusIndex >= 2 ? new Date(orderDate.getTime() + 172800000).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '',
      time: statusIndex >= 2 ? '11:00 AM' : '',
      isCompleted: statusIndex >= 2,
      isCurrent: statusIndex === 2,
      Icon: Truck,
    },
    {
      label: stepOutLabel,
      date: '',
      time: '',
      isCompleted: statusIndex >= 3,
      isCurrent: statusIndex === 3,
      Icon: MapPin,
    },
    {
      label: stepDeliveredLabel,
      date: '',
      time: '',
      isCompleted: statusIndex >= 4,
      isCurrent: statusIndex === 4,
      Icon: Check,
    },
  ];

  return (
    <View style={styles.root}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => router.back()}
          activeOpacity={0.8}
        >
          <ArrowLeft size={20} color={Colors.textPrimary} strokeWidth={2} />
        </TouchableOpacity>
        <Text style={styles.screenTitle}>{screenTitle}</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Order Summary */}
        <View style={styles.orderSummary}>
          <View style={styles.orderIconWrap}>
            <Package size={20} color={Colors.primary} strokeWidth={2} />
          </View>
          <View style={styles.orderInfo}>
            <Text style={styles.orderId}>{orderNumber}</Text>
            <Text style={styles.orderMeta}>
              {items} {language === 'ta' ? 'பொருட்கள்' : language === 'hi' ? 'सामान' : 'items'} · ₹ {amount}
            </Text>
          </View>
        </View>

        {/* Timeline */}
        <View style={styles.timeline}>
          {TIMELINE.map((step, idx) => {
            const isLast = idx === TIMELINE.length - 1;
            const StepIcon = step.Icon;

            return (
              <View key={step.label} style={styles.timelineRow}>
                {/* Dot + Line */}
                <View style={styles.timelineDotCol}>
                  <View style={[
                    styles.timelineDot,
                    step.isCompleted && styles.timelineDotCompleted,
                    step.isCurrent && styles.timelineDotCurrent,
                  ]}>
                    {step.isCompleted ? (
                      <Check size={12} color="#FFFFFF" strokeWidth={3} />
                    ) : (
                      <Clock size={12} color={Colors.textMuted} strokeWidth={2} />
                    )}
                  </View>
                  {!isLast && (
                    <View style={[
                      styles.timelineLine,
                      step.isCompleted && styles.timelineLineCompleted,
                    ]} />
                  )}
                </View>

                {/* Content */}
                <View style={styles.timelineContent}>
                  <Text style={[
                    styles.timelineLabel,
                    step.isCompleted && styles.timelineLabelCompleted,
                    !step.isCompleted && !step.isCurrent && styles.timelineLabelPending,
                  ]}>
                    {step.label}
                  </Text>
                  {step.date ? (
                    <Text style={styles.timelineDate}>{step.date}, {step.time}</Text>
                  ) : null}
                </View>
              </View>
            );
          })}
        </View>

        {/* View Details CTA */}
        <TouchableOpacity
          style={styles.viewDetailsBtn}
          onPress={() => {}}
          activeOpacity={0.88}
        >
          <Text style={styles.viewDetailsBtnText}>
            {language === 'ta' ? 'விவரங்களைக் காண்க' : language === 'hi' ? 'विवरण देखें' : 'View Details'}
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#FFFFFF' },

  /* Header */
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 16,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.surfaceGray,
    justifyContent: 'center',
    alignItems: 'center',
  },
  screenTitle: {
    fontSize: 18,
    fontWeight: '700',
    fontFamily: Fonts.headingBold,
    color: Colors.textPrimary,
  },

  /* Scroll */
  scroll: { flex: 1 },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 40,
  },

  /* Order Summary */
  orderSummary: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 32,
    padding: 14,
    backgroundColor: Colors.primaryLight,
    borderRadius: 14,
  },
  orderIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  orderInfo: {
    flex: 1,
    gap: 2,
  },
  orderId: {
    fontSize: 16,
    fontWeight: '700',
    fontFamily: Fonts.headingBold,
    color: Colors.textPrimary,
  },
  orderMeta: {
    fontSize: 13,
    fontFamily: Fonts.body,
    color: Colors.textSecondary,
  },

  /* Timeline */
  timeline: {
    paddingLeft: 8,
    marginBottom: 32,
  },
  timelineRow: {
    flexDirection: 'row',
    minHeight: 72,
  },
  timelineDotCol: {
    alignItems: 'center',
    width: 32,
  },
  timelineDot: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: Colors.surfaceGray,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1,
  },
  timelineDotCompleted: {
    backgroundColor: Colors.primary,
  },
  timelineDotCurrent: {
    backgroundColor: Colors.primary,
    borderWidth: 3,
    borderColor: Colors.primaryLight,
  },
  timelineLine: {
    flex: 1,
    width: 2,
    backgroundColor: Colors.surfaceGray,
    marginVertical: 4,
  },
  timelineLineCompleted: {
    backgroundColor: Colors.primary,
  },
  timelineContent: {
    flex: 1,
    paddingLeft: 14,
    paddingBottom: 20,
    gap: 2,
  },
  timelineLabel: {
    fontSize: 14,
    fontWeight: '600',
    fontFamily: Fonts.heading,
    color: Colors.textPrimary,
  },
  timelineLabelCompleted: {
    color: Colors.textPrimary,
    fontWeight: '700',
  },
  timelineLabelPending: {
    color: Colors.textMuted,
    fontWeight: '400',
  },
  timelineDate: {
    fontSize: 12,
    fontFamily: Fonts.body,
    color: Colors.textSecondary,
    marginTop: 2,
  },

  /* CTA */
  viewDetailsBtn: {
    backgroundColor: Colors.primary,
    borderRadius: 28,
    height: 56,
    justifyContent: 'center',
    alignItems: 'center',
    ...Shadow.hero,
  },
  viewDetailsBtnText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
    fontFamily: Fonts.headingBold,
  },
});
