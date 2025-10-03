import React from 'react';
import { Alert, ScrollView, StyleSheet, Text, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import type { RootStackParamList } from '../navigation/AppNavigator';
import { useBenefits } from '../providers/BenefitsProvider';

const dateFormatter = new Intl.DateTimeFormat('en-US', {
  month: 'long',
  day: 'numeric',
  year: 'numeric',
});

type WarrantyDetailProps = NativeStackScreenProps<RootStackParamList, 'WarrantyDetail'>;

const WarrantyDetailScreen = ({ route }: WarrantyDetailProps): React.ReactElement => {
  const { warrantyId } = route.params;
  const { getWarrantyById } = useBenefits();
  const warranty = getWarrantyById(warrantyId);

  React.useEffect(() => {
    if (!warranty) {
      Alert.alert('Missing warranty', 'We could not load that warranty.');
    }
  }, [warranty]);

  if (!warranty) {
    return (
      <View style={styles.missingContainer}>
        <Text style={styles.missingText}>Warranty not found.</Text>
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.section}>
        <Text style={styles.label}>Product</Text>
        <Text style={styles.value}>{warranty.productName}</Text>
      </View>
      <View style={styles.section}>
        <Text style={styles.label}>Merchant</Text>
        <Text style={styles.value}>{warranty.merchant}</Text>
      </View>
      <View style={styles.sectionRow}>
        <View style={styles.rowItem}>
          <Text style={styles.label}>Purchased</Text>
          <Text style={styles.value}>{dateFormatter.format(new Date(warranty.purchaseDate))}</Text>
        </View>
        <View style={styles.rowItem}>
          <Text style={styles.label}>Coverage Ends</Text>
          <Text style={styles.value}>
            {dateFormatter.format(new Date(warranty.coverageEndsOn))}
          </Text>
        </View>
      </View>
      {warranty.coverageNotes ? (
        <View style={styles.section}>
          <Text style={styles.label}>Coverage Notes</Text>
          <Text style={styles.body}>{warranty.coverageNotes}</Text>
        </View>
      ) : null}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 24,
    gap: 16,
    backgroundColor: '#f9fafb',
  },
  section: {
    backgroundColor: '#fff',
    padding: 18,
    borderRadius: 12,
    gap: 6,
    shadowColor: '#00000010',
    shadowOpacity: 0.05,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 4 },
  },
  sectionRow: {
    flexDirection: 'row',
    gap: 12,
  },
  rowItem: {
    flex: 1,
    backgroundColor: '#fff',
    padding: 18,
    borderRadius: 12,
    gap: 6,
    shadowColor: '#00000010',
    shadowOpacity: 0.05,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 4 },
  },
  label: {
    fontSize: 12,
    textTransform: 'uppercase',
    color: '#9ca3af',
    fontWeight: '600',
    letterSpacing: 0.6,
  },
  value: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
  },
  body: {
    fontSize: 15,
    lineHeight: 22,
    color: '#4b5563',
  },
  missingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  missingText: {
    fontSize: 16,
    color: '#6b7280',
  },
});

export default WarrantyDetailScreen;
