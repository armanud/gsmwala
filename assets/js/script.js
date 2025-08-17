// GSMarman - JavaScript Functionality
// Main application object
const GSMarman = {
    // Configuration
    config: {
        apiUrl: '/api',
        maxFileSize: 500 * 1024 * 1024, // 500MB
        allowedTypes: ['*'], // Allow all file types
        uploadEndpoint: '/api/upload',
        downloadEndpoint: '/api/download'
    },

    // State management
    state: {
        currentUser: null,
        uploadedFiles: [],
        isUploading: false
    },

    // Initialize the application
    init() {
        this.setupEventListeners();
        this.setupDragAndDrop();
        this.loadRecentFiles();
        this.checkAuthStatus();
    },

    // Setup all event listeners
    setupEventListeners() {
        // Navigation
        this.setupNavigation();
        
        // Modal events
        this.setupModals();
        
        // File upload events
        this.setupFileUpload();
        
        // Category events
        this.setupCategories();
        
        // Form submissions
        this.setupForms();
    },

    // Navigation functionality
    setupNavigation() {
        const hamburger = document.querySelector('.hamburger');
        const navMenu = document.querySelector('.nav-menu');
        
        if (hamburger) {
            hamburger.addEventListener('click', () => {
                navMenu.classList.toggle('active');
            });
        }

        // Smooth scrolling for navigation links
        document.querySelectorAll('a[href^="#"]').forEach(anchor => {
            anchor.addEventListener('click', function (e) {
                e.preventDefault();
                const target = document.querySelector(this.getAttribute('href'));
                if (target) {
                    target.scrollIntoView({
                        behavior: 'smooth',
                        block: 'start'
                    });
                }
            });
        });

        // Header scroll effect
        window.addEventListener('scroll', () => {
            const header = document.querySelector('.header');
            if (window.scrollY > 100) {
                header.style.background = 'rgba(255, 255, 255, 0.98)';
                header.style.boxShadow = '0 4px 20px rgba(0, 0, 0, 0.1)';
            } else {
                header.style.background = 'rgba(255, 255, 255, 0.95)';
                header.style.boxShadow = 'none';
            }
        });
    },

    // Modal functionality
    setupModals() {
        const loginBtn = document.getElementById('loginBtn');
        const signupBtn = document.getElementById('signupBtn');
        const showSignup = document.getElementById('showSignup');
        const showLogin = document.getElementById('showLogin');
        const closeBtns = document.querySelectorAll('.close');
        
        // Open modals
        if (loginBtn) {
            loginBtn.addEventListener('click', () => this.openModal('loginModal'));
        }
        
        if (signupBtn) {
            signupBtn.addEventListener('click', () => this.openModal('signupModal'));
        }
        
        // Switch between modals
        if (showSignup) {
            showSignup.addEventListener('click', (e) => {
                e.preventDefault();
                this.closeModal('loginModal');
                this.openModal('signupModal');
            });
        }
        
        if (showLogin) {
            showLogin.addEventListener('click', (e) => {
                e.preventDefault();
                this.closeModal('signupModal');
                this.openModal('loginModal');
            });
        }
        
        // Close modals
        closeBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                const modalId = btn.getAttribute('data-modal');
                this.closeModal(modalId);
            });
        });
        
        // Close modal on backdrop click
        document.querySelectorAll('.modal').forEach(modal => {
            modal.addEventListener('click', (e) => {
                if (e.target === modal) {
                    this.closeModal(modal.id);
                }
            });
        });
    },

    // Open modal
    openModal(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.classList.add('active');
            document.body.style.overflow = 'hidden';
        }
    },

    // Close modal
    closeModal(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.classList.remove('active');
            document.body.style.overflow = '';
        }
    },

    // File upload functionality
    setupFileUpload() {
        const uploadArea = document.getElementById('uploadArea');
        const fileInput = document.getElementById('fileInput');
        const selectFilesBtn = document.getElementById('selectFilesBtn');
        
        if (selectFilesBtn) {
            selectFilesBtn.addEventListener('click', () => {
                fileInput.click();
            });
        }
        
        if (uploadArea) {
            uploadArea.addEventListener('click', () => {
                if (!this.state.isUploading) {
                    fileInput.click();
                }
            });
        }
        
        if (fileInput) {
            fileInput.addEventListener('change', (e) => {
                this.handleFiles(e.target.files);
            });
        }
    },

    // Drag and drop functionality
    setupDragAndDrop() {
        const uploadArea = document.getElementById('uploadArea');
        
        if (!uploadArea) return;
        
        ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
            uploadArea.addEventListener(eventName, this.preventDefaults, false);
            document.body.addEventListener(eventName, this.preventDefaults, false);
        });
        
        ['dragenter', 'dragover'].forEach(eventName => {
            uploadArea.addEventListener(eventName, () => {
                uploadArea.classList.add('dragover');
            }, false);
        });
        
        ['dragleave', 'drop'].forEach(eventName => {
            uploadArea.addEventListener(eventName, () => {
                uploadArea.classList.remove('dragover');
            }, false);
        });
        
        uploadArea.addEventListener('drop', (e) => {
            const files = e.dataTransfer.files;
            this.handleFiles(files);
        }, false);
    },

    // Prevent default drag behaviors
    preventDefaults(e) {
        e.preventDefault();
        e.stopPropagation();
    },

    // Handle selected files
    async handleFiles(files) {
        if (files.length === 0) return;
        
        // Validate files
        const validFiles = Array.from(files).filter(file => this.validateFile(file));
        
        if (validFiles.length === 0) {
            this.showNotification('No valid files selected', 'error');
            return;
        }
        
        // Upload files
        await this.uploadFiles(validFiles);
    },

    // Validate individual file
    validateFile(file) {
        // Check file size
        if (file.size > this.config.maxFileSize) {
            this.showNotification(`File "${file.name}" is too large. Maximum size is 500MB.`, 'error');
            return false;
        }
        
        return true;
    },

    // Upload files to server
    async uploadFiles(files) {
        this.state.isUploading = true;
        const uploadArea = document.getElementById('uploadArea');
        const uploadProgress = document.getElementById('uploadProgress');
        const progressFill = document.getElementById('progressFill');
        const progressText = document.getElementById('progressText');
        
        // Show upload state
        uploadArea.classList.add('uploading');
        uploadProgress.style.display = 'block';
        
        try {
            for (let i = 0; i < files.length; i++) {
                const file = files[i];
                const formData = new FormData();
                formData.append('file', file);
                
                // Update progress
                const progress = Math.round(((i + 1) / files.length) * 100);
                progressFill.style.width = `${progress}%`;
                progressText.textContent = `Uploading ${file.name}... ${progress}%`;
                
                // Simulate upload (replace with actual API call)
                await this.simulateUpload(file);
            }
            
            // Success state
            uploadArea.classList.remove('uploading');
            uploadArea.classList.add('success');
            progressText.textContent = 'Upload completed successfully!';
            
            this.showNotification(`${files.length} file(s) uploaded successfully!`, 'success');
            
            // Reset after 3 seconds
            setTimeout(() => {
                uploadArea.classList.remove('success');
                uploadProgress.style.display = 'none';
                progressFill.style.width = '0%';
            }, 3000);
            
        } catch (error) {
            console.error('Upload failed:', error);
            uploadArea.classList.remove('uploading');
            uploadArea.classList.add('error');
            progressText.textContent = 'Upload failed!';
            this.showNotification('Upload failed. Please try again.', 'error');
            
            setTimeout(() => {
                uploadArea.classList.remove('error');
                uploadProgress.style.display = 'none';
                progressFill.style.width = '0%';
            }, 3000);
        } finally {
            this.state.isUploading = false;
        }
    },

    // Upload file to server via API
    async simulateUpload(file) {
        const formData = new FormData();
        formData.append('file', file);
        
        try {
            const response = await fetch('/api/upload', {
                method: 'POST',
                body: formData
            });
            
            if (!response.ok) {
                throw new Error(`Upload failed: ${response.statusText}`);
            }
            
            const result = await response.json();
            
            // Add to uploaded files
            this.state.uploadedFiles.push(result.file);
            
            // Refresh recent files
            setTimeout(() => this.loadRecentFiles(), 1000);
            
            return result.file;
        } catch (error) {
            console.error('Upload error:', error);
            throw error;
        }
    },

    // Category functionality
    setupCategories() {
        const categoryCards = document.querySelectorAll('.category-card');
        
        categoryCards.forEach(card => {
            card.addEventListener('click', () => {
                const category = card.getAttribute('data-category');
                this.filterFilesByCategory(category);
                this.showNotification(`Showing ${category} files`, 'success');
            });
        });
    },

    // Filter files by category
    filterFilesByCategory(category) {
        // This would typically filter and display files
        console.log(`Filtering files by category: ${category}`);
        // Implement filtering logic here
    },

    // Form submissions
    setupForms() {
        const loginForm = document.getElementById('loginForm');
        const signupForm = document.getElementById('signupForm');
        
        if (loginForm) {
            loginForm.addEventListener('submit', (e) => this.handleLogin(e));
        }
        
        if (signupForm) {
            signupForm.addEventListener('submit', (e) => this.handleSignup(e));
        }
    },

    // Handle login
    async handleLogin(e) {
        e.preventDefault();
        const email = document.getElementById('loginEmail').value;
        const password = document.getElementById('loginPassword').value;
        
        try {
            // Simulate login API call
            await this.simulateAuth('login', { email, password });
            this.showNotification('Login successful!', 'success');
            this.closeModal('loginModal');
            this.updateAuthUI(true);
        } catch (error) {
            this.showNotification('Login failed. Please check your credentials.', 'error');
        }
    },

    // Handle signup
    async handleSignup(e) {
        e.preventDefault();
        const name = document.getElementById('signupName').value;
        const email = document.getElementById('signupEmail').value;
        const password = document.getElementById('signupPassword').value;
        
        try {
            // Simulate signup API call
            await this.simulateAuth('signup', { name, email, password });
            this.showNotification('Account created successfully!', 'success');
            this.closeModal('signupModal');
            this.updateAuthUI(true);
        } catch (error) {
            this.showNotification('Signup failed. Please try again.', 'error');
        }
    },

    // Simulate authentication
    simulateAuth(type, data) {
        return new Promise((resolve, reject) => {
            setTimeout(() => {
                if (data.email && data.password) {
                    this.state.currentUser = {
                        name: data.name || 'User',
                        email: data.email
                    };
                    resolve(this.state.currentUser);
                } else {
                    reject(new Error('Authentication failed'));
                }
            }, 1000);
        });
    },

    // Update authentication UI
    updateAuthUI(isLoggedIn) {
        const loginBtn = document.getElementById('loginBtn');
        const signupBtn = document.getElementById('signupBtn');
        
        if (isLoggedIn && this.state.currentUser) {
            if (loginBtn) loginBtn.textContent = this.state.currentUser.name;
            if (signupBtn) signupBtn.style.display = 'none';
        } else {
            if (loginBtn) loginBtn.textContent = 'Login';
            if (signupBtn) signupBtn.style.display = 'inline-flex';
        }
    },

    // Check authentication status
    checkAuthStatus() {
        // Check if user is already logged in (from localStorage, cookies, etc.)
        const savedUser = localStorage.getItem('gsmarman_user');
        if (savedUser) {
            this.state.currentUser = JSON.parse(savedUser);
            this.updateAuthUI(true);
        }
    },

    // Load recent files
    async loadRecentFiles() {
        const recentFilesContainer = document.getElementById('recentFiles');
        if (!recentFilesContainer) return;
        
        try {
            // Simulate loading recent files
            const recentFiles = await this.simulateLoadRecentFiles();
            this.renderRecentFiles(recentFiles, recentFilesContainer);
        } catch (error) {
            console.error('Failed to load recent files:', error);
        }
    },

    // Load recent files from API
    async simulateLoadRecentFiles() {
        try {
            const response = await fetch('/api/recent');
            if (!response.ok) {
                throw new Error(`Failed to load files: ${response.statusText}`);
            }
            
            const data = await response.json();
            return data.files.length > 0 ? data.files : this.getSampleFiles();
        } catch (error) {
            console.error('Failed to load recent files:', error);
            // Return sample files as fallback
            return this.getSampleFiles();
        }
    },
    
    // Get sample files for demo
    getSampleFiles() {
        return [
            {
                id: 1,
                name: 'Project_Presentation.pptx',
                size: '2.5 MB',
                type: 'presentation',
                icon: 'fas fa-file-powerpoint',
                uploadDate: '2 hours ago',
                downloads: 15
            },
            {
                id: 2,
                name: 'Summer_Vacation.zip',
                size: '45.2 MB',
                type: 'archive',
                icon: 'fas fa-file-archive',
                uploadDate: '5 hours ago',
                downloads: 8
            },
            {
                id: 3,
                name: 'Tutorial_Video.mp4',
                size: '128.7 MB',
                type: 'video',
                icon: 'fas fa-video',
                uploadDate: '1 day ago',
                downloads: 32
            },
            {
                id: 4,
                name: 'Report_2024.pdf',
                size: '1.8 MB',
                type: 'document',
                icon: 'fas fa-file-pdf',
                uploadDate: '2 days ago',
                downloads: 67
            },
            {
                id: 5,
                name: 'Profile_Photo.jpg',
                size: '856 KB',
                type: 'image',
                icon: 'fas fa-image',
                uploadDate: '3 days ago',
                downloads: 12
            },
            {
                id: 6,
                name: 'Music_Album.zip',
                size: '89.4 MB',
                type: 'audio',
                icon: 'fas fa-music',
                uploadDate: '1 week ago',
                downloads: 45
            }
        ];
    },

    // Render recent files
    renderRecentFiles(files, container) {
        const filesHTML = files.map(file => `
            <div class="file-card">
                <div class="file-header">
                    <div class="file-icon">
                        <i class="${file.icon}"></i>
                    </div>
                    <div class="file-info">
                        <h4>${file.name}</h4>
                        <p>${file.size} • ${file.uploadDate}</p>
                    </div>
                </div>
                <div class="file-actions">
                    <button class="btn btn-primary btn-sm" onclick="GSMarman.downloadFile(${file.id})">
                        <i class="fas fa-download"></i> Download
                    </button>
                    <button class="btn btn-outline btn-sm" onclick="GSMarman.shareFile(${file.id})">
                        <i class="fas fa-share"></i> Share
                    </button>
                </div>
                <div style="margin-top: 0.5rem; color: var(--text-secondary); font-size: 0.8rem;">
                    <i class="fas fa-download"></i> ${file.downloads} downloads
                </div>
            </div>
        `).join('');
        
        container.innerHTML = filesHTML;
    },

    // Download file
    downloadFile(fileId) {
        this.showNotification('Download started!', 'success');
        // Implement actual download logic here
        console.log(`Downloading file with ID: ${fileId}`);
    },

    // Share file
    shareFile(fileId) {
        const shareUrl = `${window.location.origin}/share/${fileId}`;
        
        if (navigator.share) {
            navigator.share({
                title: 'GSMarman File Share',
                text: 'Check out this file on GSMarman',
                url: shareUrl
            });
        } else {
            // Fallback to clipboard
            navigator.clipboard.writeText(shareUrl).then(() => {
                this.showNotification('Share link copied to clipboard!', 'success');
            });
        }
    },

    // Show notification
    showNotification(message, type = 'info') {
        // Remove existing notifications
        const existingNotifications = document.querySelectorAll('.notification');
        existingNotifications.forEach(notification => notification.remove());
        
        // Create notification element
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.innerHTML = `
            <div style="display: flex; align-items: center; gap: 0.5rem;">
                <i class="fas fa-${this.getNotificationIcon(type)}"></i>
                <span>${message}</span>
            </div>
        `;
        
        // Add to DOM
        document.body.appendChild(notification);
        
        // Show notification
        setTimeout(() => notification.classList.add('show'), 100);
        
        // Auto remove after 5 seconds
        setTimeout(() => {
            notification.classList.remove('show');
            setTimeout(() => notification.remove(), 300);
        }, 5000);
    },

    // Get notification icon
    getNotificationIcon(type) {
        const icons = {
            success: 'check-circle',
            error: 'exclamation-circle',
            warning: 'exclamation-triangle',
            info: 'info-circle'
        };
        return icons[type] || icons.info;
    },

    // Utility function to format file size
    formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    },

    // Utility function to get file type icon
    getFileTypeIcon(fileName) {
        const extension = fileName.split('.').pop().toLowerCase();
        const iconMap = {
            // Images
            'jpg': 'fas fa-image',
            'jpeg': 'fas fa-image',
            'png': 'fas fa-image',
            'gif': 'fas fa-image',
            'svg': 'fas fa-image',
            'webp': 'fas fa-image',
            
            // Videos
            'mp4': 'fas fa-video',
            'avi': 'fas fa-video',
            'mov': 'fas fa-video',
            'mkv': 'fas fa-video',
            'wmv': 'fas fa-video',
            
            // Audio
            'mp3': 'fas fa-music',
            'wav': 'fas fa-music',
            'flac': 'fas fa-music',
            'aac': 'fas fa-music',
            
            // Documents
            'pdf': 'fas fa-file-pdf',
            'doc': 'fas fa-file-word',
            'docx': 'fas fa-file-word',
            'xls': 'fas fa-file-excel',
            'xlsx': 'fas fa-file-excel',
            'ppt': 'fas fa-file-powerpoint',
            'pptx': 'fas fa-file-powerpoint',
            'txt': 'fas fa-file-alt',
            
            // Archives
            'zip': 'fas fa-file-archive',
            'rar': 'fas fa-file-archive',
            '7z': 'fas fa-file-archive',
            'tar': 'fas fa-file-archive',
            
            // Code
            'js': 'fas fa-file-code',
            'html': 'fas fa-file-code',
            'css': 'fas fa-file-code',
            'php': 'fas fa-file-code',
            'py': 'fas fa-file-code',
            'java': 'fas fa-file-code'
        };
        
        return iconMap[extension] || 'fas fa-file';
    }
};

// Initialize the application when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    GSMarman.init();
});

// Handle page visibility for better performance
document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') {
        // Refresh data when page becomes visible
        GSMarman.loadRecentFiles();
    }
});

// Handle online/offline status
window.addEventListener('online', () => {
    GSMarman.showNotification('Connection restored!', 'success');
});

window.addEventListener('offline', () => {
    GSMarman.showNotification('Connection lost. Some features may not work.', 'warning');
});

// Export for global access
window.GSMarman = GSMarman;