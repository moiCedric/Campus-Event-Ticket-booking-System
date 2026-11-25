
const Event = require("../models/Event");
const Booking = require("../models/Booking");

async function listMyEvents(req, res) {
  try {
    const events = await Event.listByOrganizer(req.user.id);
    res.json(events);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Could not fetch your events" });
  }
}

async function listMyBookings(req, res) {
  try {
    const bookings = await Booking.listByOrganizer(req.user.id);
    res.json(bookings);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Could not fetch your bookings" });
  }
}

module.exports = {
  listMyEvents,
  listMyBookings
};
