import { connectDB } from "./db/index.js" // you dont need to define this explicitly cause node already look for index.js
import dotenv from "dotenv"

dotenv.config();
//const app = express();
//now since we have defined app.js import app from there 
import { app } from "./app.js";

connectDB().then(
    () => {
        app.listen(process.env.PORT || 8000 , () => {
            console.log("src/index.js is correctly importing and working with database");
        });
    }
).catch(
    (error) => {
        console.log("error in src/index.js while importing mongoose database:",error);
    }
);