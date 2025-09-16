import express from "express";
import cors from "cors";
import bodyParser from "body-parser";
import dotenv from "dotenv";
import twilio from "twilio";

dotenv.config();
const app = express();
app.use(cors());
app.use(bodyParser.json());

const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);

// 🔹 Send OTP
app.post("/send-otp", async (req, res) => {
  try {
    const { phone } = req.body;
    const verification = await client.verify.v2
      .services(process.env.TWILIO_SERVICE_SID)
      .verifications.create({ to: `+91${phone}`, channel: "sms" });

    res.json({ success: true, status: verification.status });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// 🔹 Verify OTP
app.post("/verify-otp", async (req, res) => {
  try {
    const { phone, otp } = req.body;
    const verificationCheck = await client.verify.v2
      .services(process.env.TWILIO_SERVICE_SID)
      .verificationChecks.create({ to: `+91${phone}`, code: otp });

    if (verificationCheck.status === "approved") {
      res.json({ success: true, message: "OTP Verified" });
    } else {
      res.json({ success: false, message: "Invalid OTP" });
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: err.message });
  }
});

app.listen(process.env.PORT, () =>
  console.log(`✅ Server running on port ${process.env.PORT}`)
);
