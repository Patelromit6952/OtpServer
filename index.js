import express from "express";
import cors from "cors";
import bodyParser from "body-parser";
import dotenv from "dotenv";
import admin from "firebase-admin"; // 🔹 FCM
import nodemailer from "nodemailer";

dotenv.config();
const app = express();
app.use(cors());
app.use(bodyParser.json());

// 🔹 Firebase Admin Init
const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT || "{}");

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});
console.log("✅ Firebase Admin initialized");
const transporter = nodemailer.createTransport({
  host: "smtp.zoho.in",
  port: 465,
  secure: true,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});
transporter.verify((err, success) => {
  if (err) {
    console.log("❌ SMTP Verify Error:", err);
  } else {
    console.log("✅ SMTP Connected");
  }
});


let otpStore = {};

app.post("/send-otp", async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ success: false, message: "Email required" });
    }

    const otp = Math.floor(100000 + Math.random() * 900000);

    otpStore[email] = {
      otp,
      expires: Date.now() + 5 * 60 * 1000, // 5 min
    };

    const mailOptions = {
      from: `"YaarKhata" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: "Your OTP Code - YaarKhata",
      html: `
        <div style="font-family:Arial; padding:20px;">
          <h2 style="color:#1a73e8;">🔐 YaarKhata Verification</h2>
          <p>Your OTP is:</p>
          <h1>${otp}</h1>
          <p>This code expires in 5 minutes.</p>
        </div>
      `,
    };

    await transporter.sendMail(mailOptions);
    res.json({
      success: true,
      message: "OTP sent successfully",
    });
  } catch (err) {
    console.error("❌ Email Error:", err);

    res.status(500).json({
      success: false,
      error: "Failed to send OTP",
    });
  }
});


// ✅ Verify OTP
app.post("/verify-otp", (req, res) => {
  try {
    const { email, otp } = req.body;

    const record = otpStore[email];
    if (!record) return res.json({ success: false, message: "No OTP requested" });

    if (Date.now() > record.expires) {
      delete otpStore[email];
      return res.json({ success: false, message: "OTP expired" });
    }

    if (record.otp == otp) {
      delete otpStore[email];
      return res.json({ success: true, message: "OTP Verified" });
    } else {
      return res.json({ success: false, message: "Invalid OTP" });
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// ✅ Push Notifications
app.post("/send-notification", async (req, res) => {
  try {
    const { token, title, body } = req.body;

    if (!token || !title || !body) {
      return res.status(400).json({ success: false, error: "Missing fields" });
    }

    const message = {
      token,
      notification: { title, body },
      android: { priority: "high" },
      apns: { headers: { "apns-priority": "10" } },
    };

    const response = await admin.messaging().send(message);
    console.log("✅ Notification sent:", response);

    res.json({ success: true, response });
  } catch (err) {
    console.error("❌ Error sending notification:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});

app.listen(process.env.PORT, () =>
  console.log(`✅ Server running on port ${process.env.PORT}`)
);
