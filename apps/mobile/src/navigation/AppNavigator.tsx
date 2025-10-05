import React from 'react';
import { Alert, StyleSheet, Text } from 'react-native';
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
import { triggerSelection } from '../utils/haptics';

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
    triggerSelection();

    const navigateTo = (params?: RootStackParamList['AddBenefit']) => {
      navigation.navigate('AddBenefit', params);
    };

    const showCaptureOptions = (initialMode: 'coupon' | 'warranty') => {
      const captureOptions = [
        {
          text: 'Scan with camera',
          onPress: () => navigateTo({ initialMode, autoScanSource: 'camera' }),
        },
        {
          text: 'Import from photos',
          onPress: () => navigateTo({ initialMode, autoScanSource: 'library' }),
        },
        {
          text: 'Manual entry',
          onPress: () => navigateTo({ initialMode }),
        },
        { text: 'Cancel', style: 'cancel' },
      ];

      Alert.alert(
        initialMode === 'coupon' ? 'Add coupon' : 'Add warranty',
        'Choose how you want to capture this benefit.',
        captureOptions,
      );
    };

    Alert.alert('Add benefit', 'What type of benefit are you adding?', [
      {
        text: 'Coupon',
        onPress: () => showCaptureOptions('coupon'),
      },
      {
        text: 'Warranty',
        onPress: () => showCaptureOptions('warranty'),
      },
      {
        text: 'Cancel',
        style: 'cancel',
      },
    ]);
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
