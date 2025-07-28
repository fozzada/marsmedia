class AdminDashboard {
    constructor() {
        // Check if Supabase is loaded
        if (typeof supabase === 'undefined') {
            console.error('Supabase library not loaded! Make sure the CDN script is included.');
            alert('Error: Supabase library not loaded. Please refresh the page.');
            return;
        }
        
        // Initialize Supabase
        this.supabaseUrl = 'https://nhsucumstmojfainalvp.supabase.co';
        this.supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5oc3VjdW1zdG1vamZhaW5hbHZwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM2ODQzOTAsImV4cCI6MjA2OTI2MDM5MH0.0TWbFkkn9ihIUhkqT_dN8VpdjGXRIeyJIsTACPTRKUk';
        
        try {
            this.supabase = supabase.createClient(this.supabaseUrl, this.supabaseAnonKey);
            console.log('Supabase client initialized successfully');
        } catch (error) {
            console.error('Failed to initialize Supabase client:', error);
            alert('Failed to initialize Supabase client. Please refresh the page.');
            return;
        }
        
        // UI Elements
        this.loginSection = document.getElementById('loginSection');
        this.dashboardSection = document.getElementById('dashboardSection');
        this.loginForm = document.getElementById('loginForm');
        this.logoutBtn = document.getElementById('logoutBtn');
        this.imagesGrid = document.getElementById('imagesGrid');
        this.loadingIndicator = document.getElementById('loadingIndicator');
        this.imageModal = document.getElementById('imageModal');
        
        // Check if critical elements exist
        if (!this.loginSection || !this.dashboardSection || !this.loginForm) {
            console.error('Critical DOM elements not found. Make sure approve.html is loaded correctly.');
            alert('Error: Page elements not found. Please refresh the page.');
            return;
        }
        
        // Stats
        this.pendingCount = document.getElementById('pendingCount');
        this.tagsCount = document.getElementById('tagsCount');
        
        // Tags
        this.allTagsContainer = document.getElementById('allTagsContainer');
        this.newTagInput = document.getElementById('newTagInput');
        this.addTagBtn = document.getElementById('addTagBtn');
        
        // Modal elements
        this.modalImage = document.getElementById('modalImage');
        this.modalImageName = document.getElementById('modalImageName');
        this.modalImageDate = document.getElementById('modalImageDate');
        this.modalTagsContainer = document.getElementById('modalTagsContainer');
        this.approveBtn = document.getElementById('approveBtn');
        this.rejectBtn = document.getElementById('rejectBtn');
        this.closeModal = document.getElementById('closeModal');
        this.cancelBtn = document.getElementById('cancelBtn');
        
        // Current image being processed
        this.currentImage = null;
        this.currentImageId = null;
        
        this.initEventListeners();
        this.checkAuthStatus();
    }
    
    async checkAuthStatus() {
        try {
            console.log('Checking authentication status...');
            
            const { data: { session }, error } = await this.supabase.auth.getSession();
            
            if (error) {
                console.error('Auth session check error:', error);
                this.showLogin();
                return;
            }
            
            if (session && session.user) {
                console.log('Existing session found for:', session.user.email);
                this.showDashboard();
            } else {
                console.log('No existing session found');
                this.showLogin();
            }
        } catch (error) {
            console.error('Auth check error:', error);
            this.showLogin();
        }
    }
    
    initEventListeners() {
        // Login form
        this.loginForm.addEventListener('submit', (e) => this.handleLogin(e));
        
        // Logout button
        this.logoutBtn.addEventListener('click', () => this.handleLogout());
        
        // Add tag button
        this.addTagBtn.addEventListener('click', () => this.addNewTag());
        
        // Enter key for new tag
        this.newTagInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                this.addNewTag();
            }
        });
        
        // Modal controls
        this.closeModal.addEventListener('click', () => this.closeImageModal());
        this.cancelBtn.addEventListener('click', () => this.closeImageModal());
        this.approveBtn.addEventListener('click', () => this.approveImage());
        this.rejectBtn.addEventListener('click', () => this.rejectImage());
        
        // Click outside modal to close
        this.imageModal.addEventListener('click', (e) => {
            if (e.target === this.imageModal) {
                this.closeImageModal();
            }
        });
    }
    
    async handleLogin(e) {
        e.preventDefault();
        
        const email = document.getElementById('adminEmail').value;
        const password = document.getElementById('adminPassword').value;
        
        if (!email || !password) {
            alert('Please enter both email and password.');
            return;
        }
        
        console.log('Attempting login...');
        
        try {
            const { data, error } = await this.supabase.auth.signInWithPassword({
                email: email,
                password: password
            });
            
            if (error) {
                console.error('Supabase auth error:', error);
                throw error;
            }
            
            console.log('Login successful:', data);
            this.showDashboard();
            
        } catch (error) {
            console.error('Login error details:', error);
            
            // Provide more specific error messages
            if (error.message.includes('Failed to fetch') || error.message.includes('fetch')) {
                alert(`Network connection failed. This might be due to:
• Internet connectivity issues
• Supabase service temporarily unavailable
• Browser blocking the request

Please try again in a moment.

Technical details: ${error.message}`);
            } else if (error.message.includes('Invalid login credentials')) {
                alert('Invalid email or password. Please check your credentials and try again.');
            } else {
                alert(`Login failed: ${error.message}`);
            }
        }
    }
    
    async handleLogout() {
        try {
            const { error } = await this.supabase.auth.signOut();
            if (error) {
                throw error;
            }
            this.showLogin();
        } catch (error) {
            console.error('Logout error:', error);
            alert(`Logout failed: ${error.message}`);
        }
    }
    
    showLogin() {
        this.loginSection.style.display = 'block';
        this.dashboardSection.style.display = 'none';
        // Clear form
        this.loginForm.reset();
    }
    
    showDashboard() {
        this.loginSection.style.display = 'none';
        this.dashboardSection.style.display = 'block';
        this.loadDashboardData();
    }
    
    async loadDashboardData() {
        await Promise.all([
            this.loadPendingImages(),
            this.loadTags()
        ]);
        this.updateStats();
    }
    
    async loadPendingImages() {
        try {
            this.loadingIndicator.style.display = 'block';
            
            const { data: images, error } = await this.supabase
                .from('images')
                .select('*')
                .order('uploaded_at', { ascending: false });
            
            if (error) {
                throw error;
            }
            
            await this.renderImages(images || []);
            
        } catch (error) {
            console.error('Load images error:', error);
            this.imagesGrid.innerHTML = `<p class="error">Failed to load images: ${error.message}</p>`;
        } finally {
            this.loadingIndicator.style.display = 'none';
        }
    }
    
    async renderImages(images) {
        if (images.length === 0) {
            this.imagesGrid.innerHTML = '<p class="no-data">No pending images to review.</p>';
            return;
        }
        
        // Generate image items with proper URLs
        const imageItems = await Promise.all(images.map(async (image) => {
            console.log('Processing image:', image.name);
            
            let imageUrl = null;
            
            // First try public URL (works if bucket is public)
            const { data: urlData } = this.supabase.storage
                .from('unapproved')
                .getPublicUrl(image.name);
            
            console.log('Public URL generated:', urlData.publicUrl);
            
            if (urlData.publicUrl && !urlData.publicUrl.includes('null')) {
                imageUrl = urlData.publicUrl;
            } else {
                // If public URL doesn't work, try signed URL (works for private buckets)
                try {
                    const { data: signedData, error: signedError } = await this.supabase.storage
                        .from('unapproved')
                        .createSignedUrl(image.name, 3600);
                    
                    console.log('Signed URL result:', signedData, signedError);
                    
                    if (!signedError && signedData && signedData.signedUrl) {
                        imageUrl = signedData.signedUrl;
                    }
                } catch (signedUrlError) {
                    console.error('Signed URL error:', signedUrlError);
                }
            }
            
            if (!imageUrl) {
                console.error('Could not generate valid URL for image:', image.name);
                // Create a placeholder image
                imageUrl = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSIjZGRkIi8+PHRleHQgeD0iNTAlIiB5PSI1MCUiIGZvbnQtZmFtaWx5PSJBcmlhbCIgZm9udC1zaXplPSIxNCIgZmlsbD0iIzk5OSIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZHk9Ii4zZW0iPkltYWdlIE5vdCBGb3VuZDwvdGV4dD48L3N2Zz4=';
            }
            
            console.log('Final image URL:', imageUrl);
            
            return `
                <div class="image-item" onclick="adminDashboard.openImageModal(${image.id}, '${imageUrl}', '${image.name}', '${image.uploaded_at}')">
                    <img src="${imageUrl}" alt="${image.name}" loading="lazy" onerror="this.style.display='none'; this.nextElementSibling.innerHTML='<p style=color:red;>Image failed to load</p>'">
                    <div class="image-info">
                        <h4>${image.name}</h4>
                        <p>${new Date(image.uploaded_at).toLocaleDateString()}</p>
                    </div>
                </div>
            `;
        }));
        
        this.imagesGrid.innerHTML = imageItems.join('');
    }
    
    async loadTags() {
        try {
            const { data: tags, error } = await this.supabase
                .from('tags')
                .select('*')
                .order('name');
            
            if (error) {
                throw error;
            }
            
            this.renderTags(tags || []);
            
        } catch (error) {
            console.error('Load tags error:', error);
            this.allTagsContainer.innerHTML = `<p class="error">Failed to load tags: ${error.message}</p>`;
        }
    }
    
    renderTags(tags) {
        this.allTagsContainer.innerHTML = tags.map(tag => `
            <span class="tag-pill" onclick="adminDashboard.deleteTag(${tag.id}, '${tag.name}')">
                ${tag.name} 
                <span class="delete-tag">×</span>
            </span>
        `).join('');
        
        // Also render in modal
        this.modalTagsContainer.innerHTML = tags.map(tag => `
            <label class="tag-checkbox">
                <input type="checkbox" value="${tag.id}" data-tag-name="${tag.name}">
                <span>${tag.name}</span>
            </label>
        `).join('');
    }
    
    async addNewTag() {
        const tagName = this.newTagInput.value.trim();
        if (!tagName) {
            alert('Please enter a tag name.');
            return;
        }
        
        try {
            const { data, error } = await this.supabase
                .from('tags')
                .insert([{ name: tagName }])
                .select();
            
            if (error) {
                throw error;
            }
            
            this.newTagInput.value = '';
            await this.loadTags();
            this.updateStats();
            
        } catch (error) {
            console.error('Add tag error:', error);
            alert(`Failed to add tag: ${error.message}`);
        }
    }
    
    async deleteTag(tagId, tagName) {
        if (!confirm(`Are you sure you want to delete the tag "${tagName}"?`)) {
            return;
        }
        
        try {
            // First delete any associations
            await this.supabase
                .from('image_tags')
                .delete()
                .eq('tag_id', tagId);
            
            // Then delete the tag
            const { error } = await this.supabase
                .from('tags')
                .delete()
                .eq('id', tagId);
            
            if (error) {
                throw error;
            }
            
            await this.loadTags();
            this.updateStats();
            
        } catch (error) {
            console.error('Delete tag error:', error);
            alert(`Failed to delete tag: ${error.message}`);
        }
    }
    
    updateStats() {
        const imageItems = this.imagesGrid.querySelectorAll('.image-item');
        const tagItems = this.allTagsContainer.querySelectorAll('.tag-pill');
        
        this.pendingCount.textContent = imageItems.length;
        this.tagsCount.textContent = tagItems.length;
    }
    
    openImageModal(imageId, imageUrl, imageName, createdAt) {
        this.currentImageId = imageId;
        this.currentImage = { id: imageId, url: imageUrl, name: imageName, uploaded_at: createdAt };
        
        this.modalImage.src = imageUrl;
        this.modalImageName.textContent = imageName;
        this.modalImageDate.textContent = new Date(createdAt).toLocaleString();
        
        // Clear previous selections
        const checkboxes = this.modalTagsContainer.querySelectorAll('input[type="checkbox"]');
        checkboxes.forEach(cb => cb.checked = false);
        
        this.imageModal.style.display = 'block';
    }
    
    closeImageModal() {
        this.imageModal.style.display = 'none';
        this.currentImage = null;
        this.currentImageId = null;
    }
    
    async approveImage() {
        if (!this.currentImage) {
            alert('No image selected.');
            return;
        }
        
        try {
            // Get selected tags
            const selectedTags = Array.from(this.modalTagsContainer.querySelectorAll('input[type="checkbox"]:checked'))
                .map(cb => ({ id: parseInt(cb.value), name: cb.dataset.tagName }));
            
            // Move image file from uploads to approved bucket
            const originalPath = `public/${this.currentImage.name}`;
            const approvedPath = `public/${this.currentImage.name}`;
            
            // Download from uploads bucket
            const { data: fileData, error: downloadError } = await this.supabase.storage
                .from('unapproved')
                .download(originalPath);
            
            if (downloadError) {
                throw new Error(`Failed to download from uploads: ${downloadError.message}`);
            }
            
            // Upload to approved bucket
            const { data: uploadData, error: uploadError } = await this.supabase.storage
                .from('approved')
                .upload(approvedPath, fileData, {
                    contentType: fileData.type,
                    upsert: true
                });
            
            if (uploadError) {
                throw new Error(`Failed to upload to approved: ${uploadError.message}`);
            }
            
            // Get public URL for approved bucket
            const { data: urlData } = this.supabase.storage
                .from('approved')
                .getPublicUrl(approvedPath);
            
            // Insert into approved_images table
            const { data: approvedImage, error: insertError } = await this.supabase
                .from('approved_images')
                .insert([{
                    name: this.currentImage.name,
                    url: urlData.publicUrl,
                    bucket: 'approved',
                    original_image_id: this.currentImage.id
                }])
                .select();
            
            if (insertError) {
                throw new Error(`Failed to insert into approved_images: ${insertError.message}`);
            }
            
            // Add tag associations if any tags were selected
            if (selectedTags.length > 0) {
                const tagAssociations = selectedTags.map(tag => ({
                    image_id: approvedImage[0].id,
                    tag_id: tag.id
                }));
                
                const { error: tagError } = await this.supabase
                    .from('image_tags')
                    .insert(tagAssociations);
                
                if (tagError) {
                    console.error('Tag association error:', tagError);
                    // Don't fail the whole operation for tag errors
                }
            }
            
            // Delete from uploads bucket
            const { error: deleteFileError } = await this.supabase.storage
                .from('unapproved')
                .remove([originalPath]);
            
            if (deleteFileError) {
                console.error('Failed to delete from uploads bucket:', deleteFileError);
                // Don't fail for this error
            }
            
            // Delete from images table
            const { error: deleteRowError } = await this.supabase
                .from('images')
                .delete()
                .eq('id', this.currentImage.id);
            
            if (deleteRowError) {
                throw new Error(`Failed to delete from images table: ${deleteRowError.message}`);
            }
            
            alert('Image approved and moved successfully!');
            this.closeImageModal();
            await this.loadPendingImages();
            this.updateStats();
            
        } catch (error) {
            console.error('Approval error:', error);
            alert(`Failed to approve image: ${error.message}`);
        }
    }
    
    async rejectImage() {
        if (!this.currentImage) {
            alert('No image selected.');
            return;
        }
        
        if (!confirm(`Are you sure you want to reject "${this.currentImage.name}"? This will permanently delete the image.`)) {
            return;
        }
        
        try {
            // Delete from uploads bucket
            const { error: deleteFileError } = await this.supabase.storage
                .from('unapproved')
                .remove([`public/${this.currentImage.name}`]);
            
            if (deleteFileError) {
                console.error('Failed to delete from uploads bucket:', deleteFileError);
                // Continue with database deletion even if file deletion fails
            }
            
            // Delete from images table
            const { error: deleteRowError } = await this.supabase
                .from('images')
                .delete()
                .eq('id', this.currentImage.id);
            
            if (deleteRowError) {
                throw deleteRowError;
            }
            
            alert('Image rejected and deleted successfully!');
            this.closeImageModal();
            await this.loadPendingImages();
            this.updateStats();
            
        } catch (error) {
            console.error('Rejection error:', error);
            alert(`Failed to reject image: ${error.message}`);
        }
    }
}

// Initialize the admin dashboard when DOM is loaded
let adminDashboard;

// Wait for both DOM and Supabase to be ready
document.addEventListener('DOMContentLoaded', () => {
    // Give a small delay to ensure Supabase library is fully loaded
    setTimeout(() => {
        console.log('Initializing AdminDashboard...');
        adminDashboard = new AdminDashboard();
    }, 100);
});
