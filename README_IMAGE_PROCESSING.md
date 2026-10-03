# Image Processing Integration for SIH Civic Engagement Portal

This document describes the image upload and processing functionality integrated into the user portal (page1.html) with 48-hour timestamp validation.

## Features

- **Image Upload**: Users can upload photos/videos, voice notes, map pins, and text reports
- **48-Hour Validation**: Images are validated to ensure they were taken within the last 48 hours
- **MongoDB Storage**: Processed images and metadata are stored in MongoDB
- **GPS Extraction**: GPS coordinates are extracted from image metadata
- **Error Handling**: Comprehensive error handling for invalid images

## Setup Instructions

### 1. Install Node.js Dependencies

```bash
npm install
```

### 2. Install Python Dependencies

```bash
pip install -r requirements.txt
```

### 3. Start the Server

```bash
npm start
```

The server will run on `http://localhost:5000`

## How It Works

### 1. Image Upload Process

1. User selects an image file in the report form
2. File is uploaded to the server via `/api/upload-image` endpoint
3. Server calls `process.py` to validate the image timestamp
4. If image is older than 48 hours, an error is returned
5. If valid, image metadata and data are stored in MongoDB

### 2. Timestamp Validation

The `process.py` script:
- Extracts EXIF data from uploaded images
- Checks the `DateTimeOriginal` field
- Compares with current time
- Returns error if image is older than 48 hours

### 3. MongoDB Storage

Processed images are stored in the `user_reports` collection with:
- User ID
- Issue details (title, category, location, description)
- Image data (binary)
- Image timestamp
- GPS coordinates
- Status and priority
- Creation/update timestamps

## API Endpoints

### POST `/api/upload-image`
Uploads and processes an image file.

**Request:**
- `image`: Image file (multipart/form-data)
- `userId`: User ID
- `issueTitle`: Issue title
- `issueCategory`: Issue category
- `issueLocation`: Issue location
- `issueDescription`: Issue description
- `reportingMethod`: Reporting method (e.g., "photo")

**Response:**
```json
{
  "success": true,
  "message": "Image processed and report submitted successfully",
  "reportId": "report_id",
  "imageTimestamp": "2024-01-01T12:00:00",
  "gpsCoordinates": [lat, lon]
}
```

### GET `/api/user/reports/:userId`
Retrieves user reports (without image data for performance).

## Error Handling

### Common Error Scenarios

1. **No DateTimeOriginal**: Image doesn't contain timestamp metadata
2. **Image Too Old**: Image was taken more than 48 hours ago
3. **Invalid File**: File is not a valid image format
4. **File Too Large**: Image exceeds 10MB limit
5. **Processing Error**: Error during image processing

### Error Messages

- "No DateTimeOriginal found in image metadata"
- "Image is X hours old. Maximum allowed is 48 hours."
- "Only image and video files are allowed!"
- "File is too large. Maximum size is 10MB."

## File Structure

```
├── server.js                 # Express server with image upload API
├── process.py               # Python script for image processing
├── package.json             # Node.js dependencies
├── requirements.txt         # Python dependencies
├── user/public/page1.html   # User portal with image upload
└── uploads/                 # Temporary upload directory
```

## Testing

### Test Image Processing

```bash
python process.py path/to/image.jpg user_id "Test Issue" "Other" "Test Location" "Test Description"
```

### Test API Endpoint

```bash
curl -X POST -F "image=@test.jpg" -F "userId=test_user" -F "issueTitle=Test" http://localhost:5000/api/upload-image
```

## Security Considerations

1. **File Validation**: Only image and video files are allowed
2. **Size Limits**: 10MB maximum file size
3. **Temporary Storage**: Uploaded files are cleaned up after processing
4. **User Authentication**: User ID is required for all uploads

## Troubleshooting

### Common Issues

1. **Python Not Found**: Ensure Python is installed and in PATH
2. **PIL Import Error**: Install Pillow: `pip install Pillow`
3. **MongoDB Connection**: Check MongoDB connection string
4. **File Upload Fails**: Check file size and format

### Debug Mode

Enable debug logging by setting environment variable:
```bash
DEBUG=1 npm start
```

## Future Enhancements

1. **Video Processing**: Add timestamp validation for video files
2. **Batch Upload**: Support multiple image uploads
3. **Image Compression**: Compress images before storage
4. **Cloud Storage**: Move to cloud storage for better scalability
5. **Real-time Processing**: WebSocket updates for processing status
