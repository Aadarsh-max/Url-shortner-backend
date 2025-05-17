import express from "express";
import mongoose from "mongoose";
import cors from "cors";
import { nanoid } from "nanoid";
import dotenv from "dotenv";
import urlModel from "./models/url.model.js";
import QRCode from "qrcode";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

app.use(
  cors({
    origin: "https://url-shortner-frontend-phi.vercel.app/", 
    methods: ["GET", "POST"],
    credentials: true,
  })
);

app.use(express.json());

app.post("/api/short", async (req, res) => {
  try {
    const { originalUrl } = req.body;
    if (!originalUrl) {
      return res.status(400).json({ error: "Original URL is required" });
    }

    console.log("Received URL to shorten:", originalUrl);

    const existingUrl = await urlModel.findOne({ originalUrl });
    if (existingUrl) {
      const myUrl = `${req.protocol}://${req.get("host")}/${existingUrl.shortUrl}`;
      const qrCodeImg = await QRCode.toDataURL(existingUrl.originalUrl);

      console.log(
        "Using existing short URL:",
        myUrl,
        "for original URL:",
        originalUrl
      );

      return res.status(200).json({
        message: "URL already exists",
        myUrl,
        qrCodeImg,
        shortUrl: existingUrl.shortUrl,
        originalUrl: existingUrl.originalUrl,
      });
    }

    const shortUrl = nanoid(8);

    const myUrl = `${req.protocol}://${req.get("host")}/${shortUrl}`;
    const qrCodeImg = await QRCode.toDataURL(originalUrl);

    console.log("Created new short URL:", myUrl, "for original URL:", originalUrl);

    const url = new urlModel({
      originalUrl,
      shortUrl,
      clicks: 0,
    });

    await url.save();

    return res.status(200).json({
      message: "URL generated successfully",
      myUrl,
      qrCodeImg,
      shortUrl,
      originalUrl,
    });
  } catch (error) {
    console.error("Error in /api/short:", error);
    res.status(500).json({ error: "Server Error" });
  }
});

app.get("/:shortUrl", async (req, res) => {
  try {
    const { shortUrl } = req.params;
    const url = await urlModel.findOne({ shortUrl });

    if (url) {
      url.clicks++;

      await url.save();

      let redirectUrl = url.originalUrl;
      if (!redirectUrl.startsWith("http://") && !redirectUrl.startsWith("https://")) {
        redirectUrl = "https://" + redirectUrl;
      }

      console.log("Redirecting to:", redirectUrl);
      return res.redirect(redirectUrl);
    } else {
      return res.status(404).json({ error: "URL not found" });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Server Error" });
  }
});

const MONGO_DB_URI = process.env.MONGO_DB_URI;
mongoose
  .connect(MONGO_DB_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(() => {
    console.log("✅ MongoDB connected successfully");
  })
  .catch((error) => {
    console.error("❌ MongoDB connection error:", error);
  });

app.get("/", (req, res) => {
  res.send("✅ Express server is running!");
});

app.listen(PORT, () => {
  console.log(`🚀 Server is running on http://localhost:${PORT}`);
});
