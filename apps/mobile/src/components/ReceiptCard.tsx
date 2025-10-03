import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { ReceiptSummary } from '@receipt-warranty/shared';

interface ReceiptCardProps {
  receipt: ReceiptSummary;
  onPress?: () => void;
}

const currencyFormatter = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
});

const dateFormatter = new Intl.DateTimeFormat('en-US', {
  month: 'short',
  day: 'numeric',
  year: 'numeric',
});

const ReceiptCard = ({ receipt, onPress }: ReceiptCardProps): React.ReactElement => {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}>
      <View style={styles.row}>
        <Text style={styles.vendor}>{receipt.vendor}</Text>
        <Text style={styles.total}>{currencyFormatter.format(receipt.total)}</Text>
      </View>
      <View style={styles.row}>
        <Text style={styles.meta}>Purchased {dateFormatter.format(new Date(receipt.purchaseDate))}</Text>
        <Text style={styles.meta}>Warranty {dateFormatter.format(new Date(receipt.warrantyExpiresOn))}</Text>
      </View>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#00000022',
    shadowOpacity: 0.08,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  cardPressed: {
    opacity: 0.8,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  vendor: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1f2937',
  },
  total: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
  },
  meta: {
    fontSize: 13,
    color: '#6b7280',
  },
});

export default ReceiptCard;
