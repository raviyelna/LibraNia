import multer, { FileFilterCallback } from 'multer';
import * as path from 'path';
import * as fs from 'fs';
import { Request } from 'express';

// Configure storage
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = process.env.LIBRANIA_UPLOAD_DIR || path.join(process.cwd(), 'data', 'uploads');

    // Ensure directory exists
    fs.mkdir(uploadDir, { recursive: true }, (err) => {
      if (err) {
        cb(err, uploadDir);
      } else {
        cb(null, uploadDir);
      }
    });
  },
  filename: (req, file, cb) => {
    // Generate unique filename: timestamp-random-extension
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    cb(null, uniqueSuffix + ext);
  }
});

// File filter for allowed types
const fileFilter = (req: Request, file: Express.Multer.File, cb: FileFilterCallback) => {
  // Allowed file extensions
  const allowedExtensions = /jpeg|jpg|png|gif|pdf|doc|docx|txt|md/;

  // Allowed MIME types
  const allowedMimeTypes = /image\/jpeg|image\/jpg|image\/png|image\/gif|application\/pdf|application\/msword|application\/vnd\.openxmlformats-officedocument\.wordprocessingml\.document|text\/plain|text\/markdown/;

  // Check extension
  const extname = allowedExtensions.test(path.extname(file.originalname).toLowerCase());

  // Check MIME type
  const mimetype = allowedMimeTypes.test(file.mimetype);

  if (extname && mimetype) {
    cb(null, true);
  } else {
    cb(new Error(`File type not allowed. Allowed types: jpeg, jpg, png, gif, pdf, doc, docx, txt, md`));
  }
};

// Configure multer with storage, file filter, and size limits
export const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit
  }
});
