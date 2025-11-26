async function activatePremium() {
    const key = document.getElementById('premiumKey').value.trim();
    const discordId = document.getElementById('discordId').value.trim();

    if (!key || !discordId) {
        showMessage('Please enter both premium key and Discord ID', 'error');
        return;
    }

    try {
        const res = await fetch('/api/premium/activate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ key, discordId })
        });

        const data = await res.json();

        if (data.success) {
            showMessage('Premium activated successfully! 🎉', 'success');
            document.getElementById('premiumKey').value = '';
            document.getElementById('discordId').value = '';
        } else {
            showMessage(data.error || 'Activation failed', 'error');
        }
    } catch (err) {
        console.error('Activation error:', err);
        showMessage('Failed to activate premium', 'error');
    }
}

function showMessage(message, type) {
    const statusMessage = document.getElementById('statusMessage');
    statusMessage.textContent = message;
    statusMessage.className = type === 'success' ? 'success' : 'error';
    statusMessage.style.display = 'block';
    statusMessage.style.padding = '1rem';
    statusMessage.style.borderRadius = '8px';
    statusMessage.style.marginBottom = '1rem';
    statusMessage.style.background = type === 'success' ? 'rgba(0, 255, 0, 0.1)' : 'rgba(255, 0, 0, 0.1)';
    statusMessage.style.border = type === 'success' ? '1px solid #0f0' : '1px solid #f00';
    statusMessage.style.color = type === 'success' ? '#0f0' : '#f00';

    setTimeout(() => {
        statusMessage.style.display = 'none';
    }, 5000);
}
