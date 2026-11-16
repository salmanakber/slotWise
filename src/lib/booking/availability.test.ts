import { getDaySlots, rankSlots } from "./availability";

function assert(cond: unknown, msg: string) {
  if (!cond) throw new Error(msg);
}

const weekly = [0, 1, 2, 3, 4, 5, 6].map((dayOfWeek) => ({
  dayOfWeek,
  enabled: dayOfWeek >= 1 && dayOfWeek <= 5,
  startTime: "09:00",
  endTime: "12:00",
}));

const monday = new Date("2026-11-16T12:00:00.000Z"); // Mon

const slots = getDaySlots({
  date: monday,
  timezone: "UTC",
  durationMin: 60,
  bufferAfterMin: 15,
  minNoticeMin: 0,
  slotStepMin: 30,
  weekly,
  bookings: [
    {
      startsAt: new Date("2026-11-16T10:00:00.000Z"),
      endsAt: new Date("2026-11-16T11:00:00.000Z"),
    },
  ],
  now: new Date("2026-11-16T07:00:00.000Z"),
});

assert(slots.length > 0, "expected slots");
assert(slots.some((s) => s.label === "10:00" && !s.available), "10:00 should be blocked");
// 09:00 ends at 10:00; bufferAfterMin 15 extends blocked range to 10:15 → conflicts with 10:00 booking
assert(slots.some((s) => s.label === "09:00" && !s.available), "09:00 should be blocked by buffer");
assert(slots.some((s) => s.label === "11:00" && s.available), "11:00 should be free");

const ranked = rankSlots(slots);
assert(ranked[0]?.available, "ranked should prefer available first");

console.log("availability.test.ts passed", { total: slots.length });
