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
    res.status(200).json({ status: "success", message: "OTP Backend is running with Gmail SMTP!" });
});

const FIREBASE_URL = "https://botpy-b99d8-default-rtdb.firebaseio.com";

// Gmail SMTP सेटअप (Render Environment Variables से पासवर्ड लेगा)
const transporter = nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 465,
    secure: true, 
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
        // 1. Firebase में OTP सेव करना
        await axios.put(`${FIREBASE_URL}/otps/${emailKey}.json`, { 
            otp, email: email.toLowerCase(), expiresAt, used: false 
        });

        // 2. Direct Gmail SMTP से ईमेल भेजना
        const mailOptions = {
            from: `"hrry.online" <${process.env.GMAIL_EMAIL}>`,
            to: email,
            subject: `${otp} is your verification code`,
            html: `
            <div style="background:#09090b; padding:30px; font-family:sans-serif; color:#ffffff; text-align:center;">
                <div style="max-width:360px; margin:auto; background:#18181b; padding:30px; border-radius:20px; border:1px solid #27272a;">
                    <h2 style="margin-bottom:8px; font-size:22px; color:#ffffff;">Verification Code</h2>
                    <p style="color:#a1a1aa; font-size:14px; margin-bottom:20px;">Use the 4-digit code below to verify your email.</p>
                    <div style="background:#000000; border:1px solid #3f3f46; border-radius:12px; padding:16px; font-size:36px; font-weight:bold; letter-spacing:12px; color:#38bdf8;">
                        ${otp}
                    </div>
                </div>
            </div>`
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
