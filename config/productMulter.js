// const multer = require('multer');


// const storage = multer.diskStorage({
//     destination: (req, file, cb) => {
//         cb(null, "uploads/"); // Define your uploads folder
//     },
//     filename: (req, file, cb) => {
//         cb(null, `${Date.now()}-${file.originalname}`);
//     },
// });

// const upload = multer({ storage });

// module.exports = {
//     upload
// }



const multer = require('multer');
const fs = require('fs');
const path = require('path');

const uploadPath = path.join(__dirname, 'uploads');

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        // Check if 'uploads' folder exists, if not, create it
        if (!fs.existsSync(uploadPath)) {
            fs.mkdirSync(uploadPath, { recursive: true });
        }
        cb(null, uploadPath);
    },
    filename: (req, file, cb) => {
        cb(null, `${Date.now()}-${file.originalname}`);
    },
});

const upload = multer({ storage });

module.exports = {
    upload
};