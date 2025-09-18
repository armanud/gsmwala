// Mobile Navigation
const hamburger = document.querySelector('.hamburger');
const navMenu = document.querySelector('.nav-menu');

hamburger.addEventListener('click', () => {
    hamburger.classList.toggle('active');
    navMenu.classList.toggle('active');
});

// Close mobile menu when clicking on a link
document.querySelectorAll('.nav-link').forEach(n => n.addEventListener('click', () => {
    hamburger.classList.remove('active');
    navMenu.classList.remove('active');
}));

// Smooth Scrolling
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

// File Upload Functionality
const uploadArea = document.getElementById('uploadArea');
const fileInput = document.getElementById('fileInput');
const uploadProgress = document.getElementById('uploadProgress');
const progressFill = document.getElementById('progressFill');
const progressText = document.getElementById('progressText');
const fileList = document.getElementById('fileList');

let uploadedFiles = [];

// Drag and Drop Events
uploadArea.addEventListener('dragover', (e) => {
    e.preventDefault();
    uploadArea.classList.add('dragover');
});

uploadArea.addEventListener('dragleave', (e) => {
    e.preventDefault();
    uploadArea.classList.remove('dragover');
});

uploadArea.addEventListener('drop', (e) => {
    e.preventDefault();
    uploadArea.classList.remove('dragover');
    const files = e.dataTransfer.files;
    handleFiles(files);
});

// File Input Change
fileInput.addEventListener('change', (e) => {
    handleFiles(e.target.files);
});

// Handle Files Function
async function handleFiles(files) {
    if (files.length === 0) return;
    
    // Clear previous file list
    fileList.innerHTML = '';
    uploadedFiles = [];
    
    // Show progress bar
    uploadProgress.style.display = 'block';
    
    // Add files to list first
    Array.from(files).forEach((file, index) => {
        uploadedFiles.push(file);
        addFileToList(file, index);
    });
    
    // Upload files to server
    await uploadFilesToServer(files);
}

// Add File to List
function addFileToList(file, index) {
    const fileItem = document.createElement('div');
    fileItem.className = 'file-item';
    fileItem.innerHTML = `
        <div class="file-item-info">
            <i class="fas ${getFileIcon(file.type)} file-item-icon"></i>
            <div>
                <h4>${file.name}</h4>
                <p>${formatFileSize(file.size)}</p>
            </div>
        </div>
        <div class="file-item-status" id="status-${index}">
            <i class="fas fa-clock"></i> Pending
        </div>
    `;
    fileList.appendChild(fileItem);
}

// Upload Files to Server
async function uploadFilesToServer(files) {
    const formData = new FormData();
    
    // Add all files to FormData
    Array.from(files).forEach(file => {
        formData.append('files', file);
    });
    
    try {
        // Show upload progress
        let progress = 0;
        const progressInterval = setInterval(() => {
            progress += Math.random() * 10;
            if (progress >= 90) progress = 90;
            updateProgressBar(progress);
        }, 100);
        
        const response = await fetch('/api/upload', {
            method: 'POST',
            body: formData
        });
        
        clearInterval(progressInterval);
        updateProgressBar(100);
        
        const result = await response.json();
        
        if (result.success) {
            // Update status for all files
            files.forEach((file, index) => {
                const statusElement = document.getElementById(`status-${index}`);
                if (statusElement) {
                    statusElement.innerHTML = '<i class="fas fa-check-circle"></i> Uploaded';
                    statusElement.style.color = '#28a745';
                }
            });
            
            // Refresh files grid
            await loadFilesFromServer();
            
            showSuccessMessage(`${files.length} file(s) uploaded successfully!`);
            
            setTimeout(() => {
                uploadProgress.style.display = 'none';
            }, 1500);
            
        } else {
            throw new Error(result.error || 'Upload failed');
        }
        
    } catch (error) {
        console.error('Upload error:', error);
        
        // Update status for all files to show error
        files.forEach((file, index) => {
            const statusElement = document.getElementById(`status-${index}`);
            if (statusElement) {
                statusElement.innerHTML = '<i class="fas fa-exclamation-circle"></i> Failed';
                statusElement.style.color = '#dc3545';
            }
        });
        
        showNotification('Upload failed: ' + error.message, 'error');
        
        setTimeout(() => {
            uploadProgress.style.display = 'none';
        }, 1500);
    }
}

// Update Progress Bar
function updateProgressBar(progress) {
    progressFill.style.width = progress + '%';
    progressText.textContent = Math.round(progress) + '%';
}

// Update Overall Progress
function updateOverallProgress() {
    const totalFiles = uploadedFiles.length;
    const completedFiles = document.querySelectorAll('.file-item-status').length;
    const progress = Math.min((completedFiles / totalFiles) * 100, 100);
    
    progressFill.style.width = progress + '%';
    progressText.textContent = Math.round(progress) + '%';
    
    if (progress === 100) {
        setTimeout(() => {
            uploadProgress.style.display = 'none';
            showSuccessMessage();
        }, 1000);
    }
}

// Add to Files Grid
function addToFilesGrid(file) {
    const filesGrid = document.getElementById('filesGrid');
    const fileCard = document.createElement('div');
    fileCard.className = 'file-card fade-in';
    fileCard.setAttribute('data-type', getFileType(file.type));
    
    fileCard.innerHTML = `
        <div class="file-icon">
            <i class="fas ${getFileIcon(file.type)}"></i>
        </div>
        <div class="file-info">
            <h4>${file.name}</h4>
            <p class="file-size">${formatFileSize(file.size)}</p>
            <p class="file-date">Just now</p>
        </div>
        <div class="file-actions">
            <button class="btn-action download-btn" onclick="downloadFile('${file.name}')">
                <i class="fas fa-download"></i>
            </button>
            <button class="btn-action share-btn" onclick="shareFile('${file.name}')">
                <i class="fas fa-share"></i>
            </button>
        </div>
    `;
    
    filesGrid.insertBefore(fileCard, filesGrid.firstChild);
}

// Get File Icon
function getFileIcon(fileType) {
    if (fileType.startsWith('image/')) return 'fa-file-image';
    if (fileType.startsWith('video/')) return 'fa-file-video';
    if (fileType.startsWith('audio/')) return 'fa-file-audio';
    if (fileType === 'application/pdf') return 'fa-file-pdf';
    if (fileType.includes('word') || fileType.includes('document')) return 'fa-file-word';
    if (fileType.includes('sheet') || fileType.includes('excel')) return 'fa-file-excel';
    if (fileType.includes('presentation') || fileType.includes('powerpoint')) return 'fa-file-powerpoint';
    if (fileType.includes('zip') || fileType.includes('rar') || fileType.includes('archive')) return 'fa-file-archive';
    if (fileType.includes('text') || fileType.includes('code')) return 'fa-file-code';
    return 'fa-file';
}

// Get File Type Category
function getFileType(fileType) {
    if (fileType.startsWith('image/')) return 'image';
    if (fileType.startsWith('video/')) return 'video';
    if (fileType === 'application/pdf') return 'pdf';
    if (fileType.includes('zip') || fileType.includes('rar') || fileType.includes('archive')) return 'archive';
    if (fileType.includes('word') || fileType.includes('document') || fileType.includes('text')) return 'document';
    return 'other';
}

// Format File Size
function formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

// Show Success Message
function showSuccessMessage() {
    const successDiv = document.createElement('div');
    successDiv.className = 'alert alert-success';
    successDiv.innerHTML = `
        <i class="fas fa-check-circle"></i>
        Files uploaded successfully!
    `;
    successDiv.style.cssText = `
        position: fixed;
        top: 100px;
        right: 20px;
        background: #d4edda;
        color: #155724;
        padding: 1rem 1.5rem;
        border-radius: 8px;
        border: 1px solid #c3e6cb;
        z-index: 1000;
        animation: slideIn 0.3s ease;
    `;
    
    document.body.appendChild(successDiv);
    
    setTimeout(() => {
        successDiv.remove();
    }, 3000);
}

// Search and Filter Functionality
const searchInput = document.getElementById('searchInput');
const typeFilter = document.getElementById('typeFilter');
const sortFilter = document.getElementById('sortFilter');

// Debounce function for search
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

const debouncedLoadFiles = debounce(loadFilesFromServer, 300);

searchInput.addEventListener('input', debouncedLoadFiles);
typeFilter.addEventListener('change', loadFilesFromServer);
sortFilter.addEventListener('change', loadFilesFromServer);

function sortFiles(cards, sortBy) {
    const parent = cards[0].parentNode;
    
    cards.sort((a, b) => {
        const aName = a.querySelector('h4').textContent;
        const bName = b.querySelector('h4').textContent;
        const aSize = a.querySelector('.file-size').textContent;
        const bSize = b.querySelector('.file-size').textContent;
        const aDate = a.querySelector('.file-date').textContent;
        const bDate = b.querySelector('.file-date').textContent;
        
        switch (sortBy) {
            case 'name':
                return aName.localeCompare(bName);
            case 'size':
                return parseFileSize(bSize) - parseFileSize(aSize);
            case 'newest':
                return new Date(bDate) - new Date(aDate);
            case 'oldest':
                return new Date(aDate) - new Date(bDate);
            default:
                return 0;
        }
    });
    
    // Re-append sorted cards
    cards.forEach(card => parent.appendChild(card));
}

function parseFileSize(sizeStr) {
    const units = { 'Bytes': 1, 'KB': 1024, 'MB': 1024*1024, 'GB': 1024*1024*1024 };
    const parts = sizeStr.split(' ');
    return parseFloat(parts[0]) * (units[parts[1]] || 1);
}

// Load Files from Server
async function loadFilesFromServer() {
    try {
        const searchTerm = searchInput.value;
        const typeValue = typeFilter.value;
        const sortValue = sortFilter.value;
        
        const params = new URLSearchParams();
        if (searchTerm) params.append('search', searchTerm);
        if (typeValue) params.append('type', typeValue);
        if (sortValue) params.append('sort', sortValue);
        
        const response = await fetch(`/api/files?${params}`);
        const result = await response.json();
        
        if (result.success) {
            displayFiles(result.files);
        } else {
            throw new Error(result.error || 'Failed to load files');
        }
        
    } catch (error) {
        console.error('Load files error:', error);
        showNotification('Failed to load files', 'error');
    }
}

// Display Files in Grid
function displayFiles(files) {
    const filesGrid = document.getElementById('filesGrid');
    filesGrid.innerHTML = '';
    
    files.forEach(file => {
        const fileCard = document.createElement('div');
        fileCard.className = 'file-card fade-in';
        fileCard.setAttribute('data-type', getFileType(file.type));
        
        fileCard.innerHTML = `
            <div class="file-icon">
                <i class="fas ${getFileIcon(file.type)}"></i>
            </div>
            <div class="file-info">
                <h4>${file.name}</h4>
                <p class="file-size">${formatFileSize(file.size)}</p>
                <p class="file-date">${formatDate(file.uploadDate)}</p>
                <p class="download-count">${file.downloadCount} downloads</p>
            </div>
            <div class="file-actions">
                <button class="btn-action download-btn" onclick="downloadFile('${file.id}', '${file.name}')">
                    <i class="fas fa-download"></i>
                </button>
                <button class="btn-action share-btn" onclick="shareFile('${file.id}', '${file.name}')">
                    <i class="fas fa-share"></i>
                </button>
            </div>
        `;
        
        filesGrid.appendChild(fileCard);
    });
}

// Download File Function
function downloadFile(fileId, fileName) {
    showNotification(`Downloading ${fileName}...`, 'info');
    
    // Create a temporary anchor element to trigger download
    const link = document.createElement('a');
    link.href = `/api/download/${fileId}`;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    // Show success message after a short delay
    setTimeout(() => {
        showNotification(`${fileName} download started!`, 'success');
    }, 500);
}

// Share File Function
function shareFile(fileId, fileName) {
    const modal = document.getElementById('shareModal');
    const shareLink = document.getElementById('shareLink');
    
    // Generate share link
    const baseUrl = window.location.origin;
    const shareUrl = `${baseUrl}/api/download/${fileId}`;
    
    shareLink.value = shareUrl;
    modal.style.display = 'block';
}

// Format Date
function formatDate(dateString) {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now - date);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    const diffHours = Math.ceil(diffTime / (1000 * 60 * 60));
    const diffMinutes = Math.ceil(diffTime / (1000 * 60));
    
    if (diffMinutes < 60) {
        return `${diffMinutes} minute${diffMinutes !== 1 ? 's' : ''} ago`;
    } else if (diffHours < 24) {
        return `${diffHours} hour${diffHours !== 1 ? 's' : ''} ago`;
    } else if (diffDays === 1) {
        return 'Yesterday';
    } else if (diffDays < 7) {
        return `${diffDays} day${diffDays !== 1 ? 's' : ''} ago`;
    } else {
        return date.toLocaleDateString();
    }
}

// Modal Functionality
const modal = document.getElementById('shareModal');
const closeBtn = document.querySelector('.close');

closeBtn.addEventListener('click', () => {
    modal.style.display = 'none';
});

window.addEventListener('click', (e) => {
    if (e.target === modal) {
        modal.style.display = 'none';
    }
});

// Copy to Clipboard
function copyToClipboard() {
    const shareLink = document.getElementById('shareLink');
    shareLink.select();
    shareLink.setSelectionRange(0, 99999);
    
    try {
        document.execCommand('copy');
        showNotification('Link copied to clipboard!', 'success');
    } catch (err) {
        showNotification('Failed to copy link', 'error');
    }
}

// Show Notification
function showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    
    const colors = {
        success: { bg: '#d4edda', color: '#155724', border: '#c3e6cb' },
        error: { bg: '#f8d7da', color: '#721c24', border: '#f5c6cb' },
        info: { bg: '#d1ecf1', color: '#0c5460', border: '#bee5eb' }
    };
    
    notification.innerHTML = `
        <i class="fas fa-${type === 'success' ? 'check-circle' : type === 'error' ? 'exclamation-circle' : 'info-circle'}"></i>
        ${message}
    `;
    
    notification.style.cssText = `
        position: fixed;
        top: 100px;
        right: 20px;
        background: ${colors[type].bg};
        color: ${colors[type].color};
        padding: 1rem 1.5rem;
        border-radius: 8px;
        border: 1px solid ${colors[type].border};
        z-index: 1000;
        animation: slideIn 0.3s ease;
        display: flex;
        align-items: center;
        gap: 0.5rem;
        max-width: 300px;
    `;
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.style.animation = 'slideOut 0.3s ease';
        setTimeout(() => notification.remove(), 300);
    }, 3000);
}

// Add CSS for animations
const style = document.createElement('style');
style.textContent = `
    @keyframes slideIn {
        from {
            transform: translateX(100%);
            opacity: 0;
        }
        to {
            transform: translateX(0);
            opacity: 1;
        }
    }
    
    @keyframes slideOut {
        from {
            transform: translateX(0);
            opacity: 1;
        }
        to {
            transform: translateX(100%);
            opacity: 0;
        }
    }
`;
document.head.appendChild(style);

// Intersection Observer for Animations
const observerOptions = {
    threshold: 0.1,
    rootMargin: '0px 0px -50px 0px'
};

const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            entry.target.classList.add('slide-up');
        }
    });
}, observerOptions);

// Observe elements for animation
document.addEventListener('DOMContentLoaded', () => {
    const animateElements = document.querySelectorAll('.file-card, .feature, .upload-container');
    animateElements.forEach(el => {
        observer.observe(el);
    });
});

// Add floating animation to hero icons
document.addEventListener('DOMContentLoaded', () => {
    const icons = document.querySelectorAll('.file-icons i');
    icons.forEach((icon, index) => {
        icon.style.setProperty('--i', index);
    });
});

// Handle file actions for existing files
document.addEventListener('DOMContentLoaded', () => {
    const downloadBtns = document.querySelectorAll('.download-btn');
    const shareBtns = document.querySelectorAll('.share-btn');
    
    downloadBtns.forEach(btn => {
        btn.addEventListener('click', (e) => {
            const fileName = e.target.closest('.file-card').querySelector('h4').textContent;
            downloadFile(fileName);
        });
    });
    
    shareBtns.forEach(btn => {
        btn.addEventListener('click', (e) => {
            const fileName = e.target.closest('.file-card').querySelector('h4').textContent;
            shareFile(fileName);
        });
    });
});

// Keyboard shortcuts
document.addEventListener('keydown', (e) => {
    // Ctrl/Cmd + U for upload
    if ((e.ctrlKey || e.metaKey) && e.key === 'u') {
        e.preventDefault();
        document.getElementById('fileInput').click();
    }
    
    // Escape to close modal
    if (e.key === 'Escape') {
        const modal = document.getElementById('shareModal');
        if (modal.style.display === 'block') {
            modal.style.display = 'none';
        }
    }
});

// Performance optimization: Lazy load file cards
function lazyLoadFileCards() {
    const fileCards = document.querySelectorAll('.file-card');
    const cardObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('fade-in');
                cardObserver.unobserve(entry.target);
            }
        });
    });
    
    fileCards.forEach(card => {
        cardObserver.observe(card);
    });
}

// Initialize the application
document.addEventListener('DOMContentLoaded', async () => {
    // Load files from server
    await loadFilesFromServer();
    
    // Initialize lazy loading
    lazyLoadFileCards();
    
    // Add floating animation to hero icons
    const icons = document.querySelectorAll('.file-icons i');
    icons.forEach((icon, index) => {
        icon.style.setProperty('--i', index);
    });
});