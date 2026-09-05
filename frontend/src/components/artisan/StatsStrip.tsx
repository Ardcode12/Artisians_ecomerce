import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Package, MessageCircle, Wallet } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { Fonts, Shadow, Spacing } from '@/constants/artisan-theme';
import { useLanguage } from '@/context/LanguageContext';

interface StatCardProps {
  Icon: any;
  value: string;
  label: string;
  onPress: () => void;
}

function StatCard({ Icon, value, label, onPress }: StatCardProps) {
  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.85}>
      <View style={styles.iconCircle}>
        <Icon size={18} color="#B5502F" strokeWidth={2.2} />
      </View>
      <Text style={styles.value}>{value}</Text>
      <Text style={styles.label}>{label}</Text>
    </TouchableOpacity>
  );
}

export function StatsStrip() {
  const router = useRouter();
  const { t } = useLanguage();

  return (
    <View style={styles.row}>
      <StatCard
        Icon={Package}
        value="12"
        label={t('stats_active_listings')}
        onPress={() => router.push('/listings')}
      />
      <StatCard
        Icon={MessageCircle}
        value="3"
        label={t('stats_new_inquiries')}
        onPress={() => router.push('/inquiries')}
      />
      <StatCard
        Icon={Wallet}
        value="₹8,450"
        label={t('stats_this_month')}
        onPress={() => router.push('/earnings')}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 4,
    marginBottom: 8,
  },
  /* Soft cream background (#FFF3E9), rounded 16px corners, subtle shadow */
  card: {
    flex: 1,
    backgroundColor: '#FFF3E9',
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 8,
    alignItems: 'center',
    gap: 4,
    borderWidth: 1,
    borderColor: '#FFE4D0',
    ...Shadow.card,
    elevation: 2,
  },
  iconCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 2,
  },
  value: {
    fontSize: 16,
    fontWeight: '800',
    fontFamily: Fonts.headingBold,
    color: '#0D0D0D',
    letterSpacing: -0.2,
  },
  label: {
    fontSize: 10,
    fontWeight: '600',
    fontFamily: Fonts.heading,
    color: '#746558',
    textAlign: 'center',
  },
});
