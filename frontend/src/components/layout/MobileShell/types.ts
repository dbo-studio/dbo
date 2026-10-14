import type { IconTypes } from '@/components/base/CustomIcon/types';
import type { MobileScreen, MobileTab } from '@/store/mobileNavStore/types';
import type { JSX } from 'react';

export type RootScreen = () => JSX.Element;

export type PushedScreenProps = {
  params: MobileScreen['params'];
};

export type PushedScreen = (props: PushedScreenProps) => JSX.Element;

export type ScreenStackProps = {
  tab: MobileTab;
  root: RootScreen;
  screens: Record<string, PushedScreen>;
};

export type TabBarItem = {
  id: MobileTab;
  label: string;
  icon: 'database' | 'code' | 'wand_sparkles';
};

export type ConnectionStatus = 'idle' | 'loading' | 'error' | 'connected';

export type ConnectionStatusStyledProps = {
  status: ConnectionStatus;
};

export type TabPaneStyledProps = {
  active: boolean;
};

export type ScreenStackStyledProps = {
  animated: boolean;
};

export type ScreenEmptyStateProps = {
  icon: keyof typeof IconTypes;
  message: string;
  actionLabel?: string;
  onAction?: () => void;
};
