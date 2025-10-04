import React from 'react';
import { ConvexProvider } from 'convex/react';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
import { View } from 'react-native';
import { StatusBar } from 'expo-status-bar';

import AppNavigator from './navigation/AppNavigator';
import { BenefitsProvider } from './providers/BenefitsProvider';
import { convexClient } from './services/convexClient';

const StatusBarOverlay = (): React.ReactElement => {
  const insets = useSafeAreaInsets();
  return <View style={{ height: insets.top, backgroundColor: '#000', width: '100%' }} />;
};

const AppContent = (): React.ReactElement => {
  return (
    <>
      <StatusBar style="light" backgroundColor="#000" />
      <StatusBarOverlay />
      <ConvexProvider client={convexClient}>
        <BenefitsProvider>
          <AppNavigator />
        </BenefitsProvider>
      </ConvexProvider>
    </>
  );
};

const App = (): React.ReactElement => {
  return (
    <SafeAreaProvider>
      <AppContent />
    </SafeAreaProvider>
  );
};

export default App;
