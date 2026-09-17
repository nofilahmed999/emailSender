require("dotenv").config();
const express = require("express");
const cors = require("cors");
const nodemailer = require("nodemailer");
const axios = require("axios");

const app = express();

app.use(cors());
app.use(express.json());

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

app.get("/", (req, res) => {
  res.send("Backend is running successfully!");
});

app.post("/api/contact", async (req, res) => {
  const { name, email, subject, message } = req.body;

  if (!name || !email || !subject || !message) {
    return res.status(400).json({
      success: false,
      message: "Please fill in all required fields.",
    });
  }

  try {
    // 1. AbstractAPI Email Verification
    const apiKey = process.env.ABSTRACT_API_KEY;
    const verifyUrl = `https://emailvalidation.abstractapi.com/v1/?api_key=${apiKey}&email=${email}`;

    const apiRes = await axios.get(verifyUrl, { timeout: 5000 });
    const data = apiRes.data;

    console.log("AbstractAPI Output:", data);

    // Exact checks according to AbstractAPI response structure
    const isValidFormat = data.is_valid_format?.value ?? false;
    const isDeliverable = data.deliverability === "DELIVERABLE";
    const isDisposable = data.is_disposable_email?.value ?? false;
    const qualityScore = parseFloat(data.quality_score || 0);

    // Reject invalid, undeliverable, disposable, or low score (< 0.70) emails
    if (!isValidFormat || !isDeliverable || isDisposable || qualityScore < 0.70) {
      return res.status(400).json({
        success: false,
        message: "Please use your real email address.",
      });
    }

    // 2. Dispatch Emails via Nodemailer
    await transporter.sendMail({
      from: `"Website Contact Form" <${process.env.EMAIL_USER}>`,
      to: process.env.EMAIL_USER,
      replyTo: email,
      subject: `New Form Submission: ${subject}`,
      html: `
        <div style="font-family: Arial, sans-serif; padding: 20px;">
          <h2>New Website Inquiry</h2>
          <p><strong>Visitor Name:</strong> ${name}</p>
          <p><strong>Visitor Email:</strong> ${email}</p>
          <p><strong>Subject:</strong> ${subject}</p>
          <p><strong>Message:</strong></p>
          <blockquote>${message}</blockquote>
        </div>
      `,
    });

    await transporter.sendMail({
      from: `"Client Support" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: "We received your message!",
      html: `
        <div style="font-family: Arial, sans-serif; padding: 20px;">
          <h2>Thanks for reaching out, ${name}! 👋</h2>
          <p>We received your inquiry regarding "<strong>${subject}</strong>" and will reply shortly.</p>
        </div>
      `,
    });

    return res.status(200).json({
      success: true,
      message: "Emails sent successfully!",
    });

  } catch (error) {
    console.error("API / Server Error:", error.response?.data || error.message);
    
    // AbstractAPI validation fail catch
    if (error.response?.status === 400) {
      return res.status(400).json({
        success: false,
        message: "Please use your real email address.",
      });
    }

    return res.status(500).json({
      success: false,
      message: "Failed to dispatch email. Please Use real email...",
    });
  }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});