/*
 * api-tests.js  -  QA Part 8b: API tests for Parts 1-4 (Auth, Events, Bookings)
 * Campus Event & Ticket Booking System
 *
 * Needs: Node 18+ (built-in fetch). No installs.
 * Run:   1) node server.js            (Terminal 1, leave running)
 *        2) node docs/qa/api-tests.js (Terminal 2)
 *
 * Optional: BASE_URL=http://localhost:5000 (default)
 *
 * Tests marked [SUSPECT] check things the code does not appear to validate.
 * A FAIL there is a likely real bug. Report it as a GitHub Issue.
 *
 * Test data: every run creates users with emails like qa_*_<timestamp>_*@test.local.
 * To clean up afterwards (MySQL Workbench):
 *   DELETE FROM users WHERE email LIKE 'qa\_%@test.local';
 * (events and bookings are removed too, because of ON DELETE CASCADE)
 */

const BASE = process.env.BASE_URL || "http://localhost:5000";
const PASSWORD = "Test@1234";
const stamp = Date.now();
let counter = 0;
const results = [];

class Skip extends Error {}
function expect(cond, msg) { if (!cond) throw new Error(msg); }
function skip(msg) { throw new Skip(msg); }
function need(x, msg) { if (!x) skip(msg); }

async function api(method, path, body, token, extraHeaders) {
  const headers = { "Content-Type": "application/json" };
  if (token) headers.Authorization = `Bearer ${token}`;
  if (extraHeaders) Object.assign(headers, extraHeaders);
  const res = await fetch(BASE + path, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let data = null;
  try { data = text ? JSON.parse(text) : null; } catch { data = text; }
  return { status: res.status, body: data };
}

async function test(id, name, fn, suspect = false) {
  let result = "PASS", detail = "";
  try {
    detail = (await fn()) || "";
  } catch (e) {
    result = e instanceof Skip ? "SKIP" : "FAIL";
    detail = e.message;
  }
  results.push({ id, name, result, detail, suspect });
  const tag = suspect ? " [SUSPECT]" : "";
  console.log(`${result.padEnd(4)}  ${id.padEnd(7)} ${name}${tag}${result !== "PASS" ? "  -> " + detail : ""}`);
}

function dt(days) {
  return new Date(Date.now() + days * 86400000).toISOString().slice(0, 19).replace("T", " ");
}

async function makeUser(role, label) {
  const email = `qa_${label}_${stamp}_${++counter}@test.local`;
  const res = await api("POST", "/api/auth/register", { name: `QA ${label}`, email, password: PASSWORD, role });
  return {
    email, res,
    token: res.body && res.body.token,
    id: res.body && res.body.user && res.body.user.id,
  };
}

async function mkEvent(token, overrides = {}) {
  const body = {
    title: `QA Event ${stamp}-${++counter}`,
    description: "QA test event",
    category: `QA-${stamp}`,
    venue: "QA Hall",
    event_date: dt(30),
    capacity: 5,
    ticket_price: 100.5,
    status: "published",
    ...overrides,
  };
  const res = await api("POST", "/api/events", body, token);
  return { body, res, id: res.body && res.body.id };
}

// Creates an event and makes sure it is published (patches it if the API ignored "status" on create)
async function mkPublished(token, overrides = {}) {
  const ev = await mkEvent(token, overrides);
  ev.published = false;
  if (!ev.id) return ev;
  if (!ev.res.body.status || ev.res.body.status !== "published") {
    await api("PATCH", `/api/events/${ev.id}`, { ...ev.body, status: "published" }, token);
  }
  const g = await api("GET", `/api/events/${ev.id}`);
  ev.published = !!(g.body && g.body.status === "published");
  return ev;
}

async function main() {
  console.log(`\nQA API tests against ${BASE}\n`);

  // ---- Server reachable? ----
  try {
    const r = await api("GET", "/");
    if (r.status !== 200) throw new Error("status " + r.status);
  } catch (e) {
    console.log("Cannot reach the server at " + BASE + " (" + e.message + ").");
    console.log("Start it first in another terminal:  node server.js");
    process.exit(2);
  }

  // ---- Setup: users ----
  const stu1 = await makeUser("student", "stu1");
  const stu2 = await makeUser("student", "stu2");
  const stu3 = await makeUser("student", "stu3");
  const org1 = await makeUser("organizer", "org1");
  const org2 = await makeUser("organizer", "org2");

  // =====================  AUTH  =====================
  await test("AUTH-01", "Register student returns 201, user and token", async () => {
    expect(stu1.res.status === 201, `expected 201, got ${stu1.res.status} ${JSON.stringify(stu1.res.body)}`);
    expect(typeof stu1.token === "string" && stu1.token.length > 10, "no token in response");
    expect(stu1.id, "no user.id in response");
    expect(stu1.res.body.user.role === "student", "role should be student");
  });

  await test("AUTH-02", "Register organizer gets organizer role", async () => {
    expect(org1.res.status === 201, `expected 201, got ${org1.res.status}`);
    expect(org1.res.body.user.role === "organizer", `role was ${org1.res.body.user && org1.res.body.user.role}`);
  });

  await test("AUTH-03", "Cannot self-register as admin (role falls back to student)", async () => {
    const u = await makeUser("admin", "adm");
    expect(u.res.status === 201, `expected 201, got ${u.res.status}`);
    expect(u.res.body.user.role === "student", `role was ${u.res.body.user.role}, must NOT be admin`);
  });

  await test("AUTH-04", "Register with missing fields returns 400", async () => {
    const r = await api("POST", "/api/auth/register", { email: `qa_x_${stamp}@test.local` });
    expect(r.status === 400, `expected 400, got ${r.status}`);
  });

  await test("AUTH-05", "Register duplicate email returns 409", async () => {
    const r = await api("POST", "/api/auth/register", { name: "Dup", email: stu1.email, password: PASSWORD });
    expect(r.status === 409, `expected 409, got ${r.status}`);
  });

  await test("AUTH-06", "Register response does not leak the password hash", async () => {
    const u = stu1.res.body && stu1.res.body.user;
    expect(u, "no user object");
    expect(!("password_hash" in u) && !("password" in u), "response contains a password field");
  });

  await test("AUTH-07", "Login with correct details returns 200 and token", async () => {
    const r = await api("POST", "/api/auth/login", { email: stu1.email, password: PASSWORD });
    expect(r.status === 200, `expected 200, got ${r.status}`);
    expect(r.body.token, "no token");
    expect(!("password_hash" in r.body.user), "login response leaks password_hash");
  });

  await test("AUTH-08", "Login with wrong password returns 401", async () => {
    const r = await api("POST", "/api/auth/login", { email: stu1.email, password: "wrong-password" });
    expect(r.status === 401, `expected 401, got ${r.status}`);
  });

  await test("AUTH-09", "Login with unknown email returns 401", async () => {
    const r = await api("POST", "/api/auth/login", { email: `nobody_${stamp}@test.local`, password: PASSWORD });
    expect(r.status === 401, `expected 401, got ${r.status}`);
  });

  await test("AUTH-10", "Login with missing fields returns 400", async () => {
    const r = await api("POST", "/api/auth/login", { email: stu1.email });
    expect(r.status === 400, `expected 400, got ${r.status}`);
  });

  await test("AUTH-11", "Register rejects an invalid email format", async () => {
    const r = await api("POST", "/api/auth/register", { name: "Bad Email", email: "not-an-email", password: PASSWORD });
    expect(r.status === 400, `expected 400, got ${r.status} (invalid email was accepted)`);
  }, true);

  await test("AUTH-12", "Register rejects a very weak password (\"1\")", async () => {
    const r = await api("POST", "/api/auth/register", { name: "Weak Pw", email: `qa_weak_${stamp}@test.local`, password: "1" });
    expect(r.status === 400, `expected 400, got ${r.status} (1-character password was accepted)`);
  }, true);

  // =====================  MIDDLEWARE  =====================
  await test("MID-01", "Protected route with no token returns 401", async () => {
    const r = await api("GET", "/api/bookings/mine");
    expect(r.status === 401, `expected 401, got ${r.status}`);
  });

  await test("MID-02", "Protected route with invalid token returns 401", async () => {
    const r = await api("GET", "/api/bookings/mine", undefined, "this.is.not.valid");
    expect(r.status === 401, `expected 401, got ${r.status}`);
  });

  await test("MID-03", "Authorization header without \"Bearer\" returns 401", async () => {
    const r = await api("GET", "/api/bookings/mine", undefined, null, { Authorization: `Token ${stu1.token}` });
    expect(r.status === 401, `expected 401, got ${r.status}`);
  });

  // =====================  EVENTS  =====================
  need(org1.token, "organizer setup failed");
  const M = await mkPublished(org1.token, { capacity: 5, ticket_price: 100.5 });   // main event
  const D = await mkEvent(org1.token, { status: "draft" });                          // draft event

  await test("EVT-01", "Student cannot create an event (403)", async () => {
    const r = await api("POST", "/api/events", { title: "X", event_date: dt(5), capacity: 5 }, stu1.token);
    expect(r.status === 403, `expected 403, got ${r.status}`);
  });

  await test("EVT-02", "Create event with no token returns 401", async () => {
    const r = await api("POST", "/api/events", { title: "X", event_date: dt(5), capacity: 5 });
    expect(r.status === 401, `expected 401, got ${r.status}`);
  });

  await test("EVT-03", "Organizer creates an event (201 with id)", async () => {
    expect(M.res.status === 201, `expected 201, got ${M.res.status} ${JSON.stringify(M.res.body)}`);
    expect(M.id, "no id in response");
  });

  await test("EVT-04", "Create event with missing title returns 400", async () => {
    const r = await api("POST", "/api/events", { event_date: dt(5), capacity: 5 }, org1.token);
    expect(r.status === 400, `expected 400, got ${r.status}`);
  });

  await test("EVT-05", "List events returns 200 and includes a published event", async () => {
    need(M.id && M.published, "main event not created/published");
    const r = await api("GET", "/api/events");
    expect(r.status === 200, `expected 200, got ${r.status}`);
    expect(Array.isArray(r.body), "response is not an array");
    expect(r.body.some((e) => e.id === M.id), "published event missing from list");
  });

  await test("EVT-06", "List events hides draft events", async () => {
    need(D.id, "draft event not created");
    const r = await api("GET", "/api/events");
    expect(!r.body.some((e) => e.id === D.id), "draft event appears in public list");
  });

  await test("EVT-07", "Get one event by id returns 200", async () => {
    need(M.id, "main event not created");
    const r = await api("GET", `/api/events/${M.id}`);
    expect(r.status === 200, `expected 200, got ${r.status}`);
    expect(r.body.id === M.id, "wrong event returned");
  });

  await test("EVT-08", "Get non-existent event returns 404", async () => {
    const r = await api("GET", "/api/events/99999999");
    expect(r.status === 404, `expected 404, got ${r.status}`);
  });

  await test("EVT-09", "Draft event is not visible to a student by id", async () => {
    need(D.id, "draft event not created");
    const r = await api("GET", `/api/events/${D.id}`, undefined, stu1.token);
    expect(r.status === 404, `expected 404, got ${r.status} (draft event is publicly readable)`);
  }, true);

  await test("EVT-10", "Search filter finds event by title", async () => {
    need(M.id && M.published, "main event not created/published");
    const r = await api("GET", `/api/events?search=${encodeURIComponent(M.body.title)}`);
    expect(r.status === 200, `expected 200, got ${r.status}`);
    expect(r.body.some((e) => e.id === M.id), "event not found by search");
  });

  await test("EVT-11", "Category filter returns only that category", async () => {
    need(M.id && M.published, "main event not created/published");
    const r = await api("GET", `/api/events?category=${encodeURIComponent(M.body.category)}`);
    expect(r.status === 200, `expected 200, got ${r.status}`);
    expect(r.body.some((e) => e.id === M.id), "event missing from category results");
    expect(r.body.every((e) => e.category === M.body.category), "other categories leaked into results");
  });

  await test("EVT-12", "Owner can update their own event", async () => {
    need(M.id, "main event not created");
    const newTitle = M.body.title + " (edited)";
    const r = await api("PATCH", `/api/events/${M.id}`, { ...M.body, title: newTitle, status: "published" }, org1.token);
    expect(r.status === 200, `expected 200, got ${r.status} ${JSON.stringify(r.body)}`);
    expect(r.body.title === newTitle, "title was not updated");
  });

  await test("EVT-13", "Another organizer cannot edit the event (403)", async () => {
    need(M.id && org2.token, "setup missing");
    const r = await api("PATCH", `/api/events/${M.id}`, { title: "Hijack" }, org2.token);
    expect(r.status === 403, `expected 403, got ${r.status}`);
  });

  await test("EVT-14", "Student cannot update an event (403)", async () => {
    need(M.id, "main event not created");
    const r = await api("PATCH", `/api/events/${M.id}`, { title: "Hijack" }, stu1.token);
    expect(r.status === 403, `expected 403, got ${r.status}`);
  });

  await test("EVT-15", "Update non-existent event returns 404", async () => {
    const r = await api("PATCH", "/api/events/99999999", { title: "X" }, org1.token);
    expect(r.status === 404, `expected 404, got ${r.status}`);
  });

  await test("EVT-16", "Create event rejects negative capacity", async () => {
    const r = await mkEvent(org1.token, { capacity: -5 });
    expect(r.res.status === 400, `expected 400, got ${r.res.status} (negative capacity accepted)`);
  }, true);

  await test("EVT-17", "Create event rejects zero capacity", async () => {
    const r = await mkEvent(org1.token, { capacity: 0 });
    expect(r.res.status === 400, `expected 400, got ${r.res.status}`);
  });

  await test("EVT-18", "Create event rejects a date in the past", async () => {
    const r = await mkEvent(org1.token, { event_date: "2020-01-01 10:00:00" });
    expect(r.res.status === 400, `expected 400, got ${r.res.status} (past date accepted)`);
  }, true);

  await test("EVT-19", "Create event rejects a negative ticket price", async () => {
    const r = await mkEvent(org1.token, { ticket_price: -50 });
    expect(r.res.status === 400, `expected 400, got ${r.res.status} (negative price accepted)`);
  }, true);

  await test("EVT-20", "Create event with an invalid date gives 400 (not a server error)", async () => {
    const r = await mkEvent(org1.token, { event_date: "not-a-date" });
    expect(r.res.status === 400, `expected 400, got ${r.res.status}`);
  }, true);

  await test("EVT-21", "Non-numeric event id does not crash the server (no 500)", async () => {
    const r = await api("GET", "/api/events/abc");
    expect(r.status !== 500, `got 500 for /api/events/abc`);
  }, true);

  await test("EVT-22", "Search with SQL-injection text does not cause a 500 or return everything", async () => {
    const r = await api("GET", `/api/events?search=${encodeURIComponent("' OR '1'='1")}`);
    expect(r.status === 200, `expected 200, got ${r.status}`);
    need(M.id && M.published, "main event not created/published");
    expect(!r.body.some((e) => e.id === M.id), "injection string matched every event");
  });

  // =====================  BOOKINGS  =====================
  const Q = await mkPublished(org1.token, { capacity: 50 });   // roomy event for validation tests
  const S = await mkPublished(org1.token, { capacity: 2 });    // small event, cancel frees capacity
  const F = await mkPublished(org1.token, { capacity: 1 });    // last-ticket event
  let B1 = null;

  await test("BKG-01", "Book without a token returns 401", async () => {
    const r = await api("POST", "/api/bookings", { event_id: 1, quantity: 1 });
    expect(r.status === 401, `expected 401, got ${r.status}`);
  });

  await test("BKG-02", "Student books tickets (201, pending, correct total)", async () => {
    need(M.id && M.published, "main event not published");
    const r = await api("POST", "/api/bookings", { event_id: M.id, quantity: 2 }, stu1.token);
    expect(r.status === 201, `expected 201, got ${r.status} ${JSON.stringify(r.body)}`);
    B1 = r.body;
    expect(B1.id, "no booking id");
    expect(B1.status === "pending", `status was ${B1.status}, expected pending`);
    expect(Number(B1.quantity) === 2, `quantity was ${B1.quantity}`);
    expect(Math.abs(Number(B1.total_amount) - 201) < 0.01, `total_amount was ${B1.total_amount}, expected 201`);
  });

  await test("BKG-03", "Book without event_id returns 400", async () => {
    const r = await api("POST", "/api/bookings", { quantity: 1 }, stu1.token);
    expect(r.status === 400, `expected 400, got ${r.status}`);
  });

  await test("BKG-04", "Book quantity 0 returns 400", async () => {
    need(Q.id, "event not created");
    const r = await api("POST", "/api/bookings", { event_id: Q.id, quantity: 0 }, stu1.token);
    expect(r.status === 400, `expected 400, got ${r.status}`);
  });

  await test("BKG-05", "Book negative quantity returns 400", async () => {
    need(Q.id, "event not created");
    const r = await api("POST", "/api/bookings", { event_id: Q.id, quantity: -3 }, stu1.token);
    expect(r.status === 400, `expected 400, got ${r.status}`);
  });

  await test("BKG-06", "Book a non-existent event returns 404", async () => {
    const r = await api("POST", "/api/bookings", { event_id: 99999999, quantity: 1 }, stu1.token);
    expect(r.status === 404, `expected 404, got ${r.status}`);
  });

  await test("BKG-07", "Cannot book a draft event", async () => {
    need(D.id, "draft event not created");
    const r = await api("POST", "/api/bookings", { event_id: D.id, quantity: 1 }, stu1.token);
    expect(r.status === 404, `expected 404, got ${r.status}`);
  });

  await test("BKG-08", "Booking more than remaining tickets returns 409", async () => {
    need(M.id && M.published, "main event not published");
    const r = await api("POST", "/api/bookings", { event_id: M.id, quantity: 4 }, stu2.token); // 5 - 2 booked = 3 left
    expect(r.status === 409, `expected 409, got ${r.status}`);
  });

  await test("BKG-09", "My bookings lists my booking", async () => {
    need(B1 && B1.id, "BKG-02 did not create a booking");
    const r = await api("GET", "/api/bookings/mine", undefined, stu1.token);
    expect(r.status === 200, `expected 200, got ${r.status}`);
    expect(Array.isArray(r.body) && r.body.some((b) => b.id === B1.id), "booking missing from my list");
  });

  await test("BKG-10", "My bookings does not show another user's bookings", async () => {
    need(B1 && B1.id, "BKG-02 did not create a booking");
    const r = await api("GET", "/api/bookings/mine", undefined, stu2.token);
    expect(r.status === 200, `expected 200, got ${r.status}`);
    expect(!r.body.some((b) => b.id === B1.id), "another user's booking leaked into the list");
  });

  await test("BKG-11", "Cannot cancel someone else's booking (403)", async () => {
    need(B1 && B1.id, "BKG-02 did not create a booking");
    const r = await api("PATCH", `/api/bookings/${B1.id}/cancel`, undefined, stu2.token);
    expect(r.status === 403, `expected 403, got ${r.status}`);
  });

  await test("BKG-12", "Owner cancels own booking (200, cancelled)", async () => {
    need(B1 && B1.id, "BKG-02 did not create a booking");
    const r = await api("PATCH", `/api/bookings/${B1.id}/cancel`, undefined, stu1.token);
    expect(r.status === 200, `expected 200, got ${r.status}`);
    expect(r.body.status === "cancelled", `status was ${r.body.status}`);
  });

  await test("BKG-13", "Cancelling twice returns 400", async () => {
    need(B1 && B1.id, "BKG-02 did not create a booking");
    const r = await api("PATCH", `/api/bookings/${B1.id}/cancel`, undefined, stu1.token);
    expect(r.status === 400, `expected 400, got ${r.status}`);
  });

  await test("BKG-14", "Cancel a non-existent booking returns 404", async () => {
    const r = await api("PATCH", "/api/bookings/99999999/cancel", undefined, stu1.token);
    expect(r.status === 404, `expected 404, got ${r.status}`);
  });

  await test("BKG-15", "Cancelling frees up capacity for others", async () => {
    need(S.id && S.published, "small event not published");
    const a = await api("POST", "/api/bookings", { event_id: S.id, quantity: 2 }, stu1.token);
    expect(a.status === 201, `first booking: expected 201, got ${a.status}`);
    const b = await api("POST", "/api/bookings", { event_id: S.id, quantity: 1 }, stu2.token);
    expect(b.status === 409, `sold-out booking: expected 409, got ${b.status}`);
    const c = await api("PATCH", `/api/bookings/${a.body.id}/cancel`, undefined, stu1.token);
    expect(c.status === 200, `cancel: expected 200, got ${c.status}`);
    const d = await api("POST", "/api/bookings", { event_id: S.id, quantity: 2 }, stu2.token);
    expect(d.status === 201, `after cancel: expected 201, got ${d.status} (capacity not freed)`);
  });

  await test("BKG-16", "Reject a decimal quantity (1.5)", async () => {
    need(Q.id && Q.published, "event not published");
    const r = await api("POST", "/api/bookings", { event_id: Q.id, quantity: 1.5 }, stu1.token);
    expect(r.status === 400, `expected 400, got ${r.status} (decimal quantity accepted)`);
  }, true);

  await test("BKG-17", "Reject a text quantity (\"2abc\")", async () => {
    need(Q.id && Q.published, "event not published");
    const r = await api("POST", "/api/bookings", { event_id: Q.id, quantity: "2abc" }, stu1.token);
    expect(r.status === 400, `expected 400, got ${r.status} ("2abc" accepted as a quantity)`);
  }, true);

  await test("BKG-18", "Huge quantity returns 409 (not 500)", async () => {
    need(Q.id && Q.published, "event not published");
    const r = await api("POST", "/api/bookings", { event_id: Q.id, quantity: 1000000 }, stu1.token);
    expect(r.status === 409, `expected 409, got ${r.status}`);
  });

  await test("BKG-19", "Two buyers racing for the last ticket: exactly one succeeds", async () => {
    need(F.id && F.published, "last-ticket event not published");
    const [a, b] = await Promise.all([
      api("POST", "/api/bookings", { event_id: F.id, quantity: 1 }, stu2.token),
      api("POST", "/api/bookings", { event_id: F.id, quantity: 1 }, stu3.token),
    ]);
    const got = [a.status, b.status].sort().join(",");
    expect(got === "201,409", `statuses were ${got}, expected one 201 and one 409 (possible overbooking)`);
  });

  await test("BKG-20", "Cannot book a cancelled event", async () => {
    const C = await mkPublished(org1.token, { capacity: 5 });
    need(C.id && C.published, "event not published");
    const p = await api("PATCH", `/api/events/${C.id}`, { ...C.body, status: "cancelled" }, org1.token);
    need(p.status === 200, `could not set event to cancelled (PATCH gave ${p.status})`);
    const r = await api("POST", "/api/bookings", { event_id: C.id, quantity: 1 }, stu1.token);
    expect(r.status === 404, `expected 404, got ${r.status}`);
  });

  await test("BKG-21", "Non-numeric booking id on cancel does not crash (no 500)", async () => {
    const r = await api("PATCH", "/api/bookings/abc/cancel", undefined, stu1.token);
    expect(r.status !== 500, `got 500 for /api/bookings/abc/cancel`);
  }, true);

  await test("SYS-01", "Static pages: GET /index.html or /login.html is served", async () => {
    const paths = ["/index.html", "/login.html", "/events.html"];
    const codes = [];
    for (const p of paths) {
      const res = await fetch(BASE + p);
      codes.push(`${p}=${res.status}`);
      if (res.status === 200) return codes.join(" ");
    }
    throw new Error(`no frontend page served by the server (${codes.join(", ")}). server.js has no express.static for public/`);
  }, true);

  // =====================  SUMMARY  =====================
  const count = (r) => results.filter((x) => x.result === r).length;
  const failed = results.filter((x) => x.result === "FAIL");
  console.log("\n" + "=".repeat(72));
  console.log(`TOTAL ${results.length}   PASS ${count("PASS")}   FAIL ${count("FAIL")}   SKIP ${count("SKIP")}`);
  console.log("=".repeat(72));
  if (failed.length) {
    console.log("\nFAILED TESTS (turn real bugs into GitHub Issues):");
    for (const f of failed) {
      console.log(`  ${f.id}${f.suspect ? " [SUSPECT]" : ""}  ${f.name}\n          ${f.detail}`);
    }
  }
  console.log("\nTip: clean test data in Workbench with:");
  console.log("  DELETE FROM users WHERE email LIKE 'qa\\_%@test.local';\n");
  process.exit(failed.length ? 1 : 0);
}

main().catch((e) => {
  console.error("Test run crashed:", e);
  process.exit(2);
});
