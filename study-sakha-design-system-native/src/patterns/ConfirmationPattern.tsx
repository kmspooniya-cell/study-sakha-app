/**
 * Study Sakha Design System (SSDS v1.0)
 * File: src/patterns/ConfirmationPattern.tsx
 */

import React from 'react';
import { Dialog, DialogVariant } from '../components/overlays/Dialog';

export interface ConfirmationPatternProps {
  open: boolean;
  onCancel: () => void;
  onConfirm: () => void;
  title: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: DialogVariant;
  loading?: boolean;
}

export function ConfirmationPattern({
  open,
  onCancel,
  onConfirm,
  title,
  description,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  variant = 'default',
  loading = false,
}: ConfirmationPatternProps) {
  return (
    <Dialog
      open={open}
      onClose={onCancel}
      title={title}
      description={description}
      variant={variant}
      secondaryAction={{ label: cancelLabel, onPress: onCancel }}
      primaryAction={{ label: confirmLabel, onPress: onConfirm, loading }}
    />
  );
}
