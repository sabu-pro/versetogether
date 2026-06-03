import { differenceInCalendarWeeks, format, getDay, startOfWeek } from "date-fns";
import { Profile } from "@/types";

export const referenceMonday = new Date("2026-06-01T00:00:00");

export function todayString() {
  return format(new Date(), "yyyy-MM-dd");
}

export function weekStartString(date = new Date()) {
  return format(startOfWeek(date, { weekStartsOn: 1 }), "yyyy-MM-dd");
}

export function prettyDate(date: string | Date) {
  return format(new Date(date), "EEE, MMM d, yyyy");
}

export function isWeekend(date = new Date()) {
  const d = getDay(date);
  return d === 0 || d === 6;
}

export function responsibleOrder(date = new Date()): 1 | 2 {
  const day = getDay(date);
  if (day === 0 || day === 6) return 1;

  const weeks = differenceInCalendarWeeks(
    startOfWeek(date, { weekStartsOn: 1 }),
    startOfWeek(referenceMonday, { weekStartsOn: 1 }),
    { weekStartsOn: 1 }
  );

  const startingOrder: 1 | 2 = weeks % 2 === 0 ? 1 : 2;
  const weekdayPosition = day - 1;
  const alternateDay = weekdayPosition % 2 === 1;

  if (startingOrder === 1) return alternateDay ? 2 : 1;
  return alternateDay ? 1 : 2;
}

export function getResponsibleProfile(profiles: Profile[]) {
  const order = responsibleOrder();
  return profiles.find((p) => p.partner_order === order) || null;
}
