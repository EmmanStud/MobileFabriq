# EmailJS Setup Guide - Send Real Gmail Emails

Complete step-by-step guide to set up EmailJS for sending real verification emails via Gmail.

## 🎯 Quick Overview

EmailJS lets you send emails directly from your app without a backend server. Free tier: **200 emails/month**.

---

## 📋 Step-by-Step Setup

### Step 1: Install EmailJS Package

```bash
npm install @emailjs/browser
```

Or if using yarn:
```bash
yarn add @emailjs/browser
```

### Step 2: Create EmailJS Account

1. Go to **https://www.emailjs.com/**
2. Click **Sign Up** (top right)
3. Sign up with:
   - Email address
   - Password
   - Or use Google account
4. Verify your email address

### Step 3: Connect Gmail Account

1. After login, go to **Email Services** (left sidebar)
2. Click **Add New Service**
3. Choose **Gmail** (or your preferred email provider)
4. Click **Connect Account**
5. Sign in with your Gmail account
6. Allow EmailJS to send emails on your behalf
7. **Save your Service ID** (you'll need this later)

**Note**: The Service ID looks like: `service_xxxxxxxxx`

### Step 4: Create Email Template

1. Go to **Email Templates** (left sidebar)
2. Click **Create New Template**
3. Fill in:

   **Template Name**: `Verification Code`
   
   **Subject**: `Hannah Vanessa - Verification Code`
   
   **Content**:
   ```
   Hello,
   
   Your verification code for Hannah Vanessa Boutique is:
   
   {{verification_code}}
   
   This code will expire in 10 minutes.
   
   If you didn't request this code, please ignore this email.
   
   Best regards,
   Hannah Vanessa Boutique
   ```

4. **Important**: Make sure to use these exact variable names:
   - `{{to_email}}` - for recipient email
   - `{{verification_code}}` - for the 6-digit code
   - `{{from_name}}` - for sender name (optional)

5. Click **Save**
6. **Save your Template ID** (you'll need this later)

**Note**: The Template ID looks like: `template_xxxxxxxxx`

### Step 5: Get Your Public Key

1. Go to **Account** (left sidebar) > **General**
2. Find **Public Key** section
3. Click **Copy** to copy your Public Key

**Note**: The Public Key looks like: `xxxxxxxxxxxxxxxxxxxxx`

### Step 6: Update Your Code

1. Open `mobcaps/services/emailService.js`
2. Find the `EMAILJS_CONFIG` object (around line 25)
3. Fill in your credentials:

```javascript
const EMAILJS_CONFIG = {
  PUBLIC_KEY: 'your_public_key_here',        // From Account > General
  SERVICE_ID: 'service_xxxxxxxxx',            // From Email Services
  TEMPLATE_ID: 'template_xxxxxxxxx',          // From Email Templates
  ENABLED: true,                              // Change to true!
};
```

**Example:**
```javascript
const EMAILJS_CONFIG = {
  PUBLIC_KEY: 'a1b2c3d4e5f6g7h8i9j0',
  SERVICE_ID: 'service_abc123',
  TEMPLATE_ID: 'template_xyz789',
  ENABLED: true,
};
```

### Step 7: Test It!

1. **Restart your app** (stop and start again)
2. Try **signing up** with a real Gmail address
3. Check the **email inbox** for the verification code
4. Check **console** for any errors

---

## ✅ Verification Checklist

Before testing, make sure:

- [ ] EmailJS package installed (`npm install @emailjs/browser`)
- [ ] EmailJS account created and verified
- [ ] Gmail service connected in EmailJS
- [ ] Email template created with correct variables
- [ ] All three credentials filled in `emailService.js`:
  - [ ] PUBLIC_KEY
  - [ ] SERVICE_ID
  - [ ] TEMPLATE_ID
- [ ] ENABLED set to `true`
- [ ] App restarted after changes

---

## 🐛 Troubleshooting

### "EmailJS error" in console

**Check:**
- ✅ All credentials are correct (no typos)
- ✅ Service ID starts with `service_`
- ✅ Template ID starts with `template_`
- ✅ Template variables match exactly: `{{to_email}}` and `{{verification_code}}`
- ✅ Gmail service is connected and active

### "Failed to send verification email"

**Possible causes:**
1. **EmailJS quota exceeded** (200/month free)
   - Check EmailJS dashboard > Usage
   - Upgrade plan or wait for next month

2. **Gmail service disconnected**
   - Go to Email Services in EmailJS
   - Reconnect Gmail if needed

3. **Template variables wrong**
   - Check template uses: `{{to_email}}` and `{{verification_code}}`
   - Variable names are case-sensitive

4. **Public Key wrong**
   - Get fresh key from Account > General
   - Make sure no extra spaces

### Email not received

**Check:**
- ✅ Check **Spam/Junk** folder
- ✅ Verify email address is correct
- ✅ Check EmailJS dashboard > Logs for errors
- ✅ Wait a few seconds (emails can take 10-30 seconds)

### Still in test mode

**Check:**
- ✅ `ENABLED: true` in config
- ✅ All three credentials filled
- ✅ App restarted after changes
- ✅ Check console for EmailJS errors

---

## 📊 Check EmailJS Dashboard

After sending emails, you can:

1. **View logs**: EmailJS dashboard > Logs
   - See all sent emails
   - Check for errors
   - View delivery status

2. **Check usage**: Dashboard shows emails sent this month
   - Free tier: 200/month
   - Upgrade if needed

3. **Test email**: Use EmailJS dashboard > Test to send test email

---

## 🔒 Security Notes

- ✅ Public Key is safe to use in frontend (it's public)
- ✅ Never share your Service ID or Template ID publicly
- ✅ EmailJS handles email sending securely
- ✅ No backend server needed

---

## 💡 Tips

1. **Test first**: Send a test email from EmailJS dashboard before using in app
2. **Check logs**: Always check EmailJS logs if emails aren't working
3. **Template design**: You can customize the email template HTML
4. **Rate limits**: Free tier has rate limits, upgrade for production

---

## 🎉 Success!

Once configured, your app will:
- ✅ Send real verification emails via Gmail
- ✅ Users receive codes in their inbox
- ✅ No backend server needed
- ✅ Works immediately after setup

---

**Need help?** Check EmailJS documentation: https://www.emailjs.com/docs/

