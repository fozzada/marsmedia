# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Mars Media Gallery is a web application for managing and sharing Mars-themed images with @MarsPygmySOL overlay. The app consists of two main interfaces:

1. **Public Gallery** (`index.html`) - Browse and download approved images with search/filter functionality
2. **Admin Dashboard** (`approve.html`) - Manage image approval process and tags

## Architecture

### Frontend Stack
- **Vanilla JavaScript** - No frameworks, pure ES6+ classes
- **HTML5 Canvas** - Image manipulation and overlay rendering
- **CSS3** - Gradient backgrounds and responsive design
- **Supabase JS SDK** - Backend-as-a-Service via CDN

### Database Schema (Supabase)
- `images` - Pending approval images in 'unapproved' bucket
- `approved_images` - Approved images in 'approved' bucket  
- `tags` - Available tags for categorization
- `image_tags` - Many-to-many relationship between images and tags

### Storage Structure
- `unapproved` bucket - Temporary storage for pending images
- `approved` bucket - Public storage for approved images
- Thumbnails generated for performance (300px max dimension)

## Key Components

### MarsMediaGallery Class (`script.js:1-766`)
Main application class handling:
- Supabase client initialization
- Image gallery display with search/filter
- Canvas-based image overlay system
- File upload with drag & drop
- Image creation modal with preview

### AdminDashboard Class (`approve.js:1-709`) 
Admin interface class handling:
- Authentication via Supabase Auth
- Pending image review workflow
- Tag management (CRUD operations)
- Image approval/rejection with bucket transfers

### Image Overlay System
The app adds branded overlays to uploaded images:
- Bottom gradient bar with contract address and Twitter handle
- Subtle center watermark with project name
- Preserves original image quality and format
- Responsive sizing based on image dimensions

## Configuration

### Supabase Connection
Both files contain hardcoded Supabase credentials:
- URL: `https://nhsucumstmojfainalvp.supabase.co`
- Anon Key: Located in `script.js:5` and `approve.js:12`

### Branding Constants (`script.js:39-41`)
- Contract Address: `Cfmo6asAsZFx6GGQvAt4Ajxn8hN6vgWGpaSrjQKRpump`
- Twitter Handle: `@MarsPygmySOL`
- Project Name: `Mars on Pump`

## Development Workflow

### File Structure
```
├── index.html          # Public gallery interface
├── approve.html        # Admin dashboard interface  
├── script.js           # Main gallery functionality
├── approve.js          # Admin dashboard functionality
├── style.css           # Gallery styles
└── approve.css         # Admin dashboard styles
```

### No Build Process
This is a static web application with no build step. Files are served directly and use Supabase via CDN.

### Testing
Manual testing required - no automated test framework in place. Test both:
- Image upload and overlay generation
- Admin approval workflow with tag assignment

## Common Operations

### Adding New Features
1. Extend the appropriate class (`MarsMediaGallery` or `AdminDashboard`)
2. Add event listeners in the constructor or `initEventListeners()`
3. Implement corresponding CSS styles
4. Test with actual Supabase backend

### Modifying Image Overlays
- Edit `addTextOverlay()` method in `script.js:457-499`
- Adjust `addCenterWatermark()` for center branding in `script.js:501-531`
- Canvas operations use 2D context with gradient fills and text rendering

### Database Schema Changes  
- Update Supabase dashboard directly
- Modify corresponding JavaScript queries in both files
- Consider data migration for existing records