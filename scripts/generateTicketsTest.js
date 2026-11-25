const Ticket = require("../models/Ticket");

const bookingId = process.argv[2];
if (!bookingId) {
  console.log("Usage: node scripts/generateTicketsTest.js <bookingId>");
  process.exit(1);
}

Ticket.generateForBooking(bookingId)
  .then((tickets) => {
    console.log(tickets);
    process.exit(0);
  })
  .catch((err) => {
    console.error(err.message);
    process.exit(1);
  });