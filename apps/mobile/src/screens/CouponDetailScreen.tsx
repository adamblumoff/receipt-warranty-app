import React from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type {
  NativeStackNavigationProp,
  NativeStackScreenProps,
} from '@react-navigation/native-stack';

import type { RootStackParamList } from '../navigation/AppNavigator';
import { useBenefits } from '../providers/BenefitsProvider';

const dateFormatter = new Intl.DateTimeFormat('en-US', {
  month: 'long',
  day: 'numeric',
  year: 'numeric',
});

type CouponDetailProps = NativeStackScreenProps<RootStackParamList, 'CouponDetail'>;

const CouponDetailScreen = ({ route }: CouponDetailProps): React.ReactElement => {
  const { couponId } = route.params;
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { getCouponById, removeCoupon } = useBenefits();
  const coupon = getCouponById(couponId);

  React.useEffect(() => {
    if (!coupon) {
      Alert.alert('Missing coupon', 'We could not load that coupon.');
    }
  }, [coupon]);

  if (!coupon) {
    return (
      <View style={styles.missingContainer}>
        <Text style={styles.missingText}>Coupon not found.</Text>
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.section}>
        <Text style={styles.label}>Merchant</Text>
        <Text style={styles.value}>{coupon.merchant}</Text>
      </View>
      <View style={styles.section}>
        <Text style={styles.label}>Offer</Text>
        <Text style={styles.body}>{coupon.description}</Text>
      </View>
      <View style={styles.section}>
        <Text style={styles.label}>Expires</Text>
        <Text style={styles.value}>{dateFormatter.format(new Date(coupon.expiresOn))}</Text>
      </View>
      {coupon.terms ? (
        <View style={styles.section}>
          <Text style={styles.label}>Terms</Text>
          <Text style={styles.body}>{coupon.terms}</Text>
        </View>
      ) : null}
      <Pressable
        style={styles.deleteButton}
        onPress={() => {
          Alert.alert('Remove coupon', 'Are you sure you want to remove this coupon?', [
            { text: 'Cancel', style: 'cancel' },
            {
              text: 'Delete',
              style: 'destructive',
              onPress: () => {
                void removeCoupon(couponId).then(() => navigation.goBack());
              },
            },
          ]);
        }}
      >
        <Text style={styles.deleteText}>Delete coupon</Text>
      </Pressable>
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
  deleteButton: {
    marginTop: 8,
    backgroundColor: '#fee2e2',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  deleteText: {
    color: '#b91c1c',
    fontSize: 16,
    fontWeight: '600',
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

export default CouponDetailScreen;
