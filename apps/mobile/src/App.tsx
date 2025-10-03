import React from 'react';
import { SafeAreaView, StyleSheet, Text } from 'react-native';

export default function App(): React.ReactElement {
  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.title}>Receipt & Warranty Vault</Text>
      <Text>Ready to build the receipt capture flow.</Text>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#ffffff',
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 8,
  },
});
