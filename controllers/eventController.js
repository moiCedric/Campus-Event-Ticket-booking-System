
const Event = require("../models/Event");

async function create(req, res) {
    try {
        const {
            title,
            event_date,
            capacity,
            ticket_price
        } = req.body;

        if (!title || !event_date || !capacity) {
            return res.status(400).json({
                error: "Title, event date and capacity are required"
            });
        }

        if (!Number.isInteger(Number(capacity)) || Number(capacity) <= 0) {
            return res.status(400).json({
                error: "Capacity must be a positive whole number"
            });
        }

        if (
            !Number.isFinite(Number(ticket_price ?? 0)) ||
            Number(ticket_price ?? 0) < 0
        ) {
            return res.status(400).json({
                error: "Ticket price must be a valid non-negative number"
            });
        }

        if (Number.isNaN(new Date(event_date).getTime())) {
            return res.status(400).json({
                error: "Please provide a valid event date"
            });
        }

        const event = await Event.createEvent(req.user.id, req.body);

        res.status(201).json({
            message: "Event created successfully",
            event
        });

    } catch (err) {
        console.error(err);
        res.status(500).json({
            error: "Could not create event"
        });
    }
}

async function list(req, res) {
    try {
        const { category, venue, search } = req.query;

        const events = await Event.listEvents({
            category,
            venue,
            search,
            onlyPublished: true
        });

        res.json(events);

    } catch (err) {
        console.error(err);
        res.status(500).json({
            error: "Could not fetch events"
        });
    }
}

async function getOne(req, res) {
    try {
        const event = await Event.getEventById(req.params.id);

        if (!event) {
            return res.status(404).json({
                error: "Event not found"
            });
        }

        res.json(event);

    } catch (err) {
        console.error(err);
        res.status(500).json({
            error: "Could not fetch event"
        });
    }
}

async function update(req, res) {
    try {
        const event = await Event.getEventById(req.params.id);

        if (!event) {
            return res.status(404).json({
                error: "Event not found"
            });
        }

        const isOwner =
            Number(event.organizer_id) === Number(req.user.id);

        if (!isOwner && req.user.role !== "admin") {
            return res.status(403).json({
                error: "You can only edit your own events"
            });
        }

        const {
            title,
            event_date,
            capacity,
            ticket_price,
            status
        } = req.body;

        if (title !== undefined && !String(title).trim()) {
            return res.status(400).json({
                error: "Event title cannot be empty"
            });
        }

        if (capacity !== undefined) {
            if (
                !Number.isInteger(Number(capacity)) ||
                Number(capacity) <= 0
            ) {
                return res.status(400).json({
                    error: "Capacity must be a positive whole number"
                });
            }
        }

        if (ticket_price !== undefined) {
            if (
                !Number.isFinite(Number(ticket_price)) ||
                Number(ticket_price) < 0
            ) {
                return res.status(400).json({
                    error: "Ticket price must be a valid non-negative number"
                });
            }
        }

        if (event_date !== undefined) {
            if (Number.isNaN(new Date(event_date).getTime())) {
                return res.status(400).json({
                    error: "Please provide a valid event date"
                });
            }
        }

        if (status !== undefined) {
            const allowedStatuses = ["draft", "published", "cancelled"];

            if (!allowedStatuses.includes(status)) {
                return res.status(400).json({
                    error: "Invalid event status"
                });
            }
        }

        const updated = await Event.updateEvent(
            req.params.id,
            req.body
        );

        res.json({
            message: "Event updated successfully",
            event: updated
        });

    } catch (err) {
        console.error(err);
        res.status(500).json({
            error: "Could not update event"
        });
    }
}

module.exports = {
    create,
    list,
    getOne,
    update
};

