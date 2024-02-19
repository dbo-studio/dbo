import React from 'react';

export type ModalProps = {
  open: boolean;
  title?: string;
  children: React.ReactNode;
};

export type ConfirmModalProps = {
  open: boolean;
  title: string;
  onConfirm: () => void;
};
