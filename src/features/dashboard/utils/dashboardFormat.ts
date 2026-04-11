export function greetingForNow(): string {
  const h = new Date().getHours();
  if (h < 12) {
    return 'Good morning';
  }
  if (h < 17) {
    return 'Good afternoon';
  }
  return 'Good evening';
}

export function formatRelativeHeartTime(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) {
    return '';
  }
  const now = new Date();
  const sameDay =
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate();
  if (sameDay) {
    const mins = Math.floor((now.getTime() - d.getTime()) / 60_000);
    if (mins < 1) {
      return 'Just now';
    }
    if (mins < 60) {
      return `${mins}m ago`;
    }
    return d.toLocaleTimeString(undefined, {
      hour: 'numeric',
      minute: '2-digit',
    });
  }
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

export function waterRemainingFoot(goalMl: number, todayMl: number): string {
  const rem = Math.max(0, goalMl - todayMl);
  if (rem <= 0) {
    return 'Daily goal reached';
  }
  if (rem >= 1000) {
    return `${(rem / 1000).toFixed(1)} L to go`;
  }
  return `${rem.toLocaleString('en-US')} ml to go`;
}
