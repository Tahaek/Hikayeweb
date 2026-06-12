import { createHash, timingSafeEqual } from "node:crypto";

const DEFAULT_PASSWORD = "anthony-admin";

function hashPassword(value) {
  return createHash("sha256").update(value, "utf8").digest();
}

export function verifyPassword(password) {
  const expected = hashPassword(process.env.ANTHONY_ADMIN_PASSWORD || DEFAULT_PASSWORD);
  const received = hashPassword(password || "");
  return timingSafeEqual(expected, received);
}
