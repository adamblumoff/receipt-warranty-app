import React from 'react';
import { Button } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import CaptureReceiptScreen from '../screens/CaptureReceiptScreen';
import ReceiptDetailScreen from '../screens/ReceiptDetailScreen';
import ReceiptsListScreen from '../screens/ReceiptsListScreen';

export type RootStackParamList = {
  Receipts: undefined;
  ReceiptDetail: { receiptId: string };
  Capture: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();

const AppNavigator = (): React.ReactElement => {
  return (
    <NavigationContainer>
      <Stack.Navigator id={undefined} initialRouteName="Receipts">
        <Stack.Screen
          name="Receipts"
          component={ReceiptsListScreen}
          options={({ navigation }) => ({
            title: 'Receipts',
            headerTitleAlign: 'center',
            headerRight: () => (
              <Button title="Capture" onPress={() => navigation.navigate('Capture')} />
            ),
          })}
        />
        <Stack.Screen
          name="ReceiptDetail"
          component={ReceiptDetailScreen}
          options={{
            title: 'Receipt Details',
            headerTitleAlign: 'center',
          }}
        />
        <Stack.Screen
          name="Capture"
          component={CaptureReceiptScreen}
          options={{
            title: 'Capture Receipt',
            headerTitleAlign: 'center',
          }}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
};

export default AppNavigator;
