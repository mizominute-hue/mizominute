require('dotenv').config();
const express = require('express');
const nodemailer = require('nodemailer');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

const transporter = nodemailer.createTransport({
    host: "smtp-relay.brevo.com",
    port: 587,
    secure: false,
    auth: {
        user: process.env.BREVO_SMTP_USER,
        pass: process.env.BREVO_SMTP_PASS
    }
});

app.post('/send-order-email', async (req, res) => {
    const { orderData, orderId } = req.body;
    
    try {
        await transporter.sendMail({
            from: '"MizoMinute" <mizominute@gmail.com>',
            to: orderData.userInfo.email,
            subject: `Order Confirmation #${orderId} - MizoMinute`,
            html: `... paste your full HTML email template here ...`
        });
        
        res.json({ success: true });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, error: error.message });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));