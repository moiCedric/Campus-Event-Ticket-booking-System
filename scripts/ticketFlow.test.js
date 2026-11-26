const test = require("node:test");
const assert = require("node:assert");
const pool = require("../config/db");
const Ticket = require("../models/Ticket");

const BASE = process.env.BASE_URL || "http://localhost:5000";
const ORGANIZER = { email: "organizer@test.com", password: "Password123" };
const STUDENT = { email: "student@test.com", password: "Password123" };

async function api(path, { method = "GET", token, body } = {}) {
  const res = await fetch(BASE + path, {
    method,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  let data = null;
  try {
    data = await res.json();
  } catch (e) {}
  return { status: res.status, data };
}

const state = {};

test("setup: log in, book 2 seats and generate tickets", async () => {
  const org = await api("/api/auth/login", { method: "POST", body: ORGANIZER });
  const stu = await api("/api/auth/login", { method: "POST", body: STUDENT });
  assert.strictEqual(org.status, 200);
  assert.strictEqual(stu.status, 200);
  state.orgToken = org.data.token;
  state.stuToken = stu.data.token;

  const [events] = await pool.query(
    "SELECT id FROM events WHERE status = 'published' ORDER BY id DESC LIMIT 1"
  );
  assert.ok(events[0], "publish an event first");
  state.eventId = events[0].id;

  const booked = await api("/api/bookings", {
    method: "POST",
    token: state.stuToken,
    body: { event_id: state.eventId, quantity: 2 },
  });
  assert.ok([200, 201].includes(booked.status), "booking failed");

  const [bookings] = await pool.query(
    `SELECT b.id FROM bookings b JOIN users u ON b.user_id = u.id
     WHERE u.email = ? ORDER BY b.id DESC LIMIT 1`,
    [STUDENT.email]
  );
  state.tickets = await Ticket.generateForBooking(bookings[0].id);
  assert.strictEqual(state.tickets.length, 2);
});

test("student sees their tickets", async () => {
  const r = await api("/api/tickets/mine", { token: state.stuToken });
  assert.strictEqual(r.status, 200);
  assert.ok(r.data.tickets.length >= 2);
});

test("organizer checks a ticket in once", async () => {
  const r = await api("/api/tickets/checkin", {
    method: "POST",
    token: state.orgToken,
    body: { qr_code: state.tickets[0].qr_code },
  });
  assert.strictEqual(r.status, 200);
});

test("second scan of the same ticket returns 409", async () => {
  const r = await api("/api/tickets/checkin", {
    method: "POST",
    token: state.orgToken,
    body: { qr_code: state.tickets[0].qr_code },
  });
  assert.strictEqual(r.status, 409);
});

test("student cannot check in (403)", async () => {
  const r = await api("/api/tickets/checkin", {
    method: "POST",
    token: state.stuToken,
    body: { qr_code: state.tickets[1].qr_code },
  });
  assert.strictEqual(r.status, 403);
});

test("unknown ticket returns 404", async () => {
  const r = await api("/api/tickets/checkin", {
    method: "POST",
    token: state.orgToken,
    body: { qr_code: "TKT-fake" },
  });
  assert.strictEqual(r.status, 404);
});

test("missing qr_code returns 400", async () => {
  const r = await api("/api/tickets/checkin", {
    method: "POST",
    token: state.orgToken,
    body: {},
  });
  assert.strictEqual(r.status, 400);
});

test("organizer sees the attendance list", async () => {
  const r = await api(`/api/tickets/event/${state.eventId}`, {
    token: state.orgToken,
  });
  assert.strictEqual(r.status, 200);
  assert.ok(r.data.checked_in >= 1);
});

test.after(async () => {
  await pool.end();
});