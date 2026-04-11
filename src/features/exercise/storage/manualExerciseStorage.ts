import AsyncStorage from '@react-native-async-storage/async-storage';
import type { ExerciseSessionRow } from '../exerciseTypes';

const KEY = '@healthfirst/exercise/manual_sessions_v1';

function sortByStartDesc(a: ExerciseSessionRow, b: ExerciseSessionRow): number {
  return new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime();
}

export async function loadManualExerciseSessions(): Promise<ExerciseSessionRow[]> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    if (!raw) {
      return [];
    }
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) {
      return [];
    }
    return (parsed as ExerciseSessionRow[]).slice().sort(sortByStartDesc);
  } catch {
    return [];
  }
}

export async function appendManualExerciseSession(
  row: ExerciseSessionRow,
): Promise<void> {
  const cur = await loadManualExerciseSessions();
  const next = [row, ...cur.filter(r => r.id !== row.id)].sort(sortByStartDesc);
  await AsyncStorage.setItem(KEY, JSON.stringify(next));
}
