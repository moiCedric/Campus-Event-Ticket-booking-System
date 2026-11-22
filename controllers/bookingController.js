
const pool = require("../config/db");
const Booking = require("../models/Booking");

async function create(req, res) {
  const { event_id, quantity } = req.body;
  const qty = parseInt(quantity, 10);

  if (!event_id || !qty || qty < 1) {
    return res.status(400).json({
      error: "event_id and a quantity of at least 1 are required"
    });
  }

  let connection;

  try {
    connection = await pool.getConnection();
    await connection.beginTransaction();

    const [eventRows] = await connection.query(
      "SELECT * FROM events WHERE id = ? FOR UPDATE",
      [event_id]
    );

    const event = eventRows[0];

    if (!event || event.status !== "published") {
      await connection.rollback();

      return res.status(404).json({
        error: "Event not found or not open for booking"
      });
    }

    const [reservedRows] = await connection.query(
      `SELECT COALESCE(SUM(quantity), 0) AS reserved
       FROM bookings
       WHERE event_id = ? AND status IN ('pending', 'paid')`,
      [event_id]
    );

    const remaining = event.capacity - reservedRows[0].reserved;

    if (qty > remaining) {
      await connection.rollback();

      return res.status(409).json({
        error: `Only ${remaining} ticket(s) left for this event`
      });
    }

    const bookingId = await Booking.insertBooking(connection, {
      userId: req.user.id,
      eventId: event_id,
      quantity: qty,
      totalAmount: qty * parseFloat(event.ticket_price)
    });

    await connection.commit();

    res.status(201).json({
      message: "Booking created successfully. Please complete payment.",
      booking: await Booking.getBookingById(bookingId)
    });

  } catch (err) {
    if (connection) {
      try {
        await connection.rollback();
      } catch (rollbackError) {
        console.error("BOOKING ROLLBACK ERROR:", rollbackError);
      }
    }

    console.error("BOOKING CREATION ERROR:", err);

    res.status(500).json({
      error: "Could not create booking"
    });

  } finally {
    if (connection) connection.release();
  }
}

async function pay(req, res) {
  let connection;

  try {
    connection = await pool.getConnection();
    await connection.beginTransaction();

    const [rows] = await connection.query(
      "SELECT * FROM bookings WHERE id = ? FOR UPDATE",
      [req.params.id]
    );

    const booking = rows[0];

    if (!booking) {
      await connection.rollback();

      return res.status(404).json({
        error: "Booking not found"
      });
    }

    if (
      Number(booking.user_id) !== Number(req.user.id) &&
      req.user.role !== "admin"
    ) {
      await connection.rollback();

      return res.status(403).json({
        error: "You can only pay for your own bookings"
      });
    }

    if (booking.status === "cancelled") {
      await connection.rollback();

      return res.status(400).json({
        error: "This booking has been cancelled"
      });
    }

    if (booking.status === "paid") {
      await connection.rollback();

      return res.status(400).json({
        error: "This booking has already been paid"
      });
    }

    await connection.query(
      "UPDATE bookings SET status = 'paid' WHERE id = ?",
      [booking.id]
    );

    const tickets = await Booking.createTickets(
      connection,
      booking.id,
      booking.quantity
    );

    await connection.commit();

    res.json({
      message: "Payment successful! Your tickets have been generated.",
      booking_id: booking.id,
      tickets
    });

  } catch (err) {
    if (connection) {
      try {
        await connection.rollback();
      } catch (rollbackError) {
        console.error("PAYMENT ROLLBACK ERROR:", rollbackError);
      }
    }

    console.error("PAYMENT ERROR:", err);

    res.status(500).json({
      error: "Payment could not be completed"
    });

  } finally {
    if (connection) connection.release();
  }
}

async function listMine(req, res) {
  try {
    const bookings = await Booking.listByUser(req.user.id);

    res.json(bookings);

  } catch (err) {
    console.error("FETCH BOOKINGS ERROR:", err);

    res.status(500).json({
      error: "Could not fetch bookings"
    });
  }
}

async function listMyTickets(req, res) {
  try {
    const tickets = await Booking.listTicketsByUser(req.user.id);

    res.json(tickets);

  } catch (err) {
    console.error("FETCH TICKETS ERROR:", err);

    res.status(500).json({
      error: "Could not fetch tickets"
    });
  }
}

async function cancel(req, res) {
  try {
    const booking = await Booking.getBookingById(req.params.id);

    if (!booking) {
      return res.status(404).json({
        error: "Booking not found"
      });
    }

    if (
      Number(booking.user_id) !== Number(req.user.id) &&
      req.user.role !== "admin"
    ) {
      return res.status(403).json({
        error: "You can only cancel your own bookings"
      });
    }

    if (booking.status === "paid") {
      return res.status(400).json({
        error: "Paid bookings cannot be cancelled"
      });
    }

    if (booking.status === "cancelled") {
      return res.status(400).json({
        error: "Booking is already cancelled"
      });
    }

    const updatedBooking = await Booking.updateStatus(
      req.params.id,
      "cancelled"
    );

    res.json(updatedBooking);

  } catch (err) {
    console.error("CANCEL BOOKING ERROR:", err);

    res.status(500).json({
      error: "Could not cancel booking"
    });
  }
}

module.exports = {
  create,
  pay,
  listMine,
  listMyTickets,
  cancel
};
