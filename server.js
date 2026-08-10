require('dotenv').config(); // Fixed: Small 'r' for require
const express = require('express');
const nodemailer = require('nodemailer');
const axios = require('axios');
const cors = require('cors');

const app = express();

// External websites se requests accept karne ke liye CORS
app.use(cors({ origin: '*' }));
app.use(express.json());

// Server Live Request Logger
app.use((req, res, next) => {
    console.log(`[${new Date().toLocaleTimeString()}] ${req.method} ${req.url}`);
    next();
});

// Render ke liye Default Health Check Route
app.get('/', (req, res) => {
    res.status(200).json({ status: "success", message: "OTP Backend is running perfectly!" });
});

// Environment Variables Check
const FIREBASE_URL = process.env.FIREBASE_URL;

// Nodemailer Gmail SMTP Transport
const transporter = nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 587,
    secure: false, // TLS
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS ? process.env.EMAIL_PASS.replace(/\s+/g, '') : ''
    },
    connectionTimeout: 10000
});

// Helper Functions
function getEmailKey(email) {
    return email.toLowerCase().replace(/[^a-zA-Z0-9]/g, '_');
}

// 4-Digit OTP Generator
function generateOTP() {
    return Math.floor(1000 + Math.random() * 9000).toString();
}

// 1. Send OTP Endpoint
app.post('/api/send-otp', async (req, res) => {
    const { email } = req.body;
    console.log(`\n📩 New OTP Request for Email: ${email}`);

    if (!email) {
        return res.status(400).json({ success: false, message: 'Email required hai!' });
    }

    // Checking if Firebase URL is properly configured
    if (!FIREBASE_URL || !FIREBASE_URL.startsWith('http')) {
        console.error("❌ ERROR: FIREBASE_URL is missing or invalid in environment variables!");
        return res.status(500).json({ 
            success: false, 
            message: 'Backend Configuration Error: Firebase URL invalid hai.' 
        });
    }

    const otp = generateOTP(); // 4 Digits
    const expiresAt = Date.now() + 3 * 60 * 1000; // 3 Minutes Expiry
    const emailKey = getEmailKey(email);

    try {
        // Step A: Save to Firebase
        console.log("1️⃣ Firebase me 4-digit OTP save ho raha hai...");
        await axios.put(`${FIREBASE_URL}/otps/${emailKey}.json`, {
            otp: otp,
            email: email.toLowerCase(),
            expiresAt: expiresAt,
            used: false
        });

        // Step B: Send Email via Nodemailer
        console.log("2️⃣ Email bheja ja raha hai...");
        await transporter.sendMail({
            from: `"hrry.online" <${process.env.EMAIL_USER}>`,
            to: email,
            subject: `${otp} is your verification code`,
            html: `
            <div style="background:#09090b; padding:30px; font-family:-apple-system, BlinkMacSystemFont, sans-serif; color:#ffffff; text-align:center;">
                <div style="max-width:360px; margin:auto; background:#18181b; padding:30px; border-radius:20px; border:1px solid #27272a;">
                    <h2 style="margin-bottom:8px; font-size:22px; color:#ffffff;">Verification Code</h2>
                    <p style="color:#a1a1aa; font-size:14px; margin-bottom:20px;">Use the 4-digit code below to verify your email.</p>
                    <div style="background:#000000; border:1px solid #3f3f46; border-radius:12px; padding:16px; font-size:36px; font-weight:bold; letter-spacing:12px; color:#38bdf8;">
                        ${otp}
                    </div>
                    <p style="color:#71717a; font-size:12px; margin-top:20px;">Valid for 3 minutes only. Do not share this code.</p>
                </div>
            </div>`
        });

        console.log("✅ OTP Email Successfully bhej diya gaya!\n");
        return res.json({ success: true, message: 'OTP Sent Successfully!' });

    } catch (error) {
        console.error("❌ Send OTP Error:", error.message);
        
        // Agar Axios ka URL error hai toh clear message bhejein
        if (error.code === 'ERR_INVALID_URL') {
            return res.status(500).json({ success: false, message: 'Backend config error: Firebase link galat hai.' });
        }
        
        return res.status(500).json({ success: false, message: 'OTP bhejne me error aaya. Email details check karein.' });
    }
});

// 2. Verify OTP Endpoint
app.post('/api/verify-otp', async (req, res) => {
    const { email, otp } = req.body;
    console.log(`\n🔑 Verification Request: ${email} -> ${otp}`);

    if (!email || !otp) {
        return res.status(400).json({ success: false, message: 'Email aur OTP dono zaroori hain!' });
    }

    if (!FIREBASE_URL || !FIREBASE_URL.startsWith('http')) {
        return res.status(500).json({ success: false, message: 'Backend config error: Firebase URL invalid hai.' });
    }

    const emailKey = getEmailKey(email);

    try {
        const response = await axios.get(`${FIREBASE_URL}/otps/${emailKey}.json`);
        const data = response.data;

        if (!data) {
            return res.status(400).json({ success: false, message: 'Is email ke liye koi OTP request nahi mili.' });
        }
        if (data.used) {
            return res.status(400).json({ success: false, message: 'Yeh OTP pehle hi use ho chuka hai!' });
        }
        if (Date.now() > data.expiresAt) {
            return res.status(400).json({ success: false, message: 'OTP expire ho chuka hai! Naya OTP mangein.' });
        }
        if (data.otp !== otp.trim()) {
            return res.status(400).json({ success: false, message: 'Galat OTP! Sahi code daalein.' });
        }

        // Mark OTP as used in Firebase
        await axios.patch(`${FIREBASE_URL}/otps/${emailKey}.json`, { used: true });
        console.log("✅ Email Verified Successfully!\n");

        return res.json({ success: true, message: 'Email Verified Successfully!' });

    } catch (error) {
        console.error("❌ Verification Error:", error.message);
        return res.status(500).json({ success: false, message: 'Verification me error aaya.' });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🚀 Server listening on port ${PORT}`));
