import { useMemo, useState } from 'react';
import { signUp } from '../../../services/auth';

export function useRegisterForm() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showErrors, setShowErrors] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [submitSuccess, setSubmitSuccess] = useState('');

  const nameError = useMemo(
    () => showErrors && name.trim().length === 0,
    [name, showErrors],
  );
  const emailError = useMemo(
    () => showErrors && email.trim().length === 0,
    [email, showErrors],
  );
  const passwordError = useMemo(
    () => showErrors && password.trim().length === 0,
    [password, showErrors],
  );

  const handleRegister = async () => {
    setShowErrors(true);
    setSubmitError('');
    setSubmitSuccess('');

    if (
      name.trim().length === 0 ||
      email.trim().length === 0 ||
      password.trim().length === 0
    ) {
      return;
    }

    setIsSubmitting(true);
    const { error } = await signUp(name.trim(), email.trim(), password);
    setIsSubmitting(false);

    if (error) {
      setSubmitError(error.message);
      return;
    }

    setSubmitSuccess('Registration successful. You can continue in the app.');
  };

  return {
    name,
    setName,
    email,
    setEmail,
    password,
    setPassword,
    nameError,
    emailError,
    passwordError,
    isSubmitting,
    submitError,
    submitSuccess,
    handleRegister,
  };
}
