import React from 'react';
import { Button } from 'react-native';
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
      <Stack.Navigator id={undefined} initialRouteName="Wallet">
        <Stack.Screen
          name="Wallet"
          component={BenefitOverviewScreen}
          options={({ navigation }) => ({
            title: 'Benefit Wallet',
            headerTitleAlign: 'center',
            headerRight: () => (
              <Button title="Add" onPress={() => navigation.navigate('AddBenefit')} />
            ),
          })}
        />
        <Stack.Screen
          name="CouponDetail"
          component={CouponDetailScreen}
          options={{ title: 'Coupon Details', headerTitleAlign: 'center' }}
        />
        <Stack.Screen
          name="WarrantyDetail"
          component={WarrantyDetailScreen}
          options={{ title: 'Warranty Details', headerTitleAlign: 'center' }}
        />
        <Stack.Screen
          name="AddBenefit"
          component={AddBenefitScreen}
          options={{ title: 'Add Benefit', headerTitleAlign: 'center' }}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
};

export default AppNavigator;
