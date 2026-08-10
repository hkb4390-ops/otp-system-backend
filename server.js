require('dotenv').config();
const express = require('express');
const axios = require('axios');
const cors = require('cors');

const app = express();

app.use(cors({ origin: '*' }));
app.use(express.json());

app.use((req, res, next) => {
    console.log(`[${new Date().toLocaleTimeString()}] ${req.method} ${req.url}`);
    next();
});

app.get('/', (req, res) => {
    res.status(200).json({ status: "success", message: "OTP Backend is running with Env Var!" });
});

const FIREBASE_URL = "https://botpy-b99d8-default-rtdb.firebaseio.com";

// Render ke Environment Variable se key utha raha hai
const RESEND_API_KEY = process.env.RESEND_API_KEY; 

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
        await axios.put(`${FIREBASE_URL}/otps/${emailKey}.json`, { otp, email: email.toLowerCase(), expiresAt, used: false });

        await axios.post('https://api.resend.com/emails', {
            from: 'hrry.online <onboarding@resend.dev>',
            to: [email],
            subject: `${otp} is your verification code`,
            html: `<div style="text-align:center; padding:20px;"><h2>Verification Code</h2><p>Your code is: <strong>${otp}</strong></p></div>`
        }, {
            headers: { 'Authorization': `Bearer ${RESEND_API_KEY}`, 'Content-Type': 'application/json' }
        });

        return res.json({ success: true, message: 'OTP Sent!' });
    } catch (error) {
        console.error("❌ Error:", error.response?.data || error.message);
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
