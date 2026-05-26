import { Router } from "express";
import { registerUser } from "../controllers/user.controller.js";
import {upload} from "../middlewares/multer.middleware.js"

const userRouter = Router();

//it will get redirected to the register url and then registerUser controller will be called
console.log("going to redirect to /register using the registerUser method")
userRouter.route("/register").post(

    //you have to create this upload fields before calling registerUser so that use have req.files also along with req.body 
    upload.fields([
        {
            name: "avatar",
            maxCount: 1
        },
        {
            name: "coverImage",
            maxCount: 1
        }
    ]),

    registerUser
);

export {userRouter};    