import express from "express"
import cors from "cors"
import cookieParser from "cookie-parser"
//now import the route from the routes 
import { userRouter } from "./routes/user.route.js"

const app = express()

//allowing to get data 
app.use(cors())


//how would it read data 
app.use(express.json({limit: "16kb"}))
app.use(express.urlencoded({extended: true, limit: "16kb"}))
app.use(express.static("public"))
app.use(cookieParser());

console.log("app is injected in the index.js file \ngoing to redirect to /users");

//now time to test the route
app.use("/api/v1/users" , userRouter)

export { app }