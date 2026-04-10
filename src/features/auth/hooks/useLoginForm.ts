import { useMemo, useState } from 'react';
import { signIn } from '../../../services/auth';

export function useLoginForm() {
  const [email, setEmail] = useState('goregaonkarsneha98@gmail.com');
  const [password, setPassword] = useState('Sneha@1998');
  const [showErrors, setShowErrors] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');

  const emailError = useMemo(
    () => showErrors && email.trim().length === 0,
    [email, showErrors],
  );
  const passwordError = useMemo(
    () => showErrors && password.trim().length === 0,
    [password, showErrors],
  );

  const handleLogin = async () => {
    setShowErrors(true);
    setSubmitError('');

    if (email.trim().length === 0 || password.trim().length === 0) {
      return;
    }

    setIsSubmitting(true);
    const { error } = await signIn(email.trim(), password);
    setIsSubmitting(false);

    if (error) {
      setSubmitError(error.message);
    }
  };

  return {
    email,
    setEmail,
    password,
    setPassword,
    emailError,
    passwordError,
    isSubmitting,
    submitError,
    handleLogin,
  };
}
