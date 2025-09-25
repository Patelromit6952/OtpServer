import express from "express";
import cors from "cors";
import bodyParser from "body-parser";
import dotenv from "dotenv";
import admin from "firebase-admin"; // 🔹 FCM
import sgMail from "@sendgrid/mail"; // 🔹 SendGrid

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

// 🔹 SendGrid Init
sgMail.setApiKey(process.env.SENDGRID_API_KEY);

let otpStore = {};

// ✅ Send OTP with SendGrid
app.post("/send-otp", async (req, res) => {
  try {
    const { email } = req.body;
    const otp = Math.floor(100000 + Math.random() * 900000);
    otpStore[email] = { otp, expires: Date.now() + 5 * 60 * 1000 };

    const msg = {
      to: email,
      from: process.env.SENDGRID_SENDER, // must be a verified sender in SendGrid
      subject: "Your OTP Code - YaarKhata",
      html: `
        <!DOCTYPE html>
        <html>
        <body style="font-family: Arial, sans-serif; background:#f9f9f9; padding:20px;">
          <div style="max-width:600px; margin:auto; background:#ffffff; padding:30px; border-radius:8px; text-align:center;">
            <h2 style="color:#1a73e8;">🔐 YaarKhata Verification</h2>
            <p style="font-size:16px;">Your One-Time Password (OTP) is:</p>
            <h1 style="letter-spacing:4px; color:#333333;">${otp}</h1>
            <p style="color:#666666;">This code will expire in <b>5 minutes</b>.</p>
          </div>
          <p style="text-align:center; font-size:12px; color:#999;">If you didn’t request this code, please ignore this email.</p>
        </body>
        </html>
      `,
    };

    await sgMail.send(msg);
    res.json({ success: true, message: "OTP sent to email" });
  } catch (err) {
    console.error("❌ Error sending email:", err.response?.body || err.message);
    res.status(500).json({ success: false, error: err.message });
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
