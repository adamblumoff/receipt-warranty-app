import React from 'react';
import { Alert, ScrollView, StyleSheet, Text, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import type { RootStackParamList } from '../navigation/AppNavigator';
import { useReceipts } from '../providers/ReceiptsProvider';

const currencyFormatter = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
});

const dateFormatter = new Intl.DateTimeFormat('en-US', {
  month: 'long',
  day: 'numeric',
  year: 'numeric',
});

type ReceiptDetailProps = NativeStackScreenProps<RootStackParamList, 'ReceiptDetail'>;

const ReceiptDetailScreen = ({ route }: ReceiptDetailProps): React.ReactElement => {
  const { receiptId } = route.params;
  const { getReceiptById } = useReceipts();
  const receipt = getReceiptById(receiptId);

  React.useEffect(() => {
    if (!receipt) {
      Alert.alert('Receipt missing', 'We could not load that receipt.');
    }
  }, [receipt]);

  if (!receipt) {
    return (
      <View style={styles.missingContainer}>
        <Text style={styles.missingText}>Receipt not found.</Text>
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.section}>
        <Text style={styles.label}>Vendor</Text>
        <Text style={styles.value}>{receipt.vendor}</Text>
      </View>
      <View style={styles.section}>
        <Text style={styles.label}>Total</Text>
        <Text style={styles.value}>{currencyFormatter.format(receipt.total)}</Text>
      </View>
      <View style={styles.section}>
        <Text style={styles.label}>Purchased on</Text>
        <Text style={styles.value}>{dateFormatter.format(new Date(receipt.purchaseDate))}</Text>
      </View>
      <View style={styles.section}>
        <Text style={styles.label}>Warranty expires</Text>
        <Text style={styles.value}>{dateFormatter.format(new Date(receipt.warrantyExpiresOn))}</Text>
      </View>
      <View style={styles.section}>
        <Text style={styles.label}>Notes</Text>
        <Text style={styles.bodyText}>
          OCR summaries, reminders, and receipt photos will live here. For now, use this space to document
          anything critical about the purchase or warranty coverage.
        </Text>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 24,
    gap: 16,
  },
  section: {
    backgroundColor: '#fff',
    padding: 18,
    borderRadius: 12,
    shadowColor: '#00000010',
    shadowOpacity: 0.06,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
    elevation: 1,
  },
  label: {
    fontSize: 12,
    textTransform: 'uppercase',
    color: '#9ca3af',
    letterSpacing: 0.8,
    marginBottom: 4,
    fontWeight: '600',
  },
  value: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1f2937',
  },
  bodyText: {
    fontSize: 14,
    lineHeight: 20,
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

export default ReceiptDetailScreen;
