import React from 'react';
import { FlatList, ListRenderItem, SafeAreaView, StatusBar, StyleSheet, Text, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import ReceiptCard from '../components/ReceiptCard';
import { useReceipts } from '../providers/ReceiptsProvider';
import type { RootStackParamList } from '../navigation/AppNavigator';
import type { ReceiptSummary } from '@receipt-warranty/shared';

const EMPTY_MESSAGE = 'Add your first receipt by tapping Capture in the top right.';

type ReceiptsScreenProps = NativeStackScreenProps<RootStackParamList, 'Receipts'>;

const ReceiptsListScreen = ({ navigation }: ReceiptsScreenProps): React.ReactElement => {
  const { receipts } = useReceipts();

  const renderItem: ListRenderItem<ReceiptSummary> = ({ item }) => (
    <ReceiptCard receipt={item} onPress={() => navigation.navigate('ReceiptDetail', { receiptId: item.id })} />
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" />
      {receipts.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyTitle}>No receipts yet</Text>
          <Text style={styles.emptyDescription}>{EMPTY_MESSAGE}</Text>
        </View>
      ) : (
        <FlatList
          contentContainerStyle={styles.listContainer}
          data={receipts}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
        />
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  listContainer: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 32,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 8,
    color: '#111827',
  },
  emptyDescription: {
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
  },
});

export default ReceiptsListScreen;
