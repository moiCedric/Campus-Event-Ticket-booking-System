
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

let adminUsers = [];

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

        adminUsers = users;

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

        renderAdminUsers(
            document.getElementById("adminUserSearch")?.value || ""
        );

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
// DISPLAY AND SEARCH ADMIN USERS
// ===============================

function renderAdminUsers(searchTerm = "") {
    const usersTable = document.getElementById("usersTable");

    if (!usersTable) return;

    const search = searchTerm.toLowerCase().trim();

    const filteredUsers = adminUsers.filter(user =>
        String(user.name || "").toLowerCase().includes(search) ||
        String(user.email || "").toLowerCase().includes(search)
    );

    usersTable.innerHTML = filteredUsers.length
        ? filteredUsers.map(user => `
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

                    <button
                        type="button"
                        class="remove-user-button"
                        data-id="${escapeHTML(user.id)}"
                    >
                        Remove
                    </button>
                </td>
            </tr>
        `).join("")
        : `<tr><td colspan="4">No matching users found.</td></tr>`;
}


// ===============================
// ADMIN USER SEARCH
// ===============================

function setupAdminUserSearch() {
    const usersTable = document.getElementById("usersTable");

    if (!usersTable) return;

    if (document.getElementById("adminUserSearch")) return;

    const searchInput = document.createElement("input");

    searchInput.type = "search";
    searchInput.id = "adminUserSearch";
    searchInput.placeholder = "Search users by name or email...";
    searchInput.style.width = "100%";
    searchInput.style.maxWidth = "400px";
    searchInput.style.padding = "12px";
    searchInput.style.marginBottom = "15px";

    const table = usersTable.closest("table");

    if (table && table.parentNode) {
        table.parentNode.insertBefore(searchInput, table);
    }

    searchInput.addEventListener("input", function () {
        renderAdminUsers(searchInput.value);
    });
}


// ===============================
// ADMIN USER MANAGEMENT
// ===============================

function setupAdminUserManagement() {
    const table = document.getElementById("usersTable");

    if (!table) return;

    table.addEventListener("click", async function (e) {

        const updateButton = e.target.closest(
            ".update-user-role-button"
        );

        if (updateButton) {
            const userId = updateButton.dataset.id;

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
                updateButton.disabled = true;
                updateButton.textContent = "Updating...";

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
                updateButton.disabled = false;
                updateButton.textContent = "Update Role";
            }

            return;
        }

        const removeButton = e.target.closest(
            ".remove-user-button"
        );

        if (removeButton) {
            const userId = removeButton.dataset.id;

            const user = adminUsers.find(
                item => String(item.id) === String(userId)
            );

            if (!user) {
                showDashboardMessage("User not found.");
                return;
            }

            const confirmed = confirm(
                `Are you sure you want to remove ${user.name} (${user.email})?`
            );

            if (!confirmed) return;

            try {
                removeButton.disabled = true;
                removeButton.textContent = "Removing...";

                const response = await api(
                    `/admin/users/${userId}`,
                    "DELETE"
                );

                showDashboardMessage(
                    response.message || "User removed successfully!",
                    false
                );

                await loadAdminDashboard();

            } catch (error) {
                console.error("Remove user error:", error);
                showDashboardMessage(error.message);

                removeButton.disabled = false;
                removeButton.textContent = "Remove";
            }
        }
    });
}


// ===============================
// ADMIN ADD USER
// ===============================

function setupAdminAddUserForm() {
    const form = document.getElementById("addUserForm");

    if (!form) return;

    form.addEventListener("submit", async function (e) {
        e.preventDefault();

        const button = form.querySelector('button[type="submit"]');

        const userData = {
            name: document.getElementById("newUserName").value.trim(),
            email: document.getElementById("newUserEmail").value.trim(),
            password: document.getElementById("newUserPassword").value,
            role: document.getElementById("newUserRole").value
        };

        if (!userData.name || !userData.email || !userData.password) {
            showDashboardMessage("Please complete all user fields.");
            return;
        }

        if (userData.password.length < 8) {
            showDashboardMessage("Password must contain at least 8 characters.");
            return;
        }

        try {
            button.disabled = true;
            button.textContent = "Adding User...";

            const response = await api(
                "/admin/users",
                "POST",
                userData
            );

            showDashboardMessage(
                response.message || "User added successfully!",
                false
            );

            form.reset();

            await loadAdminDashboard();

        } catch (error) {
            console.error("Add user error:", error);
            showDashboardMessage(error.message);

        } finally {
            button.disabled = false;
            button.textContent = "Add User";
        }
    });
}


// ===============================
// ADMIN GENERATE REPORT
// ===============================

function setupAdminReports() {
    const generateButton = document.getElementById("generateReportBtn");
    const printButton = document.getElementById("printReportBtn");

    const reportContainer = document.getElementById("reportContainer");
    const reportMessage = document.getElementById("reportMessage");

    if (!generateButton || !reportContainer) return;

    generateButton.addEventListener("click", async function () {
        try {
            generateButton.disabled = true;
            generateButton.textContent = "Generating Report...";

            if (reportMessage) {
                reportMessage.textContent = "";
            }

            const response = await api("/admin/reports");
            const report = response?.data || response;
            const summary = report.summary || {};

            setText("reportTotalUsers", summary.totalUsers ?? 0);
            setText("reportTotalEvents", summary.totalEvents ?? 0);
            setText("reportTotalBookings", summary.totalBookings ?? 0);
            setText("reportTotalTickets", summary.totalTickets ?? 0);

            setText(
                "reportGeneratedAt",
                "Generated: " + formatDate(report.generatedAt)
            );

            const rolesTable = document.getElementById("reportRolesTable");

            if (rolesTable) {
                const roles = Array.isArray(report.usersByRole)
                    ? report.usersByRole
                    : [];

                rolesTable.innerHTML = roles.length
                    ? roles.map(item => `
                        <tr>
                            <td>${escapeHTML(item.role)}</td>
                            <td>${escapeHTML(item.total)}</td>
                        </tr>
                    `).join("")
                    : `<tr><td colspan="2">No user records found.</td></tr>`;
            }

            reportContainer.hidden = false;

            if (reportMessage) {
                reportMessage.textContent = "Report generated successfully!";
                reportMessage.style.color = "#15803d";
            }

            reportContainer.scrollIntoView({
                behavior: "smooth",
                block: "start"
            });

        } catch (error) {
            console.error("Generate report error:", error);

            if (reportMessage) {
                reportMessage.textContent =
                    error.message || "Could not generate report.";
                reportMessage.style.color = "#b91c1c";
            }

        } finally {
            generateButton.disabled = false;
            generateButton.textContent = "Generate Report";
        }
    });

    if (printButton) {
        printButton.addEventListener("click", function () {
            const reportContent = document.getElementById("reportContent");

            if (!reportContent) return;

            const printWindow = window.open("", "_blank");

            if (!printWindow) {
                alert("Please allow pop-ups to print the report.");
                return;
            }

            printWindow.document.write(`
                <!DOCTYPE html>
                <html>
                <head>
                    <title>Campus Events System Report</title>
                    <style>
                        body {
                            font-family: Arial, sans-serif;
                            padding: 30px;
                            color: #222;
                        }

                        h2, h3 {
                            color: #1f2937;
                        }

                        .stats {
                            display: grid;
                            grid-template-columns: repeat(2, 1fr);
                            gap: 15px;
                            margin: 20px 0;
                        }

                        .card {
                            border: 1px solid #ddd;
                            padding: 15px;
                            border-radius: 8px;
                        }

                        table {
                            width: 100%;
                            border-collapse: collapse;
                            margin-top: 15px;
                        }

                        th, td {
                            border: 1px solid #ddd;
                            padding: 10px;
                            text-align: left;
                        }

                        th {
                            background: #f2f2f2;
                        }

                        @media print {
                            body {
                                padding: 0;
                            }
                        }
                    </style>
                </head>
                <body>
                    ${reportContent.innerHTML}
                </body>
                </html>
            `);

            printWindow.document.close();
            printWindow.focus();

            printWindow.onload = function () {
                printWindow.print();
            };
        });
    }
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
let organizerBookings = [];

async function loadOrganizerDashboard() {
    try {
        const [eventsData, bookingsData] = await Promise.all([
            api("/organizer/events"),
            api("/organizer/bookings")
        ]);

        const events = getArray(eventsData);
        const bookings = getArray(bookingsData);

        organizerEvents = events;
        organizerBookings = bookings;

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
                            booking.student_name || "Student"
                        )}</td>
                        <td>${escapeHTML(booking.event_title || "Event")}</td>
                        <td>${escapeHTML(booking.quantity)}</td>
                        <td>${formatMoney(booking.total_amount)}</td>
                        <td>${statusTag(booking.status)}</td>
                        <td>
                            <button type="button"
                                class="view-booking-details"
                                data-id="${escapeHTML(booking.id)}">
                                View Details
                            </button>
                        </td>
                    </tr>
                `).join("")
                : `<tr><td colspan="7">No bookings for your events yet.</td></tr>`;
        }

    } catch (error) {
        console.error("Organizer dashboard error:", error);
        showDashboardMessage(error.message);
    }
}


// ===============================
// ORGANIZER BOOKING DETAILS
// ===============================

function setupOrganizerBookingDetails() {
    const table = document.getElementById("organizerBookingsTable");
    const details = document.getElementById("bookingDetails");
    const content = document.getElementById("bookingDetailsContent");
    const closeButton = document.getElementById("closeBookingDetails");

    if (!table || !details || !content) return;

    table.addEventListener("click", function (e) {
        const button = e.target.closest(".view-booking-details");

        if (!button) return;

        const booking = organizerBookings.find(
            item => String(item.id) === String(button.dataset.id)
        );

        if (!booking) {
            showDashboardMessage("Booking details could not be found.");
            return;
        }

        content.innerHTML = `
            <p><strong>Booking ID:</strong>
                ${escapeHTML(booking.id)}</p>

            <p><strong>Student Name:</strong>
                ${escapeHTML(booking.student_name || "Not available")}</p>

            <p><strong>Student Email:</strong>
                ${escapeHTML(booking.student_email || "Not available")}</p>

            <p><strong>Event:</strong>
                ${escapeHTML(booking.event_title || "Not available")}</p>

            <p><strong>Venue:</strong>
                ${escapeHTML(booking.venue || "Not specified")}</p>

            <p><strong>Event Date:</strong>
                ${formatDate(booking.event_date)}</p>

            <p><strong>Tickets Booked:</strong>
                ${escapeHTML(booking.quantity)}</p>

            <p><strong>Total Amount:</strong>
                ${formatMoney(booking.total_amount)}</p>

            <p><strong>Payment Status:</strong>
                ${statusTag(booking.status)}</p>

            <p><strong>Booking Date:</strong>
                ${formatDate(booking.created_at)}</p>
        `;

        details.hidden = false;

        details.scrollIntoView({
            behavior: "smooth",
            block: "start"
        });
    });

    if (closeButton) {
        closeButton.addEventListener("click", function () {
            details.hidden = true;
        });
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

        setupAdminUserSearch();
        setupAdminUserManagement();
        setupAdminAddUserForm();
        setupAdminReports();

        loadAdminDashboard();
    }

    if (dashboard === "organizer") {
        if (!Auth.require(["organizer"])) return;

        setupCreateEventForm();
        setupEditEventForm();
        setupEventActions();
        setupTicketVerification();
        setupOrganizerBookingDetails();

        loadOrganizerDashboard();
    }

    if (dashboard === "student") {
        if (!Auth.require(["student"])) return;

        setupStudentPaymentActions();
        loadStudentDashboard();
    }
});
