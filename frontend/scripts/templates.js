// Minimal templates registry + helper to apply templates to the editor fields
const KHXZI_TEMPLATES = {
	blank: {
		username: '',
		bio: '',
		links: [],
		badges: [],
		background: { type: 'none', url: null },
		music: null,
		theme: 'dark'
	},
	"profile-hero": {
		username: 'yourname',
		bio: 'Fullstack developer • Designer • Maker',
		links: [{ title: 'Website', url: 'https://example.com' }, { title: 'GitHub', url: 'https://github.com' }],
		badges: [{ text: 'Open to work', color: '#ff2d3a' }],
		background: { type: 'image-url', url: 'https://images.unsplash.com/photo-1503264116251-35a269479413' },
		music: null,
		theme: 'dark'
	},
	portfolio: {
		username: 'artist',
		bio: 'I design beautiful things.\nContact me for commissions.',
		links: [{ title: 'Portfolio', url: 'https://example.com/portfolio' }, { title: 'Contact', url: 'mailto:me@example.com' }],
		badges: [{ text: 'Freelancer', color: '#00aaff' }],
		background: { type: 'image-url', url: 'https://images.unsplash.com/photo-1496307042754-b4aa456c4a2d' },
		music: null,
		theme: 'neon'
	}
};

function getTemplate(name) {
	if (!name) return KHXZI_TEMPLATES.blank;
	return KHXZI_TEMPLATES[name] || KHXZI_TEMPLATES.blank;
}

// Apply a template to the editor inputs on the account page
function applyTemplateToEditor(templateObj) {
	// username
	const usernameInput = document.getElementById('username-input');
	if (usernameInput && templateObj.username) usernameInput.value = templateObj.username;
	// bio
	const bioInput = document.getElementById('bio');
	if (bioInput) bioInput.value = templateObj.bio || '';
	// links: clear and add
	const linksContainer = document.getElementById('links-container');
	if (linksContainer) {
		linksContainer.innerHTML = '';
		(templateObj.links || []).forEach(l => {
			const row = document.createElement('div');
			row.className = 'link-row';
			// create inputs similar to createLinkRow
			const t = document.createElement('input');
			t.className = 'link-title'; t.type = 'text'; t.value = l.title || '';
			const u = document.createElement('input');
			u.className = 'link-url'; u.type = 'url'; u.value = l.url || '';
			const rm = document.createElement('button'); rm.type='button'; rm.className='remove-link'; rm.textContent='Remove';
			rm.addEventListener('click', () => row.remove());
			row.appendChild(t); row.appendChild(u); row.appendChild(rm);
			linksContainer.appendChild(row);
		});
	}
	// badges: clear and add
	const badgesContainer = document.getElementById('badges-container');
	if (badgesContainer) {
		badgesContainer.innerHTML = '';
		(templateObj.badges || []).forEach(b => {
			const badge = document.createElement('div'); badge.className='badge-row';
			const bt = document.createElement('input'); bt.type='text'; bt.className='badge-text'; bt.value = b.text || '';
			const bc = document.createElement('input'); bc.type='color'; bc.className='badge-color'; bc.value = b.color || '#ff2d3a';
			const rm = document.createElement('button'); rm.type='button'; rm.className='remove-badge'; rm.textContent='Remove';
			rm.addEventListener('click', () => badge.remove());
			badge.appendChild(bt); badge.appendChild(bc); badge.appendChild(rm);
			badgesContainer.appendChild(badge);
		});
	}
	// background: set url if provided
	if (templateObj.background && templateObj.background.url) {
		const bgUrlInput = document.getElementById('bg-url');
		const bgTypeInput = document.getElementById('bg-type');
		if (bgUrlInput) bgUrlInput.value = templateObj.background.url || '';
		if (bgTypeInput && templateObj.background.type) bgTypeInput.value = templateObj.background.type;
		// trigger preview update if available
	}

	// music
	const musicUrlInput = document.getElementById('music-url');
	if (musicUrlInput) musicUrlInput.value = templateObj.music && templateObj.music.url ? templateObj.music.url : '';

	// set theme
	const themeSelect = document.getElementById('theme-toggle');
	if (themeSelect && templateObj.theme) themeSelect.value = templateObj.theme;
	document.documentElement.setAttribute('data-theme', templateObj.theme || 'dark');

	// After applying, trigger an update preview if present
	if (typeof window.updatePreviewIframe === 'function') window.updatePreviewIframe();
}
