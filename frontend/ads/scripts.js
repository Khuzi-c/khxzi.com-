const form = document.getElementById('adForm');
const dropZone = document.getElementById('dropZone');
const fileInput = document.getElementById('fileInput');
const previewContainer = document.getElementById('previewContainer');
const imagePreview = document.getElementById('imagePreview');
const videoPreview = document.getElementById('videoPreview');

let uploadedFileUrl = '';
let fileType = 'image';

// Drag & Drop
dropZone.onclick = () => fileInput.click();

dropZone.ondragover = (e) => {
    e.preventDefault();
    dropZone.classList.add('dragover');
};

dropZone.ondragleave = () => dropZone.classList.remove('dragover');

dropZone.ondrop = (e) => {
    e.preventDefault();
    dropZone.classList.remove('dragover');
    handleFile(e.dataTransfer.files[0]);
};

fileInput.onchange = (e) => {
    handleFile(e.target.files[0]);
};

async function handleFile(file) {
    if (!file) return;

    // Show preview
    const reader = new FileReader();
    reader.onload = (e) => {
        previewContainer.style.display = 'block';
        if (file.type.startsWith('video')) {
            fileType = 'video';
            videoPreview.src = e.target.result;
            videoPreview.style.display = 'block';
            imagePreview.style.display = 'none';
        } else {
            fileType = 'image';
            imagePreview.src = e.target.result;
            imagePreview.style.display = 'block';
            videoPreview.style.display = 'none';
        }
    };
    reader.readAsDataURL(file);

    // Upload file
    const formData = new FormData();
    formData.append('file', file);

    try {
        dropZone.innerHTML = '<p>Uploading...</p>';
        const res = await fetch('/api/upload?type=ads', {
            method: 'POST',
            body: formData
        });

        const data = await res.json();
        if (data.success) {
            uploadedFileUrl = data.path;
            dropZone.innerHTML = '<p>✓ File uploaded successfully!</p>';
            console.log('File uploaded:', uploadedFileUrl);
        } else {
            throw new Error(data.error || 'Upload failed');
        }
    } catch (err) {
        alert('Upload failed: ' + err.message);
        dropZone.innerHTML = '<p>Drag & Drop or Click to Upload</p>';
    }
}

// Form submission
form.onsubmit = async (e) => {
    e.preventDefault();

    if (!uploadedFileUrl) {
        alert('Please upload a banner image or video first!');
        return;
    }

    const discordId = document.getElementById('discordId').value;
    const email = document.getElementById('email').value;
    const link = document.getElementById('link').value;

    const submitBtn = form.querySelector('button[type="submit"]');
    submitBtn.disabled = true;
    submitBtn.textContent = 'Submitting...';

    try {
        const res = await fetch('/api/ads/submit', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                discordId,
                email,
                link,
                banner: uploadedFileUrl,
                type: fileType
            })
        });

        const data = await res.json();

        if (data.success) {
            alert('✅ ' + data.message);
            form.reset();
            previewContainer.style.display = 'none';
            dropZone.innerHTML = '<p>Drag & Drop or Click to Upload</p>';
            uploadedFileUrl = '';
        } else {
            throw new Error(data.error || 'Submission failed');
        }
    } catch (err) {
        alert('❌ Error: ' + err.message);
    } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = 'Submit Ad';
    }
};
