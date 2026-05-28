//this file is going to be used at every place where you will require user authorisation 
//like you need automatically access during logout 
import { ApiError } from "../utils/ApiError.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import jwt from "jsonwebtoken"
import { User } from "../models/user.model.js";

const verifyJWT = asyncHandler(async(req, _, next) => { // _ is used when response is not used inside a function this is a industry practise 
    try {
        const token = req.cookies?.accessToken || req.header("Authorization")?.replace("Bearer ", "")
        // there might be that you dont have cookies access if user logged in from mobile app or some shi....
        // most times this is passed under the Authorisation header 
        // console.log(token);
        if (!token) {
            throw new ApiError(401, "Unauthorized request")
        }
    
        //for decoding token you would need access_secret
        const decodedToken = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET)
    
        //if the token is not decoded properly --->  you would not get user access 
        const user = await User.findById(decodedToken?._id).select("-password -refreshToken")
    
        if (!user) {
            
            throw new ApiError(401, "Invalid Access Token")
        }
    
        //return the user by defining it itself in the req body --> so you could req.user
        req.user = user;
        //do what you have to do next --> after this verification what you want to do 
        next();

    } catch (error) {
        throw new ApiError(401, error?.message || "Invalid access token")
    }
    
})

//this JWT does not hold something its just a method to call this authorisation function
export {verifyJWT};