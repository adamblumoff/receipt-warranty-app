import React from 'react';
import {
  TouchableOpacity,
  type TouchableOpacityProps,
  type StyleProp,
  type ViewStyle,
} from 'react-native';

interface NoFeedbackPressableProps extends TouchableOpacityProps {
  style?: StyleProp<ViewStyle> | ((pressed: { pressed: boolean }) => StyleProp<ViewStyle>);
}

const NoFeedbackPressable = ({ style, ...rest }: NoFeedbackPressableProps): React.ReactElement => {
  if (typeof style === 'function') {
    return <TouchableOpacity {...rest} activeOpacity={1} style={style({ pressed: false })} />;
  }

  return <TouchableOpacity {...rest} activeOpacity={1} style={style} />;
};

export default NoFeedbackPressable;
