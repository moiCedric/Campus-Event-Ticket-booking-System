const express = require("express");
const router = express.Router();

const bookingController = require("../controllers/bookingController");
const { requireAuth } = require("../middleware/auth");

// Create a booking
router.post("/", requireAuth, bookingController.create);

// View my bookings
router.get("/mine", requireAuth, bookingController.listMine);

// View my generated tickets
router.get("/tickets/mine", requireAuth, bookingController.listMyTickets);

// Complete simulated payment
router.post("/:id/pay", requireAuth, bookingController.pay);

// Cancel a booking
router.patch("/:id/cancel", requireAuth, bookingController.cancel);

module.exports = router;