import multer from 'multer';

// Configure multer to use memory storage
const storage = multer.memoryStorage();

// Create the upload middleware
const uploadMiddleware = multer({ storage });

export { uploadMiddleware };