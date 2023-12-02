const path = require('path');
const multer = require('multer');
const fs = require('fs');

const destinationPath = './public/uploads';

// Ensure the destination directory exists
if (!fs.existsSync(destinationPath)) {
    fs.mkdirSync(destinationPath, { recursive: true });
}

const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, destinationPath);
    },
    filename: function (req, file, cb) {
        let modifiedName = file.fieldname + '-' + Date.now() + path.extname(file.originalname);
        cb(null, modifiedName);
    }
});

const upload = multer({
    storage: storage,
    fileFilter: function (req, file, cb) {
        let filetypes = /jpeg|jpg|png|gif/;
        let mimetype = filetypes.test(file.mimetype);
        let extname = filetypes.test(path.extname(file.originalname).toLowerCase());
        if (mimetype && extname) {
            return cb(null, true);
        }
        cb("Error: File upload only supports the following filetypes - " + filetypes);
    },

});

module.exports = upload;

