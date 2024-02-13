//require('dotenv').config({path: './env'})
import dotenv from "dotenv"

dotenv.config({
    path: './env'
})

import connectDB from "./db/index.js";

connectDB()







/*
import mongosse from "mongoose";
import { DB_NAME } from "./constants";
import express from "express";
const app = express()
( async () => {
    try{
        mongosse.connect(`${process.env.MONGO}/${DB_NAME}`)
        app.on("error",(error)=>{
            console.log("ERR: ",error);
            throw error
        })
        app.listen(process.env.PORT,()=>{
            console.log(`App listening on ${process.env.PORT}`);
        })
    }catch (error){
        console.error("Error: ",error)
        throw error
    }
})()
*/