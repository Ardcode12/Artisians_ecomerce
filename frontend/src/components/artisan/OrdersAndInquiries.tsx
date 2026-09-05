import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
} from 'react-native';
import {
  MessageCircle, Package, Truck, CheckCircle2, Send, X,
} from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { Colors, Fonts, Radius, Shadow, Spacing } from '@/constants/artisan-theme';

type TabKey = 'new' | 'orders' | 'bulk';

const TABS: { key: TabKey; label: string }[] = [
  { key: 'new',    label: 'New'          },
  { key: 'orders', label: 'Orders'       },
  { key: 'bulk',   label: 'Bulk Requests'},
];

// ── Inquiry Card ──────────────────────────────────────────────────────────────
interface InquiryCardProps {
  buyerName: string;
  productName: string;
  message: string;
  time: string;
  onReply: () => void;
  onViewProduct: () => void;
}

function InquiryCard({
  buyerName,
  productName,
  message,
  time,
  onReply,
  onViewProduct,
}: InquiryCardProps) {
  const initials = buyerName
    .split(' ')
    .map((w) => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  return (
    <View style={styles.inquiryCard}>
      <View style={styles.inquiryTop}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{initials}</Text>
        </View>
        <View style={styles.inquiryMeta}>
          <Text style={styles.inquiryTitle} numberOfLines={1}>
            <Text style={styles.bold}>{buyerName}</Text>
            {' asked about '}
            <Text style={styles.bold}>{productName}</Text>
          </Text>
          <Text style={styles.inquiryMsg} numberOfLines={1}>
            "{message}"
          </Text>
        </View>
        <Text style={styles.time}>{time}</Text>
      </View>
      <View style={styles.inquiryActions}>
        <TouchableOpacity style={styles.replyBtn} onPress={onReply} activeOpacity={0.85}>
          <Send size={13} color="#FFFFFF" strokeWidth={2} />
          <Text style={styles.replyBtnText}>Reply</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={onViewProduct} activeOpacity={0.7}>
          <Text style={styles.viewLink}>View Product</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

// ── Order Card ────────────────────────────────────────────────────────────────
type OrderStatus = 'Packed' | 'Shipped' | 'Delivered';

const ORDER_STATUS: Record<OrderStatus, { color: string; Icon: any }> = {
  Packed:    { color: '#D97706', Icon: Package },
  Shipped:   { color: '#2563EB', Icon: Truck },
  Delivered: { color: '#10B981', Icon: CheckCircle2 },
};

interface OrderCardProps {
  orderId: string;
  productName: string;
  qty: number;
  total: string;
  status: OrderStatus;
  buyerName: string;
  city: string;
}

function OrderCard({ orderId, productName, qty, total, status, buyerName, city }: OrderCardProps) {
  const { color, Icon } = ORDER_STATUS[status];
  return (
    <View style={styles.orderCard}>
      <View style={styles.orderTop}>
        <View style={styles.orderInfo}>
          <Text style={styles.orderId}>Order #{orderId}</Text>
          <Text style={styles.orderName} numberOfLines={1}>{productName}</Text>
          <Text style={styles.orderMeta}>Qty: {qty}  ·  {total}</Text>
          <Text style={styles.orderBuyer}>{buyerName}  ·  {city}</Text>
        </View>
        <View style={[styles.statusPill, { backgroundColor: color + '1A' }]}>
          <Icon size={12} color={color} strokeWidth={2.2} />
          <Text style={[styles.statusText, { color }]}>{status}</Text>
        </View>
      </View>
    </View>
  );
}

// ── Bulk Card ─────────────────────────────────────────────────────────────────
interface BulkCardProps {
  businessName: string;
  units: number;
  deadline: string;
  onSendQuote: () => void;
}

function BulkCard({ businessName, units, deadline, onSendQuote }: BulkCardProps) {
  return (
    <View style={styles.bulkCard}>
      <View style={styles.bulkGoldBar} />
      <View style={styles.bulkContent}>
        <Text style={styles.bulkTitle}>
          <Text style={styles.bold}>{businessName}</Text>
          {` wants ${units} units`}
        </Text>
        <Text style={styles.bulkDeadline}>Deadline: {deadline}</Text>
        <View style={styles.bulkActions}>
          <TouchableOpacity style={styles.quoteBtn} onPress={onSendQuote} activeOpacity={0.85}>
            <Send size={13} color="#FFFFFF" strokeWidth={2} />
            <Text style={styles.quoteBtnText}>Send Quote</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.declineBtn} activeOpacity={0.8}>
            <X size={13} color="#8E8E93" strokeWidth={2} />
            <Text style={styles.declineBtnText}>Decline</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

export function OrdersAndInquiries() {
  const [activeTab, setActiveTab] = useState<TabKey>('new');
  const router = useRouter();

  return (
    <View style={styles.container}>
      {/* Tab filter row */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tabScroll}>
        <View style={styles.tabRow}>
          {TABS.map((tab) => (
            <TouchableOpacity
              key={tab.key}
              style={[styles.chip, activeTab === tab.key && styles.chipActive]}
              onPress={() => setActiveTab(tab.key)}
              activeOpacity={0.8}
            >
              <Text style={[styles.chipText, activeTab === tab.key && styles.chipTextActive]}>
                {tab.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>

      <View style={styles.tabContent}>
        {activeTab === 'new' && (
          <>
            <InquiryCard
              buyerName="Priya S."
              productName="Hand-woven Cotton Dupatta"
              message="Is this available in blue too?"
              time="2h ago"
              onReply={() => router.push('/inquiries')}
              onViewProduct={() =>
                router.push({
                  pathname: '/product-details',
                  params: {
                    title: 'Hand-woven Cotton Dupatta',
                    subtitle: 'Handloom Textile',
                    price: '₹650',
                    imageUri: 'https://images.unsplash.com/photo-1605289355680-75fb41239154?w=400',
                  },
                })
              }
            />
            <InquiryCard
              buyerName="Raj Exports"
              productName="Terracotta Vase Set"
              message="Can you do a bulk order of 100 units?"
              time="5h ago"
              onReply={() => router.push('/inquiries')}
              onViewProduct={() =>
                router.push({
                  pathname: '/product-details',
                  params: {
                    title: 'Terracotta Vase Set',
                    subtitle: 'Pottery & Clay',
                    price: '₹1,200',
                    imageUri: 'https://images.unsplash.com/photo-1565193566173-7a0ee3dbe261?w=400',
                  },
                })
              }
            />
          </>
        )}
        {activeTab === 'orders' && (
          <>
            <OrderCard
              orderId="1024"
              productName="Hand-woven Cotton Dupatta"
              qty={2}
              total="₹1,300"
              status="Shipped"
              buyerName="Meena D."
              city="Mumbai"
            />
            <OrderCard
              orderId="1019"
              productName="Terracotta Vase Set"
              qty={1}
              total="₹850"
              status="Delivered"
              buyerName="Anand K."
              city="Bengaluru"
            />
          </>
        )}
        {activeTab === 'bulk' && (
          <>
            <BulkCard
              businessName="CraftBridge Co."
              units={50}
              deadline="Sep 20, 2026"
              onSendQuote={() => router.push('/inquiries')}
            />
            <BulkCard
              businessName="Dilli Haat Exports"
              units={200}
              deadline="Oct 5, 2026"
              onSendQuote={() => router.push('/inquiries')}
            />
          </>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: Spacing.sm },
  tabScroll: { marginBottom: 6 },
  tabRow: { flexDirection: 'row', gap: Spacing.sm },

  chip: {
    borderRadius: 999,
    paddingVertical: 7,
    paddingHorizontal: 16,
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
    backgroundColor: '#FFFFFF',
  },
  chipActive: { backgroundColor: '#0D0D0D', borderColor: '#0D0D0D' },
  chipText: { fontSize: 13, fontFamily: Fonts.heading, fontWeight: '600', color: '#0D0D0D' },
  chipTextActive: { color: '#FFFFFF', fontWeight: '700' },

  tabContent: { gap: 10 },

  inquiryCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 14,
    gap: 12,
    borderWidth: 1,
    borderColor: '#F3F4F6',
    ...Shadow.card,
    elevation: 2,
  },
  inquiryTop: { flexDirection: 'row', gap: 12, alignItems: 'flex-start' },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
    flexShrink: 0,
  },
  avatarText: { fontSize: 13, fontFamily: Fonts.headingBold, color: '#0D0D0D', fontWeight: '800' },
  inquiryMeta: { flex: 1 },
  inquiryTitle: { fontSize: 13, fontFamily: Fonts.body, color: '#0D0D0D', lineHeight: 18 },
  bold: { fontFamily: Fonts.headingBold, fontWeight: '700' },
  inquiryMsg: { fontSize: 12, fontFamily: Fonts.body, color: '#8E8E93', marginTop: 2 },
  time: { fontSize: 11, fontFamily: Fonts.body, color: '#8E8E93', flexShrink: 0 },
  inquiryActions: { flexDirection: 'row', gap: 12, alignItems: 'center' },
  replyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#0D0D0D',
    borderRadius: 999,
    paddingVertical: 7,
    paddingHorizontal: 14,
  },
  replyBtnText: { fontSize: 12, fontFamily: Fonts.headingBold, fontWeight: '700', color: '#FFFFFF' },
  viewLink: { fontSize: 12, fontFamily: Fonts.heading, fontWeight: '600', color: '#6B7280' },

  orderCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 14,
    borderWidth: 1,
    borderColor: '#F3F4F6',
    ...Shadow.card,
    elevation: 2,
  },
  orderTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  orderInfo: { flex: 1, gap: 2 },
  orderId: { fontSize: 11, fontFamily: Fonts.bodyMedium, color: '#8E8E93', textTransform: 'uppercase', letterSpacing: 0.5 },
  orderName: { fontSize: 14, fontFamily: Fonts.headingBold, fontWeight: '700', color: '#0D0D0D' },
  orderMeta: { fontSize: 13, fontFamily: Fonts.heading, fontWeight: '600', color: '#0D0D0D' },
  orderBuyer: { fontSize: 12, fontFamily: Fonts.body, color: '#8E8E93' },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderRadius: 999,
    paddingVertical: 5,
    paddingHorizontal: 10,
  },
  statusText: { fontSize: 11, fontFamily: Fonts.headingBold, fontWeight: '700' },

  /* Bulk Card with Gold Accent Border */
  bulkCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    overflow: 'hidden',
    flexDirection: 'row',
    borderWidth: 1.5,
    borderColor: '#D4A017',
    ...Shadow.card,
    elevation: 2,
  },
  bulkGoldBar: { width: 5, backgroundColor: '#D4A017' },
  bulkContent: { flex: 1, padding: 14, gap: 8 },
  bulkTitle: { fontSize: 14, fontFamily: Fonts.body, color: '#0D0D0D' },
  bulkDeadline: { fontSize: 12, fontFamily: Fonts.body, color: '#8E8E93' },
  bulkActions: { flexDirection: 'row', gap: 10 },
  quoteBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#0D0D0D',
    borderRadius: 999,
    paddingVertical: 7,
    paddingHorizontal: 14,
  },
  quoteBtnText: { fontSize: 12, fontFamily: Fonts.headingBold, fontWeight: '700', color: '#FFFFFF' },
  declineBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    borderRadius: 999,
    paddingVertical: 7,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  declineBtnText: { fontSize: 12, fontFamily: Fonts.heading, color: '#8E8E93' },
});
