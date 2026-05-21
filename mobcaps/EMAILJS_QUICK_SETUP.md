# EmailJS Quick Setup - Get Your Credentials

Based on your EmailJS dashboard, here's how to get all the credentials you need:

## 📋 Step 1: Get Your Template ID

1. In your EmailJS dashboard, you're currently in the **Email Templates** section
2. Look at the **URL** in your browser - it should look like:
   ```
   https://dashboard.emailjs.com/admin/template/xxxxxxxxx
   ```
   The `xxxxxxxxx` part is your **Template ID**
   
   OR

3. Look for a field labeled **Template ID** in the template editor
4. Copy that ID (it looks like: `template_xxxxxxxxx` or just `xxxxxxxxx`)

## 📋 Step 2: Get Your Service ID

1. Go to **Email Services** (left sidebar or top navigation)
2. Click on your Gmail service
3. You'll see a **Service ID** field
4. Copy that ID (it looks like: `service_xxxxxxxxx` or just `xxxxxxxxx`)

## 📋 Step 3: Get Your Public Key

1. Go to **Account** (top right, click your name/avatar)
2. Click **General** or **Account Settings**
3. Scroll down to find **Public Key**
4. Click **Copy** to copy your Public Key
5. It looks like: `xxxxxxxxxxxxxxxxxxxxx` (a long string)

## 📋 Step 4: Update Your Template Variables

Make sure your email template uses these **exact** variable names:

- `{{to_email}}` - for recipient email
- `{{verification_code}}` - for the 6-digit code
- `{{from_name}}` - for sender name (optional)

**Important**: Variable names are case-sensitive and must match exactly!

## 📋 Step 5: Update Your Code

1. Open `mobcaps/services/emailService.js`
2. Find the `EMAILJS_CONFIG` object (around line 39)
3. Fill in your credentials:

```javascript
const EMAILJS_CONFIG = {
  PUBLIC_KEY: 'paste_your_public_key_here',
  SERVICE_ID: 'service_xxxxxxxxx',  // or just 'xxxxxxxxx'
  TEMPLATE_ID: 'template_xxxxxxxxx', // or just 'xxxxxxxxx'
  ENABLED: true,  // ← Change this to true!
};
```

## 📋 Step 6: Test Your Template

Before using in your app, test the template:

1. In EmailJS dashboard, click **Test** button (usually at the top)
2. Fill in test values:
   - `to_email`: your email
   - `verification_code`: `123456` (test code)
3. Click **Send Test Email**
4. Check your inbox!

## ✅ Checklist

- [ ] Template ID copied
- [ ] Service ID copied  
- [ ] Public Key copied
- [ ] All three credentials pasted in `emailService.js`
- [ ] `ENABLED: true` set
- [ ] Template variables match: `{{to_email}}` and `{{verification_code}}`
- [ ] Test email sent successfully
- [ ] App restarted after changes

## 🎉 Done!

After updating the code and restarting your app, verification emails will be sent via Gmail!

