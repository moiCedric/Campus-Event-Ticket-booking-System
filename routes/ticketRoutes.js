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

module.exports = router;