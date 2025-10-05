import React from 'react';
import { Pressable, StyleSheet, Text } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import AddBenefitScreen from '../screens/AddBenefitScreen';
import BenefitOverviewScreen from '../screens/BenefitOverviewScreen';
import CouponDetailScreen from '../screens/CouponDetailScreen';
import WarrantyDetailScreen from '../screens/WarrantyDetailScreen';

export type RootStackParamList = {
  Wallet: undefined;
  CouponDetail: { couponId: string };
  WarrantyDetail: { warrantyId: string };
  AddBenefit: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();

const AppNavigator = (): React.ReactElement => {
  return (
    <NavigationContainer>
      <Stack.Navigator
        id={undefined}
        initialRouteName="Wallet"
        screenOptions={({ navigation }) => ({
          headerTitleAlign: 'center',
          headerBackTitleVisible: true,
          headerLeft: ({ canGoBack, label }) => {
            if (!canGoBack) {
              return null;
            }
            return (
              <Pressable
                style={styles.headerBackButton}
                onPress={() => navigation.goBack()}
                hitSlop={12}
              >
                <Text style={styles.headerBackText}>{label ? `‹ ${label}` : '‹ Back'}</Text>
              </Pressable>
            );
          },
        })}
      >
        <Stack.Screen
          name="Wallet"
          component={BenefitOverviewScreen}
          options={({ navigation }) => ({
            title: 'Wallet',
            headerRight: () => (
              <Pressable
                style={styles.headerButton}
                onPress={() => navigation.navigate('AddBenefit')}
                hitSlop={8}
              >
                <Text style={styles.headerButtonText}>Add</Text>
              </Pressable>
            ),
          })}
        />
        <Stack.Screen
          name="CouponDetail"
          component={CouponDetailScreen}
          options={{ title: 'Coupon Details' }}
        />
        <Stack.Screen
          name="WarrantyDetail"
          component={WarrantyDetailScreen}
          options={{ title: 'Warranty Details' }}
        />
        <Stack.Screen
          name="AddBenefit"
          component={AddBenefitScreen}
          options={{ title: 'Add Benefit' }}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
};

export default AppNavigator;

const styles = StyleSheet.create({
  headerButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
  },
  headerButtonText: {
    color: '#111827',
    fontSize: 15,
    fontWeight: '600',
  },
  headerBackButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
  },
  headerBackText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#111827',
  },
});
