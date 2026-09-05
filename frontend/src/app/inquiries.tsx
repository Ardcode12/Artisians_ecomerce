import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Image,
  StatusBar,
  Modal,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import {
  ArrowLeft,
  Search,
  Bell,
  MoreVertical,
  Video,
  VideoOff,
  Phone,
  PhoneOff,
  Camera,
  Mic,
  MicOff,
  Paperclip,
  Send,
  Volume2,
  VolumeX,
  MessageSquare,
  UserPlus,
  MoreHorizontal,
  Disc,
  Star,
  ShoppingBag,
  Check,
  X,
  Plus,
  CornerDownRight,
} from 'lucide-react-native';

import { Fonts, NAV_HEIGHT } from '@/constants/artisan-theme';
import { ArtisanBottomNav, ArtisanTab } from '@/components/artisan/ArtisanBottomNav';
import { useLanguage } from '@/context/LanguageContext';

// ── Types ───────────────────────────────────────────────────────────────────
interface Message {
  id: string;
  text: string;
  time: string;
  fromMe: boolean;
}

interface Conversation {
  id: string;
  name: string;
  avatar: string;
  isOnline: boolean;
  lastMessage: string;
  time: string;
  unread: number;
  messages: Message[];
}

interface ClientReview {
  id: string;
  name: string;
  avatar: string;
  date: string;
  rating: number;
  comment: string;
  reply?: string;
}

// ── Seed Data Matching the Cloned Designs ───────────────────────────────────
const ACTIVITIES = [
  { id: '1', name: 'Kristine', avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=300&q=80' },
  { id: '2', name: 'Kay',      avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=300&q=80' },
  { id: '3', name: 'Cheryl',   avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=300&q=80' },
  { id: '4', name: 'Jeen',     avatar: 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=300&q=80' },
  { id: '5', name: 'Priya',    avatar: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=300&q=80' },
  { id: '6', name: 'Rahul',    avatar: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=300&q=80' },
];

const INITIAL_CONVERSATIONS: Conversation[] = [
  {
    id: '1',
    name: 'Kristine Jones',
    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=300&q=80',
    isOnline: true,
    lastMessage: 'Hello hw are you? I am going to market. Do you want shopping?',
    time: '23 min',
    unread: 2,
    messages: [
      { id: 'm1', text: "Hi, Kristine! How's your day going?", time: '4:35 am', fromMe: false },
      { id: 'm2', text: 'You know how it goes..', time: '4:36 am', fromMe: true },
      { id: 'm3', text: 'Do you want Startucks?', time: '4:37 am', fromMe: false },
      { id: 'm4', text: "Only if you say man. Let's see how it is.", time: '4:48 am', fromMe: true },
      { id: 'm5', text: "Great! Thank you, I'm going to work or IRR Calculation.", time: '4:50 am', fromMe: true },
    ],
  },
  {
    id: '2',
    name: 'Kay Hicks',
    avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=300&q=80',
    isOnline: true,
    lastMessage: 'We are on the runways at the military hangar, there ia a plane in it.',
    time: '40 min',
    unread: 1,
    messages: [
      { id: 'k1', text: 'Hey, I checked your handcrafted brass collection!', time: '10:15 am', fromMe: false },
      { id: 'k2', text: 'We are on the runways at the military hangar, there ia a plane in it.', time: '10:20 am', fromMe: false },
    ],
  },
  {
    id: '3',
    name: 'Cheryl Moretti',
    avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=300&q=80',
    isOnline: true,
    lastMessage: 'I receved my new watch that I ordered from Amazon.',
    time: '1 hr',
    unread: 0,
    messages: [
      { id: 'c1', text: 'Good morning! Is the handloom saree ready for dispatch?', time: '8:30 am', fromMe: false },
      { id: 'c2', text: 'Yes, it was handed over to courier this morning.', time: '8:45 am', fromMe: true },
      { id: 'c3', text: 'I receved my new watch that I ordered from Amazon.', time: '9:00 am', fromMe: false },
    ],
  },
  {
    id: '4',
    name: 'Jeen',
    avatar: 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=300&q=80',
    isOnline: true,
    lastMessage: "I just arrived in front of the school. I'm wating for you hurry up!",
    time: '1 hr',
    unread: 0,
    messages: [
      { id: 'j1', text: "I just arrived in front of the school. I'm wating for you hurry up!", time: '9:30 am', fromMe: false },
    ],
  },
  {
    id: '5',
    name: 'Priya Sharma',
    avatar: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=300&q=80',
    isOnline: false,
    lastMessage: 'Could you tell me if the terracotta vase set is customizable in indigo?',
    time: '3 hr',
    unread: 1,
    messages: [
      { id: 'p1', text: 'Hello! Beautiful pottery pieces in your catalog.', time: '1:00 pm', fromMe: false },
      { id: 'p2', text: 'Could you tell me if the terracotta vase set is customizable in indigo?', time: '1:05 pm', fromMe: false },
    ],
  },
];

const INITIAL_REVIEWS: ClientReview[] = [
  {
    id: 'r1',
    name: 'Malison Aved',
    avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=200&q=80',
    date: '20 June, 2024',
    rating: 5,
    comment: 'The point of using authentic handcrafted art is the unparalleled soul and story behind each piece. The terracotta finish is spectacular!',
    reply: 'Thank you Malison! We take immense pride in preserving 3 generations of pottery craft heritage.',
  },
  {
    id: 'r2',
    name: 'Williams Deo',
    avatar: 'https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?w=200&q=80',
    date: '20 June, 2024',
    rating: 5,
    comment: 'Super fast delivery and the packaging ensured the delicate terracotta craft arrived without a single scratch. Truly 5 stars!',
  },
  {
    id: 'r3',
    name: 'Selena Eva',
    avatar: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=200&q=80',
    date: '22 June, 2024',
    rating: 5,
    comment: 'The silk handloom fabric texture and authentic zari border exceeded all expectations. Exceptional craftsmanship!',
    reply: 'Thank you Selena! Each motif was hand-woven on traditional pit looms.',
  },
  {
    id: 'r4',
    name: 'Hasan Mahmud',
    avatar: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=200&q=80',
    date: '24 June, 2024',
    rating: 5,
    comment: 'Direct connection with the artisan gave us complete transparency on customization and bulk pricing. Highly recommended!',
  },
  {
    id: 'r5',
    name: 'Mossarof Hossen',
    avatar: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=200&q=80',
    date: '24 June, 2024',
    rating: 5,
    comment: 'The brass dhokra figurine has stunning heirloom quality. Honored to support authentic Indian crafts.',
  },
];

export default function InquiriesScreen() {
  const [currentTab, setCurrentTab] = useState<'messages' | 'reviews'>('messages');
  const [searchQuery, setSearchQuery] = useState('');
  const [conversations, setConversations] = useState<Conversation[]>(INITIAL_CONVERSATIONS);
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);

  // Chat Input
  const [inputText, setInputText] = useState('');
  const chatScrollRef = useRef<ScrollView>(null);

  // Calls
  const [videoCallOpen, setVideoCallOpen] = useState(false);
  const [audioCallOpen, setAudioCallOpen] = useState(false);
  const [callTimer, setCallTimer] = useState('25:45:34');
  const [isVideoMuted, setIsVideoMuted] = useState(false);
  const [isAudioMuted, setIsAudioMuted] = useState(false);
  const [isSpeakerOn, setIsSpeakerOn] = useState(true);
  const [isRecording, setIsRecording] = useState(false);

  // Reviews
  const [reviews, setReviews] = useState<ClientReview[]>(INITIAL_REVIEWS);
  const [replyingReviewId, setReplyingReviewId] = useState<string | null>(null);
  const [replyText, setReplyText] = useState('');
  const [newReviewModalOpen, setNewReviewModalOpen] = useState(false);
  const [newReviewerName, setNewReviewerName] = useState('');
  const [newReviewRating, setNewReviewRating] = useState(5);
  const [newReviewComment, setNewReviewComment] = useState('');

  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { t } = useLanguage();

  // Active call timer simulation
  useEffect(() => {
    if (!videoCallOpen && !audioCallOpen) return;
    let seconds = 25 * 3600 + 45 * 60 + 34;
    const interval = setInterval(() => {
      seconds++;
      const hrs = Math.floor(seconds / 3600);
      const mins = Math.floor((seconds % 3600) / 60);
      const secs = seconds % 60;
      setCallTimer(
        `${String(hrs).padStart(2, '0')}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`
      );
    }, 1000);
    return () => clearInterval(interval);
  }, [videoCallOpen, audioCallOpen]);

  // Bottom Navigation
  const handleTabChange = (tab: ArtisanTab) => {
    if (tab === 'home') router.push('/');
    if (tab === 'listings') router.push('/listings');
    if (tab === 'add') router.push('/add-product');
    if (tab === 'inquiries') {
      setSelectedConversation(null);
      setCurrentTab('messages');
    }
    if (tab === 'profile') router.push('/profile');
  };

  // Open Conversation
  const handleOpenConversation = (conv: Conversation) => {
    // Mark as read
    setConversations((prev) =>
      prev.map((c) => (c.id === conv.id ? { ...c, unread: 0 } : c))
    );
    setSelectedConversation({ ...conv, unread: 0 });
  };

  // Open Chat from Activity Avatar
  const handleActivityPress = (activity: (typeof ACTIVITIES)[0]) => {
    const existing = conversations.find((c) => c.name.toLowerCase().includes(activity.name.toLowerCase()));
    if (existing) {
      handleOpenConversation(existing);
    } else {
      const newConv: Conversation = {
        id: activity.id,
        name: activity.name,
        avatar: activity.avatar,
        isOnline: true,
        lastMessage: 'Hi, I would like to inquire about your handmade crafts.',
        time: 'Just now',
        unread: 0,
        messages: [
          { id: 'm0', text: 'Hello! I am interested in your handcrafted collection.', time: 'Just now', fromMe: false },
        ],
      };
      setConversations([newConv, ...conversations]);
      setSelectedConversation(newConv);
    }
  };

  // Send Message
  const handleSendMessage = () => {
    if (!inputText.trim() || !selectedConversation) return;
    const now = new Date();
    const timeStr = now.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }).toLowerCase();

    const newMsg: Message = {
      id: `msg-${Date.now()}`,
      text: inputText.trim(),
      time: timeStr,
      fromMe: true,
    };

    const updated = {
      ...selectedConversation,
      lastMessage: inputText.trim(),
      time: 'Just now',
      messages: [...selectedConversation.messages, newMsg],
    };

    setSelectedConversation(updated);
    setConversations((prev) =>
      prev.map((c) => (c.id === updated.id ? updated : c))
    );
    setInputText('');

    setTimeout(() => {
      chatScrollRef.current?.scrollToEnd({ animated: true });
    }, 100);

    // Auto buyer response simulation
    setTimeout(() => {
      const buyerReply: Message = {
        id: `msg-reply-${Date.now()}`,
        text: 'Sounds wonderful! Thank you for the quick update on the handcrafted order.',
        time: new Date().toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }).toLowerCase(),
        fromMe: false,
      };
      setSelectedConversation((curr) => {
        if (!curr || curr.id !== updated.id) return curr;
        const withReply = {
          ...curr,
          lastMessage: buyerReply.text,
          messages: [...curr.messages, buyerReply],
        };
        setConversations((prev) =>
          prev.map((c) => (c.id === withReply.id ? withReply : c))
        );
        return withReply;
      });
      setTimeout(() => {
        chatScrollRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }, 1500);
  };

  // Add Artisan Reply to Review
  const handleSaveReviewReply = (reviewId: string) => {
    if (!replyText.trim()) return;
    setReviews((prev) =>
      prev.map((r) => (r.id === reviewId ? { ...r, reply: replyText.trim() } : r))
    );
    setReplyingReviewId(null);
    setReplyText('');
  };

  // Add New Client Review
  const handleAddNewReview = () => {
    if (!newReviewerName.trim() || !newReviewComment.trim()) {
      Alert.alert('Required', 'Please fill in reviewer name and feedback.');
      return;
    }
    const newRev: ClientReview = {
      id: `rev-${Date.now()}`,
      name: newReviewerName.trim(),
      avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=200&q=80',
      date: 'Today',
      rating: newReviewRating,
      comment: newReviewComment.trim(),
    };
    setReviews([newRev, ...reviews]);
    setNewReviewModalOpen(false);
    setNewReviewerName('');
    setNewReviewComment('');
  };

  const filteredConversations = conversations.filter(
    (c) =>
      c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.lastMessage.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // ═══════════════════════════════════════════════════════════════════════════
  // 1. SCREEN 1: 1-TO-1 CHAT CONVERSATION VIEW (Kristine Jones)
  // ═══════════════════════════════════════════════════════════════════════════
  if (selectedConversation) {
    return (
      <View style={styles.root}>
        <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

        {/* Top Header Bar */}
        <View style={[styles.chatTopBar, { paddingTop: insets.top + 8 }]}>
          <TouchableOpacity
            style={styles.blackCircleBtn}
            onPress={() => setSelectedConversation(null)}
            activeOpacity={0.8}
          >
            <ArrowLeft size={18} color="#FFFFFF" strokeWidth={2.5} />
          </TouchableOpacity>

          <View style={styles.chatTopRight}>
            <TouchableOpacity style={styles.iconBtn} activeOpacity={0.7}>
              <Bell size={22} color="#0D0D0D" />
            </TouchableOpacity>
            <TouchableOpacity style={styles.iconBtn} activeOpacity={0.7}>
              <MoreVertical size={22} color="#0D0D0D" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Floating Contact Profile Card */}
        <View style={styles.contactCardWrapper}>
          <View style={styles.contactCard}>
            <View style={styles.contactAvatarRing}>
              <Image
                source={{ uri: selectedConversation.avatar }}
                style={styles.contactAvatar}
              />
            </View>
            <View style={styles.contactInfo}>
              <Text style={styles.contactName}>{selectedConversation.name}</Text>
              <Text style={styles.contactStatus}>Online</Text>
            </View>
            <View style={styles.callActions}>
              <TouchableOpacity
                style={styles.callBtn}
                activeOpacity={0.8}
                onPress={() => setVideoCallOpen(true)}
              >
                <Video size={22} color="#0D0D0D" strokeWidth={2} />
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.callBtn}
                activeOpacity={0.8}
                onPress={() => setAudioCallOpen(true)}
              >
                <Phone size={20} color="#0D0D0D" strokeWidth={2} />
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* Chat Message Scroll Thread */}
        <ScrollView
          ref={chatScrollRef}
          style={styles.chatScroll}
          contentContainerStyle={styles.chatContent}
          showsVerticalScrollIndicator={false}
          onContentSizeChange={() => chatScrollRef.current?.scrollToEnd({ animated: false })}
        >
          {selectedConversation.messages.map((msg) => {
            const isMe = msg.fromMe;
            return (
              <View
                key={msg.id}
                style={[
                  styles.msgRow,
                  isMe ? styles.msgRowRight : styles.msgRowLeft,
                ]}
              >
                <View
                  style={[
                    styles.bubble,
                    isMe ? styles.bubbleRight : styles.bubbleLeft,
                  ]}
                >
                  <Text
                    style={[
                      styles.bubbleText,
                      isMe ? styles.bubbleTextRight : styles.bubbleTextLeft,
                    ]}
                  >
                    {msg.text}
                  </Text>
                </View>
                <Text style={styles.msgTime}>{msg.time}</Text>
              </View>
            );
          })}
        </ScrollView>

        {/* Bottom Pill Input Bar */}
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 10 : 0}
        >
          <View
            style={[
              styles.chatInputContainer,
              { paddingBottom: Math.max(insets.bottom, 14) },
            ]}
          >
            <View style={styles.chatInputPill}>
              <TouchableOpacity
                style={styles.inputIconBtn}
                activeOpacity={0.7}
                onPress={() => Alert.alert('Camera', 'Take a craft photo or sample')}
              >
                <Camera size={20} color="#8E8E93" />
              </TouchableOpacity>

              <TextInput
                style={styles.chatTextInput}
                placeholder="Type message..."
                placeholderTextColor="#9CA3AF"
                value={inputText}
                onChangeText={setInputText}
                onSubmitEditing={handleSendMessage}
                returnKeyType="send"
              />

              <TouchableOpacity
                style={styles.inputIconBtn}
                activeOpacity={0.7}
                onPress={() => Alert.alert('Voice Note', 'Hold to record voice memo')}
              >
                <Mic size={20} color="#8E8E93" />
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.inputIconBtn}
                activeOpacity={0.7}
                onPress={() => Alert.alert('Attachment', 'Attach price quote or craft catalog')}
              >
                <Paperclip size={20} color="#8E8E93" />
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              style={styles.sendBlackCircle}
              activeOpacity={0.85}
              onPress={handleSendMessage}
            >
              <Send size={18} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>

        {/* ═════════════════════════════════════════════════════════════════ */}
        {/* 2. SCREEN 3: VIDEO CALL MODAL                                     */}
        {/* ═════════════════════════════════════════════════════════════════ */}
        <Modal visible={videoCallOpen} animationType="slide" transparent={false}>
          <View style={styles.videoCallRoot}>
            <StatusBar barStyle="light-content" backgroundColor="#0D0D0D" />

            {/* Video Stream Simulation */}
            <Image
              source={{
                uri: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=900&q=80',
              }}
              style={styles.videoStreamBg}
            />
            <View style={styles.videoOverlay} />

            {/* Top Bar with Back Button */}
            <View style={[styles.callTopBar, { paddingTop: insets.top + 16 }]}>
              <TouchableOpacity
                style={styles.videoBackCircle}
                onPress={() => setVideoCallOpen(false)}
                activeOpacity={0.8}
              >
                <ArrowLeft size={18} color="#FFFFFF" strokeWidth={2.5} />
              </TouchableOpacity>
            </View>

            {/* Floating Picture-In-Picture Caller Feed */}
            <View style={[styles.pipWrapper, { top: insets.top + 70 }]}>
              <Image
                source={{ uri: selectedConversation.avatar }}
                style={styles.pipImage}
              />
            </View>

            {/* Caller Name & Live Timer */}
            <View style={styles.videoCallInfo}>
              <Text style={styles.videoCallerName}>{selectedConversation.name}</Text>
              <Text style={styles.videoCallTimer}>{callTimer}</Text>
            </View>

            {/* Bottom Controls Pill */}
            <View style={[styles.videoControlsPill, { marginBottom: insets.bottom + 24 }]}>
              <TouchableOpacity
                style={[styles.callControlBtn, isVideoMuted && styles.callControlActive]}
                activeOpacity={0.8}
                onPress={() => setIsVideoMuted(!isVideoMuted)}
              >
                {isVideoMuted ? (
                  <VideoOff size={22} color="#0D0D0D" />
                ) : (
                  <Video size={22} color="#0D0D0D" />
                )}
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.callEndBtn}
                activeOpacity={0.85}
                onPress={() => setVideoCallOpen(false)}
              >
                <PhoneOff size={24} color="#FFFFFF" />
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.callControlBtn, isAudioMuted && styles.callControlActive]}
                activeOpacity={0.8}
                onPress={() => setIsAudioMuted(!isAudioMuted)}
              >
                {isAudioMuted ? (
                  <MicOff size={22} color="#0D0D0D" />
                ) : (
                  <Mic size={22} color="#0D0D0D" />
                )}
              </TouchableOpacity>
            </View>
          </View>
        </Modal>

        {/* ═════════════════════════════════════════════════════════════════ */}
        {/* 3. SCREEN 4: AUDIO CALL MODAL                                     */}
        {/* ═════════════════════════════════════════════════════════════════ */}
        <Modal visible={audioCallOpen} animationType="slide" transparent={false}>
          <View style={styles.audioCallRoot}>
            <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

            <View style={[styles.audioCallHeader, { paddingTop: insets.top + 20 }]}>
              <TouchableOpacity
                style={styles.blackCircleBtn}
                onPress={() => setAudioCallOpen(false)}
                activeOpacity={0.8}
              >
                <ArrowLeft size={18} color="#FFFFFF" strokeWidth={2.5} />
              </TouchableOpacity>
            </View>

            {/* Contact Avatar with Green Border */}
            <View style={styles.audioAvatarContainer}>
              <View style={styles.audioAvatarRing}>
                <Image
                  source={{ uri: selectedConversation.avatar }}
                  style={styles.audioAvatar}
                />
              </View>
              <Text style={styles.audioCallerName}>{selectedConversation.name}</Text>
              <Text style={styles.audioCallTimer}>{callTimer}</Text>
            </View>

            {/* 6 Grid Action Controls */}
            <View style={styles.audioControlsGrid}>
              {/* Row 1 */}
              <View style={styles.audioControlsRow}>
                <TouchableOpacity
                  style={styles.audioGridItem}
                  onPress={() => setIsAudioMuted(!isAudioMuted)}
                >
                  <View style={[styles.audioCircleBtn, isAudioMuted && styles.audioCircleBtnActive]}>
                    {isAudioMuted ? <MicOff size={22} color="#EF4444" /> : <Mic size={22} color="#0D0D0D" />}
                  </View>
                  <Text style={styles.audioBtnLabel}>Mute</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.audioGridItem}
                  onPress={() => {
                    setAudioCallOpen(false);
                  }}
                >
                  <View style={styles.audioCircleBtn}>
                    <MessageSquare size={22} color="#0D0D0D" />
                  </View>
                  <Text style={styles.audioBtnLabel}>Chat</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.audioGridItem}
                  onPress={() => setIsSpeakerOn(!isSpeakerOn)}
                >
                  <View style={[styles.audioCircleBtn, !isSpeakerOn && styles.audioCircleBtnActive]}>
                    {isSpeakerOn ? <Volume2 size={22} color="#0D0D0D" /> : <VolumeX size={22} color="#EF4444" />}
                  </View>
                  <Text style={styles.audioBtnLabel}>Speaker</Text>
                </TouchableOpacity>
              </View>

              {/* Row 2 */}
              <View style={styles.audioControlsRow}>
                <TouchableOpacity
                  style={styles.audioGridItem}
                  onPress={() => setIsRecording(!isRecording)}
                >
                  <View style={[styles.audioCircleBtn, isRecording && styles.audioCircleBtnActive]}>
                    <Disc size={22} color={isRecording ? '#EF4444' : '#0D0D0D'} />
                  </View>
                  <Text style={styles.audioBtnLabel}>{isRecording ? 'Recording' : 'Record'}</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.audioGridItem}
                  onPress={() => Alert.alert('Add Participant', 'Invite buyer agent or artisan guild member')}
                >
                  <View style={styles.audioCircleBtn}>
                    <UserPlus size={22} color="#0D0D0D" />
                  </View>
                  <Text style={styles.audioBtnLabel}>Add</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.audioGridItem}
                  onPress={() => Alert.alert('Options', 'Hold Call, Transfer, or View Craft Details')}
                >
                  <View style={styles.audioCircleBtn}>
                    <MoreHorizontal size={22} color="#0D0D0D" />
                  </View>
                  <Text style={styles.audioBtnLabel}>More</Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* End Call Button */}
            <View style={[styles.audioEndWrapper, { paddingBottom: insets.bottom + 36 }]}>
              <TouchableOpacity
                style={styles.audioEndBtn}
                activeOpacity={0.85}
                onPress={() => setAudioCallOpen(false)}
              >
                <PhoneOff size={28} color="#FFFFFF" />
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      </View>
    );
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // ═══════════════════════════════════════════════════════════════════════════
  // 2. MAIN VIEW: MESSAGES (Image 2) & REVIEWS CLIENT (Image 5)
  // ═══════════════════════════════════════════════════════════════════════════
  return (
    <View style={styles.root}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

      {/* Top Header Bar */}
      <View style={[styles.headerBar, { paddingTop: insets.top + 8 }]}>
        <TouchableOpacity
          style={styles.blackCircleBtn}
          onPress={() => router.back()}
          activeOpacity={0.8}
        >
          <ArrowLeft size={18} color="#FFFFFF" strokeWidth={2.5} />
        </TouchableOpacity>

        {/* Segmented Mode Selector: Messages vs Reviews Client */}
        <View style={styles.segmentPill}>
          <TouchableOpacity
            style={[styles.segmentBtn, currentTab === 'messages' && styles.segmentBtnActive]}
            onPress={() => setCurrentTab('messages')}
            activeOpacity={0.8}
          >
            <Text
              style={[
                styles.segmentText,
                currentTab === 'messages' && styles.segmentTextActive,
              ]}
            >
              Messages
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.segmentBtn, currentTab === 'reviews' && styles.segmentBtnActive]}
            onPress={() => setCurrentTab('reviews')}
            activeOpacity={0.8}
          >
            <Text
              style={[
                styles.segmentText,
                currentTab === 'reviews' && styles.segmentTextActive,
              ]}
            >
              Reviews Client
            </Text>
          </TouchableOpacity>
        </View>

        {currentTab === 'reviews' ? (
          <TouchableOpacity
            style={styles.bagBtn}
            activeOpacity={0.8}
            onPress={() => setNewReviewModalOpen(true)}
          >
            <ShoppingBag size={20} color="#0D0D0D" />
          </TouchableOpacity>
        ) : (
          <View style={styles.headerRightIcons}>
            <TouchableOpacity style={styles.iconBtn} activeOpacity={0.7}>
              <Bell size={22} color="#0D0D0D" />
            </TouchableOpacity>
            <TouchableOpacity style={styles.iconBtn} activeOpacity={0.7}>
              <MoreVertical size={22} color="#0D0D0D" />
            </TouchableOpacity>
          </View>
        )}
      </View>

      {currentTab === 'reviews' ? (
        /* ── SCREEN 5: REVIEWS CLIENT VIEW ── */
        <ScrollView
          style={styles.mainScroll}
          contentContainerStyle={[
            styles.scrollContent,
            { paddingBottom: NAV_HEIGHT + insets.bottom + 30 },
          ]}
          showsVerticalScrollIndicator={false}
        >
          {/* Average Rating Strip */}
          <View style={styles.ratingOverviewCard}>
            <View style={styles.ratingBigCol}>
              <Text style={styles.ratingBigNumber}>4.9</Text>
              <View style={styles.starsRow}>
                {[1, 2, 3, 4, 5].map((s) => (
                  <Star key={s} size={14} color="#F59E0B" fill="#F59E0B" style={{ marginRight: 2 }} />
                ))}
              </View>
              <Text style={styles.ratingCount}>Based on {reviews.length} client reviews</Text>
            </View>
            <TouchableOpacity
              style={styles.addReviewBtn}
              activeOpacity={0.85}
              onPress={() => setNewReviewModalOpen(true)}
            >
              <Plus size={16} color="#FFFFFF" />
              <Text style={styles.addReviewBtnText}>Add Review</Text>
            </TouchableOpacity>
          </View>

          {/* Review Cards */}
          {reviews.map((rev) => (
            <View key={rev.id} style={styles.reviewCard}>
              <View style={styles.reviewHeader}>
                <Image source={{ uri: rev.avatar }} style={styles.reviewerAvatar} />
                <View style={styles.reviewerMeta}>
                  <Text style={styles.reviewerName}>{rev.name}</Text>
                  <Text style={styles.reviewDate}>{rev.date}</Text>
                </View>
                <View style={styles.reviewStars}>
                  {[1, 2, 3, 4, 5].map((star) => (
                    <Star
                      key={star}
                      size={13}
                      color={star <= rev.rating ? '#F59E0B' : '#D1D5DB'}
                      fill={star <= rev.rating ? '#F59E0B' : 'transparent'}
                      style={{ marginLeft: 2 }}
                    />
                  ))}
                </View>
              </View>

              <Text style={styles.reviewComment}>{rev.comment}</Text>

              {/* Artisan Reply Thread */}
              {rev.reply ? (
                <View style={styles.artisanReplyBox}>
                  <View style={styles.replyTitleRow}>
                    <CornerDownRight size={13} color="#B5502F" />
                    <Text style={styles.artisanReplyTitle}>Artisan Response</Text>
                  </View>
                  <Text style={styles.artisanReplyContent}>{rev.reply}</Text>
                </View>
              ) : (
                <TouchableOpacity
                  style={styles.replyActionRow}
                  activeOpacity={0.7}
                  onPress={() => setReplyingReviewId(rev.id)}
                >
                  <Text style={styles.replyActionText}>Reply as Artisan</Text>
                </TouchableOpacity>
              )}
            </View>
          ))}
        </ScrollView>
      ) : (
        /* ── SCREEN 2: MESSAGES (INQUIRIES) LIST ── */
        <ScrollView
          style={styles.mainScroll}
          contentContainerStyle={[
            styles.scrollContent,
            { paddingBottom: NAV_HEIGHT + insets.bottom + 30 },
          ]}
          showsVerticalScrollIndicator={false}
        >
          {/* Search Bar Pill */}
          <View style={styles.searchWrapper}>
            <Search size={18} color="#9CA3AF" style={styles.searchIcon} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search..."
              placeholderTextColor="#9CA3AF"
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => setSearchQuery('')}>
                <X size={16} color="#9CA3AF" />
              </TouchableOpacity>
            )}
          </View>

          {/* Activities Horizontal Section */}
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionHeading}>Activities</Text>
          </View>

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.activitiesScroll}
          >
            {ACTIVITIES.map((item) => (
              <TouchableOpacity
                key={item.id}
                style={styles.activityItem}
                activeOpacity={0.8}
                onPress={() => handleActivityPress(item)}
              >
                <View style={styles.activityAvatarRing}>
                  <Image source={{ uri: item.avatar }} style={styles.activityAvatar} />
                </View>
                <Text style={styles.activityName} numberOfLines={1}>
                  {item.name}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          {/* Messages Vertical Section */}
          <View style={[styles.sectionHeader, { marginTop: 24 }]}>
            <Text style={styles.sectionHeading}>Messages</Text>
          </View>

          <View style={styles.messagesList}>
            {filteredConversations.map((item) => (
              <TouchableOpacity
                key={item.id}
                style={styles.conversationRow}
                activeOpacity={0.75}
                onPress={() => handleOpenConversation(item)}
              >
                {/* Avatar with Vibrant Green Ring */}
                <View style={styles.convAvatarRing}>
                  <Image source={{ uri: item.avatar }} style={styles.convAvatar} />
                </View>

                {/* Message Details */}
                <View style={styles.convContent}>
                  <View style={styles.convTopRow}>
                    <Text style={styles.convName}>{item.name}</Text>
                    <Text style={styles.convTime}>{item.time}</Text>
                  </View>

                  <View style={styles.convBottomRow}>
                    <Text style={styles.convSnippet} numberOfLines={2}>
                      {item.lastMessage}
                    </Text>
                    {item.unread > 0 && (
                      <View style={styles.unreadBadge}>
                        <Text style={styles.unreadBadgeText}>{item.unread}</Text>
                      </View>
                    )}
                  </View>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>
      )}

      {/* Modal: Write Artisan Reply */}
      <Modal visible={!!replyingReviewId} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Reply to Client</Text>
              <TouchableOpacity onPress={() => setReplyingReviewId(null)}>
                <X size={20} color="#0D0D0D" />
              </TouchableOpacity>
            </View>
            <TextInput
              style={styles.modalInput}
              placeholder="Thank the client and share your craft details..."
              placeholderTextColor="#9CA3AF"
              multiline
              numberOfLines={4}
              value={replyText}
              onChangeText={setReplyText}
            />
            <TouchableOpacity
              style={styles.modalPrimaryBtn}
              onPress={() => replyingReviewId && handleSaveReviewReply(replyingReviewId)}
            >
              <Text style={styles.modalPrimaryBtnText}>Post Response</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Modal: Add New Review */}
      <Modal visible={newReviewModalOpen} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Write Client Review</Text>
              <TouchableOpacity onPress={() => setNewReviewModalOpen(false)}>
                <X size={20} color="#0D0D0D" />
              </TouchableOpacity>
            </View>

            <Text style={styles.inputLabel}>Client Name</Text>
            <TextInput
              style={styles.modalSingleInput}
              placeholder="e.g. Malison Aved"
              placeholderTextColor="#9CA3AF"
              value={newReviewerName}
              onChangeText={setNewReviewerName}
            />

            <Text style={styles.inputLabel}>Star Rating</Text>
            <View style={styles.starSelectRow}>
              {[1, 2, 3, 4, 5].map((star) => (
                <TouchableOpacity key={star} onPress={() => setNewReviewRating(star)}>
                  <Star
                    size={28}
                    color="#F59E0B"
                    fill={star <= newReviewRating ? '#F59E0B' : 'transparent'}
                    style={{ marginRight: 8 }}
                  />
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.inputLabel}>Review Feedback</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="Write your feedback on the craft quality..."
              placeholderTextColor="#9CA3AF"
              multiline
              numberOfLines={3}
              value={newReviewComment}
              onChangeText={setNewReviewComment}
            />

            <TouchableOpacity style={styles.modalPrimaryBtn} onPress={handleAddNewReview}>
              <Text style={styles.modalPrimaryBtnText}>Submit Review</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Bottom Floating Nav Bar */}
      <ArtisanBottomNav activeTab="inquiries" onTabChange={handleTabChange} />
    </View>
  );
}

// ── Styles ──────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  headerBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 12,
    backgroundColor: '#FFFFFF',
  },
  blackCircleBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#0D0D0D',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerRightIcons: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconBtn: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 4,
  },
  bagBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  screenHeading: {
    fontFamily: Fonts.headingBold,
    fontSize: 20,
    color: '#0D0D0D',
  },
  segmentPill: {
    flexDirection: 'row',
    backgroundColor: '#F3F4F6',
    borderRadius: 20,
    padding: 3,
  },
  segmentBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  segmentBtnActive: {
    backgroundColor: '#0D0D0D',
  },
  segmentText: {
    fontFamily: Fonts.bodyMedium,
    fontSize: 12,
    color: '#6B7280',
  },
  segmentTextActive: {
    color: '#FFFFFF',
    fontWeight: '600',
  },

  mainScroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 18,
    paddingTop: 8,
  },

  // ── Search Pill ───────────────────────────────────────────────────────────
  searchWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    paddingHorizontal: 16,
    height: 48,
    marginBottom: 20,
  },
  searchIcon: {
    marginRight: 10,
  },
  searchInput: {
    flex: 1,
    fontFamily: Fonts.body,
    fontSize: 14,
    color: '#0D0D0D',
  },

  // ── Section Heading ───────────────────────────────────────────────────────
  sectionHeader: {
    marginBottom: 14,
  },
  sectionHeading: {
    fontFamily: Fonts.headingBold,
    fontSize: 18,
    color: '#0D0D0D',
  },

  // ── Activities ────────────────────────────────────────────────────────────
  activitiesScroll: {
    paddingRight: 10,
  },
  activityItem: {
    alignItems: 'center',
    marginRight: 18,
    width: 66,
  },
  activityAvatarRing: {
    width: 64,
    height: 64,
    borderRadius: 32,
    borderWidth: 2,
    borderColor: '#22C55E',
    padding: 2,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  activityAvatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
  },
  activityName: {
    fontFamily: Fonts.bodyMedium,
    fontSize: 13,
    color: '#0D0D0D',
    textAlign: 'center',
  },

  // ── Messages List ─────────────────────────────────────────────────────────
  messagesList: {
    gap: 18,
  },
  conversationRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  convAvatarRing: {
    width: 64,
    height: 64,
    borderRadius: 32,
    borderWidth: 2,
    borderColor: '#22C55E',
    padding: 2,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  convAvatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
  },
  convContent: {
    flex: 1,
    justifyContent: 'center',
  },
  convTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  convName: {
    fontFamily: Fonts.headingBold,
    fontSize: 15,
    color: '#0D0D0D',
  },
  convTime: {
    fontFamily: Fonts.body,
    fontSize: 12,
    color: '#0D0D0D',
    fontWeight: '500',
  },
  convBottomRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  convSnippet: {
    flex: 1,
    fontFamily: Fonts.body,
    fontSize: 13,
    color: '#6B7280',
    lineHeight: 18,
    paddingRight: 10,
  },
  unreadBadge: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#0D0D0D',
    alignItems: 'center',
    justifyContent: 'center',
  },
  unreadBadgeText: {
    fontFamily: Fonts.bodyBold,
    fontSize: 11,
    color: '#FFFFFF',
  },

  // ── Chat Screen Styles (Image 1) ──────────────────────────────────────────
  chatTopBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 8,
    backgroundColor: '#FFFFFF',
  },
  chatTopRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  contactCardWrapper: {
    paddingHorizontal: 16,
    paddingBottom: 10,
  },
  contactCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 3,
    borderWidth: 1,
    borderColor: '#F3F4F6',
  },
  contactAvatarRing: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 2,
    borderColor: '#22C55E',
    padding: 2,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  contactAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  contactInfo: {
    flex: 1,
  },
  contactName: {
    fontFamily: Fonts.headingBold,
    fontSize: 15,
    color: '#0D0D0D',
  },
  contactStatus: {
    fontFamily: Fonts.bodyMedium,
    fontSize: 12,
    color: '#22C55E',
    marginTop: 1,
  },
  callActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  callBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
  },

  chatScroll: {
    flex: 1,
  },
  chatContent: {
    paddingHorizontal: 18,
    paddingTop: 16,
    paddingBottom: 20,
  },
  msgRow: {
    marginBottom: 16,
    maxWidth: '80%',
  },
  msgRowLeft: {
    alignSelf: 'flex-start',
    alignItems: 'flex-start',
  },
  msgRowRight: {
    alignSelf: 'flex-end',
    alignItems: 'flex-end',
  },
  bubble: {
    borderRadius: 18,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  bubbleLeft: {
    backgroundColor: '#ECEEF1',
    borderTopLeftRadius: 4,
  },
  bubbleRight: {
    backgroundColor: '#0D0D0D',
    borderBottomRightRadius: 4,
  },
  bubbleText: {
    fontFamily: Fonts.body,
    fontSize: 14,
    lineHeight: 20,
  },
  bubbleTextLeft: {
    color: '#0D0D0D',
  },
  bubbleTextRight: {
    color: '#FFFFFF',
  },
  msgTime: {
    fontFamily: Fonts.body,
    fontSize: 11,
    color: '#8E8E93',
    marginTop: 4,
  },

  chatInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 8,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  chatInputPill: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 26,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    paddingHorizontal: 12,
    height: 50,
    marginRight: 10,
  },
  inputIconBtn: {
    padding: 6,
  },
  chatTextInput: {
    flex: 1,
    fontFamily: Fonts.body,
    fontSize: 14,
    color: '#0D0D0D',
    paddingHorizontal: 6,
  },
  sendBlackCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#0D0D0D',
    alignItems: 'center',
    justifyContent: 'center',
  },

  // ── Video Call Modal (Image 3) ────────────────────────────────────────────
  videoCallRoot: {
    flex: 1,
    backgroundColor: '#0D0D0D',
  },
  videoStreamBg: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    resizeMode: 'cover',
  },
  videoOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.35)',
  },
  callTopBar: {
    paddingHorizontal: 20,
    zIndex: 10,
  },
  videoBackCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(13, 13, 13, 0.8)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  pipWrapper: {
    position: 'absolute',
    right: 20,
    width: 100,
    height: 130,
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.4)',
    shadowColor: '#000',
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 8,
    zIndex: 10,
  },
  pipImage: {
    width: '100%',
    height: '100%',
  },
  videoCallInfo: {
    position: 'absolute',
    bottom: 120,
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 10,
  },
  videoCallerName: {
    fontFamily: Fonts.headingBold,
    fontSize: 18,
    color: '#FFFFFF',
    marginBottom: 4,
  },
  videoCallTimer: {
    fontFamily: Fonts.body,
    fontSize: 14,
    color: '#E5E7EB',
  },
  videoControlsPill: {
    position: 'absolute',
    bottom: 0,
    left: 30,
    right: 30,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    backgroundColor: '#000000',
    borderRadius: 36,
    paddingVertical: 14,
    paddingHorizontal: 24,
    zIndex: 10,
  },
  callControlBtn: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  callControlActive: {
    backgroundColor: '#EF4444',
  },
  callEndBtn: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#EF4444',
    alignItems: 'center',
    justifyContent: 'center',
  },

  // ── Audio Call Modal (Image 4) ────────────────────────────────────────────
  audioCallRoot: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  audioCallHeader: {
    paddingHorizontal: 20,
  },
  audioAvatarContainer: {
    alignItems: 'center',
    marginTop: 40,
    marginBottom: 40,
  },
  audioAvatarRing: {
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 3,
    borderColor: '#22C55E',
    padding: 3,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  audioAvatar: {
    width: 108,
    height: 108,
    borderRadius: 54,
  },
  audioCallerName: {
    fontFamily: Fonts.headingBold,
    fontSize: 20,
    color: '#0D0D0D',
    marginBottom: 6,
  },
  audioCallTimer: {
    fontFamily: Fonts.body,
    fontSize: 14,
    color: '#8E8E93',
  },
  audioControlsGrid: {
    paddingHorizontal: 30,
    gap: 28,
  },
  audioControlsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
  },
  audioGridItem: {
    alignItems: 'center',
    width: 70,
  },
  audioCircleBtn: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  audioCircleBtnActive: {
    backgroundColor: '#FEE2E2',
  },
  audioBtnLabel: {
    fontFamily: Fonts.bodyMedium,
    fontSize: 12,
    color: '#8E8E93',
  },
  audioEndWrapper: {
    marginTop: 'auto',
    alignItems: 'center',
  },
  audioEndBtn: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: '#EF4444',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#EF4444',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 6,
  },

  // ── Reviews Client (Image 5) ──────────────────────────────────────────────
  ratingOverviewCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFF9F5',
    borderRadius: 18,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#FFE8D9',
  },
  ratingBigCol: {
    flex: 1,
  },
  ratingBigNumber: {
    fontFamily: Fonts.headingBold,
    fontSize: 28,
    color: '#0D0D0D',
  },
  starsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 4,
  },
  ratingCount: {
    fontFamily: Fonts.body,
    fontSize: 12,
    color: '#8E8E93',
  },
  addReviewBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0D0D0D',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 20,
    gap: 6,
  },
  addReviewBtnText: {
    fontFamily: Fonts.bodyBold,
    fontSize: 12,
    color: '#FFFFFF',
  },

  reviewCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 16,
    marginBottom: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
    borderWidth: 1,
    borderColor: '#F3F4F6',
  },
  reviewHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  reviewerAvatar: {
    width: 44,
    height: 44,
    borderRadius: 12,
    marginRight: 12,
  },
  reviewerMeta: {
    flex: 1,
  },
  reviewerName: {
    fontFamily: Fonts.headingBold,
    fontSize: 15,
    color: '#0D0D0D',
  },
  reviewDate: {
    fontFamily: Fonts.body,
    fontSize: 11,
    color: '#8E8E93',
    marginTop: 1,
  },
  reviewStars: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  reviewComment: {
    fontFamily: Fonts.body,
    fontSize: 13,
    color: '#4B5563',
    lineHeight: 19,
  },
  artisanReplyBox: {
    marginTop: 12,
    padding: 10,
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    borderLeftWidth: 3,
    borderLeftColor: '#B5502F',
  },
  replyTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  artisanReplyTitle: {
    fontFamily: Fonts.bodyBold,
    fontSize: 12,
    color: '#B5502F',
  },
  artisanReplyContent: {
    fontFamily: Fonts.body,
    fontSize: 12,
    color: '#374151',
    lineHeight: 17,
  },
  replyActionRow: {
    marginTop: 10,
    alignSelf: 'flex-start',
  },
  replyActionText: {
    fontFamily: Fonts.bodyMedium,
    fontSize: 12,
    color: '#B5502F',
    textDecorationLine: 'underline',
  },

  // ── Modal Styles ──────────────────────────────────────────────────────────
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  modalCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 20,
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 8,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontFamily: Fonts.headingBold,
    fontSize: 18,
    color: '#0D0D0D',
  },
  inputLabel: {
    fontFamily: Fonts.bodyBold,
    fontSize: 13,
    color: '#374151',
    marginBottom: 6,
    marginTop: 8,
  },
  modalSingleInput: {
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    paddingHorizontal: 14,
    height: 44,
    fontFamily: Fonts.body,
    fontSize: 14,
    color: '#0D0D0D',
  },
  starSelectRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 4,
  },
  modalInput: {
    backgroundColor: '#F9FAFB',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    padding: 12,
    fontFamily: Fonts.body,
    fontSize: 14,
    color: '#0D0D0D',
    minHeight: 80,
    textAlignVertical: 'top',
    marginBottom: 16,
  },
  modalPrimaryBtn: {
    backgroundColor: '#0D0D0D',
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalPrimaryBtnText: {
    fontFamily: Fonts.bodyBold,
    fontSize: 14,
    color: '#FFFFFF',
  },
});
