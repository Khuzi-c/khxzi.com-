// Moderation Utility
const badWords = [
    'fuck', 'shit', 'ass', 'bitch', 'damn', 'cunt', 'dick', 'pussy',
    'nigger', 'nigga', 'faggot', 'retard', 'slut', 'whore', 'cock',
    // Add more as needed
];

function containsBadWords(text) {
    if (!text) return false;
    const lowerText = text.toLowerCase();
    return badWords.some(word => lowerText.includes(word));
}

function filterBadWords(text) {
    if (!text) return text;
    let filtered = text;
    badWords.forEach(word => {
        const regex = new RegExp(word, 'gi');
        filtered = filtered.replace(regex, '*'.repeat(word.length));
    });
    return filtered;
}

function logModeration(action, username, content, reason) {
    const fs = require('fs');
    const path = require('path');
    const LOG_FILE = path.join(__dirname, '../data/moderation.json');

    let logs = [];
    if (fs.existsSync(LOG_FILE)) {
        logs = JSON.parse(fs.readFileSync(LOG_FILE, 'utf8'));
    }

    logs.push({
        action,
        username,
        content,
        reason,
        timestamp: new Date().toISOString()
    });

    fs.writeFileSync(LOG_FILE, JSON.stringify(logs, null, 2));
}

module.exports = {
    containsBadWords,
    filterBadWords,
    logModeration
};
