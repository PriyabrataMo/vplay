import { asynchandler } from "../utils/asynchandler.js";
import { ApiError } from "../utils/ApiError.js";
import { User } from "../models/user.models.js"
import { uploadOnCloudinary } from "../utils/cloudinary.js";
import { ApiResponse } from "../utils/ApiResponse.js";

const registerUser = asynchandler( async (req,res)=>{
    // get user detail from frontend
    // validation - not empty
    // check if user already exists: username and email
    // check for images, check for avtar
    // upload them to cloudinary, avatar
    // create user object - create entry in db
    // remove password and refresh token field from response
    // check for user creation
    // return res
    res.status(200).json({message:"register user"})
    const {fullName , email , username , password } = req.body
    console.log(email);
    /*
    if(fullName===""){
        throw new ApiError(400,"fullname is required")
    }*/
    if(
        [fullName , email , username , password].some((field)=>
        field?.trim() === "")
    ){
        throw new ApiError(400,"All fields are compulsary");
    }
    const exists = await User.findOne({
        $or: [{ username }, { email }]
    })
    if(exists){
        throw new ApiError(409, "User already exists");
    }
    const avatarlocalpath = req.files?.avatar[0]?.path;
    const coverimagelocalpath = req.files?.coverimage[0]?.path;

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
        fullName,
        email,
        username: username.toLowerCase(),
        password,
        avatar: avtar.url,
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

export { registerUser }