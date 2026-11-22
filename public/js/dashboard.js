
function escapeHTML(value) {
    return String(value ?? "").replace(/[&<>"']/g, function (char) {
        return {
            "&": "&amp;",
            "<": "&lt;",
            ">": "&gt;",
            '"': "&quot;",
            "'": "&#039;"
        }[char];
    });
}

function getArray(data) {
    if (Array.isArray(data)) return data;
    if (Array.isArray(data?.data)) return data.data;
    if (Array.isArray(data?.items)) return data.items;
    if (Array.isArray(data?.events)) return data.events;
    if (Array.isArray(data?.bookings)) return data.bookings;
    if (Array.isArray(data?.users)) return data.users;
    return [];
}

function formatDate(value) {
    if (!value) return "Not specified";

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
        return escapeHTML(value);
    }

    return date.toLocaleString();
}

function formatMoney(value) {
    const amount = Number(value || 0);

    return "KES " + amount.toLocaleString("en-KE", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    });
}

function showDashboardMessage(message, isError = true) {
    const element = document.getElementById("msg");

    if (!element) return;

    element.textContent = message;
    element.style.display = "block";
    element.style.color = isError ? "#b91c1c" : "#15803d";
}

function setText(id, value) {
    const element = document.getElementById(id);

    if (element) {
        element.textContent = value;
    }
}

function statusTag(status) {
    const value = String(status || "unknown");

    return `<span class="tag">${escapeHTML(value)}</span>`;
}


// ===============================
// ADMIN DASHBOARD
// ===============================

async function loadAdminDashboard() {
    try {
        const [overviewData, usersData, eventsData, bookingsData] =
            await Promise.all([
                api("/admin/overview"),
                api("/admin/users"),
                api("/admin/events"),
                api("/admin/bookings")
            ]);

        const users = getArray(usersData);
        const events = getArray(eventsData);
        const bookings = getArray(bookingsData);

        const overview = overviewData?.data || overviewData || {};

        setText(
            "totalUsers",
            overview.users ?? overview.totalUsers ?? users.length
        );

        setText(
            "totalEvents",
            overview.events ?? overview.totalEvents ?? events.length
        );

        setText(
            "totalBookings",
            overview.bookings ?? overview.totalBookings ?? bookings.length
        );

        setText(
            "totalTickets",
            overview.tickets ?? overview.totalTickets ?? "N/A"
        );

        // USERS TABLE WITH ROLE MANAGEMENT
        const usersTable = document.getElementById("usersTable");

        if (usersTable) {
            usersTable.innerHTML = users.length
                ? users.map(user => `
                    <tr>
                        <td>${escapeHTML(user.id)}</td>
                        <td>${escapeHTML(user.name)}</td>
                        <td>${escapeHTML(user.email)}</td>
                        <td>
                            <select
                                class="user-role-select"
                                data-id="${escapeHTML(user.id)}"
                            >
                                <option value="student"
                                    ${user.role === "student" ? "selected" : ""}>
                                    Student
                                </option>

                                <option value="organizer"
                                    ${user.role === "organizer" ? "selected" : ""}>
                                    Organizer
                                </option>

                                <option value="admin"
                                    ${user.role === "admin" ? "selected" : ""}>
                                    Admin
                                </option>
                            </select>

                            <button
                                type="button"
                                class="update-user-role-button"
                                data-id="${escapeHTML(user.id)}"
                            >
                                Update Role
                            </button>
                        </td>
                    </tr>
                `).join("")
                : `<tr><td colspan="4">No users found.</td></tr>`;
        }

        // EVENTS TABLE
        const eventsTable = document.getElementById("eventsTable");

        if (eventsTable) {
            eventsTable.innerHTML = events.length
                ? events.map(event => `
                    <tr>
                        <td>${escapeHTML(event.title)}</td>
                        <td>${escapeHTML(event.venue)}</td>
                        <td>${formatDate(event.event_date)}</td>
                        <td>${statusTag(event.status)}</td>
                    </tr>
                `).join("")
                : `<tr><td colspan="4">No events found.</td></tr>`;
        }

        // BOOKINGS TABLE
        const bookingsTable = document.getElementById("bookingsTable");

        if (bookingsTable) {
            bookingsTable.innerHTML = bookings.length
                ? bookings.map(booking => `
                    <tr>
                        <td>${escapeHTML(booking.id)}</td>
                        <td>${escapeHTML(
                            booking.user_name || booking.student_name || "Student"
                        )}</td>
                        <td>${escapeHTML(booking.event_title || "Event")}</td>
                        <td>${escapeHTML(booking.quantity)}</td>
                        <td>${formatMoney(booking.total_amount)}</td>
                        <td>${statusTag(booking.status)}</td>
                    </tr>
                `).join("")
                : `<tr><td colspan="6">No bookings found.</td></tr>`;
        }

    } catch (error) {
        console.error("Admin dashboard error:", error);
        showDashboardMessage(error.message);
    }
}


// ===============================
// ADMIN USER MANAGEMENT
// ===============================

function setupAdminUserManagement() {
    const table = document.getElementById("usersTable");

    if (!table) return;

    table.addEventListener("click", async function (e) {
        const button = e.target.closest(".update-user-role-button");

        if (!button) return;

        const userId = button.dataset.id;

        const select = table.querySelector(
            `.user-role-select[data-id="${userId}"]`
        );

        if (!select) return;

        const newRole = select.value;

        const confirmed = confirm(
            `Change this user's role to ${newRole}?`
        );

        if (!confirmed) return;

        try {
            button.disabled = true;
            button.textContent = "Updating...";

            const response = await api(
                `/admin/users/${userId}/role`,
                "PATCH",
                { role: newRole }
            );

            showDashboardMessage(
                response.message || "User role updated successfully!",
                false
            );

            await loadAdminDashboard();

        } catch (error) {
            console.error("Update user role error:", error);
            showDashboardMessage(error.message);

        } finally {
            button.disabled = false;
            button.textContent = "Update Role";
        }
    });
}


// ===============================
// CREATE EVENT
// ===============================

function setupCreateEventForm() {
    const form = document.getElementById("createEventForm");

    if (!form) return;

    form.addEventListener("submit", async function (e) {
        e.preventDefault();

        const button = document.getElementById("createEventButton");

        const eventDateInput =
            document.getElementById("event_date").value;

        const eventData = {
            title: document.getElementById("title").value.trim(),
            description: document.getElementById("description").value.trim(),
            category: document.getElementById("category").value,
            venue: document.getElementById("venue").value.trim(),
            event_date: eventDateInput.replace("T", " ") +
                (eventDateInput.length === 16 ? ":00" : ""),
            capacity: Number(
                document.getElementById("capacity").value
            ),
            ticket_price: Number(
                document.getElementById("ticket_price").value || 0
            )
        };

        if (!eventData.title || !eventDateInput || !eventData.capacity) {
            showDashboardMessage(
                "Please fill in the event title, date and capacity."
            );
            return;
        }

        if (!Number.isInteger(eventData.capacity) ||
            eventData.capacity <= 0) {
            showDashboardMessage(
                "Capacity must be a positive whole number."
            );
            return;
        }

        if (!Number.isFinite(eventData.ticket_price) ||
            eventData.ticket_price < 0) {
            showDashboardMessage(
                "Please enter a valid ticket price."
            );
            return;
        }

        try {
            button.disabled = true;
            button.textContent = "Creating Event...";

            const response = await api(
                "/events",
                "POST",
                eventData
            );

            showDashboardMessage(
                response.message || "Event created successfully!",
                false
            );

            form.reset();

            await loadOrganizerDashboard();

        } catch (error) {
            console.error("Create event error:", error);
            showDashboardMessage(error.message);

        } finally {
            button.disabled = false;
            button.textContent = "Create Event";
        }
    });
}


// ===============================
// ORGANIZER DASHBOARD
// ===============================

let organizerEvents = [];

async function loadOrganizerDashboard() {
    try {
        const [eventsData, bookingsData] = await Promise.all([
            api("/organizer/events"),
            api("/organizer/bookings")
        ]);

        const events = getArray(eventsData);
        const bookings = getArray(bookingsData);

        organizerEvents = events;

        setText("myEventsCount", events.length);
        setText("myBookingsCount", bookings.length);

        const eventsTable =
            document.getElementById("organizerEventsTable");

        if (eventsTable) {
            eventsTable.innerHTML = events.length
                ? events.map(event => `
                    <tr>
                        <td>${escapeHTML(event.title)}</td>
                        <td>${escapeHTML(event.venue)}</td>
                        <td>${formatDate(event.event_date)}</td>
                        <td>${escapeHTML(event.capacity)}</td>
                        <td>${formatMoney(event.ticket_price)}</td>
                        <td>${statusTag(event.status)}</td>
                        <td>
                            <button type="button"
                                class="edit-event-button"
                                data-id="${escapeHTML(event.id)}">
                                Edit
                            </button>

                            ${
                                event.status === "draft"
                                    ? `<button type="button"
                                        class="publish-event-button"
                                        data-id="${escapeHTML(event.id)}">
                                        Publish
                                    </button>`
                                    : ""
                            }

                            ${
                                event.status !== "cancelled"
                                    ? `<button type="button"
                                        class="cancel-event-button"
                                        data-id="${escapeHTML(event.id)}">
                                        Cancel
                                    </button>`
                                    : ""
                            }
                        </td>
                    </tr>
                `).join("")
                : `<tr><td colspan="7">You have not created any events yet.</td></tr>`;
        }

        const bookingsTable =
            document.getElementById("organizerBookingsTable");

        if (bookingsTable) {
            bookingsTable.innerHTML = bookings.length
                ? bookings.map(booking => `
                    <tr>
                        <td>${escapeHTML(booking.id)}</td>
                        <td>${escapeHTML(
                            booking.user_name || booking.student_name || "Student"
                        )}</td>
                        <td>${escapeHTML(booking.event_title || "Event")}</td>
                        <td>${escapeHTML(booking.quantity)}</td>
                        <td>${formatMoney(booking.total_amount)}</td>
                        <td>${statusTag(booking.status)}</td>
                    </tr>
                `).join("")
                : `<tr><td colspan="6">No bookings for your events yet.</td></tr>`;
        }

    } catch (error) {
        console.error("Organizer dashboard error:", error);
        showDashboardMessage(error.message);
    }
}


// ===============================
// TICKET VERIFICATION
// ===============================

function setupTicketVerification() {
    const form = document.getElementById("verifyTicketForm");

    if (!form) return;

    const ticketInput = document.getElementById("ticketNumber");
    const button = document.getElementById("verifyTicketButton");
    const result = document.getElementById("ticketVerificationResult");

    if (!ticketInput || !button || !result) return;

    form.addEventListener("submit", async function (e) {
        e.preventDefault();

        const ticketNumber = ticketInput.value.trim();

        if (!ticketNumber) {
            result.textContent = "Please enter a ticket number.";
            result.style.color = "#b91c1c";
            return;
        }

        try {
            button.disabled = true;
            button.textContent = "Verifying...";

            result.textContent = "Checking ticket...";
            result.style.color = "#555";

            const response = await api(
                "/organizer/tickets/verify",
                "POST",
                {
                    ticket_number: ticketNumber
                }
            );

            const ticket = response.ticket;

            result.innerHTML = `
                <div class="card">
                    <h3>Ticket Verified Successfully</h3>

                    <p>
                        <strong>Ticket Number:</strong>
                        ${escapeHTML(ticket.ticket_number)}
                    </p>

                    <p>
                        <strong>Event:</strong>
                        ${escapeHTML(ticket.event_title)}
                    </p>

                    <p>
                        <strong>Date:</strong>
                        ${formatDate(ticket.event_date)}
                    </p>

                    <p>
                        <strong>Venue:</strong>
                        ${escapeHTML(ticket.venue || "Not specified")}
                    </p>

                    <p>
                        <strong>Status:</strong>
                        ${statusTag(ticket.status)}
                    </p>

                    <p style="color: #15803d;">
                        ${escapeHTML(response.message)}
                    </p>
                </div>
            `;

            result.style.color = "#15803d";

            form.reset();

        } catch (error) {
            console.error("Ticket verification error:", error);

            result.textContent =
                error.message || "Could not verify ticket.";

            result.style.color = "#b91c1c";

        } finally {
            button.disabled = false;
            button.textContent = "Verify Ticket";
        }
    });
}


// ===============================
// EDIT EVENT
// ===============================

function setupEditEventForm() {
    const form = document.getElementById("editEventForm");
    const section = document.getElementById("editEventSection");
    const cancelButton = document.getElementById("cancelEditButton");

    if (!form || !section) return;

    form.addEventListener("submit", async function (e) {
        e.preventDefault();

        const button = document.getElementById("saveEditButton");
        const id = document.getElementById("editEventId").value;
        const dateInput = document.getElementById("editDate").value;

        const eventData = {
            title: document.getElementById("editTitle").value.trim(),
            description: document.getElementById("editDescription").value.trim(),
            category: document.getElementById("editCategory").value,
            venue: document.getElementById("editVenue").value.trim(),
            event_date: dateInput.replace("T", " ") +
                (dateInput.length === 16 ? ":00" : ""),
            capacity: Number(
                document.getElementById("editCapacity").value
            ),
            ticket_price: Number(
                document.getElementById("editPrice").value
            )
        };

        if (!eventData.title || !dateInput) {
            showDashboardMessage(
                "Please enter an event title and date."
            );
            return;
        }

        if (!Number.isInteger(eventData.capacity) ||
            eventData.capacity <= 0) {
            showDashboardMessage(
                "Capacity must be a positive whole number."
            );
            return;
        }

        if (!Number.isFinite(eventData.ticket_price) ||
            eventData.ticket_price < 0) {
            showDashboardMessage(
                "Please enter a valid ticket price."
            );
            return;
        }

        try {
            button.disabled = true;
            button.textContent = "Saving...";

            const response = await api(
                `/events/${id}`,
                "PATCH",
                eventData
            );

            showDashboardMessage(
                response.message || "Event updated successfully!",
                false
            );

            section.hidden = true;
            form.reset();

            await loadOrganizerDashboard();

        } catch (error) {
            console.error("Edit event error:", error);
            showDashboardMessage(error.message);

        } finally {
            button.disabled = false;
            button.textContent = "Save Changes";
        }
    });

    if (cancelButton) {
        cancelButton.addEventListener("click", function () {
            section.hidden = true;
            form.reset();
        });
    }
}


// ===============================
// EVENT ACTION BUTTONS
// ===============================

function setupEventActions() {
    const table = document.getElementById("organizerEventsTable");

    if (!table) return;

    table.addEventListener("click", async function (e) {
        const button = e.target.closest("button");

        if (!button) return;

        const id = button.dataset.id;

        const event = organizerEvents.find(
            item => String(item.id) === String(id)
        );

        if (!event) {
            showDashboardMessage("Event not found.");
            return;
        }

        // EDIT EVENT
        if (button.classList.contains("edit-event-button")) {
            const section =
                document.getElementById("editEventSection");

            document.getElementById("editEventId").value = event.id;
            document.getElementById("editTitle").value = event.title || "";
            document.getElementById("editDescription").value =
                event.description || "";
            document.getElementById("editCategory").value =
                event.category || "";
            document.getElementById("editVenue").value =
                event.venue || "";

            const date = new Date(event.event_date);
            const localDate = new Date(
                date.getTime() - date.getTimezoneOffset() * 60000
            );

            document.getElementById("editDate").value =
                localDate.toISOString().slice(0, 16);

            document.getElementById("editCapacity").value =
                event.capacity;

            document.getElementById("editPrice").value =
                event.ticket_price ?? 0;

            section.hidden = false;
            section.scrollIntoView({
                behavior: "smooth",
                block: "start"
            });

            return;
        }

        // PUBLISH EVENT
        if (button.classList.contains("publish-event-button")) {
            const confirmed = confirm(
                "Are you sure you want to publish this event? Students will be able to see it."
            );

            if (!confirmed) return;

            try {
                button.disabled = true;

                const response = await api(
                    `/events/${id}`,
                    "PATCH",
                    { status: "published" }
                );

                showDashboardMessage(
                    response.message || "Event published successfully!",
                    false
                );

                await loadOrganizerDashboard();

            } catch (error) {
                console.error("Publish event error:", error);
                showDashboardMessage(error.message);
                button.disabled = false;
            }

            return;
        }

        // CANCEL EVENT
        if (button.classList.contains("cancel-event-button")) {
            const confirmed = confirm(
                "Are you sure you want to cancel this event?"
            );

            if (!confirmed) return;

            try {
                button.disabled = true;

                const response = await api(
                    `/events/${id}`,
                    "PATCH",
                    { status: "cancelled" }
                );

                showDashboardMessage(
                    response.message || "Event cancelled successfully!",
                    false
                );

                await loadOrganizerDashboard();

            } catch (error) {
                console.error("Cancel event error:", error);
                showDashboardMessage(error.message);
                button.disabled = false;
            }
        }
    });
}


// ===============================
// STUDENT DASHBOARD
// ===============================

async function loadStudentDashboard() {
    try {
        const [eventsData, bookingsData, ticketsData] =
            await Promise.all([
                api("/events"),
                api("/bookings/mine"),
                api("/bookings/tickets/mine")
            ]);

        const events = getArray(eventsData);
        const bookings = getArray(bookingsData);
        const tickets = getArray(ticketsData);

        setText("availableEventsCount", events.length);
        setText("studentBookingsCount", bookings.length);

        // AVAILABLE EVENTS
        const eventContainer =
            document.getElementById("studentEvents");

        if (eventContainer) {
            eventContainer.innerHTML = events.length
                ? events.slice(0, 6).map(event => `
                    <div class="card">
                        <h3>${escapeHTML(event.title)}</h3>
                        <p>${escapeHTML(event.description || "")}</p>
                        <p>
                            <strong>Venue:</strong>
                            ${escapeHTML(event.venue)}
                        </p>
                        <p>
                            <strong>Date:</strong>
                            ${formatDate(event.event_date)}
                        </p>
                        <p>
                            <strong>Ticket price:</strong>
                            ${formatMoney(event.ticket_price)}
                        </p>
                        <a href="book.html?id=${encodeURIComponent(event.id)}">
                            Book Tickets
                        </a>
                    </div>
                `).join("")
                : `<p>No published events are currently available.</p>`;
        }

        // STUDENT BOOKINGS
        const bookingsTable =
            document.getElementById("studentBookingsTable");

        if (bookingsTable) {
            bookingsTable.innerHTML = bookings.length
                ? bookings.map(booking => `
                    <tr>
                        <td>${escapeHTML(booking.id)}</td>
                        <td>${escapeHTML(booking.event_title || "Event")}</td>
                        <td>${formatDate(booking.event_date)}</td>
                        <td>${escapeHTML(booking.quantity)}</td>
                        <td>${formatMoney(booking.total_amount)}</td>
                        <td>${statusTag(booking.status)}</td>
                        <td>
                            ${
                                booking.status === "pending"
                                    ? `<button
                                        type="button"
                                        class="pay-booking-button"
                                        data-id="${escapeHTML(booking.id)}">
                                        Pay Now
                                    </button>`
                                    : booking.status === "paid"
                                        ? `<span class="tag">Paid</span>`
                                        : `<span class="tag">No action</span>`
                            }
                        </td>
                    </tr>
                `).join("")
                : `<tr><td colspan="7">You have not made any bookings yet.</td></tr>`;
        }

        // STUDENT TICKETS
        const ticketsTable =
            document.getElementById("studentTicketsTable");

        if (ticketsTable) {
            ticketsTable.innerHTML = tickets.length
                ? tickets.map(ticket => `
                    <tr>
                        <td>
                            <strong>${escapeHTML(ticket.ticket_number)}</strong>
                        </td>
                        <td>${escapeHTML(ticket.event_title || "Event")}</td>
                        <td>${formatDate(ticket.event_date)}</td>
                        <td>${escapeHTML(ticket.venue || "Not specified")}</td>
                        <td>
                            ${
                                Number(ticket.is_checked_in) === 1
                                    ? statusTag("Checked In")
                                    : statusTag("Valid")
                            }
                        </td>
                    </tr>
                `).join("")
                : `<tr><td colspan="5">No tickets generated yet. Complete payment to receive your tickets.</td></tr>`;
        }

    } catch (error) {
        console.error("Student dashboard error:", error);
        showDashboardMessage(error.message);
    }
}


// ===============================
// STUDENT PAYMENT ACTIONS
// ===============================

function setupStudentPaymentActions() {
    const table = document.getElementById("studentBookingsTable");

    if (!table) return;

    table.addEventListener("click", async function (e) {
        const button = e.target.closest(".pay-booking-button");

        if (!button) return;

        const bookingId = button.dataset.id;

        const confirmed = confirm(
            "Proceed with simulated payment for this booking?"
        );

        if (!confirmed) return;

        try {
            button.disabled = true;
            button.textContent = "Processing...";

            const response = await api(
                `/bookings/${bookingId}/pay`,
                "POST"
            );

            const ticketNumbers = response.tickets || [];

            showDashboardMessage(
                "Payment successful! Your ticket numbers: " +
                ticketNumbers.join(", "),
                false
            );

            await loadStudentDashboard();

        } catch (error) {
            console.error("Payment error:", error);
            showDashboardMessage(error.message);

            button.disabled = false;
            button.textContent = "Pay Now";
        }
    });
}


// ===============================
// INITIALISE DASHBOARDS
// ===============================

document.addEventListener("DOMContentLoaded", function () {
    const dashboard = document.body.dataset.dashboard;

    if (dashboard === "admin") {
        if (!Auth.require(["admin"])) return;

        setupAdminUserManagement();
        loadAdminDashboard();
    }

    if (dashboard === "organizer") {
        if (!Auth.require(["organizer"])) return;

        setupCreateEventForm();
        setupEditEventForm();
        setupEventActions();
        setupTicketVerification();

        loadOrganizerDashboard();
    }

    if (dashboard === "student") {
        if (!Auth.require(["student"])) return;

        setupStudentPaymentActions();
        loadStudentDashboard();
    }
});


