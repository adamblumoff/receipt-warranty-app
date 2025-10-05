import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import type { Warranty } from '@receipt-warranty/shared';
import NoFeedbackPressable from './NoFeedbackPressable';

interface WarrantyCardProps {
  warranty: Warranty;
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

const toDateSafe = (iso?: string): Date | null => {
  if (!iso) {
    return null;
  }
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? null : date;
};

const formatDateSafe = (iso?: string): string => {
  const date = toDateSafe(iso);
  return date ? dateFormatter.format(date) : '—';
};

const WarrantyCard = ({
  warranty,
  onPress,
  selectable = false,
  selected = false,
  onToggleSelect,
}: WarrantyCardProps): React.ReactElement => {
  const coverageDate = toDateSafe(warranty.coverageEndsOn);
  const expiresSoon = coverageDate
    ? coverageDate.getTime() - Date.now() < 1000 * 60 * 60 * 24 * 30
    : false;

  const handlePress = () => {
    if (selectable) {
      onToggleSelect?.();
    } else {
      onPress?.();
    }
  };

  return (
    <NoFeedbackPressable
      onPress={handlePress}
      style={[styles.card, selectable && styles.cardSelectable, selected && styles.cardSelected]}
    >
      {selectable ? (
        <View style={[styles.selectIndicator, selected && styles.selectIndicatorSelected]}>
          {selected ? <Text style={styles.selectIndicatorText}>✓</Text> : null}
        </View>
      ) : null}
      <View style={styles.row}>
        <Text style={styles.product}>{warranty.productName}</Text>
        <Text style={[styles.badge, expiresSoon && styles.badgeUrgent]}>Warranty</Text>
      </View>
      <Text style={styles.meta}>
        Purchased {formatDateSafe(warranty.purchaseDate)} at {warranty.merchant}
      </Text>
      <Text style={styles.meta}>Coverage ends {formatDateSafe(warranty.coverageEndsOn)}</Text>
    </NoFeedbackPressable>
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

export default WarrantyCard;
