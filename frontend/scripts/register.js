/* register.js */

document.addEventListener('DOMContentLoaded', () => {
	const form = document.getElementById('registerForm');
	const usernameInput = document.getElementById('username');
	const avatarInput = document.getElementById('avatar');
	const avatarPreview = document.getElementById('avatarPreview');

	// Autofill random username if empty
	if (!usernameInput.value) {
		usernameInput.value = 'user_' + Math.floor(Math.random() * 10000);
	}

	// Avatar Preview
	avatarInput.addEventListener('change', async (e) => {
		const file = e.target.files[0];
		if (file) {
			const reader = new FileReader();
			reader.onload = (e) => {
				avatarPreview.src = e.target.result;
			};
			reader.readAsDataURL(file);
		}
	});

	form.addEventListener('submit', async (e) => {
		e.preventDefault();

		const username = usernameInput.value;
		const password = document.getElementById('password').value;
		const bio = document.getElementById('bio').value;
		const theme = document.getElementById('themeSelect').value;

		let avatar = '';
		if (avatarInput.files[0]) {
			const formData = new FormData();
			formData.append('file', avatarInput.files[0]);

			try {
				// Note: Register usually happens before login, so we can't use verifyToken on upload yet.
				// We might need to allow public upload or upload after register.
				// For simplicity, let's register first without avatar, then login, then upload/update.
				// OR: Allow public upload for now (less secure) or pass a temp token.
				// Let's modify the flow: Register -> Login -> Upload Avatar -> Update Profile.
				// BUT, to keep it simple for the user, we will just skip avatar upload during register 
				// if we enforce auth on upload.
				// Alternatively, we can make the upload endpoint public but rate limited.
				// Let's try to upload after registration login.
			} catch (err) {
				console.error(err);
			}
		}

		try {
			// 1. Register
			await fetchAPI('/api/auth/register', {
				method: 'POST',
				body: JSON.stringify({ username, password, bio, avatar: '' }) // Send empty avatar first
			});

			// 2. Login to get token
			await fetchAPI('/api/auth/login', {
				method: 'POST',
				body: JSON.stringify({ username, password })
			});

			// 3. Upload Avatar if exists
			if (avatarInput.files[0]) {
				const formData = new FormData();
				formData.append('file', avatarInput.files[0]);
				const res = await fetch('/api/upload?type=avatar', {
					method: 'POST',
					body: formData
				});
				const data = await res.json();
				if (data.success) {
					// 4. Update Profile with avatar path
					await fetchAPI('/api/user/updateProfile', {
						method: 'POST',
						body: JSON.stringify({ avatar: data.path })
					});
				}
			}

			// 5. Update Theme
			if (theme) {
				await fetchAPI('/api/user/updateTheme', {
					method: 'POST',
					body: JSON.stringify({ theme })
				});
			}

			window.location.href = '/dashboard';
		} catch (err) {
			alert(err.message);
		}
	});
});
