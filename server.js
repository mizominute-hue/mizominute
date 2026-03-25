const express = require('express');
const nodemailer = require('nodemailer');
const cors = require('cors');
const bodyParser = require('body-parser');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors({
    origin: '*', // For testing only - restrict in production
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Log all requests for debugging
app.use((req, res, next) => {
    console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
    next();
});

// Nodemailer transporter
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
    }
});

// Verify transporter on startup
transporter.verify((error, success) => {
    if (error) {
        console.error('❌ Email transporter error:', error);
    } else {
        console.log('✅ Email transporter ready to send emails');
    }
});

// Email endpoint
app.post('/api/send-order-email', async (req, res) => {
    console.log('📧 Received email request:', req.body);
    
    try {
        const { customerEmail, customerName, orderDetails, grandTotal, orderId } = req.body;
        
        // Validate required fields
        if (!customerEmail || !customerName || !orderDetails || !grandTotal) {
            console.error('❌ Missing required fields');
            return res.status(400).json({ 
                success: false, 
                error: 'Missing required fields' 
            });
        }
        
        // Create email HTML
        const orderItemsHtml = orderDetails.items.map(item => `
            <tr>
                <td style="padding: 8px; border-bottom: 1px solid #eee;">${item.name}</td>
                <td style="padding: 8px; border-bottom: 1px solid #eee; text-align: center;">${item.quantity}</td>
                <td style="padding: 8px; border-bottom: 1px solid #eee; text-align: right;">₹${item.subtotal}</td>
            </tr>
        `).join('');
        
        const mailOptions = {
            from: `"MizoMinute" <${process.env.EMAIL_USER}>`,
            to: customerEmail,
            subject: `Order Confirmation #${orderId} - MizoMinute`,
            html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                    <div style="background: #ff6f2f; padding: 20px; text-align: center; color: white; border-radius: 10px 10px 0 0;">
                        <h1>MizoMinute</h1>
                        <p>Order Placed Successfully!</p>
                    </div>
                    <div style="padding: 20px; border: 1px solid #eee; border-top: none;">
                        <h2>Hello ${customerName},</h2>
                        <p>Thank you for your order! Your order has been confirmed.</p>
                        
                        <h3>Order Details</h3>
                        <p><strong>Order ID:</strong> #${orderId}</p>
                        <p><strong>Order Date:</strong> ${new Date().toLocaleString()}</p>
                        
                        <h3>Items Ordered</h3>
                        <table style="width: 100%; border-collapse: collapse;">
                            <thead>
                                <tr style="background: #f5f5f5;">
                                    <th style="padding: 8px; text-align: left;">Item</th>
                                    <th style="padding: 8px; text-align: center;">Qty</th>
                                    <th style="padding: 8px; text-align: right;">Price</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${orderItemsHtml}
                            </tbody>
                            <tfoot>
                                <tr style="background: #fff0e8;">
                                    <td colspan="2" style="padding: 8px; text-align: right;"><strong>Grand Total:</strong></td>
                                    <td style="padding: 8px; text-align: right;"><strong>₹${grandTotal}</strong></td>
                                </tr>
                            </tfoot>
                        </table>
                        
                        <h3>Delivery Address</h3>
                        <p>
                            ${orderDetails.deliveryInfo.houseNo},<br>
                            ${orderDetails.deliveryInfo.address},<br>
                            ${orderDetails.deliveryInfo.landmark},<br>
                            ${orderDetails.deliveryInfo.city}
                        </p>
                        
                        <h3>Payment Method</h3>
                        <p>${orderDetails.paymentMethod === 'COD' ? 'Cash on Delivery' : 'Pay on Delivery'}</p>
                        
                        <p style="margin-top: 30px; color: #666; font-size: 12px;">
                            Track your order status by logging into your account.<br>
                            For queries: support@mizominute.com
                        </p>
                    </div>
                </div>
            `
        };
        
        // Send email
        const info = await transporter.sendMail(mailOptions);
        console.log(`✅ Email sent to ${customerEmail}`, info.messageId);
        
        // Optional: Send admin notification
        const adminMailOptions = {
            from: `"MizoMinute" <${process.env.EMAIL_USER}>`,
            to: process.env.ADMIN_EMAIL || process.env.EMAIL_USER,
            subject: `New Order #${orderId} - ${customerName}`,
            html: `<h2>New order from ${customerName}</h2>
                   <p>Order ID: #${orderId}</p>
                   <p>Total: ₹${grandTotal}</p>
                   <p>View in admin panel for details.</p>`
        };
        
        await transporter.sendMail(adminMailOptions).catch(e => console.log('Admin email optional:', e.message));
        
        res.json({ 
            success: true, 
            message: 'Email sent successfully',
            messageId: info.messageId
        });
        
    } catch (error) {
        console.error('❌ Email sending failed:', error);
        res.status(500).json({ 
            success: false, 
            error: error.message 
        });
    }
});

// Health check endpoint
app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Start server
app.listen(PORT, () => {
    console.log(`🚀 Server running on http://localhost:${PORT}`);
    console.log(`📧 Email endpoint: http://localhost:${PORT}/api/send-order-email`);
    console.log(`🔍 Health check: http://localhost:${PORT}/api/health`);
});