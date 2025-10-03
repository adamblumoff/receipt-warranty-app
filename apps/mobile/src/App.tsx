import React from 'react';
import { ConvexProvider } from 'convex/react';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import AppNavigator from './navigation/AppNavigator';
import { BenefitsProvider } from './providers/BenefitsProvider';
import { convexClient } from './services/convexClient';

const App = (): React.ReactElement => {
  return (
    <SafeAreaProvider>
      <ConvexProvider client={convexClient}>
        <BenefitsProvider>
          <AppNavigator />
        </BenefitsProvider>
      </ConvexProvider>
    </SafeAreaProvider>
  );
};

export default App;
