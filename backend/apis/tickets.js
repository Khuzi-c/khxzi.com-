const { readJSON, writeJSON } = require('../utils/storage');
const path = require('path');

const TICKETS_FILE = path.join(__dirname, '../data/tickets.json');

const getTickets = () => readJSON(TICKETS_FILE) || [];
const saveTickets = (tickets) => writeJSON(TICKETS_FILE, tickets);

module.exports = function (app, io, discordClient) {

    // Submit Ticket
    app.post('/api/tickets/submit', async (req, res) => {
        try {
            const { username, email, category, subject, message, attachments, discordId } = req.body;

            if (!username || !email || !category || !subject || !message) {
                return res.status(400).json({ error: 'Missing required fields' });
            }

            const tickets = getTickets();
            const newTicket = {
                id: Date.now().toString(),
                username,
                email,
                category,
                subject,
                message,
                attachments: attachments || [],
                status: 'Open',
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
                assigned_to: null,
                replies: [],
                discordChannelId: null
            };

            tickets.push(newTicket);
            saveTickets(tickets);

            // Create Discord ticket channel if user has Discord ID
            if (discordId && discordClient) {
                try {
                    const { createTicketChannel } = require('../discord/commands/ticket');
                    const channelId = await createTicketChannel(discordClient, discordId, username, category, subject);

                    if (channelId) {
                        newTicket.discordChannelId = channelId;
                        saveTickets(tickets);
                    }
                } catch (err) {
                    console.error('Discord channel creation error:', err);
                }
            }

            // Notify admins via Socket.io
            if (io) {
                io.emit('new_ticket', newTicket);
            }

            res.json({ success: true, ticket: newTicket });
        } catch (err) {
            console.error('Ticket submission error:', err);
            res.status(500).json({ error: 'Server error' });
        }
    });

    // Get All Tickets (Admin)
    app.get('/api/tickets/all', (req, res) => {
        const tickets = getTickets();
        res.json(tickets);
    });

    // Get User Tickets
    app.get('/api/tickets/user/:username', (req, res) => {
        const { username } = req.params;
        const tickets = getTickets();
        const userTickets = tickets.filter(t => t.username === username);
        res.json(userTickets);
    });

    // Update Ticket Status (Admin)
    app.post('/api/tickets/update', (req, res) => {
        try {
            const { ticketId, status, assigned_to } = req.body;

            const tickets = getTickets();
            const ticketIndex = tickets.findIndex(t => t.id === ticketId);

            if (ticketIndex === -1) {
                return res.status(404).json({ error: 'Ticket not found' });
            }

            if (status) tickets[ticketIndex].status = status;
            if (assigned_to) tickets[ticketIndex].assigned_to = assigned_to;
            tickets[ticketIndex].updated_at = new Date().toISOString();

            saveTickets(tickets);

            // Notify via Socket.io
            if (io) {
                io.emit('ticket_updated', tickets[ticketIndex]);
            }

            res.json({ success: true, ticket: tickets[ticketIndex] });
        } catch (err) {
            console.error('Ticket update error:', err);
            res.status(500).json({ error: 'Server error' });
        }
    });

    // Add Reply to Ticket
    app.post('/api/tickets/reply', (req, res) => {
        try {
            const { ticketId, author, message } = req.body;

            const tickets = getTickets();
            const ticketIndex = tickets.findIndex(t => t.id === ticketId);

            if (ticketIndex === -1) {
                return res.status(404).json({ error: 'Ticket not found' });
            }

            const reply = {
                id: Date.now().toString(),
                author,
                message,
                created_at: new Date().toISOString()
            };

            tickets[ticketIndex].replies.push(reply);
            tickets[ticketIndex].updated_at = new Date().toISOString();

            saveTickets(tickets);

            // Notify via Socket.io
            if (io) {
                io.emit('ticket_reply', { ticketId, reply });
            }

            res.json({ success: true, reply });
        } catch (err) {
            console.error('Reply error:', err);
            res.status(500).json({ error: 'Server error' });
        }
    });
};
