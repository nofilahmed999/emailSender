require("dotenv").config();
const express = require("express");
const cors = require("cors");
const nodemailer = require("nodemailer");

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Transporter Configuration
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

// Contact Route
app.post("/api/contact", async (req, res) => {
  const { name, email, subject, message } = req.body;

  // Validation
  if (!name || !email || !subject || !message) {
    return res.status(400).json({
      success: false,
      message: "Please fill in all required fields.",
    });
  }

  try {
    // =========================================================================
    // 1. NOTIFICATION EMAIL -> Sent to YOUR CLIENT'S inbox (process.env.EMAIL_USER)
    // =========================================================================
    await transporter.sendMail({
      from: `"Website Contact Form" <${process.env.EMAIL_USER}>`,
      to: process.env.EMAIL_USER, // <--- DELIVERS TO CLIENT INBOX
      replyTo: email,             // So client can click "Reply" directly to visitor
      subject: `New Form Submission: ${subject}`,
      html: `
        <div style="font-family: Arial, sans-serif; padding: 20px; line-height: 1.6;">
          <h2 style="color: #2563eb;">New Website Inquiry</h2>
          <hr style="border: none; border-top: 1px solid #e5e7eb;" />
          <p><strong>Visitor Name:</strong> ${name}</p>
          <p><strong>Visitor Email:</strong> ${email}</p>
          <p><strong>Subject:</strong> ${subject}</p>
          <p><strong>Message:</strong></p>
          <blockquote style="background: #f3f4f6; padding: 15px; border-left: 4px solid #2563eb; margin: 0;">
            ${message}
          </blockquote>
        </div>
      `,
    });

    // =========================================================================
    // 2. CONFIRMATION EMAIL -> Sent to the VISITOR'S email address (email variable)
    // =========================================================================
    await transporter.sendMail({
      from: `"Client Support" <${process.env.EMAIL_USER}>`,
      to: email,                  // <--- DELIVERS TO VISITOR
      subject: "We received your message!",
      html: `
        <div style="font-family: Arial, sans-serif; padding: 20px; line-height: 1.6;">
          <h2>Thanks for reaching out, ${name}! 👋</h2>
          <p>We have received your inquiry regarding <strong>"${subject}"</strong> and will get back to you shortly.</p>
          <hr style="border: none; border-top: 1px solid #e5e7eb;" />
          <p style="font-size: 12px; color: #6b7280;">This is an automated confirmation email.</p>
        </div>
      `,
    });

    return res.status(200).json({
      success: true,
      message: "Emails sent successfully!",
    });
  } catch (error) {
    console.error("Nodemailer Error:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to dispatch emails.",
    });
  }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});