// Alarm thresholds — edit here, no UI needed.
export const ALARM_CONFIG = {
  // Days with no activity before INACTIVE alarm fires
  inactiveDays: 14,

  // Max unsubscriptions from task slots in the lookback window before HIGH_ABANDONMENT fires
  maxAbandonments: 3,
  abandonmentLookbackDays: 30,

  // Minimum event participation rate (0–1) before LOW_EVENT_PARTICIPATION fires.
  // Only checked when at least minEventsForParticipationCheck events ended in the window.
  minEventParticipationRate: 0.5,
  eventParticipationLookbackDays: 30,
  minEventsForParticipationCheck: 2,
} as const;
