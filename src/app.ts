import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";

var corsOptions = {
  origin: process.env.CORS_PRIGIN,
  credential: true,
};

const app = express();

app.use(cors(corsOptions));
app.use(express.json({ limit: "20kb" }));
app.use(express.urlencoded({ extended: true, limit: "20kb" }));
app.use(express.static("public"));
app.use(cookieParser());

export { app };
