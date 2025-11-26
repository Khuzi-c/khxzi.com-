
# Khxzi.com - Ultimate Bio Link Platform

Khxzi.com is a powerful, self-hosted bio link platform that allows users to create stunning, personalized profiles with ease. It features a robust dashboard, real-time analytics, premium subscriptions via Discord, and a fully integrated Discord bot.

## 🚀 Features

### For UsersAA
*   **Custom Profiles**: Create beautiful profiles with custom themes, backgrounds (image/video), and cursor effects.
*   **Link Management**: Add unlimited links with drag-and-drop reordering.
*   **Media Embeds**: Embed background music and videos (YouTube/MP4).
*   **Analytics**: Track profile views and link clicks in real-time.
*   **Vanity URLs**: Claim your unique `@username` (e.g., `khxzi.com/@yourname`).
*   **Premium System**: Unlock exclusive features like animated themes and higher limits.

### For Owners/Admins
*   **Admin Dashboard**: Manage users, view platform statistics, and handle support tickets.
*   **Discord Integration**: Automatically sync premium roles and log actions to Discord.
*   **Ads System**: Manage and display ads on user profiles.
*   **Ticket System**: Built-in support ticket system linked to Discord.

## 🛠️ Installation

1.  **Prerequisites**: Node.js (v16+) and NPM installed.
2.  **Clone/Download**: Download the source code.
3.  **Install Dependencies**:
    ```bash
    npm install
    ```
4.  **Configuration**:
    *   Edit `backend/config.js` (if available) or check `backend/server.js` for port settings.
    *   Ensure `backend/data` directory exists and contains necessary JSON files (`users.json`, `premium_keys.json`, etc.).

## ▶️ Running the Server

Start the backend server:
```bash
cd backend
node server.js
```
The server will start on `http://localhost:3001`.

## 🤖 Discord Bot

The platform includes a Discord bot for managing premium keys and notifications.

*   **Bot Token**: Ensure your bot token is set in `backend/discord.js` or `.env`.
*   **Commands**:
    *   `/premium generate <duration>`: Generate a new premium key (e.g., `1d`, `1m`, `1y`).
    *   `/premium revoke <key>`: Revoke a key.
    *   `/user info <user>`: Get info about a Discord user.

## 📂 Project Structure

*   `backend/`: Node.js server, API endpoints, and data storage.
*   `frontend/`: HTML, CSS, and Client-side JavaScript.
    *   `sites/`: Generated static HTML files for published profiles.
    *   `scripts/`: Dashboard and app logic.
    *   `styles/`: CSS themes and animations.

## 🆘 Support

For support, visit the [Customer Support](/support) page or join our [Discord Server](https://discord.gg/THbZwYpsJs).

---
*Built with ❤️ by Khxzi Dev Team*
