import { asynchandler } from "../utils/asynchandler.js";
import { ApiError } from "../utils/ApiError.js";
import { User } from "../models/user.models.js"
import { uploadOnCloudinary } from "../utils/cloudinary.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import jwt from "jsonwebtoken";

const generateAccessandRefreshTokens = async(userId)=>{
    try {
        const user  = await User.findById(userId);
        const accessToken = user.generateAccessToken()
        const refreshToken = user.generateRefreshToken()

        user.refreshToken = refreshToken
        await user.save({ validateBeforeSave:false })

        // console.log(accessToken);
        // console.log("\n")
        // console.log(refreshToken);
        // console.log("\n")

        return {accessToken , refreshToken}

    } catch (error) {
        throw new ApiError(500 , "Something went wrong while generting refresh and access token")
    }

}

const registerUser = asynchandler( async (req,res)=>{
    // get user detail from frontend
    // validation - not empty
    // check if user already exists: userName and email
    // check for images, check for avtar
    // upload them to cloudinary, avatar
    // create user object - create entry in db
    // remove password and refresh token field from response
    // check for user creation
    // return res

    //res.status(200).json({message:"register user"})

    const {fullName , email , userName , password } = req.body
    //console.log(email);
    /*
    if(fullName===""){
        throw new ApiError(400,"fullname is required")
    }*/
    if(
        [fullName , email , userName , password].some((field)=>
        field?.trim() === "")
    ){
        throw new ApiError(400,"All fields are compulsary");
    }
    const exists = await User.findOne({
        $or: [{ userName }, { email }]
    })
    if(exists){
        throw new ApiError(409, "User already exists");
    }
    const avatarlocalpath = req.files?.avatar[0]?.path;
    let coverimagelocalpath;
    if(req.files && Array.isArray(req.files.coverimage) && req.files.coverimage.length>0){
        coverimagelocalpath = req.files.coverimage[0].path;
    }
    if(!avatarlocalpath){
        throw new ApiError(400,"Avatar is required")
    }
    if(avatarlocalpath){
        console.log(avatarlocalpath);
    }

    const avtar = await uploadOnCloudinary(avatarlocalpath);
    const coverImage = await uploadOnCloudinary(coverimagelocalpath);

    if(!avtar){
        throw new ApiError(500,"Error in uploading avatar")
    }

    const user = await User.create({
        userName:userName.toLowerCase(),
        email,
        fullName,
        avatar: avtar.url,
        password,
        coverImage: coverImage?.url || "",

    })

    const createdUser = await User.findById(user._id).select(
        "-password -refreshToken"
    )
    if(!createdUser){
        throw new ApiError(500,"Error in creating user")
    }

    return res.status(201).json(new ApiResponse(200,createdUser,"User Created Successfully"))


})

const loginUser = asynchandler( async (req,res)=>{
    // req body -> data
    // username or with email
    // find user
    // check password
    // access and refresh token
    // send cookies
    const {email , userName , password} = req.body;

    if(!userName && !email){
        throw new ApiError(404 , "username or email required");
    }

    const user = await User.findOne({
        $or: [{email} , {userName}]
    })

    if(!user){
        throw new ApiError(404 , "user doesnot exist");
    }
    const isValid = await user.isPasswordCorrect(password)
    if(!isValid){
        throw new ApiError(401 , "incorrect password");
    }

    const { accessToken , refreshToken }= await generateAccessandRefreshTokens(user._id)

    const loggedInUser = await User.findById(user._id).select("-password -refreshtoken")

    const options = {
        httpOnly: true,
        secure: true
    }

    return res.status(200)
    .cookie("accessToken" , accessToken , options)
    .cookie("refreshToken" , refreshToken , options)
    .json(
        new ApiResponse(200,{
            user: loggedInUser,accessToken,refreshToken
        },
        "user logged in successfully"
    )
    )


})

const logoutUser = asynchandler( async (req , res)=>{
    await User.findByIdAndUpdate(
        req.user._id,
        {
            $set: {
                refreshToken: undefined
            }
        }
    )
    const options = {
        httpOnly: true,
        secure: true
    }

    return res
    .status(200)
    .clearCookie("accessToken",options)
    .clearCookie("refreshToken",options)
    .json(new ApiResponse(200 , {} , "User Logged Out"))
})

const refreshAccessToken = asynchandler( async (req,res)=>{
    const incomingRefreshToken = req.cookies.refreshToken || req.body.refreshToken
    if(!incomingRefreshToken){
        throw new ApiError(401 , "Unauthorized Request")
    }
    try {
        const decodedToken = jwt.verify(incomingRefreshToken , process.env.REFRESH_TOKEN_SECRET)
    
        const user = await User.findById(decodedToken?._id);
    
        if(!user) {
            throw new ApiError(401 , "invalid token")
        }
    
        if(incomingRefreshToken !== user?.refreshToken){
            throw new ApiError(401 , "refresh token is expired or used")
        }
    
        const options = {
            httpOnly: true,
            secure: true,
        }
        //console.log(user?.refreshToken);
        console.log(await generateAccessandRefreshTokens(user._id));
        const { accessToken , refreshToken:newrefreshToken } = await generateAccessandRefreshTokens(user._id)
        console.log(accessToken);
        console.log("\n")
        console.log(newrefreshToken);
        console.log("\n")
        return res.status(200)
        .cookie("accessToken" ,accessToken , options )
        .cookie("refreshToken",newrefreshToken , options )
        .json(
            new ApiResponse(
                200,
                {accessToken ,refreshToken:newrefreshToken},
                "accesstoken refreshed successfully"
            )
        )
    } catch (error) {
        throw new ApiError(401 , error?.message||"invalid refresh token")
    }

})

const changeCurrentPassword = asynchandler( async (req,res)=>{
    const {oldPassword , newPassword} = req.body;
    const user = await User.findById(req.user._id)
    if(!user){
        throw new ApiError(404 , "user not found")
    }
    const isValid = await user.isPasswordCorrect(oldPassword)
    if(!isValid){
        throw new ApiError(400 , "incorrect password")
    }
    user.password = newPassword
    await user.save({ validateBeforeSave: false })
    return res.status(200).json(new ApiResponse(200 , {} , "Password Changed Successfully"))
})

const getCurrentUser = asynchandler( async (req,res)=>{
    return res.status(200).json(new ApiResponse(200 , req.user , "User Fetched Successfully"))
})

const updateAccountDetails = asynchandler(async(req , res)=>{
    const {fullName , email } = req.body;
    if(!fullName && !email){
        throw new ApiError(400 , "All fields are required")
    }
    const user = User.findByIdAndUpdate(req.user?._id,{
        $set: {
            fullName:fullName,
            email:email
        }
    },{}).select("-password")
    return res.status(200).json(new ApiResponse(200 , user , "User Updated Successfully"))
})

const updateAvatar = asynchandler(async(req , res)=>{
    const avatarlocalpath = req.file?.path;
    if(!avatarlocalpath){
        throw new ApiError(400,"Avatar is required")
    }
    const avtar = await uploadOnCloudinary(avatarlocalpath);
    if(!avtar){
        throw new ApiError(500,"Error in uploading avatar")
    }
    const user = User.findByIdAndUpdate(req.user?._id,{
        $set: {
            avatar:avtar.url
        }
    },{}).select("-password")
    return res.status(200).json(new ApiResponse(200 , user , "Avatar Updated Successfully"))
})

const updateCoverImage = asynchandler(async(req , res)=>{
    const coverImagePath = req.file?.path;
    if(!coverImagePath){
        throw new ApiError(400,"Avatar is required")
    }
    const coverImage = await uploadOnCloudinary(coverImagePath);
    if(!coverImage){
        throw new ApiError(500,"Error in uploading avatar")
    }
    const user = User.findByIdAndUpdate(req.user?._id,{
        $set: {
            coverImage:coverImage.url
        }
    },{}).select("-password")
    return res.status(200).json(new ApiResponse(200 , user , "Avatar Updated Successfully"))
})


export { registerUser, loginUser , logoutUser , 
    refreshAccessToken , changeCurrentPassword , getCurrentUser , 
    updateAccountDetails , updateAvatar , updateCoverImage }
