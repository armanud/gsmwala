const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs').promises;
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '../')));

// Configure multer for file uploads
const storage = multer.diskStorage({
    destination: async (req, file, cb) => {
        const uploadDir = path.join(__dirname, '../public/uploads');
        try {
            await fs.access(uploadDir);
        } catch {
            await fs.mkdir(uploadDir, { recursive: true });
        }
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        // Generate unique filename
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
    }
});

const upload = multer({
    storage: storage,
    limits: {
        fileSize: 100 * 1024 * 1024 // 100MB limit
    },
    fileFilter: (req, file, cb) => {
        // Allow all file types for now
        cb(null, true);
    }
});

// In-memory storage for file metadata (in production, use a database)
let fileDatabase = [
    {
        id: '1',
        originalName: 'Sample Document.pdf',
        filename: 'sample-doc.pdf',
        size: 2621440, // 2.5MB in bytes
        mimetype: 'application/pdf',
        uploadDate: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2 hours ago
        downloadCount: 15
    },
    {
        id: '2',
        originalName: 'photo.jpg',
        filename: 'photo.jpg',
        size: 1887437, // 1.8MB in bytes
        mimetype: 'image/jpeg',
        uploadDate: new Date(Date.now() - 5 * 60 * 60 * 1000), // 5 hours ago
        downloadCount: 8
    },
    {
        id: '3',
        originalName: 'project.zip',
        filename: 'project.zip',
        size: 15932416, // 15.2MB in bytes
        mimetype: 'application/zip',
        uploadDate: new Date(Date.now() - 24 * 60 * 60 * 1000), // 1 day ago
        downloadCount: 23
    },
    {
        id: '4',
        originalName: 'tutorial.mp4',
        filename: 'tutorial.mp4',
        size: 47829504, // 45.6MB in bytes
        mimetype: 'video/mp4',
        uploadDate: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000), // 3 days ago
        downloadCount: 45
    }
];

// Routes

// Serve the main page
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '../index.html'));
});

// Upload endpoint
app.post('/api/upload', upload.array('files'), async (req, res) => {
    try {
        if (!req.files || req.files.length === 0) {
            return res.status(400).json({ error: 'No files uploaded' });
        }

        const uploadedFiles = req.files.map(file => {
            const fileData = {
                id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
                originalName: file.originalname,
                filename: file.filename,
                size: file.size,
                mimetype: file.mimetype,
                uploadDate: new Date(),
                downloadCount: 0
            };
            
            // Add to in-memory database
            fileDatabase.unshift(fileData);
            
            return {
                id: fileData.id,
                name: fileData.originalName,
                size: fileData.size,
                type: fileData.mimetype,
                uploadDate: fileData.uploadDate
            };
        });

        res.json({
            success: true,
            message: `${uploadedFiles.length} file(s) uploaded successfully`,
            files: uploadedFiles
        });

    } catch (error) {
        console.error('Upload error:', error);
        res.status(500).json({ error: 'Upload failed' });
    }
});

// Get all files
app.get('/api/files', (req, res) => {
    try {
        const { search, type, sort, limit = 50, offset = 0 } = req.query;
        
        let filteredFiles = [...fileDatabase];

        // Search filter
        if (search) {
            const searchLower = search.toLowerCase();
            filteredFiles = filteredFiles.filter(file =>
                file.originalName.toLowerCase().includes(searchLower)
            );
        }

        // Type filter
        if (type) {
            filteredFiles = filteredFiles.filter(file => {
                const fileType = getFileType(file.mimetype);
                return fileType === type;
            });
        }

        // Sort
        if (sort) {
            filteredFiles.sort((a, b) => {
                switch (sort) {
                    case 'newest':
                        return new Date(b.uploadDate) - new Date(a.uploadDate);
                    case 'oldest':
                        return new Date(a.uploadDate) - new Date(b.uploadDate);
                    case 'name':
                        return a.originalName.localeCompare(b.originalName);
                    case 'size':
                        return b.size - a.size;
                    default:
                        return 0;
                }
            });
        }

        // Pagination
        const paginatedFiles = filteredFiles.slice(offset, offset + parseInt(limit));

        const responseFiles = paginatedFiles.map(file => ({
            id: file.id,
            name: file.originalName,
            size: file.size,
            type: file.mimetype,
            uploadDate: file.uploadDate,
            downloadCount: file.downloadCount,
            downloadUrl: `/api/download/${file.id}`
        }));

        res.json({
            success: true,
            files: responseFiles,
            total: filteredFiles.length,
            hasMore: offset + parseInt(limit) < filteredFiles.length
        });

    } catch (error) {
        console.error('Get files error:', error);
        res.status(500).json({ error: 'Failed to get files' });
    }
});

// Download endpoint
app.get('/api/download/:id', async (req, res) => {
    try {
        const fileId = req.params.id;
        const file = fileDatabase.find(f => f.id === fileId);

        if (!file) {
            return res.status(404).json({ error: 'File not found' });
        }

        const filePath = path.join(__dirname, '../public/uploads', file.filename);

        try {
            await fs.access(filePath);
            
            // Increment download count
            file.downloadCount++;

            // Set headers for download
            res.setHeader('Content-Disposition', `attachment; filename="${file.originalName}"`);
            res.setHeader('Content-Type', file.mimetype);
            
            res.download(filePath, file.originalName);

        } catch (error) {
            // File doesn't exist on disk, return a placeholder response
            res.status(404).json({ error: 'File not found on server' });
        }

    } catch (error) {
        console.error('Download error:', error);
        res.status(500).json({ error: 'Download failed' });
    }
});

// Get file info
app.get('/api/files/:id', (req, res) => {
    try {
        const fileId = req.params.id;
        const file = fileDatabase.find(f => f.id === fileId);

        if (!file) {
            return res.status(404).json({ error: 'File not found' });
        }

        res.json({
            success: true,
            file: {
                id: file.id,
                name: file.originalName,
                size: file.size,
                type: file.mimetype,
                uploadDate: file.uploadDate,
                downloadCount: file.downloadCount,
                downloadUrl: `/api/download/${file.id}`,
                shareUrl: `${req.protocol}://${req.get('host')}/api/download/${file.id}`
            }
        });

    } catch (error) {
        console.error('Get file info error:', error);
        res.status(500).json({ error: 'Failed to get file info' });
    }
});

// Delete file
app.delete('/api/files/:id', async (req, res) => {
    try {
        const fileId = req.params.id;
        const fileIndex = fileDatabase.findIndex(f => f.id === fileId);

        if (fileIndex === -1) {
            return res.status(404).json({ error: 'File not found' });
        }

        const file = fileDatabase[fileIndex];
        const filePath = path.join(__dirname, '../public/uploads', file.filename);

        // Remove from database
        fileDatabase.splice(fileIndex, 1);

        // Try to delete physical file
        try {
            await fs.unlink(filePath);
        } catch (error) {
            console.warn('Could not delete physical file:', error.message);
        }

        res.json({
            success: true,
            message: 'File deleted successfully'
        });

    } catch (error) {
        console.error('Delete error:', error);
        res.status(500).json({ error: 'Delete failed' });
    }
});

// Get file statistics
app.get('/api/stats', (req, res) => {
    try {
        const totalFiles = fileDatabase.length;
        const totalSize = fileDatabase.reduce((sum, file) => sum + file.size, 0);
        const totalDownloads = fileDatabase.reduce((sum, file) => sum + file.downloadCount, 0);

        const fileTypes = fileDatabase.reduce((acc, file) => {
            const type = getFileType(file.mimetype);
            acc[type] = (acc[type] || 0) + 1;
            return acc;
        }, {});

        res.json({
            success: true,
            stats: {
                totalFiles,
                totalSize,
                totalDownloads,
                fileTypes,
                recentUploads: fileDatabase.slice(0, 5).map(file => ({
                    name: file.originalName,
                    size: file.size,
                    uploadDate: file.uploadDate
                }))
            }
        });

    } catch (error) {
        console.error('Stats error:', error);
        res.status(500).json({ error: 'Failed to get stats' });
    }
});

// Helper function to determine file type category
function getFileType(mimetype) {
    if (mimetype.startsWith('image/')) return 'image';
    if (mimetype.startsWith('video/')) return 'video';
    if (mimetype.startsWith('audio/')) return 'audio';
    if (mimetype === 'application/pdf') return 'pdf';
    if (mimetype.includes('zip') || mimetype.includes('rar') || mimetype.includes('archive')) return 'archive';
    if (mimetype.includes('word') || mimetype.includes('document') || mimetype.includes('text')) return 'document';
    return 'other';
}

// Error handling middleware
app.use((error, req, res, next) => {
    if (error instanceof multer.MulterError) {
        if (error.code === 'LIMIT_FILE_SIZE') {
            return res.status(400).json({ error: 'File too large. Maximum size is 100MB.' });
        }
    }
    
    console.error('Unhandled error:', error);
    res.status(500).json({ error: 'Internal server error' });
});

// 404 handler
app.use((req, res) => {
    res.status(404).json({ error: 'Endpoint not found' });
});

// Start server
app.listen(PORT, () => {
    console.log(`FilewAle server running on http://localhost:${PORT}`);
    console.log(`Upload directory: ${path.join(__dirname, '../public/uploads')}`);
});

module.exports = app;