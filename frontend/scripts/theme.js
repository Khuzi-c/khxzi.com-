/* theme.js - Theme Management */

function applyTheme(themeName) {
	document.body.className = ''; // Clear existing
	document.body.classList.add(`theme-${themeName}`);
	localStorage.setItem('khxzi_theme', themeName);
}

function loadTheme() {
	const savedTheme = localStorage.getItem('khxzi_theme') || 'red-black';
	applyTheme(savedTheme);
}

// Initialize on load
document.addEventListener('DOMContentLoaded', loadTheme);
