const Ticket = require ("../models/Ticket");
  const Ticket = require("../models/Ticket");
  await Ticket.generateForBooking(booking.id);
   (err) 
  if (err.code !== "MODULE_NOT_FOUND") {
    throw err;
  }
