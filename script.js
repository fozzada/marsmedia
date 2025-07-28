class ImageOverlay {
    constructor() {
        this.canvas = document.getElementById('canvas');
        this.ctx = this.canvas.getContext('2d');
        this.uploadArea = document.getElementById('uploadArea');
        this.imageInput = document.getElementById('imageInput');
        this.previewSection = document.getElementById('previewSection');
        this.downloadBtn = document.getElementById('downloadBtn');
        this.uploadBtn = document.getElementById('uploadBtn');
        this.resetBtn = document.getElementById('resetBtn');
        
        // Text to overlay
        this.contractAddress = 'Cfmo6asAsZFx6GGQvAt4Ajxn8hN6vgWGpaSrjQKRpump';
        this.xHandle = '@MarsPygmySOL';
        this.projectName = 'Mars on Pump';
        
        // Store original file info
        this.originalFile = null;
        this.originalFormat = 'png';
        
        // Initialize Supabase
        this.supabase = supabase.createClient(
            'https://nhsucumstmojfainalvp.supabase.co',
            'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5oc3VjdW1zdG1vamZhaW5hbHZwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM2ODQzOTAsImV4cCI6MjA2OTI2MDM5MH0.0TWbFkkn9ihIUhkqT_dN8VpdjGXRIeyJIsTACPTRKUk'
        );
        
        this.initEventListeners();
    }
    
    initEventListeners() {
        // Upload area click
        this.uploadArea.addEventListener('click', () => {
            this.imageInput.click();
        });
        
        // File input change
        this.imageInput.addEventListener('change', (e) => {
            this.handleFileSelect(e.target.files[0]);
        });
        
        // Drag and drop
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
        
        // Download button
        this.downloadBtn.addEventListener('click', () => {
            this.downloadImage();
        });
        
        // Upload to Supabase button
        this.uploadBtn.addEventListener('click', () => {
            this.uploadToSupabase();
        });
        
        // Reset button
        this.resetBtn.addEventListener('click', () => {
            this.resetUpload();
        });
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
    
    async uploadToSupabase() {
        try {
            // Disable the upload button and show loading state
            this.uploadBtn.disabled = true;
            this.uploadBtn.textContent = 'Uploading...';
            
            // Convert canvas to blob
            const blob = await new Promise(resolve => {
                if (this.originalFormat === 'image/jpeg' || this.originalFormat === 'image/jpg') {
                    this.canvas.toBlob(resolve, 'image/jpeg', 0.95);
                } else if (this.originalFormat === 'image/webp') {
                    this.canvas.toBlob(resolve, 'image/webp', 0.95);
                } else {
                    this.canvas.toBlob(resolve, 'image/png');
                }
            });
            
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
            
            // Upload to Supabase storage
            const filePath = `public/${fileName}`;
            const { data, error } = await this.supabase.storage
                .from('uploads')
                .upload(filePath, blob, {
                    contentType: blob.type,
                    upsert: false // Disallow overwriting if file exists
                });
            
            if (error) {
                throw error;
            }
            
            // Get public URL
            const { data: urlData } = this.supabase.storage
                .from('uploads')
                .getPublicUrl(filePath);
            
            // Insert record into Images table
            const { data: insertData, error: insertError } = await this.supabase
                .from('images')
                .insert([
                    {
                        name: fileName,
                        url: urlData.publicUrl,
                        bucket: 'uploads'
                    }
                ])
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
}

// Initialize the application when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new ImageOverlay();
});

// Prevent default drag behaviors on the document
document.addEventListener('dragover', (e) => e.preventDefault());
document.addEventListener('drop', (e) => e.preventDefault());
