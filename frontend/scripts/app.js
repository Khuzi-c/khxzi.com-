/* app.js - Common Utilities */

const API_BASE = '/api';

async function fetchAPI(endpoint, options = {}) {
	options.headers = {
		'Content-Type': 'application/json',
		...options.headers
	};

	try {
		const response = await fetch(endpoint, options);
		const data = await response.json();

		if (!response.ok) {
			throw new Error(data.error || 'API Error');
		}

		return data;
	} catch (err) {
		console.error('API Request Failed:', err);
		throw err;
	}
}

async function checkAuth() {
	try {
		const user = await fetchAPI(`${API_BASE}/auth/me`);
		return user;
	} catch (err) {
		return null;
	}
}

async function logout() {
	try {
		await fetchAPI(`${API_BASE}/auth/logout`, { method: 'POST' });
		window.location.href = '/login.html';
	} catch (err) {
		alert('Logout failed');
	}
}

// File to Base64
function fileToBase64(file) {
	return new Promise((resolve, reject) => {
		const reader = new FileReader();
		reader.readAsDataURL(file);
		reader.onload = () => resolve(reader.result);
		reader.onerror = error => reject(error);
	});
}
