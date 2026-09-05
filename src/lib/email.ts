import nodemailer from 'nodemailer';

export const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || "smtp.gmail.com",
  port: parseInt(process.env.SMTP_PORT || "587"),
  secure: process.env.SMTP_SECURE === "true",
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

export async function sendOTP(to: string, otp: string) {
  const mailOptions = {
    from: process.env.EMAIL_FROM,
    to,
    subject: "Your DealFlow360 Verification Code",
    text: `Your verification code is: ${otp}\n\nThis code will expire in 15 minutes.`,
    html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>DealFlow360 Verification</h2>
        <p>Your verification code is:</p>
        <h1 style="font-size: 36px; letter-spacing: 4px; color: #2563eb;">${otp}</h1>
        <p>This code will expire in 15 minutes.</p>
      </div>
    `,
  };

  await transporter.sendMail(mailOptions);
}
