import React from 'react';
import { RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import CouponCard from '../components/CouponCard';
import WarrantyCard from '../components/WarrantyCard';
import type { RootStackParamList } from '../navigation/AppNavigator';
import { useBenefits } from '../providers/BenefitsProvider';

const formatDate = (iso: string): string => {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) {
    return iso;
  }
  return new Intl.DateTimeFormat(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  }).format(date);
};

const BenefitOverviewScreen = ({
  navigation,
}: NativeStackScreenProps<RootStackParamList, 'Wallet'>): React.ReactElement => {
  const { coupons, warranties, reminders, loading, refreshBenefits } = useBenefits();

  return (
    <ScrollView
      contentContainerStyle={styles.container}
      refreshControl={
        <RefreshControl refreshing={loading} onRefresh={() => void refreshBenefits()} />
      }
    >
      {reminders.length > 0 && (
        <View style={styles.reminderSection}>
          <Text style={styles.sectionTitle}>Upcoming Reminders</Text>
          {reminders.map((reminder) => (
            <View key={reminder.id} style={styles.reminderCard}>
              <Text style={styles.reminderTitle}>
                {reminder.benefitType === 'coupon' ? 'Coupon' : 'Warranty'} · {reminder.title}
              </Text>
              <Text style={styles.reminderSubtitle}>
                Due on {formatDate(reminder.dueOn)} ({reminder.daysUntil} day
                {reminder.daysUntil === 1 ? '' : 's'} left)
              </Text>
            </View>
          ))}
        </View>
      )}

      <Text style={styles.sectionTitle}>Active Coupons</Text>
      {coupons.length === 0 ? (
        <Text style={styles.emptyText}>No coupons saved. Add one to avoid missing a deal.</Text>
      ) : (
        coupons.map((coupon) => (
          <CouponCard
            key={coupon.id}
            coupon={coupon}
            onPress={() => navigation.navigate('CouponDetail', { couponId: coupon.id })}
          />
        ))
      )}

      <View style={styles.sectionDivider} />

      <Text style={styles.sectionTitle}>Warranties</Text>
      {warranties.length === 0 ? (
        <Text style={styles.emptyText}>
          Track warranties here so you remember coverage windows.
        </Text>
      ) : (
        warranties.map((warranty) => (
          <WarrantyCard
            key={warranty.id}
            warranty={warranty}
            onPress={() => navigation.navigate('WarrantyDetail', { warrantyId: warranty.id })}
          />
        ))
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 20,
    paddingBottom: 40,
    backgroundColor: '#f5f5f5',
    gap: 12,
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#111827',
  },
  reminderSection: {
    gap: 8,
  },
  reminderCard: {
    backgroundColor: '#111827',
    borderRadius: 12,
    padding: 14,
    gap: 4,
  },
  reminderTitle: {
    color: '#f9fafb',
    fontSize: 15,
    fontWeight: '600',
  },
  reminderSubtitle: {
    color: '#e5e7eb',
    fontSize: 13,
  },
  emptyText: {
    fontSize: 14,
    color: '#6b7280',
  },
  sectionDivider: {
    height: 1,
    backgroundColor: '#e5e7eb',
    marginVertical: 12,
  },
});

export default BenefitOverviewScreen;
