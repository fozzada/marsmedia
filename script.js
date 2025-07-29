class MarsMediaGallery {
    constructor() {
        // Initialize Supabase
        this.supabaseUrl = 'https://nhsucumstmojfainalvp.supabase.co';
        this.supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5oc3VjdW1zdG1vamZhaW5hbHZwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM2ODQzOTAsImV4cCI6MjA2OTI2MDM5MH0.0TWbFkkn9ihIUhkqT_dN8VpdjGXRIeyJIsTACPTRKUk';
        this.supabase = supabase.createClient(this.supabaseUrl, this.supabaseAnonKey);
        
        // Gallery elements
        this.searchInput = document.getElementById('searchInput');
        this.searchBtn = document.getElementById('searchBtn');
        this.tagsFilter = document.getElementById('tagsFilter');
        this.clearFiltersBtn = document.getElementById('clearFiltersBtn');
        this.imagesGrid = document.getElementById('imagesGrid');
        this.imageCount = document.getElementById('imageCount');
        
        // Create image modal elements
        this.createImageBtn = document.getElementById('createImageBtn');
        this.createImageModal = document.getElementById('createImageModal');
        this.closeCreateModal = document.getElementById('closeCreateModal');
        this.canvas = document.getElementById('canvas');
        this.ctx = this.canvas.getContext('2d');
        this.uploadArea = document.getElementById('uploadArea');
        this.imageInput = document.getElementById('imageInput');
        this.previewSection = document.getElementById('previewSection');
        this.downloadBtn = document.getElementById('downloadBtn');
        this.uploadBtn = document.getElementById('uploadBtn');
        this.resetBtn = document.getElementById('resetBtn');
        
        // Image view modal elements
        this.imageViewModal = document.getElementById('imageViewModal');
        this.closeImageModal = document.getElementById('closeImageModal');
        this.imageModalTitle = document.getElementById('imageModalTitle');
        this.imageModalMeta = document.getElementById('imageModalMeta');
        this.imageModalImg = document.getElementById('imageModalImg');
        this.imageModalTags = document.getElementById('imageModalTags');
        this.downloadImageBtn = document.getElementById('downloadImageBtn');
        
        // Text to overlay
        this.contractAddress = 'Cfmo6asAsZFx6GGQvAt4Ajxn8hN6vgWGpaSrjQKRpump';
        this.xHandle = '@MarsPygmySOL';
        this.projectName = 'Mars on Pump';
        
        // Store data
        this.originalFile = null;
        this.originalFormat = 'png';
        this.allImages = [];
        this.allTags = [];
        this.selectedTags = [];
        this.currentImage = null;
        
        this.initEventListeners();
        this.loadGalleryData();
    }
    
    initEventListeners() {
        // Gallery search and filters
        this.searchBtn.addEventListener('click', () => this.filterImages());
        this.searchInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.filterImages();
        });
        this.clearFiltersBtn.addEventListener('click', () => this.clearFilters());
        
        // Create image modal
        this.createImageBtn.addEventListener('click', () => this.openCreateModal());
        this.closeCreateModal.addEventListener('click', () => this.closeCreateModalHandler());
        
        // Image view modal
        this.closeImageModal.addEventListener('click', () => this.closeImageModalHandler());
        this.downloadImageBtn.addEventListener('click', () => this.downloadCurrentImage());
        
        // Close modals on outside click
        this.createImageModal.addEventListener('click', (e) => {
            if (e.target === this.createImageModal) this.closeCreateModalHandler();
        });
        this.imageViewModal.addEventListener('click', (e) => {
            if (e.target === this.imageViewModal) this.closeImageModalHandler();
        });
        
        // Upload functionality
        this.uploadArea.addEventListener('click', () => this.imageInput.click());
        this.imageInput.addEventListener('change', (e) => this.handleFileSelect(e.target.files[0]));
        this.uploadArea.addEventListener('dragover', (e) => {
            e.preventDefault();
            this.uploadArea.classList.add('dragover');
        });
        this.uploadArea.addEventListener('dragleave', () => {
            this.uploadArea.classList.remove('dragover');
        });
        this.uploadArea.addEventListener('drop', (e) => {
            e.preventDefault();
            this.uploadArea.classList.remove('dragover');
            const files = e.dataTransfer.files;
            if (files.length > 0) {
                this.handleFileSelect(files[0]);
            }
        });
        
        // Canvas functionality
        this.downloadBtn.addEventListener('click', () => this.downloadImage());
        this.uploadBtn.addEventListener('click', () => this.uploadToSupabase());
        this.resetBtn.addEventListener('click', () => this.resetUpload());
    }
    
    async loadGalleryData() {
        await Promise.all([
            this.loadApprovedImages(),
            this.loadTags()
        ]);
        this.renderGallery();
    }
    
    async loadApprovedImages() {
        try {
            // Load approved images with their tags
            const { data: images, error } = await this.supabase
                .from('approved_images')
                .select(`
                    id,
                    name,
                    url,
                    thumbnail_url,
                    bucket,
                    original_upload_date,
                    approved_at,
                    image_tags:image_tags(tag_id, tags:tags(id, name))
                `)
                .order('approved_at', { ascending: false });
            
            if (error) {
                console.error('Failed to load approved images:', error);
                this.showError('Failed to load images');
                return;
            }
            
            this.allImages = images || [];
            console.log('Loaded approved images:', this.allImages);
        } catch (error) {
            console.error('Error loading approved images:', error);
            this.showError('Error loading images');
        }
    }
    
    async loadTags() {
        try {
            const { data: tags, error } = await this.supabase
                .from('tags')
                .select('*')
                .order('name');
            
            if (error) {
                console.error('Failed to load tags:', error);
                return;
            }
            
            this.allTags = tags || [];
            this.renderTagsFilter();
        } catch (error) {
            console.error('Error loading tags:', error);
        }
    }
    
    renderTagsFilter() {
        if (this.allTags.length === 0) {
            this.tagsFilter.innerHTML = '<div class="no-data">No tags available</div>';
            return;
        }
        
        this.tagsFilter.innerHTML = this.allTags.map(tag => 
            `<div class="tag-filter" data-tag-id="${tag.id}">${tag.name}</div>`
        ).join('');
        
        // Add click listeners to tag filters
        this.tagsFilter.querySelectorAll('.tag-filter').forEach(tagEl => {
            tagEl.addEventListener('click', () => this.toggleTagFilter(tagEl));
        });
    }
    
    toggleTagFilter(tagEl) {
        const tagId = tagEl.dataset.tagId; // Keep as string since it's a GUID
        
        if (tagEl.classList.contains('active')) {
            tagEl.classList.remove('active');
            this.selectedTags = this.selectedTags.filter(id => id !== tagId);
        } else {
            tagEl.classList.add('active');
            this.selectedTags.push(tagId);
        }
        
        this.filterImages();
    }
    
    filterImages() {
        const searchTerm = this.searchInput.value.toLowerCase().trim();
        
        let filteredImages = this.allImages;
        
        // Filter by search term
        if (searchTerm) {
            filteredImages = filteredImages.filter(image => 
                image.name.toLowerCase().includes(searchTerm)
            );
        }
        
        // Filter by selected tags
        if (this.selectedTags.length > 0) {
            filteredImages = filteredImages.filter(image => {
                const imageTags = image.image_tags?.map(it => it.tag_id) || [];
                return this.selectedTags.some(tagId => imageTags.includes(tagId));
            });
        }
        
        this.renderGallery(filteredImages);
    }
    
    clearFilters() {
        this.searchInput.value = '';
        this.selectedTags = [];
        this.tagsFilter.querySelectorAll('.tag-filter').forEach(tagEl => {
            tagEl.classList.remove('active');
        });
        this.renderGallery();
    }
    
    renderGallery(imagesToShow = null) {
        const images = imagesToShow || this.allImages;
        
        // Update count
        this.imageCount.textContent = `${images.length} image${images.length !== 1 ? 's' : ''} available`;
        
        if (images.length === 0) {
            this.imagesGrid.innerHTML = '<div class="no-data">No images found</div>';
            return;
        }
        
        this.imagesGrid.innerHTML = images.map(image => {
            const imageTags = image.image_tags?.map(it => it.tags?.name).filter(Boolean) || [];
            
            // Use thumbnail for grid display, fallback to full image
            const displayUrl = image.thumbnail_url || image.url;
            
            return `
                <div class="image-item" data-image-id="${image.id}">
                    <div class="image-container">
                        <img src="${displayUrl}" alt="${image.name}" loading="lazy">
                        <div class="image-actions">
                            <button class="action-icon copy-btn" onclick="event.stopPropagation(); marsGallery.copyImageToClipboard('${image.url}')" title="Copy to clipboard">
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                                    <path d="M16 1H4c-1.1 0-2 .9-2 2v14h2V3h12V1zm3 4H8c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h11c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2zm0 16H8V7h11v14z"/>
                                </svg>
                            </button>
                            <button class="action-icon download-btn" onclick="event.stopPropagation(); marsGallery.downloadImageDirect('${image.url}', '${image.name}')" title="Download">
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                                    <path d="M19 9h-4V3H9v6H5l7 7 7-7zM5 18v2h14v-2H5z"/>
                                </svg>
                            </button>
                        </div>
                    </div>
                    <div class="image-tags-list">
                        ${imageTags.map(tag => `<span class="tag-pill-small">${tag}</span>`).join('')}
                    </div>
                </div>
            `;
        }).join('');
        
        // Add click listeners to image items
        this.imagesGrid.querySelectorAll('.image-item').forEach(item => {
            item.addEventListener('click', () => {
                const imageId = parseInt(item.dataset.imageId);
                this.openImageModal(imageId);
            });
        });
    }
    
    openImageModal(imageId) {
        const image = this.allImages.find(img => img.id === imageId);
        if (!image) return;
        
        this.currentImage = image;
        this.imageModalTitle.textContent = image.name;
        this.imageModalImg.src = image.url;
        
        const uploadDate = new Date(image.original_upload_date || image.approved_at).toLocaleDateString();
        this.imageModalMeta.textContent = `Uploaded: ${uploadDate}`;
        
        // Display tags
        const imageTags = image.image_tags?.map(it => it.tags?.name).filter(Boolean) || [];
        if (imageTags.length > 0) {
            this.imageModalTags.innerHTML = `
                <h4>Tags:</h4>
                <div class="image-tags-list">
                    ${imageTags.map(tag => `<span class="tag-pill-small">${tag}</span>`).join('')}
                </div>
            `;
        } else {
            this.imageModalTags.innerHTML = '<div class="no-data">No tags</div>';
        }
        
        this.imageViewModal.style.display = 'block';
    }
    
    closeImageModalHandler() {
        this.imageViewModal.style.display = 'none';
        this.currentImage = null;
    }
    
    downloadCurrentImage() {
        if (this.currentImage) {
            this.downloadImageDirect(this.currentImage.url, this.currentImage.name);
        }
    }
    
    async downloadImageDirect(imageUrl, imageName) {
        try {
            const response = await fetch(imageUrl);
            const blob = await response.blob();
            
            const link = document.createElement('a');
            link.href = URL.createObjectURL(blob);
            link.download = imageName;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(link.href);
        } catch (error) {
            console.error('Error downloading image:', error);
            alert('Failed to download image. Please try again.');
        }
    }
    
    async copyImageToClipboard(imageUrl) {
        try {
            // Method 1: Try creating a canvas and copying from it
            const img = new Image();
            img.crossOrigin = 'anonymous';
            
            await new Promise((resolve, reject) => {
                img.onload = resolve;
                img.onerror = reject;
                img.src = imageUrl;
            });
            
            // Create canvas and draw image
            const canvas = document.createElement('canvas');
            canvas.width = img.naturalWidth;
            canvas.height = img.naturalHeight;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0);
            
            // Try to copy canvas as blob
            if (navigator.clipboard && window.ClipboardItem) {
                try {
                    const blob = await new Promise(resolve => {
                        canvas.toBlob(resolve, 'image/png');
                    });
                    
                    const clipboardItem = new ClipboardItem({
                        'image/png': blob
                    });
                    
                    await navigator.clipboard.write([clipboardItem]);
                    this.showCopySuccess('Image copied to clipboard!');
                    return;
                } catch (clipboardError) {
                    console.warn('Canvas clipboard method failed:', clipboardError);
                }
            }
            
            // Method 2: Try direct fetch and clipboard
            try {
                const response = await fetch(imageUrl);
                const blob = await response.blob();
                
                if (navigator.clipboard && window.ClipboardItem) {
                    const clipboardItem = new ClipboardItem({
                        [blob.type]: blob
                    });
                    
                    await navigator.clipboard.write([clipboardItem]);
                    this.showCopySuccess('Image copied to clipboard!');
                    return;
                }
            } catch (fetchError) {
                console.warn('Fetch clipboard method failed:', fetchError);
            }
            
            // Method 3: Create a temporary image element for right-click simulation
            this.createCopyableImage(imageUrl);
            
        } catch (error) {
            console.error('Error copying image:', error);
            
            // Final fallback: copy URL as text
            try {
                await navigator.clipboard.writeText(imageUrl);
                alert('Could not copy image content. Image URL copied instead.\n\nTip: Try right-clicking the image and selecting "Copy image" for better compatibility.');
            } catch (urlError) {
                console.error('Error copying URL:', urlError);
                alert('Failed to copy image. Please try downloading instead.');
            }
        }
    }
    
    createCopyableImage(imageUrl) {
        // Create a temporary modal with the image for manual copying
        const modal = document.createElement('div');
        modal.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: rgba(0,0,0,0.8);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 10000;
            flex-direction: column;
        `;
        
        const img = document.createElement('img');
        img.src = imageUrl;
        img.style.cssText = `
            max-width: 90%;
            max-height: 80%;
            border-radius: 8px;
            box-shadow: 0 4px 20px rgba(0,0,0,0.5);
        `;
        
        const instructions = document.createElement('div');
        instructions.innerHTML = `
            <div style="color: white; text-align: center; margin-top: 20px; padding: 20px;">
                <p style="font-size: 18px; margin-bottom: 10px;">Right-click the image above and select "Copy image"</p>
                <p style="font-size: 14px; opacity: 0.8;">This will copy the actual image content to your clipboard</p>
                <button id="closeCopyModal" style="
                    margin-top: 15px;
                    padding: 10px 20px;
                    background: #667eea;
                    color: white;
                    border: none;
                    border-radius: 6px;
                    cursor: pointer;
                    font-size: 14px;
                ">Close</button>
            </div>
        `;
        
        modal.appendChild(img);
        modal.appendChild(instructions);
        document.body.appendChild(modal);
        
        // Close modal when clicking close button or outside
        const closeBtn = modal.querySelector('#closeCopyModal');
        const closeModal = () => {
            if (modal.parentNode) {
                modal.parentNode.removeChild(modal);
            }
        };
        
        closeBtn.addEventListener('click', closeModal);
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                closeModal();
            }
        });
        
        // Close on escape key
        const handleEscape = (e) => {
            if (e.key === 'Escape') {
                closeModal();
                document.removeEventListener('keydown', handleEscape);
            }
        };
        document.addEventListener('keydown', handleEscape);
    }
    
    showCopySuccess(message = '✓ Image copied to clipboard!') {
        // Create a temporary success message
        const successMsg = document.createElement('div');
        successMsg.textContent = message;
        successMsg.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: #4CAF50;
            color: white;
            padding: 12px 20px;
            border-radius: 8px;
            font-weight: 600;
            z-index: 10000;
            box-shadow: 0 4px 12px rgba(0,0,0,0.2);
            animation: slideIn 0.3s ease;
        `;
        
        // Add CSS animation
        const style = document.createElement('style');
        style.textContent = `
            @keyframes slideIn {
                from { transform: translateX(100%); opacity: 0; }
                to { transform: translateX(0); opacity: 1; }
            }
        `;
        document.head.appendChild(style);
        
        document.body.appendChild(successMsg);
        
        // Remove after 3 seconds
        setTimeout(() => {
            if (successMsg.parentNode) {
                successMsg.parentNode.removeChild(successMsg);
            }
            if (style.parentNode) {
                style.parentNode.removeChild(style);
            }
        }, 3000);
    }
    
    // Create Image Modal Functions
    openCreateModal() {
        this.createImageModal.style.display = 'block';
        this.resetUpload();
    }
    
    closeCreateModalHandler() {
        this.createImageModal.style.display = 'none';
        this.resetUpload();
    }
    
    
    handleFileSelect(file) {
        if (!file || !file.type.startsWith('image/')) {
            alert('Please select a valid image file.');
            return;
        }
        
        // Store original file info
        this.originalFile = file;
        this.originalFormat = file.type; // e.g., 'image/jpeg', 'image/png'
        
        const reader = new FileReader();
        reader.onload = (e) => {
            this.loadImage(e.target.result);
        };
        reader.readAsDataURL(file);
    }
    
    loadImage(imageSrc) {
        const img = new Image();
        img.onload = () => {
            this.drawImageWithOverlay(img);
            this.showPreview();
        };
        img.src = imageSrc;
    }
    
    drawImageWithOverlay(img) {
        // Use original image dimensions (no resizing)
        const { width, height } = img;
        
        this.canvas.width = width;
        this.canvas.height = height;
        
        // Draw the image at full resolution
        this.ctx.drawImage(img, 0, 0, width, height);
        
        // Add overlay
        this.addTextOverlay(width, height);
    }
    
    addTextOverlay(canvasWidth, canvasHeight) {
        const ctx = this.ctx;
        
        // Add subtle center watermark first (so bottom overlay goes on top)
        this.addCenterWatermark(canvasWidth, canvasHeight);
        
        // Scale overlay height proportionally to image size
        const overlayHeight = Math.max(30, canvasHeight * 0.05);
        const gradient = ctx.createLinearGradient(0, canvasHeight - overlayHeight, 0, canvasHeight);
        gradient.addColorStop(0, 'rgba(0, 0, 0, 0.3)');
        gradient.addColorStop(1, 'rgba(0, 0, 0, 0.5)');
        
        ctx.fillStyle = gradient;
        ctx.fillRect(0, canvasHeight - overlayHeight, canvasWidth, overlayHeight);
        
        // Text styling - lower contrast and smaller
        ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
        ctx.shadowColor = 'rgba(0, 0, 0, 0.4)';
        ctx.shadowBlur = Math.max(1, canvasWidth / 800);
        ctx.shadowOffsetX = 0.5;
        ctx.shadowOffsetY = 0.5;
        
        // Calculate font size proportional to image size
        const fontSize = Math.max(8, canvasWidth / 60);
        ctx.font = `${fontSize}px 'Segoe UI', Arial, sans-serif`;
        
        // Calculate padding proportional to image size
        const padding = Math.max(10, canvasWidth * 0.02);
        
        // Twitter handle on the left
        ctx.textAlign = 'left';
        ctx.fillText(this.xHandle, padding, canvasHeight - overlayHeight / 2 + fontSize / 3);
        
        // Contract address on the right
        ctx.textAlign = 'right';
        ctx.fillText(this.contractAddress, canvasWidth - padding, canvasHeight - overlayHeight / 2 + fontSize / 3);
        
        // Reset shadow
        ctx.shadowColor = 'transparent';
        ctx.shadowBlur = 0;
        ctx.shadowOffsetX = 0;
        ctx.shadowOffsetY = 0;
    }
    
    addCenterWatermark(canvasWidth, canvasHeight) {
        const ctx = this.ctx;
        
        // Save the current context state
        ctx.save();
        
        // Set very subtle watermark style - larger but more transparent
        ctx.fillStyle = 'rgba(255, 255, 255, 0.1)'; // Even lower opacity
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        
        // Calculate much larger font size for center watermark to cover more area
        const watermarkFontSize = Math.max(40, canvasWidth / 15); // Much larger: /15 instead of /80
        ctx.font = `${watermarkFontSize}px 'Segoe UI', Arial, sans-serif`;
        
        // Add very subtle shadow for better visibility on light backgrounds
        ctx.shadowColor = 'rgba(0, 0, 0, 0.02)'; // Even more subtle shadow
        ctx.shadowBlur = 2;
        ctx.shadowOffsetX = 1;
        ctx.shadowOffsetY = 1;
        
        // Position in the center
        const centerX = canvasWidth / 2;
        const centerY = canvasHeight / 2;
        
        // Draw the watermark
        ctx.fillText(this.projectName, centerX, centerY);
        
        // Restore the context state
        ctx.restore();
    }
    
    showPreview() {
        document.querySelector('.upload-section').style.display = 'none';
        this.previewSection.style.display = 'block';
    }
    
    downloadImage() {
        const link = document.createElement('a');
        
        // Get original filename and create new filename with overlay suffix
        let fileName;
        if (this.originalFile) {
            const originalName = this.originalFile.name;
            const lastDotIndex = originalName.lastIndexOf('.');
            if (lastDotIndex !== -1) {
                const nameWithoutExt = originalName.substring(0, lastDotIndex);
                const originalExt = originalName.substring(lastDotIndex);
                fileName = `${nameWithoutExt}-overlay${originalExt}`;
            } else {
                fileName = `${originalName}-overlay`;
            }
        } else {
            fileName = `image-overlay.png`;
        }
        
        // Set quality based on format
        let dataURL;
        
        if (this.originalFormat === 'image/jpeg' || this.originalFormat === 'image/jpg') {
            // High quality JPEG (0.95 = 95% quality)
            dataURL = this.canvas.toDataURL('image/jpeg', 0.95);
        } else if (this.originalFormat === 'image/webp') {
            // High quality WebP
            dataURL = this.canvas.toDataURL('image/webp', 0.95);
        } else {
            // PNG (lossless)
            dataURL = this.canvas.toDataURL('image/png');
        }
        
        link.download = fileName;
        link.href = dataURL;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }

    // Helper function to create thumbnail
    async createThumbnail(sourceCanvas, maxSize) {
        const { width, height } = sourceCanvas;
        
        // Calculate new dimensions while maintaining aspect ratio
        let newWidth, newHeight;
        if (width > height) {
            newWidth = Math.min(width, maxSize);
            newHeight = (height * newWidth) / width;
        } else {
            newHeight = Math.min(height, maxSize);
            newWidth = (width * newHeight) / height;
        }
        
        // Create thumbnail canvas
        const thumbCanvas = document.createElement('canvas');
        const thumbCtx = thumbCanvas.getContext('2d');
        
        thumbCanvas.width = newWidth;
        thumbCanvas.height = newHeight;
        
        // Draw resized image
        thumbCtx.drawImage(sourceCanvas, 0, 0, newWidth, newHeight);
        
        // Convert to blob
        return new Promise(resolve => {
            thumbCanvas.toBlob(resolve, 'image/jpeg', 0.85); // Use JPEG for smaller thumbnails
        });
    }

    // Helper function to generate thumbnail filename
    getThumbnailFileName(originalFileName) {
        const lastDotIndex = originalFileName.lastIndexOf('.');
        if (lastDotIndex !== -1) {
            const nameWithoutExt = originalFileName.substring(0, lastDotIndex);
            const ext = originalFileName.substring(lastDotIndex);
            return `${nameWithoutExt}-thumb.jpg`; // Always use .jpg for thumbnails
        } else {
            return `${originalFileName}-thumb.jpg`;
        }
    }
    
    async uploadToSupabase() {
        try {
            // Disable the upload button and show loading state
            this.uploadBtn.disabled = true;
            this.uploadBtn.textContent = 'Uploading...';
            
            // Convert canvas to blob (full size)
            const fullSizeBlob = await new Promise(resolve => {
                if (this.originalFormat === 'image/jpeg' || this.originalFormat === 'image/jpg') {
                    this.canvas.toBlob(resolve, 'image/jpeg', 0.95);
                } else if (this.originalFormat === 'image/webp') {
                    this.canvas.toBlob(resolve, 'image/webp', 0.95);
                } else {
                    this.canvas.toBlob(resolve, 'image/png');
                }
            });

            // Create thumbnail
            const thumbnailBlob = await this.createThumbnail(this.canvas, 300); // 300px max width/height
            
            // Generate filename
            let fileName;
            if (this.originalFile) {
                const originalName = this.originalFile.name;
                const lastDotIndex = originalName.lastIndexOf('.');
                if (lastDotIndex !== -1) {
                    const nameWithoutExt = originalName.substring(0, lastDotIndex);
                    const originalExt = originalName.substring(lastDotIndex);
                    fileName = `${nameWithoutExt}-overlay${originalExt}`;
                } else {
                    fileName = `${originalName}-overlay`;
                }
            } else {
                const timestamp = Date.now();
                fileName = `image-overlay-${timestamp}.png`;
            }

            // Generate thumbnail filename
            const thumbFileName = this.getThumbnailFileName(fileName);
            
            // Upload full-size image to Supabase storage
            this.uploadBtn.textContent = 'Uploading full image...';
            const filePath = `public/${fileName}`;
            const { data, error } = await this.supabase.storage
                .from('unapproved')
                .upload(filePath, fullSizeBlob, {
                    contentType: fullSizeBlob.type,
                    upsert: false // Disallow overwriting if file exists
                });
            
            if (error) {
                throw error;
            }

            // Upload thumbnail to Supabase storage
            this.uploadBtn.textContent = 'Uploading thumbnail...';
            const thumbFilePath = `public/${thumbFileName}`;
            const { data: thumbData, error: thumbError } = await this.supabase.storage
                .from('unapproved')
                .upload(thumbFilePath, thumbnailBlob, {
                    contentType: thumbnailBlob.type,
                    upsert: false
                });
            
            if (thumbError) {
                console.error('Thumbnail upload error:', thumbError);
                // Continue without thumbnail - not critical
            }
            
            // Get public URLs
            const { data: urlData } = this.supabase.storage
                .from('unapproved')
                .getPublicUrl(filePath);

            const { data: thumbUrlData } = this.supabase.storage
                .from('unapproved')
                .getPublicUrl(thumbFilePath);

            // Insert record into Images table
            this.uploadBtn.textContent = 'Saving to database...';
            const imageRecord = {
                name: filePath,
                url: urlData.publicUrl,
                bucket: 'unapproved'
            };

            // Add thumbnail URL if upload was successful
            if (!thumbError && thumbUrlData) {
                imageRecord.thumbnail_url = thumbUrlData.publicUrl;
            }

            const { data: insertData, error: insertError } = await this.supabase
                .from('images')
                .insert([imageRecord])
                .select();
            
            if (insertError) {
                console.error('Database insert error:', insertError);
                // Don't throw here - storage upload was successful, database is just a bonus
                alert(`Image uploaded successfully, but failed to save to database.\nPublic URL: ${urlData.publicUrl}\nError: ${insertError.message}`);
            } else {
                console.log('Database insert successful:', insertData);
                // Show success message
                alert(`Image uploaded successfully and saved to database!\nPublic URL: ${urlData.publicUrl}`);
            }
            
            // Optionally copy URL to clipboard
            if (navigator.clipboard) {
                try {
                    await navigator.clipboard.writeText(urlData.publicUrl);
                    console.log('URL copied to clipboard');
                } catch (clipboardError) {
                    console.log('Could not copy to clipboard:', clipboardError);
                }
            }
            
        } catch (error) {
            console.error('Upload error:', error);
            alert(`Upload failed: ${error.message}`);
        } finally {
            // Re-enable the upload button
            this.uploadBtn.disabled = false;
            this.uploadBtn.textContent = 'Upload to Supabase';
        }
    }
    
    resetUpload() {
        this.previewSection.style.display = 'none';
        document.querySelector('.upload-section').style.display = 'block';
        this.imageInput.value = '';
        
        // Clear canvas
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    }
    
    showError(message) {
        this.imagesGrid.innerHTML = `<div class="error">${message}</div>`;
    }
}

// Global variable for access from inline event handlers
let marsGallery;

// Initialize the application when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    marsGallery = new MarsMediaGallery();
});

// Prevent default drag behaviors on the document
document.addEventListener('dragover', (e) => e.preventDefault());
document.addEventListener('drop', (e) => e.preventDefault());
