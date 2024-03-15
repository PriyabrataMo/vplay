//require('dotenv').config({path: './env'})
import dotenv from "dotenv"
import connectDB from "./db/index.js";
import { app } from "./app.js";

dotenv.config({
    path: './.env'
})


connectDB()
.then(()=>{
    app.listen(process.env.PORT||8000,()=>{
        console.log("Server is running at PORT ",process.env.PORT);
    })
})
.catch((err)=>{
    console.log("MONGODB connection Falied: ",err);
})







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