import React from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import AppNavigator from './navigation/AppNavigator';
import { ReceiptsProvider } from './providers/ReceiptsProvider';

const App = (): React.ReactElement => {
  return (
    <SafeAreaProvider>
      <ReceiptsProvider>
        <AppNavigator />
      </ReceiptsProvider>
    </SafeAreaProvider>
  );
};

export default App;
