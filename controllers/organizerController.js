
const pool = require("../config/db");
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

async function verifyTicket(req, res) {
  const ticketNumber = String(req.body.ticket_number || "").trim();

  if (!ticketNumber) {
    return res.status(400).json({
      error: "Please provide a ticket number"
    });
  }

  let connection;

  try {
    connection = await pool.getConnection();
    await connection.beginTransaction();

    const [rows] = await connection.query(
      `SELECT
          t.id AS ticket_id,
          t.ticket_number,
          t.is_checked_in,
          b.status AS booking_status,
          e.title AS event_title,
          e.event_date,
          e.venue
       FROM tickets t
       INNER JOIN bookings b ON t.booking_id = b.id
       INNER JOIN events e ON b.event_id = e.id
       WHERE t.ticket_number = ?
         AND e.organizer_id = ?
       FOR UPDATE`,
      [ticketNumber, req.user.id]
    );

    const ticket = rows[0];

    if (!ticket) {
      await connection.rollback();

      return res.status(404).json({
        error: "Ticket not found or does not belong to your events"
      });
    }

    if (ticket.booking_status !== "paid") {
      await connection.rollback();

      return res.status(400).json({
        error: "This ticket has not been paid for"
      });
    }

    if (Number(ticket.is_checked_in) === 1) {
      await connection.rollback();

      return res.status(409).json({
        error: "This ticket has already been checked in"
      });
    }

    await connection.query(
      `UPDATE tickets
       SET is_checked_in = 1,
           checked_in_at = CURRENT_TIMESTAMP
       WHERE id = ?`,
      [ticket.ticket_id]
    );

    await connection.commit();

    res.json({
      message: "Ticket verified successfully. Check-in completed.",
      ticket: {
        ticket_number: ticket.ticket_number,
        event_title: ticket.event_title,
        event_date: ticket.event_date,
        venue: ticket.venue,
        status: "Checked In"
      }
    });

  } catch (err) {
    if (connection) {
      try {
        await connection.rollback();
      } catch (rollbackError) {
        console.error("TICKET VERIFICATION ROLLBACK ERROR:", rollbackError);
      }
    }

    console.error("TICKET VERIFICATION ERROR:", err);

    res.status(500).json({
      error: "Could not verify ticket"
    });

  } finally {
    if (connection) connection.release();
  }
}

module.exports = {
  listMyEvents,
  listMyBookings,
  verifyTicket
};

