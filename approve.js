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
                .select('*, thumbnail_url')
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
            
            // Try thumbnail first if available
            if (image.thumbnail_url) {
                console.log('Using thumbnail URL:', image.thumbnail_url);
                imageUrl = image.thumbnail_url;
            } else {
                // Fallback to full image processing
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
            }
            
            if (!imageUrl) {
                console.error('Could not generate valid URL for image:', image.name);
                // Create a placeholder image
                imageUrl = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSIjZGRkIi8+PHRleHQgeD0iNTAlIiB5PSI1MCUiIGZvbnQtZmFtaWx5PSJBcmlhbCIgZm9udC1zaXplPSIxNCIgZmlsbD0iIzk5OSIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZHk9Ii4zZW0iPkltYWdlIE5vdCBGb3VuZDwvdGV4dD48L3N2Zz4=';
            }
            
            console.log('Final image URL:', imageUrl);
            
            return `
                <div class="image-item" data-image-id="${image.id}" data-image-name="${image.name}">
                    <img src="${imageUrl}" alt="${image.name}" loading="lazy" onerror="this.style.display='none'; this.nextElementSibling.innerHTML='<p style=color:red;>Image failed to load</p>'">
                    <div class="image-info">
                        <h4>${image.name}</h4>
                        <p>${new Date(image.uploaded_at).toLocaleDateString()}</p>
                        <div class="image-tags">
                            <label>Tags:</label>
                            <div class="tags-pills-selection" id="tags-${image.id}">
                                <!-- Tag pills will be populated here -->
                            </div>
                        </div>
                        <div class="image-actions">
                            <button class="btn btn-approve" data-action="approve">Approve</button>
                            <button class="btn btn-reject" data-action="reject">Reject</button>
                        </div>
                    </div>
                </div>
            `;
        }));
        
        this.imagesGrid.innerHTML = imageItems.join('');
        
        // Add event listeners for approve/reject buttons
        this.addImageActionListeners();
        
        // Populate tags for each image after rendering
        await this.populateImageTags(images);
    }
    
    addImageActionListeners() {
        // Remove existing listeners to avoid duplicates
        if (this.handleImageAction) {
            this.imagesGrid.removeEventListener('click', this.handleImageAction);
        }
        
        // Define the click handler
        this.handleImageAction = (e) => {
            const button = e.target.closest('.btn[data-action]');
            if (!button) return;
            
            e.preventDefault();
            e.stopPropagation();
            
            const imageItem = button.closest('.image-item');
            const imageId = imageItem.dataset.imageId;
            const imageName = imageItem.dataset.imageName;
            const action = button.dataset.action;
            
            console.log('Button clicked:', action, imageId, imageName);
            
            if (action === 'approve') {
                this.approveImageDirect(imageId, imageName);
            } else if (action === 'reject') {
                this.rejectImageDirect(imageId, imageName);
            }
        };
        
        this.imagesGrid.addEventListener('click', this.handleImageAction);
    }
    
    async populateImageTags(images) {
        try {
            // Get all tags
            const { data: tags, error } = await this.supabase
                .from('tags')
                .select('*')
                .order('name');
            
            if (error) {
                console.error('Failed to load tags for images:', error);
                return;
            }
            
            // Populate tag pills for each image
            images.forEach(image => {
                const tagsContainer = document.getElementById(`tags-${image.id}`);
                if (tagsContainer && tags) {
                    tagsContainer.innerHTML = tags.map(tag => `
                        <div class="tag-pill-selectable" data-tag-id="${tag.id}" data-tag-name="${tag.name}">
                            ${tag.name}
                        </div>
                    `).join('');
                    
                    // Add click listeners to tag pills for this image
                    tagsContainer.querySelectorAll('.tag-pill-selectable').forEach(pill => {
                        pill.addEventListener('click', (e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            pill.classList.toggle('selected');
                        });
                    });
                }
            });
        } catch (error) {
            console.error('Error populating image tags:', error);
        }
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
            <span class="tag-pill" onclick="adminDashboard.deleteTag('${tag.id}', '${tag.name}')">
                ${tag.name} 
                <span class="delete-tag">×</span>
            </span>
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
        // Show confirmation toast instead of prompt
        if (!await this.showConfirmationToast(`Delete tag "${tagName}"?`)) {
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
            this.showToast(`Tag "${tagName}" deleted successfully!`, 'success');
            
        } catch (error) {
            console.error('Delete tag error:', error);
            this.showToast(`Failed to delete tag: ${error.message}`, 'error');
        }
    }
    
    updateStats() {
        const imageItems = this.imagesGrid.querySelectorAll('.image-item');
        const tagItems = this.allTagsContainer.querySelectorAll('.tag-pill');
        
        this.pendingCount.textContent = imageItems.length;
        this.tagsCount.textContent = tagItems.length;
    }

    // Helper function to extract filename from Supabase URL
    extractFileNameFromUrl(url) {
        try {
            // Supabase URLs typically end with /storage/v1/object/public/bucket/path/filename
            const urlParts = url.split('/');
            const filename = urlParts[urlParts.length - 1];
            return filename ? `public/${filename}` : null;
        } catch (error) {
            console.error('Error extracting filename from URL:', error);
            return null;
        }
    }
    
    async approveImageDirect(imageId, imageName) {
        // Show confirmation toast instead of prompt
        if (!await this.showConfirmationToast(`Approve image "${imageName}"?`)) {
            return;
        }
        
        try {
            console.log('Approving image:', imageName);
            
            // Get selected tags for this image
            const tagsContainer = document.getElementById(`tags-${imageId}`);
            const selectedTags = tagsContainer ? 
                Array.from(tagsContainer.querySelectorAll('.tag-pill-selectable.selected'))
                    .map(pill => {
                        const tagId = pill.dataset.tagId; // Keep as string since it's a GUID
                        const tagName = pill.dataset.tagName;
                        console.log('Processing selected pill:', tagId, 'name:', tagName);
                        return { id: tagId, name: tagName };
                    }) : [];
            
            console.log('Selected tags:', selectedTags);
            
            // First, get the original upload date and thumbnail info from the images table
            const { data: originalImage, error: fetchError } = await this.supabase
                .from('images')
                .select('uploaded_at, thumbnail_url')
                .eq('id', imageId)
                .single();
            
            if (fetchError) {
                console.error('Failed to fetch original image data:', fetchError);
            }
            
            // Download from unapproved bucket
            const { data: fileData, error: downloadError } = await this.supabase.storage
                .from('unapproved')
                .download(imageName);
            
            if (downloadError) {
                throw new Error(`Failed to download from unapproved bucket: ${downloadError.message}`);
            }
            
            // Upload to approved bucket
            const { data: uploadData, error: uploadError } = await this.supabase.storage
                .from('approved')
                .upload(imageName, fileData, {
                    contentType: fileData.type,
                    upsert: false
                });
            
            if (uploadError) {
                throw new Error(`Failed to upload to approved bucket: ${uploadError.message}`);
            }

            // Handle thumbnail if it exists
            let approvedThumbnailUrl = null;
            if (originalImage && originalImage.thumbnail_url) {
                try {
                    // Extract thumbnail filename from URL
                    const thumbnailFileName = this.extractFileNameFromUrl(originalImage.thumbnail_url);
                    
                    if (thumbnailFileName) {
                        // Download thumbnail from unapproved bucket
                        const { data: thumbData, error: thumbDownloadError } = await this.supabase.storage
                            .from('unapproved')
                            .download(thumbnailFileName);
                        
                        if (!thumbDownloadError && thumbData) {
                            // Upload thumbnail to approved bucket
                            const { data: thumbUploadData, error: thumbUploadError } = await this.supabase.storage
                                .from('approved')
                                .upload(thumbnailFileName, thumbData, {
                                    contentType: thumbData.type,
                                    upsert: false
                                });
                            
                            if (!thumbUploadError) {
                                const { data: thumbUrlData } = this.supabase.storage
                                    .from('approved')
                                    .getPublicUrl(thumbnailFileName);
                                approvedThumbnailUrl = thumbUrlData.publicUrl;
                            }
                        }
                    }
                } catch (thumbError) {
                    console.error('Thumbnail processing error:', thumbError);
                    // Continue without thumbnail - not critical
                }
            }
            
            // Get public URL for approved bucket
            const { data: urlData } = this.supabase.storage
                .from('approved')
                .getPublicUrl(imageName);
            
            // Insert into approved_images table with correct schema
            const approvedImageData = {
                name: imageName,
                url: urlData.publicUrl,
                bucket: 'approved'
            };
            
            // Add thumbnail URL if available
            if (approvedThumbnailUrl) {
                approvedImageData.thumbnail_url = approvedThumbnailUrl;
            }
            
            // Add original upload date if we have it
            if (originalImage && originalImage.uploaded_at) {
                approvedImageData.original_upload_date = originalImage.uploaded_at;
            }
            
            const { data: approvedImage, error: insertError } = await this.supabase
                .from('approved_images')
                .insert([approvedImageData])
                .select();
            
            if (insertError) {
                throw new Error(`Failed to insert into approved_images: ${insertError.message}`);
            }
            
            // Add tag associations if any tags were selected
            if (selectedTags.length > 0) {
                console.log('Creating tag associations for approved image ID:', approvedImage[0].id);
                console.log('Selected tags for association:', selectedTags);
                
                // Filter out any tags with invalid IDs (should be valid GUIDs)
                const validTags = selectedTags.filter(tag => tag.id && tag.id.trim() !== '');
                console.log('Valid tags after filtering:', validTags);
                
                if (validTags.length > 0) {
                    const tagAssociations = validTags.map(tag => ({
                        image_id: approvedImage[0].id,
                        tag_id: tag.id
                    }));
                    
                    console.log('Tag associations to insert:', tagAssociations);
                    
                    const { error: tagError } = await this.supabase
                        .from('image_tags')
                        .insert(tagAssociations);
                    
                    if (tagError) {
                        console.error('Tag association error:', tagError);
                        // Don't fail the whole operation for tag errors
                    } else {
                        console.log('Tags associated successfully:', tagAssociations);
                    }
                } else {
                    console.warn('No valid tags to associate after filtering');
                }
            }
            
            // Delete from unapproved bucket
            const { error: deleteFileError } = await this.supabase.storage
                .from('unapproved')
                .remove([imageName]);
            
            if (deleteFileError) {
                console.error('Failed to delete from unapproved bucket:', deleteFileError);
                // Don't fail for this error
            }
            
            // Delete from images table
            const { error: deleteRowError } = await this.supabase
                .from('images')
                .delete()
                .eq('id', imageId);
            
            if (deleteRowError) {
                throw new Error(`Failed to delete from images table: ${deleteRowError.message}`);
            }
            
            this.showToast('Image approved successfully!', 'success');
            await this.loadPendingImages();
            this.updateStats();
            
        } catch (error) {
            console.error('Approve error:', error);
            this.showToast(`Failed to approve image: ${error.message}`, 'error');
        }
    }
    
    async rejectImageDirect(imageId, imageName) {
        // Show confirmation toast instead of prompt
        if (!await this.showConfirmationToast(`Reject and permanently delete image "${imageName}"?`)) {
            return;
        }
        
        try {
            console.log('Rejecting image:', imageName);
            
            // Get thumbnail info to clean it up too
            const { data: originalImage, error: fetchError } = await this.supabase
                .from('images')
                .select('thumbnail_url')
                .eq('id', imageId)
                .single();
            
            // Delete main image from unapproved bucket
            const { error: deleteFileError } = await this.supabase.storage
                .from('unapproved')
                .remove([imageName]);
            
            if (deleteFileError) {
                console.error('Failed to delete from unapproved bucket:', deleteFileError);
                // Continue with database deletion even if file deletion fails
            }

            // Delete thumbnail if it exists
            if (!fetchError && originalImage && originalImage.thumbnail_url) {
                try {
                    const thumbnailFileName = this.extractFileNameFromUrl(originalImage.thumbnail_url);
                    if (thumbnailFileName) {
                        const { error: thumbDeleteError } = await this.supabase.storage
                            .from('unapproved')
                            .remove([thumbnailFileName]);
                        
                        if (thumbDeleteError) {
                            console.error('Failed to delete thumbnail:', thumbDeleteError);
                        }
                    }
                } catch (thumbError) {
                    console.error('Thumbnail cleanup error:', thumbError);
                }
            }
            
            // Delete from images table
            const { error: deleteRowError } = await this.supabase
                .from('images')
                .delete()
                .eq('id', imageId);
            
            if (deleteRowError) {
                throw new Error(`Failed to delete from images table: ${deleteRowError.message}`);
            }
            
            this.showToast('Image rejected and deleted successfully!', 'success');
            await this.loadPendingImages();
            this.updateStats();
            
        } catch (error) {
            console.error('Reject error:', error);
            this.showToast(`Failed to reject image: ${error.message}`, 'error');
        }
    }
    
    showToast(message = '✓ Success!', type = 'success') {
        // Create a temporary success message
        const toast = document.createElement('div');
        toast.textContent = message;
        
        let backgroundColor, textColor;
        switch(type) {
            case 'success':
                backgroundColor = '#4CAF50';
                textColor = 'white';
                break;
            case 'error':
                backgroundColor = '#f44336';
                textColor = 'white';
                break;
            case 'warning':
                backgroundColor = '#ff9800';
                textColor = 'white';
                break;
            default:
                backgroundColor = '#4CAF50';
                textColor = 'white';
        }
        
        toast.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: ${backgroundColor};
            color: ${textColor};
            padding: 12px 20px;
            border-radius: 8px;
            font-weight: 600;
            z-index: 10000;
            box-shadow: 0 4px 12px rgba(0,0,0,0.2);
            animation: slideIn 0.3s ease;
            font-family: 'Poppins', sans-serif;
        `;
        
        // Add CSS animation if not already added
        if (!document.querySelector('#toast-animation-style')) {
            const style = document.createElement('style');
            style.id = 'toast-animation-style';
            style.textContent = `
                @keyframes slideIn {
                    from { transform: translateX(100%); opacity: 0; }
                    to { transform: translateX(0); opacity: 1; }
                }
            `;
            document.head.appendChild(style);
        }
        
        document.body.appendChild(toast);
        
        // Remove after 3 seconds
        setTimeout(() => {
            if (toast.parentNode) {
                toast.parentNode.removeChild(toast);
            }
        }, 3000);
    }
    
    showConfirmationToast(message) {
        return new Promise((resolve) => {
            // Create confirmation modal
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
                font-family: 'Poppins', sans-serif;
            `;
            
            const dialog = document.createElement('div');
            dialog.style.cssText = `
                background: linear-gradient(135deg, rgba(255, 255, 255, 0.15) 0%, rgba(255, 255, 255, 0.1) 100%);
                backdrop-filter: blur(20px);
                border-radius: 20px;
                padding: 30px;
                border: 1px solid rgba(255, 255, 255, 0.2);
                text-align: center;
                min-width: 300px;
                color: white;
            `;
            
            dialog.innerHTML = `
                <h3 style="margin-bottom: 20px; color: rgba(224, 224, 224, 0.95);">${message}</h3>
                <div style="display: flex; gap: 15px; justify-content: center;">
                    <button id="confirmYes" style="
                        background: linear-gradient(135deg, #66C2D7 0%, #4A9FBF 100%);
                        color: white;
                        border: none;
                        padding: 12px 24px;
                        border-radius: 25px;
                        font-weight: 600;
                        cursor: pointer;
                        transition: all 0.3s ease;
                        box-shadow: 0 4px 15px rgba(102, 194, 215, 0.3);
                    ">Yes</button>
                    <button id="confirmNo" style="
                        background: rgba(184, 160, 130, 0.1);
                        backdrop-filter: blur(10px);
                        color: rgba(224, 224, 224, 0.9);
                        border: 1px solid rgba(184, 160, 130, 0.2);
                        padding: 12px 24px;
                        border-radius: 25px;
                        font-weight: 600;
                        cursor: pointer;
                        transition: all 0.3s ease;
                    ">Cancel</button>
                </div>
            `;
            
            modal.appendChild(dialog);
            document.body.appendChild(modal);
            
            const cleanup = () => {
                if (modal.parentNode) {
                    modal.parentNode.removeChild(modal);
                }
            };
            
            // Event listeners
            dialog.querySelector('#confirmYes').addEventListener('click', () => {
                cleanup();
                resolve(true);
            });
            
            dialog.querySelector('#confirmNo').addEventListener('click', () => {
                cleanup();
                resolve(false);
            });
            
            // Close on escape or outside click
            modal.addEventListener('click', (e) => {
                if (e.target === modal) {
                    cleanup();
                    resolve(false);
                }
            });
            
            const handleEscape = (e) => {
                if (e.key === 'Escape') {
                    cleanup();
                    resolve(false);
                    document.removeEventListener('keydown', handleEscape);
                }
            };
            document.addEventListener('keydown', handleEscape);
        });
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
