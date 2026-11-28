import React from 'react';
import { View, type StyleProp, type ViewProps, type ViewStyle } from 'react-native';
import { useSSDSTheme } from './ssdsThemeBridge';
import type { SpacingTokens } from '../study-sakha-design-system-native/src/theme/tokens/spacing';

export {
  SSDSThemeBridgeProvider,
  SSDSThemeProvider,
  useSSDSTheme,
} from './ssdsThemeBridge';

export {
  Text as SSDSText,
  type TextProps as SSDSTextProps,
} from '../study-sakha-design-system-native/src/components/foundation/Text';
export {
  Icon as SSDSIcon,
  type IconProps as SSDSIconProps,
} from '../study-sakha-design-system-native/src/components/foundation/Icon';
export {
  Divider as SSDSDivider,
  type DividerOrientation as SSDSDividerOrientation,
  type DividerProps as SSDSDividerProps,
  type DividerVariant as SSDSDividerVariant,
} from '../study-sakha-design-system-native/src/components/foundation/Divider';
export {
  Surface as SSDSSurface,
  type SurfaceProps as SSDSSurfaceProps,
  type SurfaceVariant as SSDSSurfaceVariant,
} from '../study-sakha-design-system-native/src/components/foundation/Surface';
export {
  Spacer as SSDSSpacer,
  type SpacerProps as SSDSSpacerProps,
} from '../study-sakha-design-system-native/src/components/foundation/Spacer';

export {
  BaseCard as SSDSBaseCard,
  BaseCard as SSDSCard,
  type BaseCardProps as SSDSBaseCardProps,
  type BaseCardProps as SSDSCardProps,
} from '../study-sakha-design-system-native/src/components/cards/BaseCard';

export {
  ScreenContainer as SSDSScreenContainer,
  type ScreenContainerProps as SSDSScreenContainerProps,
} from '../study-sakha-design-system-native/src/components/layout/ScreenContainer';
export {
  SectionContainer as SSDSSectionContainer,
  type SectionContainerProps as SSDSSectionContainerProps,
} from '../study-sakha-design-system-native/src/components/layout/SectionContainer';
export {
  SectionHeader as SSDSSectionHeader,
  type SectionHeaderProps as SSDSSectionHeaderProps,
} from '../study-sakha-design-system-native/src/components/layout/SectionHeader';
export {
  PageLayout as SSDSPageLayout,
  type PageLayoutProps as SSDSPageLayoutProps,
} from '../study-sakha-design-system-native/src/components/layout/PageLayout';

// Phase 3: Buttons
export {
  Button as SSDSButton,
  type ButtonProps as SSDSButtonProps,
  type ButtonSize as SSDSButtonSize,
  type ButtonVariant as SSDSButtonVariant,
} from '../study-sakha-design-system-native/src/components/buttons/Button';
export {
  IconButton as SSDSIconButton,
  type IconButtonProps as SSDSIconButtonProps,
  type IconButtonSize as SSDSIconButtonSize,
  type IconButtonVariant as SSDSIconButtonVariant,
} from '../study-sakha-design-system-native/src/components/buttons/IconButton';

// Phase 3: Forms & Selection
export {
  TextInput as SSDSTextInput,
  type SSDSInputType,
  type TextInputProps as SSDSTextInputProps,
} from '../study-sakha-design-system-native/src/components/forms/TextInput';
export {
  SearchInput as SSDSSearchInput,
  type SearchInputProps as SSDSSearchInputProps,
} from '../study-sakha-design-system-native/src/components/forms/SearchInput';
export {
  Checkbox as SSDSCheckbox,
  type CheckboxProps as SSDSCheckboxProps,
} from '../study-sakha-design-system-native/src/components/forms/Checkbox';
export {
  Radio as SSDSRadio,
  type RadioProps as SSDSRadioProps,
} from '../study-sakha-design-system-native/src/components/forms/Radio';
export {
  Switch as SSDSSwitch,
  type SwitchProps as SSDSSwitchProps,
} from '../study-sakha-design-system-native/src/components/forms/Switch';
export {
  Slider as SSDSSlider,
  type SliderProps as SSDSSliderProps,
} from '../study-sakha-design-system-native/src/components/forms/Slider';
export {
  Select as SSDSSelect,
  type SelectOption as SSDSSelectOption,
  type SelectProps as SSDSSelectProps,
} from '../study-sakha-design-system-native/src/components/forms/Select';
export {
  SegmentedControl as SSDSSegmentedControl,
  type SegmentedControlProps as SSDSSegmentedControlProps,
  type SegmentedOption as SSDSSegmentedOption,
} from '../study-sakha-design-system-native/src/components/forms/SegmentedControl';

// Phase 3: Feedback & Progress
export {
  Badge as SSDSBadge,
  type BadgeProps as SSDSBadgeProps,
  type BadgeSize as SSDSBadgeSize,
  type BadgeVariant as SSDSBadgeVariant,
} from '../study-sakha-design-system-native/src/components/feedback/Badge';
export {
  ProgressBar as SSDSProgressBar,
  type ProgressBarProps as SSDSProgressBarProps,
} from '../study-sakha-design-system-native/src/components/data-display/ProgressBar';
export {
  CircularProgress as SSDSCircularProgress,
  type CircularProgressProps as SSDSCircularProgressProps,
} from '../study-sakha-design-system-native/src/components/data-display/CircularProgress';
export {
  Toast as SSDSToast,
  type ToastProps as SSDSToastProps,
  type ToastType as SSDSToastType,
} from '../study-sakha-design-system-native/src/components/feedback/Toast';
export {
  Snackbar as SSDSSnackbar,
  type SnackbarProps as SSDSSnackbarProps,
} from '../study-sakha-design-system-native/src/components/feedback/Snackbar';

// Phase 3: Overlays
export {
  Dialog as SSDSDialog,
  type DialogAction as SSDSDialogAction,
  type DialogProps as SSDSDialogProps,
  type DialogVariant as SSDSDialogVariant,
} from '../study-sakha-design-system-native/src/components/overlays/Dialog';
export {
  BottomSheet as SSDSBottomSheet,
  type BottomSheetProps as SSDSBottomSheetProps,
} from '../study-sakha-design-system-native/src/components/overlays/BottomSheet';

// Phase 4: Layout, Headers & Feedback States
export {
  ScreenHeader as SSDSScreenHeader,
  type ScreenHeaderProps as SSDSScreenHeaderProps,
} from '../study-sakha-design-system-native/src/components/layout/ScreenHeader';
export {
  EmptyState as SSDSEmptyState,
  type EmptyStateAction as SSDSEmptyStateAction,
  type EmptyStateProps as SSDSEmptyStateProps,
} from '../study-sakha-design-system-native/src/components/feedback/EmptyState';
export {
  ErrorState as SSDSErrorState,
  type ErrorStateProps as SSDSErrorStateProps,
} from '../study-sakha-design-system-native/src/components/feedback/ErrorState';
export {
  Skeleton as SSDSSkeleton,
  type SkeletonProps as SSDSSkeletonProps,
} from '../study-sakha-design-system-native/src/components/feedback/Skeleton';

// Phase 4: Navigation
export {
  TabBar as SSDSTabBar,
  TabBar as SSDSTabs,
  type TabBarItem as SSDSTabBarItem,
  type TabBarProps as SSDSTabBarProps,
} from '../study-sakha-design-system-native/src/components/navigation/TabBar';
export {
  AppHeader as SSDSAppHeader,
  type AppHeaderProps as SSDSAppHeaderProps,
} from '../study-sakha-design-system-native/src/components/navigation/AppHeader';
export {
  BottomBar as SSDSBottomBar,
  type BottomBarItem as SSDSBottomBarItem,
  type BottomBarProps as SSDSBottomBarProps,
} from '../study-sakha-design-system-native/src/components/navigation/BottomBar';

// Phase 4: Data Display, Cards & Media
export {
  ListItem as SSDSListItem,
  type ListItemProps as SSDSListItemProps,
} from '../study-sakha-design-system-native/src/components/data-display/ListItem';
export {
  StatItem as SSDSStatItem,
  type StatItemProps as SSDSStatItemProps,
} from '../study-sakha-design-system-native/src/components/data-display/StatItem';
export {
  StatisticCard as SSDSStatisticCard,
  type StatisticCardProps as SSDSStatisticCardProps,
} from '../study-sakha-design-system-native/src/components/cards/StatisticCard';
export {
  ProgressCard as SSDSProgressCard,
  type ProgressCardBadge as SSDSProgressCardBadge,
  type ProgressCardProps as SSDSProgressCardProps,
} from '../study-sakha-design-system-native/src/components/cards/ProgressCard';
export {
  FeatureCard as SSDSFeatureCard,
  type FeatureCardBadge as SSDSFeatureCardBadge,
  type FeatureCardProps as SSDSFeatureCardProps,
} from '../study-sakha-design-system-native/src/components/cards/FeatureCard';
export {
  Avatar as SSDSAvatar,
  type AvatarProps as SSDSAvatarProps,
  type AvatarStatus as SSDSAvatarStatus,
  type AvatarVariant as SSDSAvatarVariant,
} from '../study-sakha-design-system-native/src/components/media/Avatar';
export {
  Thumbnail as SSDSThumbnail,
  type ThumbnailProps as SSDSThumbnailProps,
} from '../study-sakha-design-system-native/src/components/media/Thumbnail';
export {
  ImagePlaceholder as SSDSImagePlaceholder,
  type ImagePlaceholderProps as SSDSImagePlaceholderProps,
} from '../study-sakha-design-system-native/src/components/media/ImagePlaceholder';

// Phase 4: Additional Reusable Overlays & Floating Action
export {
  ActionMenu as SSDSActionMenu,
  type ActionMenuItem as SSDSActionMenuItem,
  type ActionMenuProps as SSDSActionMenuProps,
} from '../study-sakha-design-system-native/src/components/overlays/ActionMenu';
export {
  FloatingButton as SSDSFloatingButton,
  type FloatingButtonProps as SSDSFloatingButtonProps,
} from '../study-sakha-design-system-native/src/components/buttons/FloatingButton';

// Phase 5: Patterns
export {
  SearchFilterPattern as SSDSSearchFilterPattern,
  type SearchFilterPatternProps as SSDSSearchFilterPatternProps,
} from '../study-sakha-design-system-native/src/patterns/SearchFilterPattern';
export {
  SectionPattern as SSDSSectionPattern,
  type SectionPatternProps as SSDSSectionPatternProps,
} from '../study-sakha-design-system-native/src/patterns/SectionPattern';
export {
  EmptyContentPattern as SSDSEmptyContentPattern,
  type EmptyContentPatternProps as SSDSEmptyContentPatternProps,
} from '../study-sakha-design-system-native/src/patterns/EmptyContentPattern';
export {
  ConfirmationPattern as SSDSConfirmationPattern,
  type ConfirmationPatternProps as SSDSConfirmationPatternProps,
} from '../study-sakha-design-system-native/src/patterns/ConfirmationPattern';

// Phase 5: Screen Templates
export {
  StandardScreen as SSDSStandardScreen,
  type StandardScreenProps as SSDSStandardScreenProps,
} from '../study-sakha-design-system-native/src/templates/StandardScreen';
export {
  ListingScreen as SSDSListingScreen,
  type ListingScreenProps as SSDSListingScreenProps,
} from '../study-sakha-design-system-native/src/templates/ListingScreen';
export {
  DetailScreen as SSDSDetailScreen,
  type DetailScreenProps as SSDSDetailScreenProps,
} from '../study-sakha-design-system-native/src/templates/DetailScreen';
export {
  FormScreen as SSDSFormScreen,
  type FormScreenProps as SSDSFormScreenProps,
} from '../study-sakha-design-system-native/src/templates/FormScreen';

export interface SSDSStackProps extends ViewProps {
  direction?: 'column' | 'row';
  gap?: keyof SpacingTokens | number;
  align?: ViewStyle['alignItems'];
  justify?: ViewStyle['justifyContent'];
  wrap?: ViewStyle['flexWrap'];
  style?: StyleProp<ViewStyle>;
  children?: React.ReactNode;
}

export function SSDSStack({
  direction = 'column',
  gap = 12,
  align,
  justify,
  wrap,
  style,
  children,
  ...rest
}: SSDSStackProps) {
  const { tokens } = useSSDSTheme();
  const resolvedGap =
    typeof gap === 'number'
      ? (tokens.spacing[gap as keyof SpacingTokens] ?? gap)
      : tokens.spacing[gap];

  return React.createElement(
    View,
    {
      ...rest,
      style: [
        {
          flexDirection: direction,
          gap: resolvedGap,
          alignItems: align,
          justifyContent: justify,
          flexWrap: wrap,
        },
        style,
      ],
    },
    children,
  );
}

export function SSDSRow(props: Omit<SSDSStackProps, 'direction'>) {
  return React.createElement(SSDSStack, { align: 'center', ...props, direction: 'row' });
}

export function SSDSColumn(props: Omit<SSDSStackProps, 'direction'>) {
  return React.createElement(SSDSStack, { ...props, direction: 'column' });
}
