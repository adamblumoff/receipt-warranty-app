import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import type { NativeStackHeaderProps } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import NoFeedbackPressable from './NoFeedbackPressable';

const HEADER_HEIGHT = 44;
const SAFE_AREA_REDUCTION = 55;

const AppHeader = ({ navigation, options, route, back }: NativeStackHeaderProps) => {
  const insets = useSafeAreaInsets();
  const title = options.title ?? route.name;
  const tintColor = options.headerTintColor ?? '#111827';

  const renderLeft = () => {
    if (back) {
      const rawOptionBackTitle: unknown = options.backTitle;
      const backOptionTitle =
        typeof rawOptionBackTitle === 'string' && rawOptionBackTitle.length > 0
          ? rawOptionBackTitle
          : undefined;

      const rawStackTitle: unknown = back.title;
      const backStackTitle =
        typeof rawStackTitle === 'string' && rawStackTitle.length > 0 ? rawStackTitle : undefined;

      const label = backOptionTitle ?? backStackTitle ?? 'Back';

      return (
        <NoFeedbackPressable style={styles.action} hitSlop={8} onPress={() => navigation.goBack()}>
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

  const topInset = insets.top;
  const paddingTop = topInset > SAFE_AREA_REDUCTION ? topInset - SAFE_AREA_REDUCTION : 0;

  return (
    <View style={[styles.container, { paddingTop }]} accessibilityRole="header">
      <View style={styles.content}>
        <View style={styles.side}>{renderLeft()}</View>
        <Text style={[styles.title, { color: tintColor }]} numberOfLines={1}>
          {title}
        </Text>
        <View style={[styles.side, styles.right]}>{renderRight()}</View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#f5f5f5',
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    height: HEADER_HEIGHT,
    paddingHorizontal: 16,
  },
  side: {
    minWidth: 76,
    flexDirection: 'row',
    alignItems: 'center',
  },
  right: {
    justifyContent: 'flex-end',
  },
  action: {
    paddingHorizontal: 8,
    paddingVertical: 6,
  },
  actionPlaceholder: {
    minWidth: 40,
  },
  backText: {
    fontSize: 17,
    fontWeight: '500',
  },
  title: {
    flex: 1,
    textAlign: 'center',
    fontSize: 17,
    fontWeight: '600',
  },
});

export default AppHeader;
