import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { Coupon } from '@receipt-warranty/shared';

interface CouponCardProps {
  coupon: Coupon;
  onPress?: () => void;
  selectable?: boolean;
  selected?: boolean;
  onToggleSelect?: () => void;
}

const dateFormatter = new Intl.DateTimeFormat('en-US', {
  month: 'short',
  day: 'numeric',
  year: 'numeric',
});

const CouponCard = ({
  coupon,
  onPress,
  selectable = false,
  selected = false,
  onToggleSelect,
}: CouponCardProps): React.ReactElement => {
  const expiresSoon = new Date(coupon.expiresOn).getTime() - Date.now() < 1000 * 60 * 60 * 24 * 7;

  const handlePress = () => {
    if (selectable) {
      onToggleSelect?.();
    } else {
      onPress?.();
    }
  };

  return (
    <Pressable
      onPress={handlePress}
      style={({ pressed }) => [
        styles.card,
        selectable && styles.cardSelectable,
        selected && styles.cardSelected,
        pressed && styles.cardPressed,
      ]}
    >
      {selectable ? (
        <View style={[styles.selectIndicator, selected && styles.selectIndicatorSelected]}>
          {selected ? <Text style={styles.selectIndicatorText}>✓</Text> : null}
        </View>
      ) : null}
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
    position: 'relative',
  },
  cardPressed: {
    opacity: 0.85,
  },
  cardSelectable: {
    paddingRight: 44,
  },
  cardSelected: {
    borderWidth: 2,
    borderColor: '#2563eb',
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
  selectIndicator: {
    position: 'absolute',
    top: 12,
    right: 12,
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#d1d5db',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
  },
  selectIndicatorSelected: {
    backgroundColor: '#2563eb',
    borderColor: '#1d4ed8',
  },
  selectIndicatorText: {
    color: '#fff',
    fontWeight: '700',
  },
});

export default CouponCard;
