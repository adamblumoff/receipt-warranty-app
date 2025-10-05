import React from 'react';
import { Alert, Platform, StyleSheet, Text } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import type { NativeStackHeaderProps } from '@react-navigation/native-stack';

import AddBenefitScreen from '../screens/AddBenefitScreen';
import BenefitOverviewScreen from '../screens/BenefitOverviewScreen';
import CouponDetailScreen from '../screens/CouponDetailScreen';
import WarrantyDetailScreen from '../screens/WarrantyDetailScreen';
import NoFeedbackPressable from '../components/NoFeedbackPressable';
import AppHeader from '../components/AppHeader';
import { CANVAS_COLOR, TEXT_PRIMARY } from '../theme/colors';

export type RootStackParamList = {
  Wallet: undefined;
  CouponDetail: { couponId: string };
  WarrantyDetail: { warrantyId: string };
  AddBenefit:
    | { initialMode?: 'coupon' | 'warranty'; autoScanSource?: 'library' | 'camera' }
    | undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();

const AppNavigator = (): React.ReactElement => {
  const handleAddPressed = (navigation: NativeStackHeaderProps['navigation']) => {
    const navigateTo = (params?: RootStackParamList['AddBenefit']) => {
      navigation.navigate('AddBenefit', params);
    };

    const options = [
      {
        text: 'Scan coupon (camera)',
        onPress: () => navigateTo({ initialMode: 'coupon', autoScanSource: 'camera' }),
      },
      {
        text: 'Scan warranty (camera)',
        onPress: () => navigateTo({ initialMode: 'warranty', autoScanSource: 'camera' }),
      },
      {
        text: 'Import from photos',
        onPress: () => navigateTo({ autoScanSource: 'library' }),
      },
      {
        text: 'Manual entry',
        onPress: () => navigateTo({}),
      },
      { text: 'Cancel', style: 'cancel' },
    ];

    if (Platform.OS === 'android') {
      Alert.alert('Add benefit', 'Choose how you want to capture a benefit.', options);
    } else {
      Alert.alert('Add benefit', undefined, options);
    }
  };

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
                onPress={() => handleAddPressed(navigation)}
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
    backgroundColor: CANVAS_COLOR,
  },
  headerButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
  },
  headerButtonText: {
    color: TEXT_PRIMARY,
    fontSize: 15,
    fontWeight: '600',
  },
});
