class GalleryManager {
    constructor(container) {
        this.container = container;
        this.images = [];
        this.setupManager();
    }

    setupManager() {
        this.container.innerHTML = `
            <div class="gallery-controls">
                <button class="primary-btn upload-btn">Upload Images</button>
                <input type="file" accept="image/*" multiple style="display: none;">
            </div>
            <div class="gallery-grid"></div>
        `;

        // Setup event listeners
        const uploadBtn = this.container.querySelector('.upload-btn');
        const fileInput = this.container.querySelector('input[type="file"]');

        uploadBtn.addEventListener('click', () => {
            fileInput.click();
        });

        fileInput.addEventListener('change', (e) => {
            this.handleFileUpload(e.target.files);
        });

        // Load initial gallery
        this.loadGallery();
    }

    async loadGallery() {
        try {
            const headers = getAuthHeaders();
            if (!headers) return;

            const response = await fetch('/dev/gallery', {
                headers,
            });

            if (!response.ok) throw new Error('Failed to load gallery');

            const images = await response.json();
            this.images = images;
            this.renderGallery();
        } catch (error) {
            console.error('Failed to load gallery:', error);
            showNotification('Failed to load gallery', 'error');
        }
    }

    renderGallery() {
        const grid = this.container.querySelector('.gallery-grid');
        grid.innerHTML = '';

        this.images.forEach(image => {
            const item = document.createElement('div');
            item.className = 'gallery-item';
            item.innerHTML = `
                <div class="gallery-image-container">
                    <img src="${image.url}" alt="${image.caption || ''}">
                    <div class="gallery-overlay">
                        <button class="delete-btn">Delete</button>
                    </div>
                </div>
                <div class="gallery-controls">
                    <input type="text" class="caption-input" placeholder="Add caption" value="${image.caption || ''}">
                </div>
            `;

            // Setup delete button
            item.querySelector('.delete-btn').addEventListener('click', () => {
                this.deleteImage(image.id);
            });

            // Setup caption input
            const captionInput = item.querySelector('.caption-input');
            captionInput.addEventListener('change', () => {
                this.updateCaption(image.id, captionInput.value);
            });

            grid.appendChild(item);
        });
    }

    async handleFileUpload(files) {
        const uploadPromises = Array.from(files).map(file => {
            const formData = new FormData();
            formData.append('image', file);

            const headers = getAuthHeaders();
            if (!headers) return;
            delete headers['Content-Type']; // Let browser set correct content-type for FormData

            return fetch('/dev/gallery/upload', {
                method: 'POST',
                headers,
                body: formData,
            }).then(response => {
                if (!response.ok) throw new Error('Upload failed');
                return response.json();
            });
        });

        try {
            await Promise.all(uploadPromises);
            showNotification('Images uploaded successfully', 'success');
            this.loadGallery();
        } catch (error) {
            console.error('Failed to upload images:', error);
            showNotification('Failed to upload images', 'error');
        }
    }

    async updateCaption(imageId, caption) {
        try {
            const headers = getAuthHeaders();
            if (!headers) return;

            const response = await fetch(`/dev/gallery/${imageId}`, {
                method: 'PUT',
                headers,
                body: JSON.stringify({ caption }),
            });

            if (!response.ok) throw new Error('Failed to update caption');

            showNotification('Caption updated successfully', 'success');
            this.loadGallery();
        } catch (error) {
            console.error('Failed to update caption:', error);
            showNotification('Failed to update caption', 'error');
        }
    }

    async deleteImage(imageId) {
        if (!confirm('Are you sure you want to delete this image?')) return;

        try {
            const headers = getAuthHeaders();
            if (!headers) return;

            const response = await fetch(`/dev/gallery/${imageId}`, {
                method: 'DELETE',
                headers,
            });

            if (!response.ok) throw new Error('Failed to delete image');

            showNotification('Image deleted successfully', 'success');
            this.loadGallery();
        } catch (error) {
            console.error('Failed to delete image:', error);
            showNotification('Failed to delete image', 'error');
        }
    }
}

// Helper function for getting auth headers
function getAuthHeaders() {
    const token = localStorage.getItem('token');
    if (!token) {
        window.location.href = '/dev/login.html';
        return null;
    }
    return {
        'Authorization': 'Bearer ' + token,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
    };
}
