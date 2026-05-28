import { Router } from "express";
import { loginUser, registerUser , logoutUser, refreshAccessToken } from "../controllers/user.controller.js";
import {upload} from "../middlewares/multer.middleware.js"
import { verifyJWT } from "../middlewares/auth.middleware.js";

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

userRouter.route("/login").post(loginUser);

//secured routes --> needs authorisation before working 
//you will need verifyJWT in post before it would make sure you first verifyJWT and then logout the user --> thats why we used 
//you can define any number of middlewares before running the logoutUser thing i guess 
userRouter.route("/logout").post(verifyJWT,logoutUser);
userRouter.route("/refresh").post(refreshAccessToken); //since i had already verified if this refresh token is valid or not we dont need to pass verifyJWT here
//it will automatically new JWT tokens 


export {userRouter};    