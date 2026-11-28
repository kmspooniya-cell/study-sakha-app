import Ionicons from '@expo/vector-icons/Ionicons';
import React, { useCallback, useRef, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  cleanupTemporaryScreenshot,
  createClientRequestId,
  FEEDBACK_CATEGORY_OPTIONS,
  FeedbackCategory,
  FeedbackScreenshotAsset,
  FeedbackSubmissionError,
  IDEA_CATEGORIES,
  ISSUE_SUBCATEGORIES,
  MAX_FEEDBACK_MESSAGE_LENGTH,
  MAX_REPRO_STEPS_LENGTH,
  pickFeedbackScreenshot,
  submitFeedback,
} from '../lib/feedback';
import { useTheme } from '../lib/theme';
import { Txt } from './ui';

export interface HelpFeedbackModalProps {
  visible: boolean;
  onClose: () => void;
  routeName?: string;
  initialCategory?: FeedbackCategory;
  initialStep?: 1 | 2 | 3;
}

export function HelpFeedbackModal(props: HelpFeedbackModalProps) {
  if (!props.visible) return null;
  return <HelpFeedbackModalInner {...props} />;
}

function HelpFeedbackModalInner({
  visible,
  onClose,
  routeName,
  initialCategory = 'report_issue',
  initialStep = 1,
}: HelpFeedbackModalProps) {
  const { scheme, colors } = useTheme();
  const insets = useSafeAreaInsets();

  const [step, setStep] = useState<1 | 2 | 3>(initialStep);
  const [category, setCategory] = useState<FeedbackCategory>(initialCategory);
  const [issueSubCategory, setIssueSubCategory] = useState<string>(ISSUE_SUBCATEGORIES[0]);
  const [ideaSubCategory, setIdeaSubCategory] = useState<string>(IDEA_CATEGORIES[0]);
  const [shareLogs, setShareLogs] = useState(false);
  const [includeScreenshot, setIncludeScreenshot] = useState(false);
  const [screenshotAsset, setScreenshotAsset] = useState<FeedbackScreenshotAsset | null>(null);
  const [pickingScreenshot, setPickingScreenshot] = useState(false);
  const [message, setMessage] = useState('');
  const [reproductionSteps, setReproductionSteps] = useState('');
  const [validationError, setValidationError] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submittedId, setSubmittedId] = useState<string | null>(null);

  const submittingRef = useRef(false);
  const clientRequestIdRef = useRef<string>(createClientRequestId());

  const resetForm = useCallback(() => {
    setStep(initialStep);
    setCategory(initialCategory);
    setIssueSubCategory(ISSUE_SUBCATEGORIES[0]);
    setIdeaSubCategory(IDEA_CATEGORIES[0]);
    setShareLogs(false);
    setIncludeScreenshot(false);
    setScreenshotAsset(null);
    setPickingScreenshot(false);
    setMessage('');
    setReproductionSteps('');
    setValidationError(null);
    setSubmitError(null);
    setSubmitting(false);
    setSubmittedId(null);
    submittingRef.current = false;
    clientRequestIdRef.current = createClientRequestId();
  }, [initialCategory, initialStep]);

  const handleClose = useCallback(() => {
    if (submittingRef.current) return;
    if (!submittedId && screenshotAsset?.uri) {
      void cleanupTemporaryScreenshot(screenshotAsset.uri);
    }
    resetForm();
    onClose();
  }, [onClose, resetForm, screenshotAsset, submittedId]);

  const handleRequestClose = useCallback(() => {
    if (submittingRef.current) return;
    if (submittedId) {
      handleClose();
      return;
    }
    if (step === 3) {
      setValidationError(null);
      setSubmitError(null);
      setStep(category === 'appreciate_team' ? 1 : 2);
      return;
    }
    if (step === 2) {
      setValidationError(null);
      setSubmitError(null);
      setStep(1);
      return;
    }
    handleClose();
  }, [category, handleClose, step, submittedId]);

  const handleToggleScreenshot = useCallback(async () => {
    if (submittingRef.current || pickingScreenshot) return;
    setValidationError(null);
    setSubmitError(null);

    if (includeScreenshot) {
      setIncludeScreenshot(false);
      if (screenshotAsset?.uri) {
        void cleanupTemporaryScreenshot(screenshotAsset.uri);
      }
      setScreenshotAsset(null);
      return;
    }

    setPickingScreenshot(true);
    try {
      const picked = await pickFeedbackScreenshot();
      if (picked) {
        setIncludeScreenshot(true);
        setScreenshotAsset(picked);
      } else {
        setIncludeScreenshot(false);
        setScreenshotAsset(null);
      }
    } catch (error) {
      setIncludeScreenshot(false);
      setScreenshotAsset(null);
      setSubmitError(
        error instanceof Error ? error.message : 'Unable to select screenshot.'
      );
    } finally {
      setPickingScreenshot(false);
    }
  }, [includeScreenshot, pickingScreenshot, screenshotAsset]);

  const performSubmit = useCallback(async () => {
    if (submittingRef.current) return;
    setValidationError(null);
    setSubmitError(null);

    const trimmed = message.trim();
    if (!trimmed) {
      setValidationError('Please enter a message before submitting.');
      return;
    }
    if (includeScreenshot && !screenshotAsset) {
      setValidationError('Please attach a screenshot or uncheck Include Screenshot.');
      return;
    }

    submittingRef.current = true;
    setSubmitting(true);

    try {
      const activeSubCategory =
        category === 'report_issue'
          ? issueSubCategory
          : category === 'share_idea'
            ? ideaSubCategory
            : undefined;

      const result = await submitFeedback({
        category,
        subCategory: activeSubCategory,
        message: trimmed,
        reproductionSteps: category === 'report_issue' ? reproductionSteps : undefined,
        shareLogs: category === 'report_issue' ? shareLogs : false,
        includeScreenshot: category === 'report_issue' ? includeScreenshot : false,
        screenshotAsset: category === 'report_issue' && includeScreenshot ? screenshotAsset : null,
        routeName,
        clientRequestId: clientRequestIdRef.current,
      });

      setSubmittedId(result.id);
    } catch (error) {
      const errMsg =
        error instanceof FeedbackSubmissionError
          ? error.message
          : error instanceof Error
            ? error.message
            : 'Unable to submit feedback. Please try again.';
      setSubmitError(errMsg);
    } finally {
      submittingRef.current = false;
      setSubmitting(false);
    }
  }, [
    category,
    ideaSubCategory,
    includeScreenshot,
    issueSubCategory,
    message,
    reproductionSteps,
    routeName,
    screenshotAsset,
    shareLogs,
  ]);

  const handleContinue = useCallback(() => {
    if (submittingRef.current) return;
    setValidationError(null);
    setSubmitError(null);

    if (step === 1) {
      if (category === 'appreciate_team') {
        setStep(3);
      } else {
        setStep(2);
      }
      return;
    }

    if (step === 2) {
      setStep(3);
      return;
    }

    void performSubmit();
  }, [category, performSubmit, step]);

  const categoryOption = FEEDBACK_CATEGORY_OPTIONS.find((item) => item.id === category);
  const selectedSubLabel =
    category === 'report_issue'
      ? issueSubCategory
      : category === 'share_idea'
        ? ideaSubCategory
        : null;

  const step3Title =
    category === 'report_issue'
      ? 'Tell us more about the issue'
      : category === 'share_idea'
        ? 'What would you like to see in Study Sakha?'
        : 'Share your appreciation with the team';

  const step3Placeholder =
    category === 'report_issue'
      ? 'Describe what happened and what you expected...'
      : category === 'share_idea'
        ? 'Describe your idea and how it helps your preparation...'
        : 'Tell us what you love about Study Sakha...';

  const submitButtonLabel =
    category === 'report_issue'
      ? 'Submit issue'
      : category === 'share_idea'
        ? 'Submit idea'
        : 'Send appreciation';

  const cardBg = scheme === 'dark' ? '#1E2024' : colors.surfaceAlt;

  return (
    <Modal
      animationType="fade"
      transparent
      statusBarTranslucent
      visible={visible}
      onRequestClose={handleRequestClose}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.75)', justifyContent: 'flex-end' }}
      >
        <View
          testID="help-feedback-modal"
          style={{
            width: '100%',
            borderTopLeftRadius: 24,
            borderTopRightRadius: 24,
            padding: 24,
            paddingBottom: Math.max(24, insets.bottom + 12),
            borderWidth: 1,
            borderBottomWidth: 0,
            backgroundColor: scheme === 'dark' ? '#141416' : colors.surface,
            borderColor: colors.border,
            maxHeight: '88%',
          }}
        >
          {/* Modal Header with Back & Close */}
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
            {step > 1 && !submittedId ? (
              <Pressable
                onPress={handleRequestClose}
                disabled={submitting}
                hitSlop={10}
                accessibilityRole="button"
                accessibilityLabel="Back"
                testID="help-modal-back"
              >
                <Ionicons name="arrow-back" size={22} color={colors.text} />
              </Pressable>
            ) : (
              <View />
            )}
            <Pressable
              onPress={handleClose}
              disabled={submitting}
              hitSlop={10}
              accessibilityRole="button"
              accessibilityLabel="Close"
              testID="help-modal-close"
            >
              <Ionicons name="close" size={22} color={colors.textMuted} />
            </Pressable>
          </View>

          {/* SUCCESS CONFIRMATION */}
          {submittedId ? (
            <View testID="help-feedback-success" style={{ alignItems: 'center', paddingVertical: 16, gap: 12 }}>
              <View
                style={{
                  width: 56,
                  height: 56,
                  borderRadius: 28,
                  backgroundColor: 'rgba(52, 199, 89, 0.16)',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Ionicons name="checkmark-circle" size={34} color="#34C759" />
              </View>
              <Txt size={20} weight="800" color={colors.text} style={{ textAlign: 'center' }}>
                Submitted successfully
              </Txt>
              <Txt size={13.5} color={colors.textMuted} style={{ textAlign: 'center', lineHeight: 20 }}>
                Thank you for helping improve Study Sakha. Our team has received your{' '}
                {categoryOption?.label.toLowerCase() ?? 'feedback'}.
              </Txt>
              <View
                style={{
                  paddingHorizontal: 14,
                  paddingVertical: 10,
                  borderRadius: 12,
                  backgroundColor: cardBg,
                  borderWidth: 1,
                  borderColor: colors.border,
                  width: '100%',
                  alignItems: 'center',
                  gap: 2,
                }}
              >
                <Txt size={11} color={colors.textMuted} weight="600">
                  Reference ID
                </Txt>
              <View testID="help-feedback-reference-id">
                <Txt size={12.5} color={colors.text} weight="700">
                  {submittedId}
                </Txt>
              </View>
              </View>
              <Pressable
                onPress={handleClose}
                testID="help-feedback-done"
                style={{
                  marginTop: 8,
                  width: '100%',
                  height: 48,
                  borderRadius: 24,
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: colors.blue,
                }}
              >
                <Txt size={15} color="#FFFFFF" weight="800">
                  Done
                </Txt>
              </Pressable>
            </View>
          ) : (
            <>
              {/* STEP 1: Main Category Selection */}
              {step === 1 && (
                <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ gap: 12, paddingBottom: 14 }}>
                  <View style={{ gap: 4, marginBottom: 6 }}>
                    <Txt size={14} color={colors.textMuted} weight="600">
                      Hey,
                    </Txt>
                    <Txt size={22} color={colors.text} weight="800">
                      How can we help you?
                    </Txt>
                  </View>

                  {FEEDBACK_CATEGORY_OPTIONS.map((opt) => {
                    const isSelected = category === opt.id;
                    return (
                      <View
                        key={opt.id}
                        style={{
                          borderRadius: 16,
                          borderWidth: 1.5,
                          padding: 16,
                          backgroundColor: cardBg,
                          borderColor: isSelected ? '#34C759' : colors.border,
                          gap: 12,
                        }}
                      >
                        <Pressable
                          onPress={() => {
                            setCategory(opt.id);
                            setValidationError(null);
                            setSubmitError(null);
                          }}
                          testID={`help-category-${opt.id}`}
                          accessibilityRole="radio"
                          accessibilityState={{ selected: isSelected }}
                          style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}
                        >
                          <View style={{ flex: 1, gap: 2 }}>
                            <Txt size={15} color={colors.text} weight="700">
                              {opt.label}
                            </Txt>
                            <Txt size={12} color={colors.textMuted}>
                              {opt.description}
                            </Txt>
                          </View>
                          <View
                            style={{
                              width: 20,
                              height: 20,
                              borderRadius: 10,
                              borderWidth: 2,
                              alignItems: 'center',
                              justifyContent: 'center',
                              borderColor: isSelected ? '#34C759' : colors.textMuted,
                            }}
                          >
                            {isSelected && (
                              <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: '#34C759' }} />
                            )}
                          </View>
                        </Pressable>

                        {/* Optional attachments for Report an issue (explicit opt-in) */}
                        {isSelected && opt.id === 'report_issue' && (
                          <View style={{ gap: 10, paddingTop: 10, borderTopWidth: 1, borderTopColor: colors.borderSubtle }}>
                            <Pressable
                              onPress={() => setShareLogs((prev) => !prev)}
                              testID="help-share-logs-checkbox"
                              accessibilityRole="checkbox"
                              accessibilityState={{ checked: shareLogs }}
                              style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}
                            >
                              <View
                                style={{
                                  width: 18,
                                  height: 18,
                                  borderRadius: 4,
                                  backgroundColor: shareLogs ? '#34C759' : 'transparent',
                                  borderWidth: 2,
                                  borderColor: shareLogs ? '#34C759' : colors.textMuted,
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                }}
                              >
                                {shareLogs && <Ionicons name="checkmark" size={12} color="#FFF" />}
                              </View>
                              <Txt size={13} color={colors.text} style={{ flex: 1 }}>
                                Share logs to help us debug the issue (tokens & keys redacted)
                              </Txt>
                            </Pressable>

                            <Pressable
                              onPress={() => void handleToggleScreenshot()}
                              testID="help-include-screenshot-checkbox"
                              accessibilityRole="checkbox"
                              accessibilityState={{ checked: includeScreenshot }}
                              style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}
                            >
                              <View
                                style={{
                                  width: 18,
                                  height: 18,
                                  borderRadius: 4,
                                  backgroundColor: includeScreenshot ? '#34C759' : 'transparent',
                                  borderWidth: 2,
                                  borderColor: includeScreenshot ? '#34C759' : colors.textMuted,
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                }}
                              >
                                {includeScreenshot && <Ionicons name="checkmark" size={12} color="#FFF" />}
                              </View>
                              <Txt size={13} color={colors.text} style={{ flex: 1 }}>
                                {pickingScreenshot
                                  ? 'Selecting screenshot...'
                                  : screenshotAsset
                                    ? `Screenshot attached: ${screenshotAsset.fileName || 'image'}`
                                    : 'Include Screenshot'}
                              </Txt>
                            </Pressable>
                          </View>
                        )}
                      </View>
                    );
                  })}
                </ScrollView>
              )}

              {/* STEP 2: Sub-category selection (Report an issue OR Share an idea) */}
              {step === 2 && (
                <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ gap: 10, paddingBottom: 14 }}>
                  <Txt size={21} color={colors.text} weight="800" style={{ marginBottom: 6 }}>
                    {category === 'report_issue'
                      ? 'What issue are you facing?'
                      : 'Which area is your idea for?'}
                  </Txt>

                  {(category === 'report_issue' ? ISSUE_SUBCATEGORIES : IDEA_CATEGORIES).map((sub) => {
                    const current = category === 'report_issue' ? issueSubCategory : ideaSubCategory;
                    const isSelected = current === sub;
                    return (
                      <Pressable
                        key={sub}
                        onPress={() => {
                          if (category === 'report_issue') setIssueSubCategory(sub);
                          else setIdeaSubCategory(sub);
                        }}
                        testID={`help-subcategory-${sub}`}
                        accessibilityRole="radio"
                        accessibilityState={{ selected: isSelected }}
                        style={{
                          flexDirection: 'row',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          paddingVertical: 15,
                          paddingHorizontal: 16,
                          borderRadius: 16,
                          borderWidth: 1.5,
                          backgroundColor: cardBg,
                          borderColor: isSelected ? '#34C759' : colors.border,
                        }}
                      >
                        <Txt size={14.5} color={colors.text} weight="700">
                          {sub}
                        </Txt>
                        <View
                          style={{
                            width: 20,
                            height: 20,
                            borderRadius: 10,
                            borderWidth: 2,
                            alignItems: 'center',
                            justifyContent: 'center',
                            borderColor: isSelected ? '#34C759' : colors.textMuted,
                          }}
                        >
                          {isSelected && (
                            <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: '#34C759' }} />
                          )}
                        </View>
                      </Pressable>
                    );
                  })}
                </ScrollView>
              )}

              {/* STEP 3: Message Input, Optional Reproduction Steps & Submit */}
              {step === 3 && (
                <ScrollView
                  showsVerticalScrollIndicator={false}
                  keyboardShouldPersistTaps="handled"
                  contentContainerStyle={{ gap: 12, paddingBottom: 14 }}
                >
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
                    <View
                      testID="help-selected-category-badge"
                      style={{
                        paddingHorizontal: 10,
                        paddingVertical: 4,
                        borderRadius: 999,
                        backgroundColor: cardBg,
                        borderWidth: 1,
                        borderColor: colors.border,
                      }}
                    >
                      <Txt size={11.5} weight="700" color={colors.textMuted}>
                        {categoryOption?.label}
                        {selectedSubLabel ? ` • ${selectedSubLabel}` : ''}
                      </Txt>
                    </View>
                  </View>

                  <Txt size={21} color={colors.text} weight="800">
                    {step3Title}
                  </Txt>

                  <View
                    style={{
                      borderRadius: 16,
                      borderWidth: 1.5,
                      borderColor: validationError ? colors.danger : colors.border,
                      backgroundColor: cardBg,
                      padding: 12,
                    }}
                  >
                    <TextInput
                      testID="help-feedback-message-input"
                      style={{
                        color: colors.text,
                        fontSize: 14,
                        minHeight: 112,
                        textAlignVertical: 'top',
                        ...(Platform.OS === 'web' ? ({ outlineStyle: 'none' } as any) : {}),
                      }}
                      placeholder={step3Placeholder}
                      placeholderTextColor={colors.textMuted}
                      multiline
                      maxLength={MAX_FEEDBACK_MESSAGE_LENGTH}
                      value={message}
                      editable={!submitting}
                      onChangeText={(txt) => {
                        setMessage(txt);
                        if (validationError) setValidationError(null);
                      }}
                    />
                    <Txt size={11} color={colors.textMuted} style={{ textAlign: 'right', marginTop: 6 }}>
                      {message.length}/{MAX_FEEDBACK_MESSAGE_LENGTH} characters
                    </Txt>
                  </View>

                  {category === 'report_issue' && (
                    <View
                      style={{
                        borderRadius: 16,
                        borderWidth: 1.5,
                        borderColor: colors.border,
                        backgroundColor: cardBg,
                        padding: 12,
                      }}
                    >
                      <TextInput
                        testID="help-feedback-repro-input"
                        style={{
                          color: colors.text,
                          fontSize: 13.5,
                          minHeight: 72,
                          textAlignVertical: 'top',
                          ...(Platform.OS === 'web' ? ({ outlineStyle: 'none' } as any) : {}),
                        }}
                        placeholder="Steps to reproduce (optional)"
                        placeholderTextColor={colors.textMuted}
                        multiline
                        maxLength={MAX_REPRO_STEPS_LENGTH}
                        value={reproductionSteps}
                        editable={!submitting}
                        onChangeText={setReproductionSteps}
                      />
                    </View>
                  )}

                  {validationError && (
                    <View testID="help-feedback-validation-error">
                      <Txt size={12.5} color={colors.danger} weight="600">
                        {validationError}
                      </Txt>
                    </View>
                  )}

                  {submitError && (
                    <View
                      testID="help-feedback-submit-error"
                      style={{
                        borderRadius: 12,
                        padding: 12,
                        backgroundColor: 'rgba(255, 59, 48, 0.12)',
                        borderWidth: 1,
                        borderColor: colors.danger,
                        gap: 8,
                      }}
                    >
                      <Txt size={12.5} color={colors.danger} weight="600">
                        {submitError}
                      </Txt>
                      <Pressable
                        onPress={() => void performSubmit()}
                        disabled={submitting}
                        testID="help-feedback-retry-button"
                        style={{
                          alignSelf: 'flex-start',
                          paddingHorizontal: 12,
                          paddingVertical: 6,
                          borderRadius: 8,
                          backgroundColor: colors.danger,
                        }}
                      >
                        <Txt size={12} color="#FFFFFF" weight="700">
                          Retry
                        </Txt>
                      </Pressable>
                    </View>
                  )}
                </ScrollView>
              )}

              {/* Bottom Continue / Submit Button */}
              <View style={{ marginTop: 10 }}>
                <Pressable
                  onPress={handleContinue}
                  disabled={submitting || pickingScreenshot}
                  testID="help-modal-continue-submit"
                  accessibilityRole="button"
                  style={({ pressed }) => ({
                    height: 52,
                    borderRadius: 26,
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 8,
                    backgroundColor: colors.blue,
                    opacity: submitting || pickingScreenshot ? 0.6 : pressed ? 0.88 : 1,
                  })}
                >
                  {submitting ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <Txt size={15} color="#FFFFFF" weight="800">
                      {step === 3 ? submitButtonLabel : 'Continue'}
                    </Txt>
                  )}
                </Pressable>
              </View>
            </>
          )}
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}
