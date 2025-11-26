let currentUser = null;
let links = [];
let unsavedChanges = false;

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
        initializeDashboard();
    } catch (err) {
        console.error('Init error:', err);
        // Only alert if it's not a redirect
        if (!window.location.href.includes('/login')) {
            alert('Authentication error: ' + err.message);
            window.location.href = '/login';
        }
    }
});

function initializeDashboard() {
    // Load Data
    document.getElementById('usernameDisplay').value = currentUser.username;
    document.getElementById('bioInput').value = currentUser.bio || '';
    document.getElementById('themeSelect').value = currentUser.theme || 'red-black';
    document.getElementById('bgMusicInput').value = currentUser.bgMusic || '';
    document.getElementById('bgVideoInput').value = currentUser.bgVideo || '';

    if (currentUser.avatar) {
        document.getElementById('avatarPreview').src = currentUser.avatar;
    }

    links = currentUser.links || [];
    renderLinks();
    updateDiscordStatus();

    // Initial Preview
    updatePreview();

    // Event Listeners
    setupListeners();
}

function setupListeners() {
    // Input changes trigger preview update
    ['bioInput', 'themeSelect', 'bgMusicInput', 'bgVideoInput'].forEach(id => {
        document.getElementById(id).addEventListener('input', () => {
            unsavedChanges = true;
            updatePreview();
        });
    });

    // Avatar Upload
    document.getElementById('avatarInput').addEventListener('change', async (e) => {
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
                document.getElementById('avatarPreview').src = data.path;
                currentUser.avatar = data.path; // Update local state
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

function showSection(sectionId) {
    document.querySelectorAll('.section').forEach(el => el.classList.remove('active'));
    document.getElementById(sectionId).classList.add('active');

    document.querySelectorAll('.nav-item').forEach(el => el.classList.remove('active'));
    event.currentTarget.classList.add('active');
}

function renderLinks() {
    const container = document.getElementById('linksContainer');
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
    const data = {
        bio: document.getElementById('bioInput').value,
        theme: document.getElementById('themeSelect').value,
        bgMusic: document.getElementById('bgMusicInput').value,
        bgVideo: document.getElementById('bgVideoInput').value,
        avatar: document.getElementById('avatarPreview').src,
        links: links
    };

    try {
        // We'll use the generic updateProfile endpoint if available, or individual ones
        // Based on previous code, we might need multiple calls or a unified one.
        // Let's try a unified update first, if not, fall back.

        await fetchAPI('/api/user/updateProfile', {
            method: 'POST',
            body: JSON.stringify(data)
        });

        // Also save links specifically if needed
        await fetchAPI('/api/user/updateLinks', {
            method: 'POST',
            body: JSON.stringify({ links })
        });

        // Update Theme
        await fetchAPI('/api/user/updateTheme', {
            method: 'POST',
            body: JSON.stringify({ theme: data.theme })
        });

        unsavedChanges = false;
        alert('Changes saved successfully!');
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
    // We can use a special preview route or just inject HTML
    // For now, let's postMessage to a preview handler if we have one, 
    // OR just construct a basic preview URL if the backend supports it.

    // Better approach: Generate a temporary preview object and send it to the iframe
    // The iframe should load a generic template that listens for messages.

    // If the iframe is blank, load the template first
    if (frame.src === 'about:blank') {
        // We need a preview template. Let's assume /preview-template.html exists or we use the user's live site
        // For now, let's try to load the user's site but in "preview mode" if possible.
        // Actually, let's just load the published site if it exists, otherwise a placeholder.
        frame.src = `/@${currentUser.username}?preview=true`;
    }

    // Send real-time updates
    const data = {
        username: currentUser.username,
        bio: document.getElementById('bioInput').value,
        theme: document.getElementById('themeSelect').value,
        avatar: document.getElementById('avatarPreview').src,
        links: links,
        bgMusic: document.getElementById('bgMusicInput').value,
        bgVideo: document.getElementById('bgVideoInput').value
    };

    frame.contentWindow.postMessage({ type: 'previewUpdate', data }, '*');
}

function updateDiscordStatus() {
    const container = document.getElementById('discordStatus');
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
