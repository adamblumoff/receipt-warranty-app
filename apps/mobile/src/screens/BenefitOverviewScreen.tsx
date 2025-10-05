import React, { useState } from 'react';
import { Alert, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
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
  const {
    coupons,
    warranties,
    reminders,
    loading,
    refreshBenefits,
    removeCouponsBulk,
    removeWarrantiesBulk,
  } = useBenefits();

  const [selectionMode, setSelectionMode] = useState<'none' | 'coupons' | 'warranties'>('none');
  const [selectedCoupons, setSelectedCoupons] = useState<string[]>([]);
  const [selectedWarranties, setSelectedWarranties] = useState<string[]>([]);
  const [bulkDeleting, setBulkDeleting] = useState(false);

  const exitSelection = () => {
    setSelectionMode('none');
    setSelectedCoupons([]);
    setSelectedWarranties([]);
    setBulkDeleting(false);
  };

  const startCouponSelection = () => {
    setSelectionMode('coupons');
    setSelectedCoupons([]);
    setSelectedWarranties([]);
  };

  const startWarrantySelection = () => {
    setSelectionMode('warranties');
    setSelectedCoupons([]);
    setSelectedWarranties([]);
  };

  const toggleCouponSelection = (couponId: string) => {
    setSelectedCoupons((current) =>
      current.includes(couponId) ? current.filter((id) => id !== couponId) : [...current, couponId],
    );
  };

  const toggleWarrantySelection = (warrantyId: string) => {
    setSelectedWarranties((current) =>
      current.includes(warrantyId)
        ? current.filter((id) => id !== warrantyId)
        : [...current, warrantyId],
    );
  };

  const selectedCount =
    selectionMode === 'coupons'
      ? selectedCoupons.length
      : selectionMode === 'warranties'
        ? selectedWarranties.length
        : 0;

  const selectionActive = selectionMode !== 'none';

  const handleCouponPress = (couponId: string) => {
    if (selectionMode === 'coupons') {
      toggleCouponSelection(couponId);
      return;
    }
    navigation.navigate('CouponDetail', { couponId });
  };

  const handleWarrantyPress = (warrantyId: string) => {
    if (selectionMode === 'warranties') {
      toggleWarrantySelection(warrantyId);
      return;
    }
    navigation.navigate('WarrantyDetail', { warrantyId });
  };

  const confirmBulkDelete = () => {
    if (!selectionActive || selectedCount === 0 || bulkDeleting) {
      return;
    }

    const mode = selectionMode;
    const ids = mode === 'coupons' ? [...selectedCoupons] : [...selectedWarranties];
    const baseLabel = mode === 'coupons' ? 'coupon' : 'warranty';
    const labelPlural = `${baseLabel}${selectedCount === 1 ? '' : 's'}`;

    Alert.alert(
      `Delete ${selectedCount} ${labelPlural}?`,
      `This will permanently remove the selected ${labelPlural} from your wallet.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            setBulkDeleting(true);
            void (async () => {
              try {
                if (mode === 'coupons') {
                  await removeCouponsBulk(ids);
                } else {
                  await removeWarrantiesBulk(ids);
                }
                exitSelection();
              } catch (error) {
                console.warn('Failed bulk delete', error);
                Alert.alert('Unable to delete', 'Please try again.');
              } finally {
                setBulkDeleting(false);
              }
            })();
          },
        },
      ],
    );
  };

  return (
    <View style={styles.screen}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.container, selectionActive && styles.containerWithSelection]}
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

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Active Coupons</Text>
          {selectionMode === 'coupons' ? (
            <Pressable
              style={[styles.headerAction, styles.headerActionCancel]}
              onPress={exitSelection}
            >
              <Text style={[styles.headerActionText, styles.headerActionCancelText]}>Cancel</Text>
            </Pressable>
          ) : selectionMode === 'none' && coupons.length > 0 ? (
            <Pressable
              style={[styles.headerAction, styles.headerActionSelect]}
              onPress={startCouponSelection}
            >
              <Text style={[styles.headerActionText, styles.headerActionSelectText]}>Select</Text>
            </Pressable>
          ) : null}
        </View>
        {coupons.length === 0 ? (
          <Text style={styles.emptyText}>No coupons saved. Add one to avoid missing a deal.</Text>
        ) : (
          coupons.map((coupon) => (
            <CouponCard
              key={coupon.id}
              coupon={coupon}
              onPress={() => handleCouponPress(coupon.id)}
              selectable={selectionMode === 'coupons'}
              selected={selectedCoupons.includes(coupon.id)}
              onToggleSelect={() => toggleCouponSelection(coupon.id)}
            />
          ))
        )}

        <View style={styles.sectionDivider} />

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Warranties</Text>
          {selectionMode === 'warranties' ? (
            <Pressable
              style={[styles.headerAction, styles.headerActionCancel]}
              onPress={exitSelection}
            >
              <Text style={[styles.headerActionText, styles.headerActionCancelText]}>Cancel</Text>
            </Pressable>
          ) : selectionMode === 'none' && warranties.length > 0 ? (
            <Pressable
              style={[styles.headerAction, styles.headerActionSelect]}
              onPress={startWarrantySelection}
            >
              <Text style={[styles.headerActionText, styles.headerActionSelectText]}>Select</Text>
            </Pressable>
          ) : null}
        </View>
        {warranties.length === 0 ? (
          <Text style={styles.emptyText}>
            Track warranties here so you remember coverage windows.
          </Text>
        ) : (
          warranties.map((warranty) => (
            <WarrantyCard
              key={warranty.id}
              warranty={warranty}
              onPress={() => handleWarrantyPress(warranty.id)}
              selectable={selectionMode === 'warranties'}
              selected={selectedWarranties.includes(warranty.id)}
              onToggleSelect={() => toggleWarrantySelection(warranty.id)}
            />
          ))
        )}
      </ScrollView>

      {selectionActive ? (
        <View style={styles.selectionBar}>
          <Text style={styles.selectionSummary}>
            {selectedCount === 0
              ? 'No items selected'
              : `${selectedCount} ${
                  selectionMode === 'coupons' ? 'coupon' : 'warranty'
                }${selectedCount === 1 ? '' : 's'} selected`}
          </Text>
          <Pressable
            style={[
              styles.selectionDelete,
              (selectedCount === 0 || bulkDeleting) && styles.selectionDeleteDisabled,
            ]}
            onPress={confirmBulkDelete}
            disabled={selectedCount === 0 || bulkDeleting}
          >
            <Text
              style={[
                styles.selectionDeleteText,
                (selectedCount === 0 || bulkDeleting) && styles.selectionDeleteTextDisabled,
              ]}
            >
              {bulkDeleting ? 'Deleting…' : 'Delete selected'}
            </Text>
          </Pressable>
        </View>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  scroll: {
    flex: 1,
  },
  container: {
    padding: 20,
    paddingBottom: 40,
    gap: 12,
  },
  containerWithSelection: {
    paddingBottom: 160,
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#111827',
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 12,
  },
  headerAction: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
  },
  headerActionText: {
    fontSize: 13,
    fontWeight: '600',
  },
  headerActionSelect: {
    backgroundColor: '#e0e7ff',
  },
  headerActionSelectText: {
    color: '#1d4ed8',
  },
  headerActionCancel: {
    backgroundColor: '#e5e7eb',
  },
  headerActionCancelText: {
    color: '#374151',
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
  selectionBar: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: 24,
    paddingTop: 14,
    paddingBottom: 24,
    backgroundColor: '#111827',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 20,
  },
  selectionSummary: {
    color: '#f9fafb',
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
  },
  selectionDelete: {
    backgroundColor: '#dc2626',
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: 999,
  },
  selectionDeleteDisabled: {
    backgroundColor: '#7f1d1d',
    opacity: 0.6,
  },
  selectionDeleteText: {
    color: '#fff',
    fontWeight: '700',
  },
  selectionDeleteTextDisabled: {
    color: '#fee2e2',
  },
});

export default BenefitOverviewScreen;
