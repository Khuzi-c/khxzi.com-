let currentUser = null;
let links = [];
let unsavedChanges = false;
let allUsers = []; // For Admin

document.addEventListener('DOMContentLoaded', async () => {
    try {
        const auth = await checkAuth();
        console.log('Auth check result:', auth);

        if (!auth || !auth.user) {
            console.log('No auth found, redirecting to login');
            window.location.href = '/login';
            return;
        }

        // Handle different auth response structures
        currentUser = auth.user || auth;

        if (!currentUser.username) {
            console.log('No username found, redirecting to login');
            window.location.href = '/login';
            return;
        }

        console.log('Logged in as:', currentUser.username);

        // Show Admin UI if user is admin
        if (currentUser.isAdmin) {
            const adminNavItem = document.getElementById('adminNavItem');
            if (adminNavItem) adminNavItem.style.display = 'flex';
        }

        initializeDashboard();
    } catch (err) {
        console.error('Init error:', err);
        if (!window.location.href.includes('/login')) {
            alert('Authentication error: ' + err.message);
            window.location.href = '/login';
        }
    }
});

function initializeDashboard() {
    // Load Data safely
    safeSetValue('usernameDisplay', currentUser.username);
    safeSetValue('bioInput', currentUser.bio || '');
    safeSetValue('themeSelect', currentUser.theme || 'red-black');
    safeSetValue('bgMusicInput', currentUser.bgMusic || '');
    safeSetValue('bgVideoInput', currentUser.bgVideo || '');

    if (currentUser.avatar) {
        const avatarPreview = document.getElementById('avatarPreview');
        if (avatarPreview) avatarPreview.src = currentUser.avatar;
    }

    links = currentUser.links || [];
    renderLinks();
    updateDiscordStatus();

    // Initial Preview
    updatePreview();

    // Event Listeners
    setupListeners();
    // Load overview stats
    loadOverview();
}

async function loadOverview() {
    try {
        const res = await fetchAPI('/api/account/overview');
        if (!res || !res.user) return;
        const u = res.user;

        // Update cards
        const cardUsername = document.getElementById('cardUsername');
        const cardAlias = document.getElementById('cardAlias');
        const cardUID = document.getElementById('cardUID');
        const cardViews = document.getElementById('cardViews');
        if (cardUsername) cardUsername.textContent = u.username || '';
        if (cardAlias) cardAlias.textContent = u.alias || 'Unavailable';
        if (cardUID) cardUID.textContent = u.uid || '-';
        const viewCountValue = (res.analytics && res.analytics.views) ? res.analytics.views : 0;
        if (cardViews) cardViews.textContent = viewCountValue;
        const analyticsViews = document.getElementById('analyticsViews');
        if (analyticsViews) analyticsViews.textContent = viewCountValue;

        // Update profile completion
        const pct = res.profileCompletion ? res.profileCompletion.percent : 0;
        const bar = document.getElementById('profileCompletionBar');
        const txt = document.getElementById('profileCompletionText');
        if (bar) bar.style.width = pct + '%';
        if (txt) txt.textContent = `${pct}% completed`;

        // Update checks
        const checks = res.profileCompletion ? res.profileCompletion.checks : {};
        setCompletionCheck('checkAvatar', checks.avatar);
        setCompletionCheck('checkBio', checks.bio);
        setCompletionCheck('checkDiscord', checks.discord);
        setCompletionCheck('checkLinks', checks.links);

        // Populate link click analytics
        const linksListEl = document.getElementById('analyticsLinksList');
        const topLinkEl = document.getElementById('analyticsTopLink');
        if (linksListEl && res.analytics && res.analytics.linkClicks) {
            linksListEl.innerHTML = '';
            const linkClicksObj = res.analytics.linkClicks || {};
            // Convert to array sorted by clicks
            const linkEntries = Object.keys(linkClicksObj).map(k => ({ label: k, clicks: linkClicksObj[k] }));
            linkEntries.sort((a, b) => b.clicks - a.clicks);
            if (topLinkEl) topLinkEl.textContent = (linkEntries[0] && linkEntries[0].label) || '-';
            linkEntries.forEach(entry => {
                const div = document.createElement('div');
                div.style.display = 'flex';
                div.style.justifyContent = 'space-between';
                div.style.padding = '0.5rem 0.75rem';
                div.style.background = 'rgba(255,255,255,0.03)';
                div.style.borderRadius = '6px';
                div.innerHTML = `<div>${entry.label}</div><div style="color:#aaa">${entry.clicks}</div>`;
                linksListEl.appendChild(div);
            });
        } else {
            if (linksListEl) linksListEl.innerHTML = '<div style="color:#666">No link click data available</div>';
            if (topLinkEl) topLinkEl.textContent = '-';
        }
    } catch (err) {
        console.error('Failed to load overview:', err);
    }
}

function setCompletionCheck(id, passed) {
    const el = document.getElementById(id);
    if (!el) return;
    el.style.borderColor = passed ? 'rgba(106,195,107,0.15)' : 'transparent';
    el.style.background = passed ? 'rgba(106,195,107,0.06)' : 'transparent';
    el.querySelector('i').style.color = passed ? '#6ac36b' : '#666';
}

function safeSetValue(id, value) {
    const el = document.getElementById(id);
    if (el) {
        el.value = value;
    } else {
        console.warn(`Element with ID '${id}' not found.`);
    }
}

function setupListeners() {
    // Input changes trigger preview update
    ['bioInput', 'themeSelect', 'bgMusicInput', 'bgVideoInput'].forEach(id => {
        const el = document.getElementById(id);
        if (el) {
            el.addEventListener('input', () => {
                unsavedChanges = true;
                updatePreview();
            });
        }
    });

    // Avatar Upload
    const avatarInput = document.getElementById('avatarInput');
    if (avatarInput) {
        avatarInput.addEventListener('change', async (e) => {
            const file = e.target.files[0];
            if (!file) return;

            const formData = new FormData();
            formData.append('file', file);

            try {
                const res = await fetch('/api/upload?type=avatar', {
                    method: 'POST',
                    body: formData
                });
                const data = await res.json();
                if (data.success) {
                    const avatarPreview = document.getElementById('avatarPreview');
                    const p = data.path || '';
                    const fullPath = p.startsWith('/') ? p : '/' + p;
                    if (avatarPreview) avatarPreview.src = fullPath;
                    currentUser.avatar = fullPath; // Update local state
                    unsavedChanges = true;
                    updatePreview();
                } else {
                    alert('Upload failed: ' + data.error);
                }
            } catch (err) {
                alert('Upload error');
            }
        });
    }

    // Background Music Upload
    const bgMusicFileInput = document.getElementById('bgMusicFileInput');
    const bgMusicInputEl = document.getElementById('bgMusicInput');
    if (bgMusicFileInput) {
        bgMusicFileInput.addEventListener('change', async (e) => {
            const file = e.target.files[0];
            if (!file) return;
            const formData = new FormData();
            formData.append('file', file);
            try {
                const res = await fetch('/api/upload?type=media', { method: 'POST', body: formData });
                const data = await res.json();
                if (data.success) {
                    const p = data.path || '';
                    const fullPath = p.startsWith('/') ? p : '/' + p;
                    if (bgMusicInputEl) bgMusicInputEl.value = fullPath;
                    currentUser.bgMusic = fullPath;
                    unsavedChanges = true;
                    updatePreview();
                } else {
                    alert('Upload failed: ' + data.error);
                }
            } catch (err) {
                alert('Upload error');
            }
        });
    }

    // Background Video Upload
    const bgVideoFileInput = document.getElementById('bgVideoFileInput');
    const bgVideoInputEl = document.getElementById('bgVideoInput');
    if (bgVideoFileInput) {
        bgVideoFileInput.addEventListener('change', async (e) => {
            const file = e.target.files[0];
            if (!file) return;
            const formData = new FormData();
            formData.append('file', file);
            try {
                const res = await fetch('/api/upload?type=media', { method: 'POST', body: formData });
                const data = await res.json();
                if (data.success) {
                    const p = data.path || '';
                    const fullPath = p.startsWith('/') ? p : '/' + p;
                    if (bgVideoInputEl) bgVideoInputEl.value = fullPath;
                    currentUser.bgVideo = fullPath;
                    unsavedChanges = true;
                    updatePreview();
                } else {
                    alert('Upload failed: ' + data.error);
                }
            } catch (err) {
                alert('Upload error');
            }
        });
    }
}

function showSection(sectionId) {
    document.querySelectorAll('.section').forEach(el => el.classList.remove('active'));
    const section = document.getElementById(sectionId);
    if (section) section.classList.add('active');

    document.querySelectorAll('.nav-item').forEach(el => el.classList.remove('active'));
    if (event && event.currentTarget) event.currentTarget.classList.add('active');

    // Load Admin data if opening Admin section
    if (sectionId === 'admin' && currentUser.isAdmin) {
        loadAdminData();
    }
}

function renderLinks() {
    const container = document.getElementById('linksContainer');
    if (!container) return;

    container.innerHTML = '';

    links.forEach((link, index) => {
        const div = document.createElement('div');
        div.className = 'link-item';
        div.innerHTML = `
            <div class="drag-handle"><i class="fas fa-bars"></i></div>
            <div style="flex: 1; display: flex; flex-direction: column; gap: 0.5rem;">
                <input type="text" placeholder="Title (e.g. Instagram)" value="${link.label}" oninput="updateLink(${index}, 'label', this.value)">
                <input type="text" placeholder="URL (https://...)" value="${link.url}" oninput="updateLink(${index}, 'url', this.value)">
            </div>
            <button class="btn" style="color: #ff4444; background: transparent;" onclick="removeLink(${index})"><i class="fas fa-trash"></i></button>
        `;
        container.appendChild(div);
    });
}

function addLink() {
    links.push({ label: '', url: '' });
    renderLinks();
    unsavedChanges = true;
    updatePreview();
}

function updateLink(index, field, value) {
    links[index][field] = value;
    unsavedChanges = true;
    updatePreview();
}

function removeLink(index) {
    links.splice(index, 1);
    renderLinks();
    unsavedChanges = true;
    updatePreview();
}

async function saveChanges() {
    const bioInput = document.getElementById('bioInput');
    const themeSelect = document.getElementById('themeSelect');
    const bgMusicInput = document.getElementById('bgMusicInput');
    const bgVideoInput = document.getElementById('bgVideoInput');
    const avatarPreview = document.getElementById('avatarPreview');

    const data = {
        bio: bioInput ? bioInput.value : '',
        theme: themeSelect ? themeSelect.value : 'red-black',
        bgMusic: bgMusicInput ? bgMusicInput.value : '',
        bgVideo: bgVideoInput ? bgVideoInput.value : '',
        avatar: avatarPreview ? avatarPreview.src : '',
        links: links
    };

    try {
        await fetchAPI('/api/user/updateProfile', {
            method: 'POST',
            body: JSON.stringify(data)
        });

        unsavedChanges = false;
        alert('Changes saved successfully!');
        // Refresh overview values (views, completion, etc.)
        loadOverview();
    } catch (err) {
        console.error(err);
        alert('Failed to save changes: ' + err.message);
    }
}

async function publishSite() {
    if (unsavedChanges) {
        if (!confirm('You have unsaved changes. Save and publish?')) return;
        await saveChanges();
    }

    try {
        const res = await fetchAPI('/api/profile/publish', { method: 'POST' });
        if (res.success) {
            alert('Site published successfully!');
            window.open(`/@${currentUser.username}`, '_blank');
        } else {
            throw new Error(res.message || 'Publish failed');
        }
    } catch (err) {
        alert('Publish failed: ' + err.message);
    }
}

function updatePreview() {
    const frame = document.getElementById('previewFrame');
    if (!frame) return;

    if (frame.src === 'about:blank') {
        frame.src = `/@${currentUser.username}?preview=true`;
    }

    const bioInput = document.getElementById('bioInput');
    const themeSelect = document.getElementById('themeSelect');
    const avatarPreview = document.getElementById('avatarPreview');
    const bgMusicInput = document.getElementById('bgMusicInput');
    const bgVideoInput = document.getElementById('bgVideoInput');

    const data = {
        username: currentUser.username,
        bio: bioInput ? bioInput.value : '',
        theme: themeSelect ? themeSelect.value : 'red-black',
        avatar: avatarPreview ? avatarPreview.src : '',
        links: links,
        bgMusic: bgMusicInput ? bgMusicInput.value : '',
        bgVideo: bgVideoInput ? bgVideoInput.value : ''
    };

    frame.contentWindow.postMessage({ type: 'previewUpdate', data }, '*');
}

function updateDiscordStatus() {
    const container = document.getElementById('discordStatus');
    if (!container) return;

    if (currentUser.discord && currentUser.discord.id) {
        container.innerHTML = `
            <div style="background: rgba(88, 101, 242, 0.1); border: 1px solid #5865F2; padding: 1rem; border-radius: 8px; display: flex; align-items: center; gap: 1rem;">
                <img src="https://cdn.discordapp.com/avatars/${currentUser.discord.id}/${currentUser.discord.avatar}.png" style="width: 40px; height: 40px; border-radius: 50%;">
                <div>
                    <div style="font-weight: bold;">${currentUser.discord.username}</div>
                    <div style="font-size: 0.8rem; color: #aaa;">Connected</div>
                </div>
                <button class="btn" style="margin-left: auto; background: #333; font-size: 0.8rem;" onclick="unlinkDiscord()">Unlink</button>
            </div>
        `;
    } else {
        container.innerHTML = `
            <button class="btn" style="background: #5865F2; color: white; width: 100%;" onclick="linkDiscord()">
                <i class="fab fa-discord"></i> Connect Discord
            </button>
        `;
    }
}

function linkDiscord() {
    const clientId = '1442843317590036562';
    const redirectUri = window.location.hostname === 'localhost'
        ? 'http://localhost:3001/auth/discord/callback'
        : 'https://khxzi.com/auth/discord/callback';
    const scope = 'identify guilds email guilds.join connections';
    window.location.href = `https://discord.com/oauth2/authorize?client_id=${clientId}&response_type=code&redirect_uri=${encodeURIComponent(redirectUri)}&scope=${encodeURIComponent(scope)}`;
}

function logout() {
    document.cookie = 'khxzi_token=; Max-Age=0; path=/';
    window.location.href = '/login';
}

// --- Admin Functions ---

async function loadAdminData() {
    try {
        const res = await fetchAPI('/api/admin/users');
        allUsers = res.users;
        renderUserList(allUsers);
    } catch (err) {
        console.error('Failed to load admin data:', err);
    }
}

function renderUserList(users) {
    const list = document.getElementById('userList');
    if (!list) return;

    list.innerHTML = '';

    users.forEach(user => {
        const div = document.createElement('div');
        div.className = 'user-row';
        div.innerHTML = `
            <div>
                <span style="font-weight: bold;">${user.username}</span>
                ${user.isAdmin ? '<span class="admin-badge">ADMIN</span>' : ''}
                ${user.isBanned ? '<span class="admin-badge" style="background: #333;">BANNED</span>' : ''}
                <div style="font-size: 0.8rem; color: #666;">${user.email || 'No email'}</div>
            </div>
            <div style="display: flex; gap: 0.5rem;">
                <button class="btn" style="font-size: 0.8rem; background: #333;" onclick="resetPassword('${user.username}')">Reset Pass</button>
                ${!user.isAdmin ? `
                    <button class="btn" style="font-size: 0.8rem; background: ${user.isBanned ? '#444' : '#ff4444'};" onclick="toggleBan('${user.username}', ${user.isBanned})">
                        ${user.isBanned ? 'Unban' : 'Ban'}
                    </button>
                ` : ''}
            </div>
        `;
        list.appendChild(div);
    });
}

function searchUsers() {
    const query = document.getElementById('adminSearch').value.toLowerCase();
    const filtered = allUsers.filter(u => u.username.toLowerCase().includes(query));
    renderUserList(filtered);
}

async function resetPassword(username) {
    const newPass = prompt(`Enter new password for ${username}:`);
    if (!newPass) return;

    try {
        await fetchAPI('/api/admin/reset-password', {
            method: 'POST',
            body: JSON.stringify({ username, newPassword: newPass })
        });
        alert('Password reset successfully');
    } catch (err) {
        alert('Error: ' + err.message);
    }
}

async function toggleBan(username, currentStatus) {
    if (!confirm(`${currentStatus ? 'Unban' : 'Ban'} user ${username}?`)) return;

    try {
        await fetchAPI('/api/admin/ban-user', {
            method: 'POST',
            body: JSON.stringify({ username, ban: !currentStatus })
        });
        loadAdminData(); // Refresh list
    } catch (err) {
        alert('Error: ' + err.message);
    }
}

async function banUrl() {
    const url = document.getElementById('banUrlInput').value.trim();
    if (!url) return;

    try {
        await fetchAPI('/api/admin/ban-url', {
            method: 'POST',
            body: JSON.stringify({ url })
        });
        alert(`URL /@${url} banned successfully`);
        document.getElementById('banUrlInput').value = '';
    } catch (err) {
        alert('Error: ' + err.message);
    }
}
