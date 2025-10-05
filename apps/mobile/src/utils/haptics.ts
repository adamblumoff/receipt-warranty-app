import {
  selectionAsync as selectionAsyncOriginal,
  impactAsync as impactAsyncOriginal,
  notificationAsync as notificationAsyncOriginal,
  ImpactFeedbackStyle,
  NotificationFeedbackType,
} from 'expo-haptics';

const selectionAsyncTyped = selectionAsyncOriginal as () => Promise<void>;
const impactAsyncTyped = impactAsyncOriginal as (style: ImpactFeedbackStyle) => Promise<void>;
const notificationAsyncTyped = notificationAsyncOriginal as (
  type: NotificationFeedbackType,
) => Promise<void>;

const triggerSelection = () => {
  void selectionAsyncTyped();
};

const triggerImpactLight = () => {
  void impactAsyncTyped('light' as ImpactFeedbackStyle);
};

const triggerNotificationSuccess = () => {
  void notificationAsyncTyped('success' as NotificationFeedbackType);
};

export { triggerSelection, triggerImpactLight, triggerNotificationSuccess };
