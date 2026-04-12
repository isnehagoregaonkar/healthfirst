export type FastingSession = Readonly<{
  id: string;
  startedAt: string;
  endedAt: string;
  targetHours: number;
  durationMin: number;
}>;

export type FastingPersisted = Readonly<{
  activeFastStartedAt: string | null;
  targetFastHours: number;
  history: FastingSession[];
}>;
