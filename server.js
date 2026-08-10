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
    res.status(200).json({ status: "success", message: "OTP Backend is running with Brevo API!" });
});

const FIREBASE_URL = "https://botpy-b99d8-default-rtdb.firebaseio.com";

// Yahan 'xkeysib' ko lowercase (chota x) kar diya gaya hai
const BREVO_API_KEY = "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"; 

const SENDER_EMAIL = "hrryonline@gmail.com";

function getEmailKey(email) {
    return email.toLowerCase().replace(/[^a-zA-Z0-9]/g, '_');
}

function generateOTP() {
    return Math.floor(1000 + Math.random() * 9000).toString();
}

app.post('/api/send-otp', async (req, res) => {
    const { email } = req.body;
    console.log(`\n📩 New OTP Request for Email: ${email}`);

    if (!email) {
        return res.status(400).json({ success: false, message: 'Email required hai!' });
    }

    const otp = generateOTP();
    const expiresAt = Date.now() + 3 * 60 * 1000;
    const emailKey = getEmailKey(email);

    try {
        console.log("1️⃣ Firebase me 4-digit OTP save ho raha hai...");
        await axios.put(`${FIREBASE_URL}/otps/${emailKey}.json`, {
            otp: otp,
            email: email.toLowerCase(),
            expiresAt: expiresAt,
            used: false
        });

        console.log("2️⃣ Brevo HTTP API ke zariye email bheja ja raha hai...");
        await axios.post('https://api.brevo.com/v3/smtp/email', {
            sender: { name: "hrry.online", email: SENDER_EMAIL },
            to: [{ email: email }],
            subject: `${otp} is your verification code`,
            htmlContent: `
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
        }, {
            headers: {
                'api-key': BREVO_API_KEY,
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            }
        });

        console.log("✅ OTP Email Successfully bhej diya gaya!\n");
        return res.json({ success: true, message: 'OTP Sent Successfully!' });

    } catch (error) {
        console.error("❌ Send OTP Error:", error.response?.data || error.message);
        return res.status(500).json({ success: false, message: 'OTP bhejne me error aaya.' });
    }
});

app.post('/api/verify-otp', async (req, res) => {
    const { email, otp } = req.body;
    console.log(`\n🔑 Verification Request: ${email} -> ${otp}`);

    if (!email || !otp) {
        return res.status(400).json({ success: false, message: 'Email aur OTP dono zaroori hain!' });
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
            return res.status(400).json({ success: false, message: 'OTP expire ho chuka hai!' });
        }
        if (data.otp !== otp.trim()) {
            return res.status(400).json({ success: false, message: 'Galat OTP! Sahi code daalein.' });
        }

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
