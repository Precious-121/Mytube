import multer from "multer";

const storage = multer.diskStorage({
    destination: function (req, file, cb) {
      cb(null, "./public/temp")
    },
    filename: function (req, file, cb) {
      
      cb(null, file.originalname)
    }
  })
  
//create a usable upload method which can be used to upload files 
const upload = multer({ 
    storage, 
})

export {upload};