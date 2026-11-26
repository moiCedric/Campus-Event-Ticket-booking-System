const express = require("express");
const router = express.Router();
const ticketController = require("../controllers/ticketController");
const { requireAuth, requireRole } = require("../middleware/auth");

router.get("/mine", requireAuth, ticketController.listMine);
router.post(
  "/checkin",
  requireAuth,
  requireRole("organizer", "admin"),
  ticketController.checkIn
);
router.get(
  "/event/:eventId",
  requireAuth,
  requireRole("organizer", "admin"),
  ticketController.listForEvent
);
module.exports = router;