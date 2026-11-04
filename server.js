require("dotenv").config();
const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");
const nodemailer = require("nodemailer");

const app = express();
app.use(cors());
app.use(express.json());

mongoose
  .connect(process.env.MONGO_URI)
  .then(() => console.log("MongoDB connected"))
  .catch((err) => console.error("MongoDB error:", err.message));

const mailSchema = new mongoose.Schema({
  subject: String,
  body: String,
  recipients: [String],
  sentCount: Number,
  failedCount: Number,
  status: { type: String, enum: ["sent", "partial", "failed"] },
  createdAt: { type: Date, default: Date.now },
});
const Mail = mongoose.model("Mail", mailSchema);

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_APP_PASSWORD,
  },
});

const isEmail = (e) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e);

app.post("/api/send", async (req, res) => {
  const { subject, body, recipients } = req.body;

  if (!subject || !body || !Array.isArray(recipients) || recipients.length === 0) {
    return res.status(400).json({ message: "Subject, body and recipients are required" });
  }

  const valid = [...new Set(recipients.map((e) => e.trim()).filter(isEmail))];
  if (valid.length === 0) {
    return res.status(400).json({ message: "No valid email addresses found" });
  }

  let sentCount = 0;
  let failedCount = 0;

  for (const to of valid) {
    try {
      await transporter.sendMail({
        from: process.env.GMAIL_USER,
        to,
        subject,
        text: body,
      });
      sentCount++;
    } catch (err) {
      console.error(`Failed to send to ${to}:`, err.message);
      failedCount++;
    }
  }

  const status = failedCount === 0 ? "sent" : sentCount === 0 ? "failed" : "partial";

  try {
    await Mail.create({ subject, body, recipients: valid, sentCount, failedCount, status });
  } catch (err) {
    console.error("Failed to save mail record:", err.message);
  }

  res.status(status === "failed" ? 500 : 200).json({
    message: `Sent: ${sentCount}, Failed: ${failedCount}`,
    status,
    sentCount,
    failedCount,
  });
});

app.get("/api/history", async (req, res) => {
  try {
    const mails = await Mail.find().sort({ createdAt: -1 });
    res.json(mails);
  } catch (err) {
    res.status(500).json({ message: "Could not fetch history" });
  }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
