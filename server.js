require('dotenv').config();
const express = require('express');
const axios = require('axios');
const cors = require('cors');
const nodemailer = require('nodemailer');

const app = express();
app.use(cors({ origin: '*' }));
app.use(express.json());

app.use((req, res, next) => {
    console.log(`[${new Date().toLocaleTimeString()}] ${req.method} ${req.url}`);
    next();
});

app.get('/', (req, res) => {
    res.status(200).json({ status: "success", message: "Backend is running with Gmail SMTP Port 587!" });
});

const FIREBASE_URL = "https://botpy-b99d8-default-rtdb.firebaseio.com";

// Gmail SMTP सेटअप (Render Environment Variables से पासवर्ड लेगा)
const transporter = nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 587,         // <-- यहाँ 465 की जगह 587 कर दिया है
    secure: false,     // <-- 587 के लिए इसे false रखना होता है
    auth: {
        user: process.env.GMAIL_EMAIL, 
        pass: process.env.GMAIL_APP_PASSWORD 
    }
});

function getEmailKey(email) {
    return email.toLowerCase().replace(/[^a-zA-Z0-9]/g, '_');
}

function generateOTP() {
    return Math.floor(1000 + Math.random() * 9000).toString();
}

app.post('/api/send-otp', async (req, res) => {
    const { email } = req.body;
    if (!email) return res.status(400).json({ success: false, message: 'Email required!' });

    const otp = generateOTP();
    const expiresAt = Date.now() + 3 * 60 * 1000;
    const emailKey = getEmailKey(email);

    try {
        console.log("⏳ Sending email to:", email);
        
        await axios.put(`${FIREBASE_URL}/otps/${emailKey}.json`, { 
            otp, email: email.toLowerCase(), expiresAt, used: false 
        });

        const mailOptions = {
            from: `"hrry.online" <${process.env.GMAIL_EMAIL}>`,
            to: email,
            subject: `${otp} is your verification code`,
            html: `<div style="text-align:center; padding:20px; background:#000; color:#fff;"><h2>Verification Code</h2><p style="font-size:24px; color:#38bdf8;">${otp}</p></div>`
        };

        await transporter.sendMail(mailOptions);
        console.log(`✅ OTP sent successfully to ${email}`);

        return res.json({ success: true, message: 'OTP Sent!' });
    } catch (error) {
        console.error("❌ Email Error:", error.message);
        return res.status(500).json({ success: false, message: 'Error sending email.' });
    }
});

app.post('/api/verify-otp', async (req, res) => {
    const { email, otp } = req.body;
    const emailKey = getEmailKey(email);

    try {
        const response = await axios.get(`${FIREBASE_URL}/otps/${emailKey}.json`);
        const data = response.data;
        if (!data || data.used || Date.now() > data.expiresAt || data.otp !== otp.trim()) {
            return res.status(400).json({ success: false, message: 'Invalid or expired OTP.' });
        }
        await axios.patch(`${FIREBASE_URL}/otps/${emailKey}.json`, { used: true });
        return res.json({ success: true, message: 'Verified!' });
    } catch (error) {
        return res.status(500).json({ success: false, message: 'Error verifying.' });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
