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
    const { qr_code } = req.body;
    if (!qr_code) {
      return res.status(400).json({ error: "qr_code is required" });
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