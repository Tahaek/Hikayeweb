import { verifyPassword } from "./lib/admin-auth.mjs";

function jsonResponse(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
    },
  });
}

export default async (request) => {
  if (request.method !== "POST") {
    return jsonResponse({ ok: false, message: "Method not allowed." }, 405);
  }

  const body = await request.json().catch(() => ({}));
  const password = typeof body.password === "string" ? body.password : "";

  if (!verifyPassword(password)) {
    return jsonResponse({ ok: false, message: "Unauthorized." }, 401);
  }

  return jsonResponse({ ok: true });
};
