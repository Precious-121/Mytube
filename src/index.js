import mongoose  from "mongoose";
import dotenv from "dotenv";
import express from "express";

dotenv.config();
const app = express();

const connectDB = async () => { //this async would make this async 

    try {
        //mongoose connecting syntax 
        await mongoose.connect(`${process.env.MONGO_URL}/${process.env.DATABASE_NAME}`);
        console.log("Hell yeah the database has been connected");

        //when this code block would it would indicate and run this actions 
        app.on("error", (error) => {
            console.log("Bruh there is this error :",error);
        });

        app.listen(process.env.PORT || 8000 , () => {
            console.log("This is currently working at port", process.env.PORT);
        });


    } catch (error) {
        console.log("Your Error is", error);
    }
};

connectDB();