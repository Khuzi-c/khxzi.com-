/* Notifications System */
let notificationsOpen = false;
let unreadCount = 0;

async function loadNotifications() {
    try {
        const res = await fetch('/api/notifications/all');
        const notifications = await res.json();

        // Count unread
        const unread = notifications.filter(n => !n.read).length;
        updateNotificationBadge(unread);

        return notifications;
    } catch (err) {
        console.error('Load notifications error:', err);
        return [];
    }
}

function updateNotificationBadge(count) {
    unreadCount = count;
    const badge = document.getElementById('notificationBadge');
    if (badge) {
        badge.textContent = count;
        badge.style.display = count > 0 ? 'flex' : 'none';
    }
}

async function toggleNotifications() {
    notificationsOpen = !notificationsOpen;
    const panel = document.getElementById('notificationPanel');

    if (notificationsOpen) {
        const notifications = await loadNotifications();
        renderNotifications(notifications);
        panel.style.display = 'block';

        // Mark as read
        await fetch('/api/notifications/mark-read', { method: 'POST' });
        updateNotificationBadge(0);
    } else {
        panel.style.display = 'none';
    }
}

function renderNotifications(notifications) {
    const container = document.getElementById('notificationsList');
    container.innerHTML = '';

    if (notifications.length === 0) {
        container.innerHTML = '<div style="padding: 2rem; text-align: center; color: #888;">No notifications</div>';
        return;
    }

    notifications.forEach(notif => {
        const div = document.createElement('div');
        div.className = 'notification-item';
        div.innerHTML = `
            <div style="font-weight: bold; margin-bottom: 0.5rem;">${notif.title}</div>
            <div style="color: #aaa; font-size: 0.9rem; margin-bottom: 0.5rem;">${notif.message}</div>
            <div style="color: #666; font-size: 0.8rem;">${new Date(notif.created_at).toLocaleString()}</div>
        `;
        container.appendChild(div);
    });
}

// Close notifications when clicking outside
document.addEventListener('click', (e) => {
    const panel = document.getElementById('notificationPanel');
    const bell = document.getElementById('notificationBell');

    if (notificationsOpen && panel && bell && !panel.contains(e.target) && !bell.contains(e.target)) {
        notificationsOpen = false;
        panel.style.display = 'none';
    }
});

// Load notifications on page load
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', loadNotifications);
} else {
    loadNotifications();
}
