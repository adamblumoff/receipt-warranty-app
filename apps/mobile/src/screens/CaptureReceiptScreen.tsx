import React from 'react';
import { Alert, Pressable, SafeAreaView, StyleSheet, Text, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { v4 as uuid } from 'uuid';

import type { RootStackParamList } from '../navigation/AppNavigator';
import { useReceipts } from '../providers/ReceiptsProvider';
import type { ReceiptSummary } from '@receipt-warranty/shared';

const CaptureReceiptScreen = (): React.ReactElement => {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { addReceipt } = useReceipts();

  const handleMockCapture = () => {
    const timestamp = new Date();
    const newReceipt: ReceiptSummary = {
      id: uuid(),
      vendor: 'Sample Vendor',
      purchaseDate: timestamp.toISOString(),
      total: 42.11,
      warrantyExpiresOn: new Date(timestamp.getFullYear() + 1, timestamp.getMonth(), timestamp.getDate()).toISOString(),
    };

    addReceipt(newReceipt);
    Alert.alert('Receipt saved', 'A placeholder receipt was added to your list.');
    navigation.navigate('Receipts');
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <Text style={styles.title}>Capture a Receipt</Text>
        <Text style={styles.description}>
          The camera flow will live here. For now, tap the button below to simulate adding a receipt with OCR’d
          details.
        </Text>
        <Pressable style={styles.button} onPress={handleMockCapture}>
          <Text style={styles.buttonText}>Simulate capture</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#fff',
  },
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    gap: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#111827',
  },
  description: {
    fontSize: 15,
    textAlign: 'center',
    color: '#4b5563',
    lineHeight: 22,
  },
  button: {
    backgroundColor: '#2563eb',
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 12,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    letterSpacing: 0.3,
    textTransform: 'uppercase',
  },
});

export default CaptureReceiptScreen;
