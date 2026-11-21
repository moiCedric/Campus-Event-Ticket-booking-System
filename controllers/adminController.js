
const pool = require("../config/db");
const User = require("../models/User");
const Event = require("../models/Event");
const Booking = require("../models/Booking");

async function overview(req, res) {
  try {
    const [users] = await pool.query(
      "SELECT COUNT(*) AS total FROM users"
    );

    const [events] = await pool.query(
      "SELECT COUNT(*) AS total FROM events"
    );

    const [bookings] = await pool.query(
      "SELECT COUNT(*) AS total FROM bookings"
    );

    const [tickets] = await pool.query(
      "SELECT COUNT(*) AS total FROM tickets"
    );

    res.json({
      users: users[0].total,
      events: events[0].total,
      bookings: bookings[0].total,
      tickets: tickets[0].total
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Could not load admin overview" });
  }
}

async function listUsers(req, res) {
  try {
    res.json(await User.listUsers());
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Could not fetch users" });
  }
}

async function listEvents(req, res) {
  try {
    res.json(await Event.listEvents({ onlyPublished: false }));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Could not fetch events" });
  }
}

async function listBookings(req, res) {
  try {
    res.json(await Booking.listAll());
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Could not fetch bookings" });
  }
}

module.exports = {
  overview,
  listUsers,
  listEvents,
  listBookings
};
