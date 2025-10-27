const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs').promises;
const cors = require('cors');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');
const rateLimit = require('express-rate-limit');
const helmet = require('helmet');
const compression = require('compression');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'gsmarman-secret-key-2024';
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/gsmarman';

// Security middleware
app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com", "https://cdnjs.cloudflare.com"],
            fontSrc: ["'self'", "https://fonts.gstatic.com", "https://cdnjs.cloudflare.com"],
            scriptSrc: ["'self'", "https://cdnjs.cloudflare.com"],
            imgSrc: ["'self'", "data:", "https:"],
            connectSrc: ["'self'"]
        }
    }
}));

// Rate limiting
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // limit each IP to 100 requests per windowMs
    message: 'Too many requests from this IP, please try again later.'
});

const uploadLimiter = rateLimit({
    windowMs: 60 * 1000, // 1 minute
    max: 10, // limit each IP to 10 uploads per minute
    message: 'Too many uploads, please try again later.'
});

app.use(limiter);
app.use(compression());
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Serve static files
app.use(express.static('.'));
app.use('/uploads', express.static('uploads'));

// MongoDB connection (optional - for production use)
if (process.env.NODE_ENV === 'production') {
    mongoose.connect(MONGODB_URI, {
        useNewUrlParser: true,
        useUnifiedTopology: true,
    }).then(() => {
        console.log('Connected to MongoDB');
    }).catch((error) => {
        console.error('MongoDB connection error:', error);
    });
}

// In-memory storage for demo purposes
let users = [];
let files = [];
let fileIdCounter = 1;

// User schema (for MongoDB)
const userSchema = new mongoose.Schema({
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    createdAt: { type: Date, default: Date.now },
    isActive: { type: Boolean, default: true }
});

// File schema (for MongoDB)
const fileSchema = new mongoose.Schema({
    filename: { type: String, required: true },
    originalName: { type: String, required: true },
    mimetype: { type: String, required: true },
    size: { type: Number, required: true },
    uploadedBy: { type: String, required: true },
    uploadDate: { type: Date, default: Date.now },
    downloads: { type: Number, default: 0 },
    category: { type: String, required: true },
    isPublic: { type: Boolean, default: true },
    shareUrl: { type: String, required: true },
    description: { type: String, default: '' }
});

const User = mongoose.models.User || mongoose.model('User', userSchema);
const File = mongoose.models.File || mongoose.model('File', fileSchema);

// Multer configuration for file uploads
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, 'uploads/');
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const extension = path.extname(file.originalname);
        cb(null, file.fieldname + '-' + uniqueSuffix + extension);
    }
});

const upload = multer({
    storage: storage,
    limits: {
        fileSize: 500 * 1024 * 1024 // 500MB limit
    },
    fileFilter: function (req, file, cb) {
        // Allow all file types for now
        cb(null, true);
    }
});

// Utility functions
const generateShareUrl = () => {
    return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
};

const getFileCategory = (mimetype) => {
    if (mimetype.startsWith('image/')) return 'images';
    if (mimetype.startsWith('video/')) return 'videos';
    if (mimetype.startsWith('audio/')) return 'audio';
    if (mimetype.includes('pdf') || mimetype.includes('document') || mimetype.includes('text')) return 'documents';
    if (mimetype.includes('zip') || mimetype.includes('rar') || mimetype.includes('tar')) return 'archives';
    if (mimetype.includes('application/')) return 'software';
    return 'others';
};

const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

const getFileIcon = (mimetype) => {
    if (mimetype.startsWith('image/')) return 'fas fa-image';
    if (mimetype.startsWith('video/')) return 'fas fa-video';
    if (mimetype.startsWith('audio/')) return 'fas fa-music';
    if (mimetype.includes('pdf')) return 'fas fa-file-pdf';
    if (mimetype.includes('word')) return 'fas fa-file-word';
    if (mimetype.includes('excel') || mimetype.includes('spreadsheet')) return 'fas fa-file-excel';
    if (mimetype.includes('powerpoint') || mimetype.includes('presentation')) return 'fas fa-file-powerpoint';
    if (mimetype.includes('zip') || mimetype.includes('rar')) return 'fas fa-file-archive';
    return 'fas fa-file';
};

// Middleware to verify JWT token
const verifyToken = (req, res, next) => {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    
    if (!token) {
        return res.status(401).json({ error: 'Access denied. No token provided.' });
    }
    
    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        req.user = decoded;
        next();
    } catch (error) {
        res.status(400).json({ error: 'Invalid token.' });
    }
};

// Routes

// Home route
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// API Routes

// User registration
app.post('/api/register', async (req, res) => {
    try {
        const { name, email, password } = req.body;
        
        // Validation
        if (!name || !email || !password) {
            return res.status(400).json({ error: 'All fields are required' });
        }
        
        // Check if user already exists (in-memory)
        const existingUser = users.find(user => user.email === email);
        if (existingUser) {
            return res.status(400).json({ error: 'User already exists' });
        }
        
        // Hash password
        const saltRounds = 10;
        const hashedPassword = await bcrypt.hash(password, saltRounds);
        
        // Create user
        const user = {
            id: users.length + 1,
            name,
            email,
            password: hashedPassword,
            createdAt: new Date(),
            isActive: true
        };
        
        users.push(user);
        
        // Generate JWT token
        const token = jwt.sign(
            { id: user.id, email: user.email },
            JWT_SECRET,
            { expiresIn: '24h' }
        );
        
        res.status(201).json({
            message: 'User created successfully',
            token,
            user: { id: user.id, name: user.name, email: user.email }
        });
        
    } catch (error) {
        console.error('Registration error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// User login
app.post('/api/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        
        // Validation
        if (!email || !password) {
            return res.status(400).json({ error: 'Email and password are required' });
        }
        
        // Find user
        const user = users.find(user => user.email === email);
        if (!user) {
            return res.status(400).json({ error: 'Invalid credentials' });
        }
        
        // Check password
        const isValidPassword = await bcrypt.compare(password, user.password);
        if (!isValidPassword) {
            return res.status(400).json({ error: 'Invalid credentials' });
        }
        
        // Generate JWT token
        const token = jwt.sign(
            { id: user.id, email: user.email },
            JWT_SECRET,
            { expiresIn: '24h' }
        );
        
        res.json({
            message: 'Login successful',
            token,
            user: { id: user.id, name: user.name, email: user.email }
        });
        
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// File upload
app.post('/api/upload', uploadLimiter, upload.single('file'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'No file uploaded' });
        }
        
        const shareUrl = generateShareUrl();
        const category = getFileCategory(req.file.mimetype);
        
        const fileData = {
            id: fileIdCounter++,
            filename: req.file.filename,
            originalName: req.file.originalname,
            mimetype: req.file.mimetype,
            size: req.file.size,
            uploadedBy: req.user?.email || 'anonymous',
            uploadDate: new Date(),
            downloads: 0,
            category,
            isPublic: true,
            shareUrl,
            description: req.body.description || '',
            icon: getFileIcon(req.file.mimetype),
            formattedSize: formatFileSize(req.file.size)
        };
        
        files.push(fileData);
        
        res.json({
            message: 'File uploaded successfully',
            file: fileData
        });
        
    } catch (error) {
        console.error('Upload error:', error);
        res.status(500).json({ error: 'Upload failed' });
    }
});

// Get all files
app.get('/api/files', (req, res) => {
    try {
        const { category, search, limit = 50, page = 1 } = req.query;
        
        let filteredFiles = [...files];
        
        // Filter by category
        if (category && category !== 'all') {
            filteredFiles = filteredFiles.filter(file => file.category === category);
        }
        
        // Search functionality
        if (search) {
            const searchTerm = search.toLowerCase();
            filteredFiles = filteredFiles.filter(file => 
                file.originalName.toLowerCase().includes(searchTerm) ||
                file.description.toLowerCase().includes(searchTerm)
            );
        }
        
        // Pagination
        const startIndex = (page - 1) * limit;
        const endIndex = startIndex + parseInt(limit);
        const paginatedFiles = filteredFiles.slice(startIndex, endIndex);
        
        // Sort by upload date (newest first)
        paginatedFiles.sort((a, b) => new Date(b.uploadDate) - new Date(a.uploadDate));
        
        res.json({
            files: paginatedFiles,
            total: filteredFiles.length,
            page: parseInt(page),
            totalPages: Math.ceil(filteredFiles.length / limit)
        });
        
    } catch (error) {
        console.error('Get files error:', error);
        res.status(500).json({ error: 'Failed to fetch files' });
    }
});

// Get file by ID
app.get('/api/files/:id', (req, res) => {
    try {
        const fileId = parseInt(req.params.id);
        const file = files.find(f => f.id === fileId);
        
        if (!file) {
            return res.status(404).json({ error: 'File not found' });
        }
        
        res.json({ file });
        
    } catch (error) {
        console.error('Get file error:', error);
        res.status(500).json({ error: 'Failed to fetch file' });
    }
});

// Download file
app.get('/api/download/:id', (req, res) => {
    try {
        const fileId = parseInt(req.params.id);
        const file = files.find(f => f.id === fileId);
        
        if (!file) {
            return res.status(404).json({ error: 'File not found' });
        }
        
        const filePath = path.join(__dirname, 'uploads', file.filename);
        
        // Increment download counter
        file.downloads++;
        
        // Set appropriate headers
        res.setHeader('Content-Disposition', `attachment; filename="${file.originalName}"`);
        res.setHeader('Content-Type', file.mimetype);
        
        // Send file
        res.download(filePath, file.originalName, (error) => {
            if (error) {
                console.error('Download error:', error);
                res.status(500).json({ error: 'Download failed' });
            }
        });
        
    } catch (error) {
        console.error('Download error:', error);
        res.status(500).json({ error: 'Download failed' });
    }
});

// Share file by share URL
app.get('/share/:shareUrl', (req, res) => {
    try {
        const { shareUrl } = req.params;
        const file = files.find(f => f.shareUrl === shareUrl);
        
        if (!file) {
            return res.status(404).send(`
                <!DOCTYPE html>
                <html>
                <head>
                    <title>File Not Found - GSMarman</title>
                    <style>
                        body { font-family: Arial, sans-serif; text-align: center; padding: 50px; }
                        .error { color: #ef4444; }
                    </style>
                </head>
                <body>
                    <h1 class="error">File Not Found</h1>
                    <p>The requested file could not be found or may have been removed.</p>
                    <a href="/">← Back to GSMarman</a>
                </body>
                </html>
            `);
        }
        
        // Generate download page
        res.send(`
            <!DOCTYPE html>
            <html>
            <head>
                <title>${file.originalName} - GSMarman</title>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <link rel="stylesheet" href="/assets/css/style.css">
                <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
            </head>
            <body>
                <div class="container" style="max-width: 600px; margin: 100px auto; text-align: center;">
                    <div class="file-card" style="padding: 3rem;">
                        <div class="file-icon" style="font-size: 4rem; color: var(--primary-color); margin-bottom: 1rem;">
                            <i class="${file.icon}"></i>
                        </div>
                        <h1>${file.originalName}</h1>
                        <p>Size: ${file.formattedSize}</p>
                        <p>Uploaded: ${new Date(file.uploadDate).toLocaleDateString()}</p>
                        <p>Downloads: ${file.downloads}</p>
                        
                        <div style="margin: 2rem 0;">
                            <a href="/api/download/${file.id}" class="btn btn-primary" style="font-size: 1.1rem; padding: 1rem 2rem;">
                                <i class="fas fa-download"></i> Download File
                            </a>
                        </div>
                        
                        <div style="margin-top: 2rem;">
                            <a href="/" class="btn btn-outline">← Back to GSMarman</a>
                        </div>
                    </div>
                </div>
            </body>
            </html>
        `);
        
    } catch (error) {
        console.error('Share error:', error);
        res.status(500).send('Internal server error');
    }
});

// Get file categories with counts
app.get('/api/categories', (req, res) => {
    try {
        const categories = {
            all: files.length,
            documents: files.filter(f => f.category === 'documents').length,
            images: files.filter(f => f.category === 'images').length,
            videos: files.filter(f => f.category === 'videos').length,
            audio: files.filter(f => f.category === 'audio').length,
            software: files.filter(f => f.category === 'software').length,
            archives: files.filter(f => f.category === 'archives').length,
            others: files.filter(f => f.category === 'others').length
        };
        
        res.json({ categories });
        
    } catch (error) {
        console.error('Categories error:', error);
        res.status(500).json({ error: 'Failed to fetch categories' });
    }
});

// Get recent files (public endpoint)
app.get('/api/recent', (req, res) => {
    try {
        const recentFiles = files
            .filter(file => file.isPublic)
            .sort((a, b) => new Date(b.uploadDate) - new Date(a.uploadDate))
            .slice(0, 12)
            .map(file => ({
                id: file.id,
                name: file.originalName,
                size: file.formattedSize,
                type: file.category,
                icon: file.icon,
                uploadDate: new Date(file.uploadDate).toLocaleDateString(),
                downloads: file.downloads,
                shareUrl: file.shareUrl
            }));
        
        res.json({ files: recentFiles });
        
    } catch (error) {
        console.error('Recent files error:', error);
        res.status(500).json({ error: 'Failed to fetch recent files' });
    }
});

// Delete file (protected route)
app.delete('/api/files/:id', verifyToken, async (req, res) => {
    try {
        const fileId = parseInt(req.params.id);
        const fileIndex = files.findIndex(f => f.id === fileId);
        
        if (fileIndex === -1) {
            return res.status(404).json({ error: 'File not found' });
        }
        
        const file = files[fileIndex];
        
        // Check if user owns the file (for demo, allow any authenticated user)
        // In production, check if req.user.email === file.uploadedBy
        
        try {
            // Delete physical file
            const filePath = path.join(__dirname, 'uploads', file.filename);
            await fs.unlink(filePath);
        } catch (fsError) {
            console.error('File deletion error:', fsError);
            // Continue even if physical file deletion fails
        }
        
        // Remove from array
        files.splice(fileIndex, 1);
        
        res.json({ message: 'File deleted successfully' });
        
    } catch (error) {
        console.error('Delete file error:', error);
        res.status(500).json({ error: 'Failed to delete file' });
    }
});

// Get user profile (protected route)
app.get('/api/profile', verifyToken, (req, res) => {
    try {
        const user = users.find(u => u.id === req.user.id);
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }
        
        const userFiles = files.filter(f => f.uploadedBy === user.email);
        
        res.json({
            user: {
                id: user.id,
                name: user.name,
                email: user.email,
                createdAt: user.createdAt
            },
            stats: {
                totalFiles: userFiles.length,
                totalDownloads: userFiles.reduce((sum, file) => sum + file.downloads, 0),
                totalSize: userFiles.reduce((sum, file) => sum + file.size, 0)
            }
        });
        
    } catch (error) {
        console.error('Profile error:', error);
        res.status(500).json({ error: 'Failed to fetch profile' });
    }
});

// Health check endpoint
app.get('/api/health', (req, res) => {
    res.json({
        status: 'OK',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        version: '1.0.0'
    });
});

// Error handling middleware
app.use((error, req, res, next) => {
    console.error('Unhandled error:', error);
    
    if (error instanceof multer.MulterError) {
        if (error.code === 'LIMIT_FILE_SIZE') {
            return res.status(400).json({ error: 'File too large. Maximum size is 500MB.' });
        }
    }
    
    res.status(500).json({ error: 'Internal server error' });
});

// 404 handler
app.use((req, res) => {
    res.status(404).json({ error: 'Endpoint not found' });
});

// Initialize uploads directory
const initUploadsDir = async () => {
    try {
        await fs.mkdir('uploads', { recursive: true });
        console.log('Uploads directory initialized');
    } catch (error) {
        console.error('Failed to create uploads directory:', error);
    }
};

// Start server
const startServer = async () => {
    await initUploadsDir();
    
    app.listen(PORT, () => {
        console.log(`🚀 GSMarman server running on port ${PORT}`);
        console.log(`📁 File uploads: http://localhost:${PORT}`);
        console.log(`🌐 Website: http://localhost:${PORT}`);
        console.log(`📊 API Health: http://localhost:${PORT}/api/health`);
        
        // Add some sample files for demonstration
        if (files.length === 0) {
            console.log('📋 Adding sample files...');
            // Sample files will be added when users upload
        }
    });
};

// Graceful shutdown
process.on('SIGTERM', () => {
    console.log('SIGTERM received. Shutting down gracefully...');
    process.exit(0);
});

process.on('SIGINT', () => {
    console.log('SIGINT received. Shutting down gracefully...');
    process.exit(0);
});

// Start the server
startServer().catch(error => {
    console.error('Failed to start server:', error);
    process.exit(1);
});

module.exports = app;