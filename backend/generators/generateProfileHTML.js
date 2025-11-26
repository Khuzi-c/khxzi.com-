module.exports = function generateProfileHTML(user) {
	const linksHtml = user.links.map(link => `
        <a href="${link.url}" class="link-card" onclick="trackClick('${user.username}', '${link.label}')" target="_blank">
            <span>${link.label}</span>
        </a>
    `).join('');

	return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${user.username} | khxzi.com</title>
    <link rel="stylesheet" href="../../styles/main.css">
    <link rel="stylesheet" href="../../styles/themes.css">
    <link rel="stylesheet" href="../../styles/animations.css">
    <style>
        body {
            /* Apply user theme variable overrides if needed, or just class */
        }
        .bg-video{ position: fixed; inset: 0; width: 100%; height: 100%; object-fit: cover; z-index: -1; opacity: 0.6; pointer-events: none; }
        .bg-video-iframe{ position: fixed; inset: 0; width: 100%; height: 100%; z-index: -1; opacity: 0.6; pointer-events: none; border: 0; }
        .bg-audio{ display: none; }
    </style>
</head>
<body class="theme-${user.theme || 'red-black'}">
    <div class="profile-container fade-in">
        <!-- Background media (video or audio) -->
        ${user.bgVideo ? `
        <div class="bg-media">
            ${user.bgVideo.includes('youtube.com') || user.bgVideo.includes('youtu.be') ? `
                <iframe class="bg-video-iframe" src="${user.bgVideo.includes('youtube') ? user.bgVideo.replace('watch?v=', 'embed/') : user.bgVideo}" frameborder="0" allow="autoplay; fullscreen" allowfullscreen></iframe>
            ` : `<video id="bgVideo" class="bg-video" autoplay muted loop playsinline>
                    <source src="${user.bgVideo}" type="video/mp4">
                </video>`}
        </div>
        ` : ''}
        ${user.bgMusic ? `
        <div class="bg-audio">
            ${user.bgMusic.includes('youtube.com') || user.bgMusic.includes('youtu.be') ? `
                <iframe src="${user.bgMusic.includes('youtube') ? user.bgMusic.replace('watch?v=', 'embed/') : user.bgMusic}" frameborder="0" allow="autoplay" style="display:none"></iframe>
            ` : `<audio id="bgMusic" src="${user.bgMusic}" autoplay loop></audio>`}
        </div>
        ` : ''}
        <div class="avatar-container">
            <img src="${user.avatar || '../../assets/khxzilogo.png'}" alt="Avatar" class="avatar">
        </div>
        <h1 class="username">${user.username}</h1>
        <p class="bio">${user.bio || ''}</p>
        
        <div class="links-grid">
            ${linksHtml}
        </div>
    </div>

    <script>
        function trackClick(username, label) {
            fetch('/api/analytics/click', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, linkLabel: label })
            });
        }

        // Track view on load
        fetch('/api/analytics/view', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username: '${user.username}' })
        });
    </script>
    <script>
        // Preview messaging support - when the editor posts a previewUpdate message we apply changes live
        window.addEventListener('message', (ev) => {
            try {
                const msg = ev.data;
                if (!msg || msg.type !== 'previewUpdate') return;
                const d = msg.data || {};
                // Update bio and links
                if (d.bio !== undefined && document.querySelector('.bio')) document.querySelector('.bio').textContent = d.bio;
                if (d.avatar !== undefined && document.querySelector('.avatar')) document.querySelector('.avatar').src = d.avatar;
                if (Array.isArray(d.links) && document.querySelector('.links-grid')) {
                    const linksGrid = document.querySelector('.links-grid');
                    linksGrid.innerHTML = d.links.map(function (l) { return '<a href="' + (l.url || '#') + '" class="link-card" target="_blank"><span>' + (l.label || '') + '</span></a>'; }).join('');
                    // Attach click handlers for analytics
                    Array.from(linksGrid.querySelectorAll('.link-card')).forEach((a, i) => {
                        a.addEventListener('click', function () {
                            try { trackClick(d.username, (d.links[i] || {}).label || 'link'); } catch (e) { }
                        });
                    });
                }
                // Update background video
                if (d.bgVideo !== undefined) {
                    // remove existing elements
                    const existingVideo = document.getElementById('bgVideo');
                    if (existingVideo) existingVideo.src = '';
                    const existingIframe = document.querySelector('.bg-video-iframe');
                    if (existingIframe) existingIframe.remove();
                    if (d.bgVideo) {
                        if (d.bgVideo.includes('youtube.com') || d.bgVideo.includes('youtu.be')) {
                            const url = d.bgVideo.includes('youtube') ? d.bgVideo.replace('watch?v=', 'embed/') : d.bgVideo;
                            const iframe = document.createElement('iframe');
                            iframe.className = 'bg-video-iframe';
                            iframe.src = url;
                            iframe.setAttribute('frameborder', '0');
                            iframe.setAttribute('allow', 'autoplay; fullscreen');
                            iframe.style.position = 'fixed';
                            iframe.style.inset = '0';
                            iframe.style.width = '100%';
                            iframe.style.height = '100%';
                            iframe.style.zIndex = '-1';
                            iframe.style.opacity = '0.8';
                            document.body.appendChild(iframe);
                        } else {
                            let v = document.getElementById('bgVideo');
                            if (!v) {
                                v = document.createElement('video');
                                v.id = 'bgVideo';
                                v.className = 'bg-video';
                                v.autoplay = true; v.muted = true; v.loop = true; v.playsInline = true;
                                document.body.appendChild(v);
                            }
                            v.src = d.bgVideo;
                        }
                    }
                }
                // Update background music
                if (d.bgMusic !== undefined) {
                    const existingAudio = document.getElementById('bgMusic');
                    if (existingAudio) existingAudio.pause();
                    // Remove youtube iframe if exist
                    const existingMusicIframe = document.querySelector('.bg-music-iframe');
                    if (existingMusicIframe) existingMusicIframe.remove();
                    if (d.bgMusic) {
                        if (d.bgMusic.includes('youtube.com') || d.bgMusic.includes('youtu.be')) {
                            const url = d.bgMusic.includes('youtube') ? d.bgMusic.replace('watch?v=', 'embed/') : d.bgMusic;
                            const iframe = document.createElement('iframe');
                            iframe.className = 'bg-music-iframe';
                            iframe.src = url;
                            iframe.style.display = 'none';
                            iframe.setAttribute('allow', 'autoplay');
                            document.body.appendChild(iframe);
                        } else {
                            let a = document.getElementById('bgMusic');
                            if (!a) {
                                a = document.createElement('audio');
                                a.id = 'bgMusic';
                                a.autoplay = true; a.loop = true;
                                document.body.appendChild(a);
                            }
                            a.src = d.bgMusic;
                            a.play().catch(() => {
                                // autoplay might be blocked by browser; ignore
                            });
                        }
                    }
                }
            } catch (e) {
                console.error('Preview Update failed', e);
            }
        });
    </script>
</body>
</html>
    `;
};
