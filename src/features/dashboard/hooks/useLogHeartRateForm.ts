import { useCallback, useEffect, useState } from 'react';
import { addHeartRateReading } from '../../../services/vitals';

export function useLogHeartRateForm(
  visible: boolean,
  onClose: () => void,
  onLogged: () => void,
) {
  const [bpm, setBpm] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    if (!visible) {
      setBpm('');
      setErr(null);
    }
  }, [visible]);

  const submit = useCallback(async () => {
    setErr(null);
    const n = Number.parseInt(bpm.replaceAll(/\s/g, ''), 10);
    if (!Number.isFinite(n)) {
      setErr('Enter a whole number.');
      return;
    }
    setBusy(true);
    const r = await addHeartRateReading(n);
    setBusy(false);
    if (!r.ok) {
      setErr(r.error.message);
      return;
    }
    setBpm('');
    onLogged();
    onClose();
  }, [bpm, onClose, onLogged]);

  return { bpm, setBpm, err, busy, submit };
}
