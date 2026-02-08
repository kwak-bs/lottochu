/**
 * 기준일 이후 다음에 오는 요일의 날짜 반환
 * @param dayOfWeek 0=일, 1=월, ..., 6=토
 */
export function getNextWeekday(dayOfWeek: number): Date {
  const today = new Date();
  const current = today.getDay();
  const daysUntil = (dayOfWeek - current + 7) % 7 || 7;
  const next = new Date(today);
  next.setDate(today.getDate() + daysUntil);
  return next;
}

/** 다음 토요일 (로또 추첨일) */
export function getNextSaturday(): Date {
  return getNextWeekday(6);
}

/** 다음 목요일 (연금복권 결과일) */
export function getNextThursday(): Date {
  return getNextWeekday(4);
}
