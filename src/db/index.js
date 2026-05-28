import mongoose  from "mongoose";
import dotenv from "dotenv";
dotenv.config();

//database connection - by default return a promise 
const connectDB = async () => { //this async would make this async 

    try {
        //mongoose connecting syntax 
        await mongoose.connect(`${process.env.MONGO_URL}/${process.env.DATABASE_NAME}`);
        console.log("db/index.js is working fine - database connected from here");

    } catch (error) {
        console.log("Your db/index.js has some Error:", error);
    }
};

export {connectDB}; 