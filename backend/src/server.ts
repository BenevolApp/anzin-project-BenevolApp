import express from "express";
import helmet from "helmet";
import cors from "cors";
import dotenv from "dotenv";
import type { Express } from "express";


// Cofig
const PORT = process.env.PORT || 3000;
const app: Express = express();

dotenv.config();



// middleware
app.use(helmet());
app.use(cors());

app.use(express.json());