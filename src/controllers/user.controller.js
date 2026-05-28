import { asyncHandler } from "../utils/asyncHandler.js";
import {ApiError} from "../utils/ApiError.js"
import { ApiResponse } from "../utils/ApiResponse.js";
import { User} from "../models/user.model.js"
import {uploadOnCloudinary} from "../utils/cloudinary.js"
import jwt from "jsonwebtoken"
import mongoose from "mongoose";


const generateAccessAndRefereshTokens = async(userId) =>{
    try {
        const user = await User.findById(userId)
        //after searching the user, a user instance has been generated and tokens has been generated for the same 
        //with the help of the methods defined in user.model.js
        const accessToken = user.generateAccessToken()
        const refreshToken = user.generateRefreshToken()

        //update the user refresh token parameter 
        user.refreshToken = refreshToken
        //save the user without caring about the schema that i have defined earlier while defining the User schema
        await user.save({ validateBeforeSave: false })

        //simply return the access and refresh tokens to be saved in the parameter later 
        return {accessToken, refreshToken}


    } catch (error) {
        throw new ApiError(500, "Something went wrong while generating referesh and access token")
    }
}

const registerUser = asyncHandler( async (req, res) => {
    
    
    // get user details from frontend -- request will be given by the frontend 
    const {fullName, email, username, password } = req.body
    console.log("email:",email); //-- to check the body of the mail
    
    // validation - not empty {.some}
    if (
        [fullName, email, username, password].some((field) => field?.trim() === "")
    ) {
        throw new ApiError(400, "All fields are required")
    }
    
    // check if user already exists: username, email in the User model that you have imported from models 
    const existedUser = await User.findOne({
        $or: [{ username }, { email }]
        // this $or is a good syntax 
    })
    
    if (existedUser) {
        throw new ApiError(409, "User with email or username already exists")
    }
    
    //console.log(req.files);
    // check for images, check for avatar
    const avatarLocalPath = req.files?.avatar[0]?.path;
    //const coverImageLocalPath = req.files?.coverImage[0]?.path;
    
    let coverImageLocalPath;
    if (req.files && Array.isArray(req.files.coverImage) && req.files.coverImage.length > 0) {
        coverImageLocalPath = req.files.coverImage[0].path
    }
    
    
    if (!avatarLocalPath) {
        throw new ApiError(400, "Avatar file is required")
    }
    
    // upload them to cloudinary, avatar and coverImage if its there 
    const avatar = await uploadOnCloudinary(avatarLocalPath)
    const coverImage = await uploadOnCloudinary(coverImageLocalPath)
    
    if (!avatar) {
        throw new ApiError(400, "Avatar file is required")
    }
    
    
    // create user object - create entry in db
    const user = await User.create({
        fullName,
        avatar: avatar.url,
        coverImage: coverImage?.url || "",
        email, 
        password,
        username: username.toLowerCase()
    })
    
    // remove password and refresh token field from response and then return 
    const createdUser = await User.findById(user._id).select(
        "-password -refreshToken"
    )
    
    // check for user creation
    if (!createdUser) {
        throw new ApiError(500, "Something went wrong while registering the user")
    }
    
    // return res
    return res.status(201).json(
        new ApiResponse(200, createdUser, "User registered Successfully")
    )
    
} )

const loginUser = asyncHandler(async (req, res) =>{
    //access and referesh token
    //send cookie
    
    // req body -> data
    const {email, username, password} = req.body
    console.log(email);


    if(!password){
        throw new ApiError(400, "password is required");
    }
    
    // username or email -> one of the field is a must required 
    if (!username && !email) {
        throw new ApiError(400, "username or email is required")
    }
    
    //find the user -> in the User mongoose model 
    const user = await User.findOne({
        $or: [{username}, {email}]
        // this finds the user either by username or email
    })
    
    if (!user) {
        throw new ApiError(404, "User does not exist")
    }
    
    //password check -> isPasswordCorrect is a method that i only made 
    const isPasswordValid = await user.isPasswordCorrect(password)
    
    if (!isPasswordValid) {
    throw new ApiError(401, "Invalid user credentials")
    }

    //generating access and refresh token by the function defined upper side (would take the user_id to search the user in the database)
    const {accessToken, refreshToken} = await generateAccessAndRefereshTokens(user._id)

    //since the previous instance of the user that you defined did not have any refresh token they were called earlier so now you have to find it again
    //so the new instance is updated 
    const loggedInUser = await User.findById(user._id).select("-password -refreshToken")

    //makes sure that the cookie is unaccessible by the javascript on the browser
    const options = {
        httpOnly: true,
        secure: true
    }


    //return an all ok response with { final logged in user instance = loggedInUser , accessToken , refreshToken } in json while also saving them to cookie instance 
    //these cookie save this info so that the user do not have to login the next time and only this token is used for that
    return res
    .status(200)
    .cookie("accessToken", accessToken, options)
    .cookie("refreshToken", refreshToken, options)
    .json(
        new ApiResponse(
            200, 
            {
                //the tokens are sent here also because the frontend may require the token access 
                user: loggedInUser, accessToken, refreshToken
            },
            "User logged In Successfully"
        )
    )

})

const logoutUser = asyncHandler(async(req, res) => {
    //since the req body after the use of auth.middleware.js already have the user we could access the _id and make changes individually like how we want 
    await User.findByIdAndUpdate(
        req.user._id,
        {
            $unset: {
                refreshToken: 1 // this removes the field from document
            }
        },
        {
            //return the updated document
            new: true
        }
    )

    const options = {
        httpOnly: true,
        secure: true
    }


    // in the cleared response clear the cookie and refreshToken of the parameter have already been erased 
    return res
    .status(200)
    .clearCookie("accessToken", options)
    .clearCookie("refreshToken", options)
    //our ApiRespose have ( status code , data in JSON format , message to be shown )
    .json(new ApiResponse(200, {}, "User logged Out"))
})

const refreshAccessToken = asyncHandler(async (req, res) => {

    //what is the refresh token coming up in the request cookie or from the body if not have cookie
    const incomingRefreshToken = req.cookies.refreshToken || req.body.refreshToken

    if (!incomingRefreshToken) {
        throw new ApiError(401, "unauthorized request")
    }

    try {
        //again you would require to decode refresh token using the refresh secret that you have
        const decodedToken = jwt.verify(
            incomingRefreshToken,
            process.env.REFRESH_TOKEN_SECRET
        )
    
        //now if the refreshToken provided is correct i must be able to get _id parameter that i had passed before in the 
        //refreshToken generator part before 
        
        const user = await User.findById(decodedToken?._id)
        
        if (!user) {
            throw new ApiError(401, "Invalid refresh token")
        }
        
        //you got the user from the decoded_token then refreshToken should be same ? 
        //this check is necessary because as per flow 
        // there was a time this user had this token -> but maybe the token now got { deleted , changed } so it must check again if its still valid or not 
        if (incomingRefreshToken !== user?.refreshToken) {
            throw new ApiError(401, "Refresh token is expired or used")
            
        }
        
        const options = {
            httpOnly: true,
            secure: true
        }
        
        //since the refresh token has been verified generate new accessToken and refreshToken
    
        const {accessToken, refreshToken} = await generateAccessAndRefereshTokens(user._id)
    
        //return the response 
        return res
        .status(200)
        .cookie("accessToken", accessToken, options)
        .cookie("refreshToken", refreshToken, options)
        .json(
            new ApiResponse(
                200, 
                {accessToken,refreshToken},
                "Access token refreshed"
            )
        )
    } catch (error) {
        throw new ApiError(401, error?.message || "Invalid refresh token")
    }

})

const changeCurrentPassword = asyncHandler(async(req, res) => {
    const {oldPassword, newPassword} = req.body

    

    const user = await User.findById(req.user?._id)
    const isPasswordCorrect = await user.isPasswordCorrect(oldPassword)

    if (!isPasswordCorrect) {
        throw new ApiError(400, "Invalid old password")
    }

    user.password = newPassword
    await user.save({validateBeforeSave: false})

    return res
    .status(200)
    .json(new ApiResponse(200, {}, "Password changed successfully"))
})


const getCurrentUser = asyncHandler(async(req, res) => {
    return res
    .status(200)
    .json(new ApiResponse(
        200,
        req.user,
        "User fetched successfully"
    ))
})

const updateAccountDetails = asyncHandler(async(req, res) => {
    const {fullName, email} = req.body

    if (!fullName || !email) {
        throw new ApiError(400, "All fields are required")
    }

    const user = await User.findByIdAndUpdate(
        req.user?._id,
        {
            $set: {
                fullName,
                email: email
            }
        },
        {new: true}
        
    ).select("-password")

    return res
    .status(200)
    .json(new ApiResponse(200, user, "Account details updated successfully"))
});

const updateUserAvatar = asyncHandler(async(req, res) => {
    const avatarLocalPath = req.file?.path

    if (!avatarLocalPath) {
        throw new ApiError(400, "Avatar file is missing")
    }

    //TODO: delete old image - assignment

    const avatar = await uploadOnCloudinary(avatarLocalPath)

    if (!avatar.url) {
        throw new ApiError(400, "Error while uploading on avatar")
        
    }

    const user = await User.findByIdAndUpdate(
        req.user?._id,
        {
            $set:{
                avatar: avatar.url
            }
        },
        {new: true}
    ).select("-password")

    return res
    .status(200)
    .json(
        new ApiResponse(200, user, "Avatar image updated successfully")
    )
})

const updateUserCoverImage = asyncHandler(async(req, res) => {
    const coverImageLocalPath = req.file?.path

    if (!coverImageLocalPath) {
        throw new ApiError(400, "Cover image file is missing")
    }

    //TODO: delete old image - assignment


    const coverImage = await uploadOnCloudinary(coverImageLocalPath)

    if (!coverImage.url) {
        throw new ApiError(400, "Error while uploading on avatar")
        
    }

    const user = await User.findByIdAndUpdate(
        req.user?._id,
        {
            $set:{
                coverImage: coverImage.url
            }
        },
        {new: true}
    ).select("-password")

    return res
    .status(200)
    .json(
        new ApiResponse(200, user, "Cover image updated successfully")
    )
})


const getUserChannelProfile = asyncHandler(async(req, res) => {
    const {username} = req.params

    if (!username?.trim()) {
        throw new ApiError(400, "username is missing")
    }

    const channel = await User.aggregate([
        {
            $match: {
                username: username?.toLowerCase()
            }
        },
        {
            $lookup: {
                from: "subscriptions",
                localField: "_id",
                foreignField: "channel",
                as: "subscribers"
            }
        },
        {
            $lookup: {
                from: "subscriptions",
                localField: "_id",
                foreignField: "subscriber",
                as: "subscribedTo"
            }
        },
        {
            $addFields: {
                subscribersCount: {
                    $size: "$subscribers"
                },
                channelsSubscribedToCount: {
                    $size: "$subscribedTo"
                },
                isSubscribed: {
                    $cond: {
                        if: {$in: [req.user?._id, "$subscribers.subscriber"]},
                        then: true,
                        else: false
                    }
                }
            }
        },
        {
            $project: {
                fullName: 1,
                username: 1,
                subscribersCount: 1,
                channelsSubscribedToCount: 1,
                isSubscribed: 1,
                avatar: 1,
                coverImage: 1,
                email: 1

            }
        }
    ])

    if (!channel?.length) {
        throw new ApiError(404, "channel does not exists")
    }

    return res
    .status(200)
    .json(
        new ApiResponse(200, channel[0], "User channel fetched successfully")
    )
})

const getWatchHistory = asyncHandler(async(req, res) => {
    const user = await User.aggregate([
        {
            $match: {
                _id: new mongoose.Types.ObjectId(req.user._id)
            }
        },
        {
            $lookup: {
                from: "videos",
                localField: "watchHistory",
                foreignField: "_id",
                as: "watchHistory",
                pipeline: [
                    {
                        $lookup: {
                            from: "users",
                            localField: "owner",
                            foreignField: "_id",
                            as: "owner",
                            pipeline: [
                                {
                                    $project: {
                                        fullName: 1,
                                        username: 1,
                                        avatar: 1
                                    }
                                }
                            ]
                        }
                    },
                    {
                        $addFields:{
                            owner:{
                                $first: "$owner"
                            }
                        }
                    }
                ]
            }
        }
    ])

    return res
    .status(200)
    .json(
        new ApiResponse(
            200,
            user[0].watchHistory,
            "Watch history fetched successfully"
        )
    )
})


export {
    registerUser,
    loginUser,
    logoutUser,
    refreshAccessToken,
    changeCurrentPassword,
    getCurrentUser,
    updateAccountDetails,
    updateUserAvatar,
    updateUserCoverImage,
    getUserChannelProfile,
    getWatchHistory
}