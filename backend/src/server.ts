import "dotenv/config";
import express from "express";
import helmet from "helmet";
import cors from "cors";
import type { Express } from "express";

// Import Routes
import exportRouter from "./routes/export.js";

// Config
const PORT = process.env.PORT || 3000;
const app: Express = express();

// Body parsing middlewares
app.use(cors());
app.use(helmet());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// API Routes
app.use("/api/export", exportRouter);

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

export default app;
