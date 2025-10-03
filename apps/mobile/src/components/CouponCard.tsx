import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { Coupon } from '@receipt-warranty/shared';

interface CouponCardProps {
  coupon: Coupon;
  onPress?: () => void;
}

const dateFormatter = new Intl.DateTimeFormat('en-US', {
  month: 'short',
  day: 'numeric',
  year: 'numeric',
});

const CouponCard = ({ coupon, onPress }: CouponCardProps): React.ReactElement => {
  const expiresSoon = new Date(coupon.expiresOn).getTime() - Date.now() < 1000 * 60 * 60 * 24 * 7;

  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}>
      <View style={styles.row}>
        <Text style={styles.merchant}>{coupon.merchant}</Text>
        <Text style={[styles.badge, expiresSoon && styles.badgeUrgent]}>Coupon</Text>
      </View>
      <Text style={styles.description}>{coupon.description}</Text>
      <Text style={styles.meta}>Expires {dateFormatter.format(new Date(coupon.expiresOn))}</Text>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    gap: 8,
    shadowColor: '#0000001a',
    shadowOpacity: 0.08,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 1,
  },
  cardPressed: {
    opacity: 0.85,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  merchant: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
  },
  badge: {
    fontSize: 12,
    textTransform: 'uppercase',
    color: '#2563eb',
    backgroundColor: '#dbeafe',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    fontWeight: '700',
    letterSpacing: 0.8,
  },
  badgeUrgent: {
    color: '#b91c1c',
    backgroundColor: '#fee2e2',
  },
  description: {
    fontSize: 15,
    color: '#1f2937',
  },
  meta: {
    fontSize: 13,
    color: '#6b7280',
  },
});

export default CouponCard;
