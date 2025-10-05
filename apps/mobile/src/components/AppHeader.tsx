import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import type { NativeStackHeaderProps } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import NoFeedbackPressable from './NoFeedbackPressable';

const AppHeader = ({ navigation, options, route, back }: NativeStackHeaderProps) => {
  const insets = useSafeAreaInsets();
  const title = options.title ?? route.name;
  const tintColor = options.headerTintColor ?? '#111827';

  const renderLeft = () => {
    if (back) {
      /* eslint-disable @typescript-eslint/no-unsafe-assignment */
      const label =
        typeof options.backTitle === 'string'
          ? options.backTitle
          : typeof back.title === 'string' && back.title.length > 0
            ? back.title
            : 'Back';
      /* eslint-enable @typescript-eslint/no-unsafe-assignment */
      return (
        <NoFeedbackPressable onPress={() => navigation.goBack()} style={styles.action} hitSlop={12}>
          <Text style={[styles.backText, { color: tintColor }]}>{`‹ ${label}`}</Text>
        </NoFeedbackPressable>
      );
    }

    if (options.headerLeft) {
      return options.headerLeft({ tintColor });
    }

    return <View style={styles.actionPlaceholder} />;
  };

  const renderRight = () => {
    if (options.headerRight) {
      return options.headerRight({ tintColor });
    }
    return <View style={styles.actionPlaceholder} />;
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.content}>
        <View style={styles.side}>{renderLeft()}</View>
        <Text style={[styles.title, { color: tintColor }]} numberOfLines={1}>
          {title}
        </Text>
        <View style={styles.side}>{renderRight()}</View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#ffffff',
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  side: {
    minWidth: 84,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-start',
  },
  action: {
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 999,
  },
  actionPlaceholder: {
    minWidth: 52,
  },
  backText: {
    fontSize: 16,
    fontWeight: '500',
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    flex: 1,
    textAlign: 'center',
  },
});

export default AppHeader;
