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