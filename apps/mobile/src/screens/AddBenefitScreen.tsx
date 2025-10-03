import React from 'react';
import { Pressable, SafeAreaView, StyleSheet, Text, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { v4 as uuid } from 'uuid';

import type { RootStackParamList } from '../navigation/AppNavigator';
import { useBenefits } from '../providers/BenefitsProvider';

const AddBenefitScreen = (): React.ReactElement => {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { addCoupon, addWarranty } = useBenefits();

  const handleAddCoupon = () => {
    const now = new Date();
    addCoupon({
      id: uuid(),
      merchant: 'Local Coffee Club',
      description: 'Buy one get one free drink',
      expiresOn: new Date(now.getFullYear(), now.getMonth(), now.getDate() + 10).toISOString(),
      terms: 'Limit one per visit; valid on handcrafted beverages.',
    });
    navigation.navigate('Wallet');
  };

  const handleAddWarranty = () => {
    const now = new Date();
    addWarranty({
      id: uuid(),
      productName: 'Smart Home Hub',
      merchant: 'HomeTech Warranty',
      purchaseDate: now.toISOString(),
      coverageEndsOn: new Date(now.getFullYear() + 2, now.getMonth(), now.getDate()).toISOString(),
      coverageNotes: 'File claims via hometechwarranty.com with your serial number.',
    });
    navigation.navigate('Wallet');
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <Text style={styles.title}>What would you like to add?</Text>
        <Text style={styles.subtitle}>Real capture flows will live here. Use the buttons to simulate new entries.</Text>
        <Pressable style={[styles.button, styles.primary]} onPress={handleAddCoupon}>
          <Text style={styles.buttonText}>Add sample coupon</Text>
        </Pressable>
        <Pressable style={[styles.button, styles.secondary]} onPress={handleAddWarranty}>
          <Text style={styles.buttonText}>Add sample warranty</Text>
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
  subtitle: {
    fontSize: 15,
    color: '#4b5563',
    textAlign: 'center',
    lineHeight: 22,
  },
  button: {
    width: '100%',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
  },
  primary: {
    backgroundColor: '#2563eb',
  },
  secondary: {
    backgroundColor: '#047857',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    letterSpacing: 0.3,
  },
});

export default AddBenefitScreen;
