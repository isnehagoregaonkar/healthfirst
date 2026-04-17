import { useMemo, useState } from 'react';
import { requestPasswordReset } from '../../../services/auth';

export function useForgotPasswordForm() {
  const [email, setEmail] = useState('');
  const [showErrors, setShowErrors] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [submitSuccess, setSubmitSuccess] = useState('');

  const emailError = useMemo(
    () => showErrors && email.trim().length === 0,
    [email, showErrors],
  );

  const handleSendReset = async () => {
    setShowErrors(true);
    setSubmitError('');
    setSubmitSuccess('');

    const trimmedEmail = email.trim();
    if (trimmedEmail.length === 0) {
      return;
    }

    setIsSubmitting(true);
    const { error } = await requestPasswordReset(trimmedEmail);
    setIsSubmitting(false);

    if (error) {
      setSubmitError(error.message);
      return;
    }

    setSubmitSuccess(
      'If an account exists for this email, password reset instructions have been sent.',
    );
  };

  return {
    email,
    setEmail,
    emailError,
    isSubmitting,
    submitError,
    submitSuccess,
    handleSendReset,
  };
}
