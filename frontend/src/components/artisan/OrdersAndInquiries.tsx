import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Modal,
  TextInput,
  Alert,
} from 'react-native';
import {
  MessageCircle,
  Package,
  Truck,
  CheckCircle2,
  Send,
  X,
  Clock,
  Sparkles,
} from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { Colors, Fonts, Radius, Shadow, Spacing } from '@/constants/artisan-theme';
import { useAuth } from '@/context/AuthContext';

const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL || 'http://192.168.137.205:5000';

type TabKey = 'new' | 'orders' | 'bulk';

const TABS: { key: TabKey; label: string }[] = [
  { key: 'new',    label: 'New'           },
  { key: 'orders', label: 'Orders'        },
  { key: 'bulk',   label: 'Bulk Requests' },
];

interface Inquiry {
  id: string;
  product_id?: string;
  product_title?: string;
  buyer_name?: string;
  buyer_phone?: string;
  buyer_type?: string;
  message?: string;
  reply?: string;
  replied_at?: string;
  status?: string;
  created_at?: string;
}

interface Order {
  id: string;
  product_id?: string;
  product_title?: string;
  quantity?: number;
  total_amount?: string;
  status?: string;
  buyer_name?: string;
  buyer_phone?: string;
  buyer_address?: string;
  created_at?: string;
}

export function OrdersAndInquiries() {
  const [activeTab, setActiveTab] = useState<TabKey>('new');
  const [inquiries, setInquiries] = useState<Inquiry[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  // Reply modal state
  const [replyModalOpen, setReplyModalOpen] = useState(false);
  const [selectedInquiry, setSelectedInquiry] = useState<Inquiry | null>(null);
  const [replyText, setReplyText] = useState('');
  const [isReplying, setIsReplying] = useState(false);

  const router = useRouter();
  const { user } = useAuth();

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      let inqUrl = `${BACKEND_URL}/api/inquiries`;
      if (user?.id) inqUrl += `?artisan_id=${user.id}`;
      let ordUrl = `${BACKEND_URL}/api/orders`;
      if (user?.id) ordUrl += `?artisan_id=${user.id}`;

      const [inqRes, ordRes] = await Promise.all([fetch(inqUrl), fetch(ordUrl)]);
      if (inqRes.ok) {
        const iData = await inqRes.json();
        if (iData?.inquiries && Array.isArray(iData.inquiries)) {
          setInquiries(iData.inquiries);
        }
      }
      if (ordRes.ok) {
        const oData = await ordRes.json();
        if (oData?.orders && Array.isArray(oData.orders)) {
          setOrders(oData.orders);
        }
      }
    } catch (_) {
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Submit reply to inquiry
  const handleSendReply = async () => {
    if (!selectedInquiry || !replyText.trim()) return;
    setIsReplying(true);
    try {
      const res = await fetch(`${BACKEND_URL}/api/inquiries/${selectedInquiry.id}/reply`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reply: replyText.trim() }),
      });
      if (res.ok) {
        Alert.alert('Reply Sent', 'Your response has been sent to the buyer.');
        setReplyModalOpen(false);
        setReplyText('');
        fetchData();
      } else {
        Alert.alert('Error', 'Could not send reply. Please try again.');
      }
    } catch (_) {
      Alert.alert('Error', 'Network error sending reply.');
    } finally {
      setIsReplying(false);
    }
  };

  const bulkRequests = inquiries.filter(
    (i) => i.buyer_type === 'Retail Business' || (i.message || '').toLowerCase().includes('bulk')
  );

  return (
    <View style={styles.container}>
      {/* Tab filter row */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tabScroll}>
        <View style={styles.tabRow}>
          {TABS.map((tab) => {
            const count =
              tab.key === 'new'
                ? inquiries.length
                : tab.key === 'orders'
                ? orders.length
                : bulkRequests.length;
            return (
              <TouchableOpacity
                key={tab.key}
                style={[styles.chip, activeTab === tab.key && styles.chipActive]}
                onPress={() => setActiveTab(tab.key)}
                activeOpacity={0.8}
              >
                <Text style={[styles.chipText, activeTab === tab.key && styles.chipTextActive]}>
                  {tab.label} ({count})
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </ScrollView>

      <View style={styles.tabContent}>
        {loading ? (
          <View style={styles.loaderBox}>
            <ActivityIndicator size="small" color="#0D0D0D" />
            <Text style={styles.loaderText}>Checking messages & orders...</Text>
          </View>
        ) : activeTab === 'new' ? (
          inquiries.length === 0 ? (
            <View style={styles.emptyBox}>
              <MessageCircle size={32} color="#9CA3AF" />
              <Text style={styles.emptyTitle}>No Inquiries Yet</Text>
              <Text style={styles.emptySub}>
                When buyers book products or ask questions, they will appear here.
              </Text>
            </View>
          ) : (
            inquiries.map((inq) => {
              const initials = (inq.buyer_name || 'Buyer')
                .split(' ')
                .map((w) => w[0])
                .join('')
                .slice(0, 2)
                .toUpperCase();
              const dateStr = inq.created_at
                ? new Date(inq.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                : 'Just now';

              return (
                <View key={inq.id} style={styles.inquiryCard}>
                  <View style={styles.inquiryTop}>
                    <View style={styles.avatar}>
                      <Text style={styles.avatarText}>{initials}</Text>
                    </View>
                    <View style={styles.inquiryMeta}>
                      <Text style={styles.inquiryTitle} numberOfLines={1}>
                        <Text style={styles.bold}>{inq.buyer_name || 'Buyer'}</Text>
                        {' · '}
                        <Text style={styles.bold}>{inq.product_title || 'Craft Item'}</Text>
                      </Text>
                      <Text style={styles.inquiryMsg} numberOfLines={2}>
                        "{inq.message}"
                      </Text>
                      {inq.reply && (
                        <View style={styles.replyBubble}>
                          <Text style={styles.replyBubbleText}>
                            Your Reply: "{inq.reply}"
                          </Text>
                        </View>
                      )}
                    </View>
                    <Text style={styles.time}>{dateStr}</Text>
                  </View>
                  <View style={styles.inquiryActions}>
                    <TouchableOpacity
                      style={styles.replyBtn}
                      onPress={() => {
                        setSelectedInquiry(inq);
                        setReplyText(inq.reply || '');
                        setReplyModalOpen(true);
                      }}
                      activeOpacity={0.85}
                    >
                      <Send size={13} color="#FFFFFF" strokeWidth={2} />
                      <Text style={styles.replyBtnText}>{inq.reply ? 'Edit Reply' : 'Reply'}</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={() => router.push('/inquiries')}
                      activeOpacity={0.7}
                    >
                      <Text style={styles.viewLink}>Open Messages</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              );
            })
          )
        ) : activeTab === 'orders' ? (
          orders.length === 0 ? (
            <View style={styles.emptyBox}>
              <Package size={32} color="#9CA3AF" />
              <Text style={styles.emptyTitle}>No Orders Yet</Text>
              <Text style={styles.emptySub}>
                When buyers book products from your catalog, orders will show here.
              </Text>
            </View>
          ) : (
            orders.map((ord) => {
              const statusColor =
                (ord.status || '').toLowerCase() === 'delivered'
                  ? '#10B981'
                  : (ord.status || '').toLowerCase() === 'shipped'
                  ? '#2563EB'
                  : '#D97706';

              return (
                <View key={ord.id} style={styles.orderCard}>
                  <View style={styles.orderTop}>
                    <View style={styles.orderInfo}>
                      <Text style={styles.orderId}>Order #{ord.id.slice(0, 10).toUpperCase()}</Text>
                      <Text style={styles.orderName} numberOfLines={1}>
                        {ord.product_title || 'Handcrafted Treasure'}
                      </Text>
                      <Text style={styles.orderMeta}>
                        Qty: {ord.quantity || 1}  ·  {ord.total_amount || '₹650'}
                      </Text>
                      <Text style={styles.orderBuyer}>
                        Buyer: {ord.buyer_name || 'Registered Patron'}
                      </Text>
                      {ord.buyer_address && (
                        <Text style={styles.orderAddress} numberOfLines={1}>
                          Ship to: {ord.buyer_address}
                        </Text>
                      )}
                    </View>
                    <View style={[styles.statusPill, { backgroundColor: statusColor + '1A' }]}>
                      <Package size={12} color={statusColor} strokeWidth={2.2} />
                      <Text style={[styles.statusText, { color: statusColor }]}>
                        {(ord.status || 'CONFIRMED').toUpperCase()}
                      </Text>
                    </View>
                  </View>
                </View>
              );
            })
          )
        ) : (
          bulkRequests.length === 0 ? (
            <View style={styles.emptyBox}>
              <Sparkles size={32} color="#9CA3AF" />
              <Text style={styles.emptyTitle}>No Bulk Inquiries</Text>
              <Text style={styles.emptySub}>
                Corporate or boutique wholesale requests will be listed here.
              </Text>
            </View>
          ) : (
            bulkRequests.map((req) => (
              <View key={req.id} style={styles.bulkCard}>
                <View style={styles.bulkGoldBar} />
                <View style={styles.bulkContent}>
                  <Text style={styles.bulkTitle}>
                    <Text style={styles.bold}>{req.buyer_name || 'Boutique Client'}</Text>
                    {` inquired about ${req.product_title || 'Craft Collection'}`}
                  </Text>
                  <Text style={styles.bulkDeadline}>"{req.message}"</Text>
                  <View style={styles.bulkActions}>
                    <TouchableOpacity
                      style={styles.quoteBtn}
                      onPress={() => {
                        setSelectedInquiry(req);
                        setReplyText('We can fulfill your bulk custom order. Here are the quote details:');
                        setReplyModalOpen(true);
                      }}
                      activeOpacity={0.85}
                    >
                      <Send size={13} color="#FFFFFF" strokeWidth={2} />
                      <Text style={styles.quoteBtnText}>Send Quote</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            ))
          )
        )}
      </View>

      {/* ── MODAL: Reply to Buyer Message ─────────────────────────── */}
      <Modal visible={replyModalOpen} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Reply to Buyer</Text>
              <TouchableOpacity onPress={() => setReplyModalOpen(false)}>
                <X size={20} color="#0D0D0D" />
              </TouchableOpacity>
            </View>
            {selectedInquiry && (
              <View style={styles.modalInqBox}>
                <Text style={styles.modalInqBuyer}>{selectedInquiry.buyer_name || 'Buyer'}:</Text>
                <Text style={styles.modalInqMsg}>"{selectedInquiry.message}"</Text>
              </View>
            )}
            <Text style={styles.inputLabel}>Your Response to Buyer:</Text>
            <TextInput
              style={styles.inputField}
              value={replyText}
              onChangeText={setReplyText}
              placeholder="Type your message, delivery confirmation or custom sizing note..."
              placeholderTextColor="#9CA3AF"
              multiline
              numberOfLines={4}
            />
            <TouchableOpacity
              style={styles.sendReplyBtn}
              onPress={handleSendReply}
              disabled={isReplying}
              activeOpacity={0.85}
            >
              {isReplying ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Text style={styles.sendReplyBtnText}>Send Message to Buyer</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: Spacing.sm },
  tabScroll: { marginBottom: 6 },
  tabRow: { flexDirection: 'row', gap: Spacing.sm },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: Radius.pill,
    backgroundColor: '#F3F4F6',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  chipActive: {
    backgroundColor: '#0D0D0D',
    borderColor: '#0D0D0D',
  },
  chipText: {
    fontSize: 12,
    fontWeight: '600',
    fontFamily: Fonts.heading,
    color: '#4B5563',
  },
  chipTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontFamily: Fonts.headingBold,
  },
  tabContent: { gap: Spacing.sm },
  loaderBox: {
    paddingVertical: 24,
    alignItems: 'center',
    gap: 8,
  },
  loaderText: {
    fontSize: 12,
    color: '#6B7280',
  },
  emptyBox: {
    backgroundColor: '#FFFFFF',
    borderRadius: Radius.lg,
    padding: 24,
    alignItems: 'center',
    gap: 6,
    ...Shadow.card,
  },
  emptyTitle: {
    fontSize: 14,
    fontWeight: '700',
    fontFamily: Fonts.headingBold,
    color: '#0D0D0D',
    marginTop: 4,
  },
  emptySub: {
    fontSize: 12,
    color: '#6B7280',
    textAlign: 'center',
    paddingHorizontal: 16,
  },
  inquiryCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: Radius.lg,
    padding: Spacing.md,
    gap: Spacing.sm,
    ...Shadow.card,
  },
  inquiryTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.sm,
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#0D0D0D',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontSize: 12,
    fontWeight: '700',
    fontFamily: Fonts.headingBold,
    color: '#FFFFFF',
  },
  inquiryMeta: { flex: 1, gap: 2 },
  inquiryTitle: {
    fontSize: 13,
    color: '#374151',
    fontFamily: Fonts.body,
  },
  bold: {
    fontWeight: '700',
    fontFamily: Fonts.headingBold,
    color: '#0D0D0D',
  },
  inquiryMsg: {
    fontSize: 12,
    color: '#6B7280',
    fontStyle: 'italic',
    lineHeight: 16,
  },
  replyBubble: {
    backgroundColor: '#F0FDF4',
    borderRadius: 8,
    padding: 8,
    marginTop: 4,
    borderWidth: 1,
    borderColor: '#BBF7D0',
  },
  replyBubbleText: {
    fontSize: 11,
    color: '#166534',
    fontFamily: Fonts.bodyMedium,
  },
  time: {
    fontSize: 10,
    color: '#9CA3AF',
    fontFamily: Fonts.body,
  },
  inquiryActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 4,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  replyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#0D0D0D',
    borderRadius: Radius.pill,
    paddingHorizontal: 12,
    paddingVertical: 5,
  },
  replyBtnText: {
    fontSize: 11,
    fontWeight: '700',
    fontFamily: Fonts.headingBold,
    color: '#FFFFFF',
  },
  viewLink: {
    fontSize: 11,
    fontWeight: '600',
    color: '#0D0D0D',
  },
  orderCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: Radius.lg,
    padding: Spacing.md,
    ...Shadow.card,
  },
  orderTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  orderInfo: { flex: 1, gap: 2 },
  orderId: {
    fontSize: 11,
    fontWeight: '700',
    fontFamily: Fonts.headingBold,
    color: '#9CA3AF',
  },
  orderName: {
    fontSize: 13,
    fontWeight: '700',
    fontFamily: Fonts.headingBold,
    color: '#0D0D0D',
  },
  orderMeta: {
    fontSize: 12,
    color: '#374151',
    fontWeight: '600',
    marginTop: 2,
  },
  orderBuyer: {
    fontSize: 11,
    color: '#6B7280',
    marginTop: 1,
  },
  orderAddress: {
    fontSize: 10,
    color: '#9CA3AF',
    marginTop: 1,
  },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderRadius: Radius.pill,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  statusText: {
    fontSize: 10,
    fontWeight: '800',
    fontFamily: Fonts.headingBold,
  },
  bulkCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: Radius.lg,
    flexDirection: 'row',
    overflow: 'hidden',
    ...Shadow.card,
  },
  bulkGoldBar: {
    width: 4,
    backgroundColor: '#B5502F',
  },
  bulkContent: {
    flex: 1,
    padding: Spacing.md,
    gap: 4,
  },
  bulkTitle: {
    fontSize: 13,
    color: '#374151',
  },
  bulkDeadline: {
    fontSize: 11,
    color: '#6B7280',
    fontStyle: 'italic',
    marginBottom: 4,
  },
  bulkActions: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 4,
  },
  quoteBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#0D0D0D',
    borderRadius: Radius.pill,
    paddingHorizontal: 12,
    paddingVertical: 5,
  },
  quoteBtnText: {
    fontSize: 11,
    fontWeight: '700',
    fontFamily: Fonts.headingBold,
    color: '#FFFFFF',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    padding: 20,
    paddingBottom: 36,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '800',
    fontFamily: Fonts.headingBold,
    color: '#0D0D0D',
  },
  modalInqBox: {
    backgroundColor: '#F9FAFB',
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    marginBottom: 12,
  },
  modalInqBuyer: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0D0D0D',
    marginBottom: 2,
  },
  modalInqMsg: {
    fontSize: 12,
    color: '#6B7280',
    fontStyle: 'italic',
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#374151',
    marginBottom: 6,
  },
  inputField: {
    backgroundColor: '#F3F4F6',
    borderRadius: 14,
    padding: 12,
    fontSize: 13,
    color: '#0D0D0D',
    textAlignVertical: 'top',
    height: 90,
  },
  sendReplyBtn: {
    backgroundColor: '#0D0D0D',
    borderRadius: 24,
    paddingVertical: 13,
    alignItems: 'center',
    marginTop: 16,
  },
  sendReplyBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
    fontFamily: Fonts.headingBold,
  },
});
