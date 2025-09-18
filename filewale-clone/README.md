# FilewAle Clone

A modern, responsive file sharing platform inspired by FilewAle.com. This web application allows users to upload, share, and download files with an intuitive and beautiful interface.

## Features

- 🚀 **Modern UI/UX**: Clean, responsive design with smooth animations
- 📁 **File Upload**: Drag & drop or click to upload multiple files
- 🔍 **Search & Filter**: Find files by name, type, and sort options
- 📱 **Mobile Responsive**: Works perfectly on all devices
- ⚡ **Fast Performance**: Optimized for speed and efficiency
- 🔗 **File Sharing**: Generate shareable links for files
- 📊 **File Management**: View file details, download counts, and more
- 🎨 **Beautiful Animations**: Smooth transitions and hover effects

## File Types Supported

- 📄 Documents (PDF, DOC, TXT, etc.)
- 🖼️ Images (JPG, PNG, GIF, etc.)
- 🎥 Videos (MP4, AVI, MOV, etc.)
- 🎵 Audio (MP3, WAV, etc.)
- 📦 Archives (ZIP, RAR, etc.)
- 💻 Code files and more

## Tech Stack

### Frontend
- HTML5, CSS3, JavaScript (ES6+)
- Font Awesome icons
- Google Fonts (Poppins)
- CSS Grid & Flexbox
- Responsive design
- Intersection Observer API

### Backend
- Node.js
- Express.js
- Multer (file uploads)
- CORS enabled
- RESTful API

## Installation & Setup

### Prerequisites
- Node.js (v14 or higher)
- npm or yarn

### Steps

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd filewale-clone
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Start the development server**
   ```bash
   npm run dev
   ```
   Or for production:
   ```bash
   npm start
   ```

4. **Open your browser**
   Navigate to `http://localhost:3000`

## API Endpoints

### File Operations
- `POST /api/upload` - Upload multiple files
- `GET /api/files` - Get all files (with search, filter, sort)
- `GET /api/files/:id` - Get file information
- `GET /api/download/:id` - Download a file
- `DELETE /api/files/:id` - Delete a file

### Statistics
- `GET /api/stats` - Get file statistics

### Query Parameters (for /api/files)
- `search` - Search files by name
- `type` - Filter by file type (image, video, pdf, archive, document, other)
- `sort` - Sort files (newest, oldest, name, size)
- `limit` - Number of files per page (default: 50)
- `offset` - Pagination offset (default: 0)

## Project Structure

```
filewale-clone/
├── backend/
│   └── server.js          # Express server
├── public/
│   ├── css/
│   │   └── style.css      # Main stylesheet
│   ├── js/
│   │   └── script.js      # Frontend JavaScript
│   ├── images/            # Static images
│   └── uploads/           # Uploaded files storage
├── index.html             # Main HTML file
├── package.json           # Dependencies and scripts
└── README.md             # This file
```

## Features in Detail

### File Upload
- Drag and drop interface
- Multiple file selection
- Progress tracking
- File type detection
- Size validation (100MB limit)

### File Management
- Grid view with file cards
- File type icons
- File size and date information
- Download and share buttons
- Search functionality
- Type filtering
- Sorting options

### Responsive Design
- Mobile-first approach
- Hamburger menu for mobile
- Flexible grid layouts
- Touch-friendly interface

### Performance
- Lazy loading
- Intersection Observer
- Optimized animations
- Efficient file handling

## Browser Support

- Chrome 60+
- Firefox 55+
- Safari 12+
- Edge 79+

## Configuration

### File Upload Limits
Edit `backend/server.js` to modify:
- Maximum file size (default: 100MB)
- Allowed file types
- Upload directory

### Styling
Customize the appearance by editing:
- `public/css/style.css` - Main styles
- CSS custom properties for colors and spacing

## Development

### Available Scripts
- `npm start` - Start production server
- `npm run dev` - Start development server with auto-reload
- `npm test` - Run tests (not implemented)

### Adding New Features
1. Frontend changes: Edit HTML, CSS, and JavaScript files
2. Backend changes: Modify `backend/server.js`
3. API changes: Add new routes and update documentation

## Security Considerations

- File type validation
- File size limits
- CORS configuration
- Input sanitization
- Path traversal protection

## Deployment

### Local Deployment
```bash
npm start
```

### Production Deployment
1. Set environment variables
2. Configure reverse proxy (nginx)
3. Set up SSL certificate
4. Configure file storage
5. Set up monitoring

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Support

For support and questions:
- Create an issue on GitHub
- Check the documentation
- Review the code comments

## Acknowledgments

- Inspired by FilewAle.com
- Font Awesome for icons
- Google Fonts for typography
- Express.js community
- Open source contributors

---

**Note**: This is a clone/inspired version created for educational purposes. Please respect the original website's terms of service and intellectual property rights.