import React from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { X, Square } from 'lucide-react-native';

export interface ExitConfirmModalProps {
  isOpen: boolean;
  isFocusing: boolean;
  isDark: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}

export const ExitConfirmModal: React.FC<ExitConfirmModalProps> = ({
  isOpen,
  isFocusing,
  isDark,
  onCancel,
  onConfirm,
}) => {
  return (
    <Modal
      visible={isOpen}
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={onCancel}
    >
      <View style={styles.exitModalRoot}>
        <Pressable style={styles.exitBackdrop} onPress={onCancel} />
        <View
          style={[
            styles.exitCard,
            {
              backgroundColor: isDark ? '#121824' : '#FFFFFF',
              borderColor: isDark ? '#1E293B' : '#E2E8F0',
            },
          ]}
        >
          <Text style={[styles.exitTitle, { color: isDark ? '#F1F5F9' : '#0F172A' }]}>
            Leave Silent Focus Hall?
          </Text>
          <Text
            style={[styles.exitBody, { color: isDark ? '#94A3B8' : '#64748B' }]}
          >
            {isFocusing
              ? 'Your active focus session will end and your chair will be cleared.'
              : 'You can return to your study seat anytime from the Study Sakha lobby.'}
          </Text>
          <View style={styles.exitBtnRow}>
            <Pressable
              onPress={onCancel}
              style={({ pressed }) => [
                styles.exitSecondaryBtn,
                {
                  borderColor: isDark ? '#334155' : '#E2E8F0',
                  backgroundColor: pressed
                    ? isDark
                      ? '#1E293B'
                      : '#F8FAFC'
                    : 'transparent',
                },
              ]}
            >
              <Text
                style={[
                  styles.exitBtnText,
                  { color: isDark ? '#CBD5E1' : '#334155' },
                ]}
              >
                Stay Here
              </Text>
            </Pressable>
            <Pressable
              onPress={onConfirm}
              style={({ pressed }) => [
                styles.exitDangerBtn,
                { opacity: pressed ? 0.88 : 1 },
              ]}
            >
              <Text style={[styles.exitBtnText, { color: '#FFFFFF' }]}>Leave Hall</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  exitModalRoot: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
  },
  exitBackdrop: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(15, 23, 42, 0.52)',
  },
  exitCard: {
    width: '100%',
    maxWidth: 360,
    borderRadius: 18,
    borderWidth: 1,
    padding: 20,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 10,
  },
  exitTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
  exitBody: {
    fontSize: 14,
    lineHeight: 20,
    marginTop: 6,
  },
  exitBtnRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 20,
  },
  exitSecondaryBtn: {
    flex: 1,
    paddingVertical: 11,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
  },
  exitDangerBtn: {
    flex: 1,
    paddingVertical: 11,
    borderRadius: 12,
    backgroundColor: '#E11D48',
    alignItems: 'center',
  },
  exitBtnText: {
    fontSize: 14,
    fontWeight: '600',
  },
});