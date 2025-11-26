/* dashboard.js */

let currentUser = null;
let links = [];
let selectedMedia = {
    bgMusic: '',
    bgVideo: '',
    cursor: ''
};

// Initialize
document.addEventListener('DOMContentLoaded', async () => {
    console.log('Dashboard loading...');

    try {
        const response = await checkAuth();
        console.log('Auth response:', response);

        // Handle response structure
        if (response && response.user) {
            currentUser = response.user;
        } else if (response && response.username) {
            currentUser = response;
        } else {
            throw new Error('Invalid auth response');
        }

        console.log('Current user:', currentUser);

        if (!currentUser || !currentUser.username) {
            console.error('No valid user data');
            window.location.href = '/login';
            return;
        }

        // Initial Route Handling
        handleRoute();

        // Load Data
        loadDashboardData();
        loadSystemMedia();
        loadAnalytics();

        // Setup Events
        setupEventListeners();
        setupDragDrop();

        // Handle Browser Back/Forward
        window.onpopstate = handleRoute;
    } catch (err) {
        console.error('Dashboard init error:', err);
        alert('Failed to load dashboard. Please login again.');
        window.location.href = '/login';
    }
});

function handleRoute() {
    const path = window.location.pathname;

    // Default to profile if just /dashboard
    if (path === '/dashboard' || path === '/dashboard/') {
        showSection('profile');
        return;
    }

    // Extract section from path
    const section = path.split('/').pop();
    if (['profile', 'links', 'media', 'analytics'].includes(section)) {
        showSection(section);
    } else {
        showSection('profile');
    }
}
