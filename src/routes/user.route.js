import { Router } from "express";
import { registerUser } from "../controllers/user.controller.js";

const userRouter = Router();

//it will get redirected to the register url and then registerUser controller will be called
userRouter.route("/register").post(registerUser)

export {userRouter};    