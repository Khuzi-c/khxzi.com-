/* editor.js */

let currentFile = null;

document.addEventListener('DOMContentLoaded', async () => {
    const user = await checkAuth();
    if (!user) {
        window.location.href = '/login.html';
        return;
    }

    loadFileList();

    document.getElementById('saveBtn').addEventListener('click', saveFile);
    document.getElementById('newFileBtn').addEventListener('click', createFile);
    document.getElementById('deleteFileBtn').addEventListener('click', deleteFile);

    // Auto-refresh preview on type (debounce)
    let timeout;
    document.getElementById('editor').addEventListener('input', () => {
        clearTimeout(timeout);
        timeout = setTimeout(updatePreview, 1000);
    });
});

async function loadFileList() {
    const files = await fetchAPI('/api/files/list');
    const list = document.getElementById('fileList');
    list.innerHTML = '';

    files.forEach(file => {
        const item = document.createElement('div');
        item.className = 'file-item';
        item.textContent = file;
        item.onclick = () => openFile(file);
        list.appendChild(item);
    });
}

async function openFile(filename) {
    currentFile = filename;
    const data = await fetchAPI(`/api/files/read?path=${filename}`);
    document.getElementById('editor').value = data.content;
    document.getElementById('currentFileLabel').textContent = filename;
    updatePreview();
}

async function saveFile() {
    if (!currentFile) return;
    const content = document.getElementById('editor').value;
    await fetchAPI('/api/files/write', {
        method: 'POST',
        body: JSON.stringify({ path: currentFile, content })
    });
    alert('Saved!');
    updatePreview();
}

async function createFile() {
    const filename = prompt('Enter filename (e.g., my-site.html):');
    if (!filename) return;

    try {
        await fetchAPI('/api/files/create', {
            method: 'POST',
            body: JSON.stringify({ filename })
        });
        loadFileList();
        openFile(filename);
    } catch (err) {
        alert(err.message);
    }
}

async function deleteFile() {
    if (!currentFile || !confirm(`Delete ${currentFile}?`)) return;

    try {
        await fetchAPI('/api/files/delete', {
            method: 'DELETE',
            body: JSON.stringify({ path: currentFile })
        });
        currentFile = null;
        document.getElementById('editor').value = '';
        document.getElementById('currentFileLabel').textContent = '';
        loadFileList();
    } catch (err) {
        alert(err.message);
    }
}

function updatePreview() {
    if (!currentFile) return;
    const content = document.getElementById('editor').value;
    const previewFrame = document.getElementById('previewFrame');

    // If it's HTML, render it. If CSS/JS, maybe inject?
    // For simplicity, we assume editing HTML files or we inject content into a blank frame.

    const doc = previewFrame.contentDocument || previewFrame.contentWindow.document;
    doc.open();
    doc.write(content);
    doc.close();
}
