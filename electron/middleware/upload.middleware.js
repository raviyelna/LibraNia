import multer from 'multer';
import * as path from 'path';
import * as fs from 'fs';
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const uploadDir = process.env.LIBRANIA_UPLOAD_DIR || path.join(process.cwd(), 'data', 'uploads');
        fs.mkdir(uploadDir, { recursive: true }, (err) => {
            if (err) {
                cb(err, uploadDir);
            }
            else {
                cb(null, uploadDir);
            }
        });
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const ext = path.extname(file.originalname);
        cb(null, uniqueSuffix + ext);
    }
});
const fileFilter = (req, file, cb) => {
    const allowedExtensions = /jpeg|jpg|png|gif|pdf|doc|docx|txt|md/;
    const allowedMimeTypes = /image\/jpeg|image\/jpg|image\/png|image\/gif|application\/pdf|application\/msword|application\/vnd\.openxmlformats-officedocument\.wordprocessingml\.document|text\/plain|text\/markdown/;
    const extname = allowedExtensions.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedMimeTypes.test(file.mimetype);
    if (extname && mimetype) {
        cb(null, true);
    }
    else {
        cb(new Error(`File type not allowed. Allowed types: jpeg, jpg, png, gif, pdf, doc, docx, txt, md`));
    }
};
export const upload = multer({
    storage: storage,
    fileFilter: fileFilter,
    limits: {
        fileSize: 10 * 1024 * 1024
    }
});
