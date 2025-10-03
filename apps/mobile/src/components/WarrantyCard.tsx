import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { Warranty } from '@receipt-warranty/shared';

interface WarrantyCardProps {
  warranty: Warranty;
  onPress?: () => void;
}

const dateFormatter = new Intl.DateTimeFormat('en-US', {
  month: 'short',
  day: 'numeric',
  year: 'numeric',
});

const WarrantyCard = ({ warranty, onPress }: WarrantyCardProps): React.ReactElement => {
  const expiresSoon =
    new Date(warranty.coverageEndsOn).getTime() - Date.now() < 1000 * 60 * 60 * 24 * 30;

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
    >
      <View style={styles.row}>
        <Text style={styles.product}>{warranty.productName}</Text>
        <Text style={[styles.badge, expiresSoon && styles.badgeUrgent]}>Warranty</Text>
      </View>
      <Text style={styles.meta}>
        Purchased {dateFormatter.format(new Date(warranty.purchaseDate))} at {warranty.merchant}
      </Text>
      <Text style={styles.meta}>
        Coverage ends {dateFormatter.format(new Date(warranty.coverageEndsOn))}
      </Text>
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
  product: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
  },
  badge: {
    fontSize: 12,
    textTransform: 'uppercase',
    color: '#047857',
    backgroundColor: '#d1fae5',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    fontWeight: '700',
    letterSpacing: 0.8,
  },
  badgeUrgent: {
    color: '#b45309',
    backgroundColor: '#fef3c7',
  },
  meta: {
    fontSize: 13,
    color: '#6b7280',
  },
});

export default WarrantyCard;
