// Check URL params for status
const urlParams = new URLSearchParams(window.location.search);
const status = urlParams.get('status');
const error = urlParams.get('error');
const username = urlParams.get('username');

const statusMessage = document.getElementById('statusMessage');
const verifyBtn = document.getElementById('verifyBtn');

if (status === 'success') {
    statusMessage.style.display = 'block';
    statusMessage.className = 'success';
    statusMessage.innerHTML = `✅ Successfully verified as <strong>${username}</strong>! You can now close this window.`;
    verifyBtn.style.display = 'none';
} else if (status === 'failed' || status === 'error') {
    statusMessage.style.display = 'block';
    statusMessage.className = 'error';
    statusMessage.textContent = `❌ Verification Failed: ${error || 'Unknown error'}`;
}

// Mock Member Count (could fetch from API if implemented)
document.getElementById('memberCount').textContent = '1,240';
