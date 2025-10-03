import React from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import AppNavigator from './navigation/AppNavigator';
import { BenefitsProvider } from './providers/BenefitsProvider';

const App = (): React.ReactElement => {
  return (
    <SafeAreaProvider>
      <BenefitsProvider>
        <AppNavigator />
      </BenefitsProvider>
    </SafeAreaProvider>
  );
};

export default App;
