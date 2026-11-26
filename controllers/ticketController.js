const Ticket = require("../models/Ticket");

exports.listMine = async (req, res) => {
  try {
    const userId = req.user.id; // CHECK: use req.user.userId if your token uses that
    const tickets = await Ticket.getTicketsByUser(userId);
    res.json({ tickets });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Could not load tickets" });
  }
};

exports.checkIn = async (req, res) => {
  try {
        const qr_code =
      typeof req.body.qr_code === "string" ? req.body.qr_code.trim() : "";
    if (!qr_code) {
      return res
        .status(400)
        .json({ error: "qr_code is required and must be text" });
    }

    const ticket = await Ticket.getTicketByQr(qr_code);
    if (!ticket) {
      return res.status(404).json({ error: "Unknown ticket" });
    }

    // Organizers can only check in tickets for their own events
    const userId = req.user.id; // CHECK: same key as above
    if (req.user.role === "organizer" && ticket.organizer_id !== userId) {
      return res
        .status(403)
        .json({ error: "This ticket is for another organizer's event" });
    }

    if (ticket.is_checked_in) {
      return res.status(409).json({ error: "Ticket already used" });
    }

    const ok = await Ticket.markCheckedIn(qr_code);
    if (!ok) {
      return res.status(409).json({ error: "Ticket already used" });
    }

    res.json({ message: "Check-in successful", qr_code });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Check-in failed" });
  }
};
exports.listForEvent = async (req, res) => {
  try {
    const eventId = Number(req.params.eventId);
    if (!Number.isInteger(eventId)) {
      return res.status(400).json({ error: "eventId must be a number" });
    }

    const organizerId = await Ticket.getEventOrganizerId(eventId);
    if (organizerId === null) {
      return res.status(404).json({ error: "Event not found" });
    }

    // Organizers can only see tickets for their own events
    if (req.user.role === "organizer" && organizerId !== req.user.id) {
      return res
        .status(403)
        .json({ error: "This is another organizer's event" });
    }

    const tickets = await Ticket.getTicketsByEvent(eventId);
    const checkedIn = tickets.filter((t) => t.is_checked_in).length;
    res.json({
      event_id: eventId,
      total: tickets.length,
      checked_in: checkedIn,
      tickets,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Could not load tickets for this event" });
  }
};