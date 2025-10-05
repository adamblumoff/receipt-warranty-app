import React from 'react';
import { StyleSheet, Text } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import AddBenefitScreen from '../screens/AddBenefitScreen';
import BenefitOverviewScreen from '../screens/BenefitOverviewScreen';
import CouponDetailScreen from '../screens/CouponDetailScreen';
import WarrantyDetailScreen from '../screens/WarrantyDetailScreen';
import NoFeedbackPressable from '../components/NoFeedbackPressable';
import AppHeader from '../components/AppHeader';

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
        screenOptions={{
          header: (props) => <AppHeader {...props} />,
          headerTitleAlign: 'center',
          headerStyle: styles.header,
          headerShadowVisible: false,
        }}
      >
        <Stack.Screen
          name="Wallet"
          component={BenefitOverviewScreen}
          options={({ navigation }) => ({
            title: 'Wallet',
            headerRight: () => (
              <NoFeedbackPressable
                style={styles.headerButton}
                onPress={() => navigation.navigate('AddBenefit')}
                hitSlop={8}
              >
                <Text style={styles.headerButtonText}>Add</Text>
              </NoFeedbackPressable>
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
  header: {
    backgroundColor: '#f5f5f5',
  },
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
});
