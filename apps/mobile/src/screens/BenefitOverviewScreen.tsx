import React, { useState } from 'react';
import { Alert, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { triggerSelection, triggerNotificationSuccess } from '../utils/haptics';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import CouponCard from '../components/CouponCard';
import WarrantyCard from '../components/WarrantyCard';
import type { RootStackParamList } from '../navigation/AppNavigator';
import { useBenefits } from '../providers/BenefitsProvider';
import {
  SURFACE_COLOR,
  TEXT_MUTED,
  TEXT_PRIMARY,
  TEXT_ACCENT,
  CANVAS_COLOR,
} from '../theme/colors';
import { spacing } from '../theme/spacing';

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
    triggerSelection();
    setSelectionMode('coupons');
    setSelectedCoupons([]);
    setSelectedWarranties([]);
  };

  const startWarrantySelection = () => {
    triggerSelection();
    setSelectionMode('warranties');
    setSelectedCoupons([]);
    setSelectedWarranties([]);
  };

  const toggleCouponSelection = (couponId: string) => {
    setSelectedCoupons((current) => {
      const next = current.includes(couponId)
        ? current.filter((id) => id !== couponId)
        : [...current, couponId];
      triggerSelection();
      return next;
    });
  };

  const toggleWarrantySelection = (warrantyId: string) => {
    setSelectedWarranties((current) => {
      const next = current.includes(warrantyId)
        ? current.filter((id) => id !== warrantyId)
        : [...current, warrantyId];
      triggerSelection();
      return next;
    });
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
            triggerNotificationSuccess();
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
        <View style={styles.heroBox}>
          <Text style={styles.heroTitle}>Benefit wallet</Text>
          <Text style={styles.heroSubtitle}>
            Stay ahead of expirations with quick access to your perks.
          </Text>
          <View style={styles.heroStatsRow}>
            <View style={styles.heroStatCard}>
              <Text style={styles.heroStatValue}>{coupons.length}</Text>
              <Text style={styles.heroStatLabel}>
                {coupons.length === 1 ? 'Coupon' : 'Coupons'}
              </Text>
            </View>
            <View style={styles.heroStatCard}>
              <Text style={styles.heroStatValue}>{warranties.length}</Text>
              <Text style={styles.heroStatLabel}>
                {warranties.length === 1 ? 'Warranty' : 'Warranties'}
              </Text>
            </View>
          </View>
        </View>

        {loading && !selectionActive ? (
          <View style={styles.skeletonStack}>
            {[0, 1].map((key) => (
              <View key={`skeleton-${key}`} style={styles.skeletonCard} />
            ))}
          </View>
        ) : null}

        {reminders.length > 0 && !loading && (
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
              style={[styles.headerAction, styles.headerActionGhost]}
              onPress={exitSelection}
            >
              <View style={styles.headerActionContent}>
                <Ionicons name="close-outline" size={16} color={TEXT_MUTED} />
                <Text style={[styles.headerActionText, styles.headerActionGhostText]}>Cancel</Text>
              </View>
            </Pressable>
          ) : selectionMode === 'none' && coupons.length > 0 ? (
            <Pressable
              style={[styles.headerAction, styles.headerActionOutline]}
              onPress={startCouponSelection}
            >
              <View style={styles.headerActionContent}>
                <Ionicons name="checkmark-circle-outline" size={16} color={TEXT_ACCENT} />
                <Text style={[styles.headerActionText, styles.headerActionOutlineText]}>
                  Select
                </Text>
              </View>
            </Pressable>
          ) : null}
        </View>
        {loading && coupons.length === 0 ? (
          <View style={styles.skeletonCard} />
        ) : coupons.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="pricetag-outline" size={36} color={TEXT_MUTED} />
            <Text style={styles.emptyTitle}>No coupons yet</Text>
            <Text style={styles.emptyText}>
              Use “Add” to scan a coupon and track its expiration.
            </Text>
          </View>
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
              style={[styles.headerAction, styles.headerActionGhost]}
              onPress={exitSelection}
            >
              <View style={styles.headerActionContent}>
                <Ionicons name="close-outline" size={16} color={TEXT_MUTED} />
                <Text style={[styles.headerActionText, styles.headerActionGhostText]}>Cancel</Text>
              </View>
            </Pressable>
          ) : selectionMode === 'none' && warranties.length > 0 ? (
            <Pressable
              style={[styles.headerAction, styles.headerActionOutline]}
              onPress={startWarrantySelection}
            >
              <View style={styles.headerActionContent}>
                <Ionicons name="checkmark-circle-outline" size={16} color={TEXT_ACCENT} />
                <Text style={[styles.headerActionText, styles.headerActionOutlineText]}>
                  Select
                </Text>
              </View>
            </Pressable>
          ) : null}
        </View>
        {loading && warranties.length === 0 ? (
          <View style={styles.skeletonCard} />
        ) : warranties.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="shield-checkmark-outline" size={36} color={TEXT_MUTED} />
            <Text style={styles.emptyTitle}>No warranties logged</Text>
            <Text style={styles.emptyText}>Capture receipts to remember coverage windows.</Text>
          </View>
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
            <View style={styles.selectionDeleteContent}>
              <Ionicons
                name="trash-outline"
                size={18}
                color={selectedCount === 0 || bulkDeleting ? '#fca5a5' : '#fff'}
              />
              <Text
                style={[
                  styles.selectionDeleteText,
                  (selectedCount === 0 || bulkDeleting) && styles.selectionDeleteTextDisabled,
                ]}
              >
                {bulkDeleting ? 'Deleting…' : 'Delete selected'}
              </Text>
            </View>
          </Pressable>
        </View>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: SURFACE_COLOR,
  },
  scroll: {
    flex: 1,
  },
  container: {
    padding: spacing.xl,
    paddingBottom: spacing.xxl + spacing.lg,
    gap: spacing.md,
  },
  heroBox: {
    backgroundColor: CANVAS_COLOR,
    padding: spacing.xl,
    borderRadius: 16,
    gap: spacing.md,
    shadowColor: '#0000001a',
    shadowOpacity: 0.12,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 6 },
    elevation: 3,
  },
  heroTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: TEXT_PRIMARY,
  },
  heroSubtitle: {
    fontSize: 14,
    color: TEXT_MUTED,
    lineHeight: 20,
  },
  heroStatsRow: {
    flexDirection: 'row',
    gap: 12,
  },
  heroStatCard: {
    flex: 1,
    backgroundColor: SURFACE_COLOR,
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#00000012',
    shadowOpacity: 0.1,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  heroStatValue: {
    fontSize: 20,
    fontWeight: '700',
    color: TEXT_PRIMARY,
  },
  heroStatLabel: {
    fontSize: 12,
    color: TEXT_MUTED,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  skeletonStack: {
    gap: spacing.md,
    marginBottom: spacing.lg,
  },
  skeletonCard: {
    borderRadius: 14,
    backgroundColor: '#e5e7eb',
    height: 90,
    opacity: 0.6,
  },
  containerWithSelection: {
    paddingBottom: 160,
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: TEXT_PRIMARY,
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
  headerActionContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  headerActionText: {
    fontSize: 13,
    fontWeight: '600',
  },
  headerActionOutline: {
    borderWidth: 1,
    borderColor: TEXT_ACCENT,
    backgroundColor: SURFACE_COLOR,
  },
  headerActionOutlineText: {
    color: TEXT_ACCENT,
  },
  headerActionGhost: {
    borderWidth: 1,
    borderColor: '#e5e7eb',
    backgroundColor: SURFACE_COLOR,
  },
  headerActionGhostText: {
    color: TEXT_MUTED,
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
    color: TEXT_MUTED,
  },
  emptyState: {
    backgroundColor: SURFACE_COLOR,
    borderRadius: 16,
    padding: spacing.lg,
    alignItems: 'center',
    gap: spacing.sm,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: TEXT_PRIMARY,
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
  selectionDeleteContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
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
