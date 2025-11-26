publishBtn.addEventListener('click', async () => {
	try {
		await fetchAPI('/api/profile/publish', { method: 'POST' });
		alert('Profile published!');
		window.open(`/@${currentUser.username}`, '_blank');
	} catch (err) {
		alert('Failed to publish: ' + err.message);
	}
});
	}

const shareBtn = document.getElementById('shareBtn');
if (shareBtn) {
	shareBtn.addEventListener('click', () => {
		const profileUrl = `${window.location.origin}/@${currentUser.username}`;
		if (navigator.share) {
			navigator.share({
				title: `${currentUser.username}'s Profile`,
				text: `Check out my profile on Khxzi!`,
				url: profileUrl
			});
		} else {
			navigator.clipboard.writeText(profileUrl);
			alert('Profile link copied to clipboard!');
		}
	});
}

const themeSelect = document.getElementById('themeSelect');
if (themeSelect) themeSelect.addEventListener('change', updatePreview);

const bioInput = document.getElementById('bioInput');
if (bioInput) bioInput.addEventListener('input', updatePreview);
}

function updatePreview() {
	const previewFrame = document.getElementById('previewFrame');
	if (!previewFrame) return;

	const bioInput = document.getElementById('bioInput');
	const avatarPreview = document.getElementById('avatarPreview');
	const themeSelect = document.getElementById('themeSelect');

	const data = {
		username: currentUser.username,
		bio: bioInput ? bioInput.value : '',
		avatar: avatarPreview ? avatarPreview.src : '',
		links: links,
		theme: themeSelect ? themeSelect.value : 'red-black',
		bgMusic: selectedMedia.bgMusic,
		bgVideo: selectedMedia.bgVideo,
		cursor: selectedMedia.cursor,
		discord: currentUser.discord
	};
	previewFrame.contentWindow.postMessage(data, '*');

	console.log('Preview updated with:', data);
}

function setupDragDrop() {
	const dropZones = document.querySelectorAll('.drop-zone');
	dropZones.forEach(zone => {
		zone.addEventListener('dragover', e => {
			e.preventDefault();
			zone.classList.add('drag-over');
		});
		zone.addEventListener('dragleave', () => zone.classList.remove('drag-over'));
		zone.addEventListener('drop', handleDrop);
	});
}

function handleDrop(e) {
	e.preventDefault();
	const dropZone = e.currentTarget;
	const file = e.dataTransfer.files[0];
	if (!file) return;

	const reader = new FileReader();
	reader.onload = function (e) {
		const base64 = e.target.result.split(',')[1];
		const type = file.type.split('/')[0];
		const name = file.name;

		const data = {
			type,
			name,
			base64
		};

		const previewFrame = document.getElementById('previewFrame');
		if (!previewFrame) return;

		previewFrame.contentWindow.postMessage(data, '*');
	};
	reader.readAsDataURL(file);
}