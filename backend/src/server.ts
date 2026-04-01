import {config} from "dotenv"
import express from "express";
import helmet from "helmet";
import cors from "cors";
import type { Express } from "express";



// Import Routes



// Cofig
const PORT = process.env.PORT || 3000;
const app: Express = express();

config();



// Body parsing middlwares
app.use(cors());
app.use(helmet());
app.use(express.json())
app.use(express.urlencoded({extended: true}))


 // API Routes