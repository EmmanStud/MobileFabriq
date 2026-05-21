# EmailJS Configuration Guide

## EmailJS Account Setup (5 Minutes)

### Step 1: Create Free Account
1. Go to https://www.emailjs.com/
2. Click "Sign Up Free"
3. Use Gmail to sign up (recommended)
4. Verify your email

### Step 2: Add Email Service
1. Dashboard → Click "Email Services" (or "Add Service")
2. Select provider:
   - **Gmail** (recommended for testing)
   - Outlook
   - Yahoo
   - Other

#### For Gmail:
1. Click "Gmail"
2. Click "Link Account"
3. Sign in with your Gmail account
4. Allow access when prompted
5. Copy the **Service ID** (format: `service_xxxxx`)

**Note:** If using Gmail App Password:
1. Enable 2FA on Google account
2. Generate app-specific password
3. Use app password instead of regular password

### Step 3: Create Email Template
1. Dashboard → "Email Templates"
2. Click "Create New Template"
3. Name: "Password Reset" (or your choice)

#### Template Configuration
**Subject:**
```
Hannah Vanessa - Password Reset Code
```

**HTML Content:**
```html
<!DOCTYPE html>
<html>
<head>
    <style>
        body {
            font-family: Arial, sans-serif;
            background-color: #f5f5f5;
            padding: 20px;
        }
        .container {
            max-width: 500px;
            margin: 0 auto;
            background-color: white;
            padding: 30px;
            border-radius: 8px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        }
        .header {
            text-align: center;
            margin-bottom: 30px;
        }
        .logo {
            font-size: 28px;
            font-weight: bold;
            color: #1a1a1a;
            font-family: serif;
        }
        .content {
            color: #333;
            line-height: 1.6;
            margin-bottom: 30px;
        }
        .code-box {
            background-color: #f0f0f0;
            border-left: 4px solid #6B5D4F;
            padding: 15px;
            margin: 20px 0;
            text-align: center;
        }
        .code {
            font-size: 32px;
            font-weight: bold;
            letter-spacing: 5px;
            color: #1a1a1a;
            font-family: monospace;
        }
        .warning {
            background-color: #fff3cd;
            border: 1px solid #ffc107;
            padding: 12px;
            border-radius: 4px;
            margin: 20px 0;
            font-size: 14px;
            color: #856404;
        }
        .footer {
            border-top: 1px solid #eee;
            padding-top: 20px;
            font-size: 12px;
            color: #999;
            text-align: center;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <div class="logo">Hannah Vanessa</div>
            <p style="color: #6B5D4F; margin-top: 5px;">Boutique</p>
        </div>

        <div class="content">
            <p>Hello,</p>
            <p>You requested a password reset for your Hannah Vanessa account. Use the code below to reset your password:</p>

            <div class="code-box">
                <div class="code">{{verification_code}}</div>
            </div>

            <div class="warning">
                <strong>⏰ Important:</strong> This code expires in 15 minutes. If you didn't request this, please ignore this email.
            </div>

            <p>If you have any questions, please don't hesitate to contact us.</p>

            <p>Best regards,<br>
            <strong>Hannah Vanessa Team</strong></p>
        </div>

        <div class="footer">
            <p>© 2026 Hannah Vanessa Boutique. All rights reserved.</p>
            <p><a href="mailto:contact@hannahvanessa.com">contact@hannahvanessa.com</a></p>
        </div>
    </div>
</body>
</html>
```

**Template Variables Used:**
- `{{verification_code}}` - 6-digit reset code
- `{{to_email}}` - Recipient email (auto-filled by EmailJS)

4. Click "Save"
5. Copy the **Template ID** (format: `template_xxxxx`)

### Step 4: Get Your Credentials
1. Account Settings (top right) → "General"
2. Copy **Public Key** (format: `xxxxxxxxxxxxxxx`)

You now have:
- ✅ Public Key
- ✅ Service ID
- ✅ Template ID

### Step 5: Update Configuration File
In `services/emailService.js`:

```javascript
const EMAILJS_CONFIG = {
  PUBLIC_KEY: 'Jjn03sX_4VJbULO-Y',        // Your Public Key
  SERVICE_ID: 'service_mg7qfxd',          // Your Service ID
  TEMPLATE_ID: 'template_67j9i2m',        // Your Template ID
  ENABLED: true,                          // ← Set to true
};

const TEST_MODE = false;                  // ← Set to false to use EmailJS
```

---

## Template Variables Reference

| Variable | Description | Example | Set By |
|----------|-------------|---------|--------|
| `{{to_email}}` | Recipient email | user@gmail.com | EmailJS (automatic) |
| `{{verification_code}}` | 6-digit reset code | 123456 | App sends in template params |
| `{{from_name}}` | Sender name | Hannah Vanessa Boutique | App sends in template params |
| `{{subject}}` | Email subject | Hannah Vanessa - Password Reset Code | Template name |

---

## How Code Sends Email

### In Home.jsx
```javascript
// Step 1: Generate code
const result = await passwordResetService.generateResetCode(email);

// Step 2: Send via EmailJS
await sendPasswordResetEmail(result.email, result.code);
// This calls emailService.sendPasswordResetEmail()
```

### In emailService.js
```javascript
export const sendPasswordResetEmail = async (email, code) => {
  try {
    if (EMAILJS_CONFIG.ENABLED && EMAILJS_CONFIG.PUBLIC_KEY && ...) {
      // EmailJS is enabled
      await emailjs.send(
        EMAILJS_CONFIG.SERVICE_ID,
        EMAILJS_CONFIG.TEMPLATE_ID,
        {
          to_email: email,                    // ← fills {{to_email}}
          verification_code: code,             // ← fills {{verification_code}}
          from_name: 'Hannah Vanessa Boutique', // ← fills {{from_name}}
          subject: 'Hannah Vanessa - Password Reset Code', // ← subject
        },
        EMAILJS_CONFIG.PUBLIC_KEY
      );
    }
  } catch (error) {
    // Handle error
  }
};
```

---

## Email Service Providers

### Gmail (Recommended)
✅ **Pros:**
- Free
- Reliable
- No configuration needed
- Good deliverability

❌ **Cons:**
- May require App Password
- Some spam filter restrictions

**Setup:**
1. EmailJS → Email Services → Gmail
2. Click "Link Account"
3. OAuth 2.0 authentication
4. Done!

### Outlook
✅ **Pros:**
- Professional
- Good for business emails

❌ **Cons:**
- May require more setup
- OAuth configuration needed

**Setup:**
1. EmailJS → Email Services → Outlook
2. Click "Link Account"
3. Sign in with Outlook account

### Custom SMTP
✅ **Pros:**
- Full control
- Custom domain email

❌ **Cons:**
- More setup required
- Need SMTP credentials

**Setup:**
1. EmailJS → Email Services → Other SMTP
2. Enter SMTP server details:
   - Host
   - Port (usually 587 or 465)
   - Username
   - Password
   - From email

---

## Testing EmailJS Configuration

### Test 1: Verify Service is Active
1. Dashboard → "Email Services"
2. Check if service shows "Connected" status
3. Green indicator = working

### Test 2: Send Test Email
1. Dashboard → "Email Templates"
2. Click your template → "Test"
3. Fill test variables
4. Click "Send Email"
5. Check your inbox

### Test 3: Check Quotas
1. Dashboard → "Settings"
2. View monthly email limit
3. Free plan: 200 emails/month
4. Check remaining quota

### Test 4: View Sending Logs
1. Dashboard → "Activity"
2. See all emails sent/failed
3. Check error messages for debugging

---

## Troubleshooting

### Issue: Emails Not Sending
**Solution:**
1. Check ENABLED is `true`
2. Verify credentials are correct
3. Check EmailJS dashboard for errors
4. Verify email service is "Connected"
5. Check sending quota not exceeded

### Issue: "Service not found"
**Solution:**
- Copy exact Service ID from EmailJS dashboard
- Make sure SERVICE_ID starts with "service_"

### Issue: "Template not found"
**Solution:**
- Copy exact Template ID from EmailJS dashboard
- Make sure TEMPLATE_ID starts with "template_"

### Issue: "Invalid public key"
**Solution:**
- Copy exact Public Key from account settings
- Make sure it's the Public Key, not Public ID

### Issue: Gmail Not Connecting
**Solution:**
Option 1 - Use App Password:
1. Enable 2FA on Google account
2. Generate app-specific password
3. In EmailJS, use app password instead
4. Re-authenticate

Option 2 - Allow Less Secure Apps:
1. Google Account Settings
2. Security → "Less secure app access"
3. Toggle ON
4. Re-authenticate in EmailJS

### Issue: Emails Going to Spam
**Solution:**
1. Check sender email is verified
2. Configure SPF/DKIM records (for custom domain)
3. Use professional template design
4. Avoid spam trigger words
5. Test with major email providers

---

## Email Quota Management

### Free Plan Limits
- **Monthly Limit:** 200 emails
- **Per-day Limit:** None specified
- **Rate Limit:** No hard limit

### Upgrade Plans
- **Starter:** $5/month - 10,000 emails
- **Professional:** $25/month - 100,000 emails
- **Enterprise:** Custom

### Monitor Usage
1. Dashboard → "Settings"
2. View current month emails sent
3. View quota percentage used

### Optimize Usage
- Only send when necessary
- Batch similar emails
- Test in TEST_MODE first
- Monitor failed sends

---

## Production Best Practices

1. **Use Custom Domain Email**
   - Instead of gmail.com
   - Better deliverability
   - Professional appearance

2. **Set Up SPF/DKIM**
   - Improves email authentication
   - Reduces spam classification
   - Follow provider instructions

3. **Template Design**
   - Mobile-responsive
   - Professional branding
   - Clear call-to-action

4. **Error Handling**
   - Log failed sends
   - Retry on failure
   - Alert admin on critical failures

5. **User Experience**
   - Informative error messages
   - Resend code option
   - Clear expiry timing

6. **Security**
   - HTTPS only
   - Secure API keys
   - Rate limit code requests
   - Validate all inputs

---

## Switching from Test Mode to Production

### Checklist
- [ ] EmailJS account created
- [ ] Email service connected
- [ ] Template created with variables
- [ ] Public Key copied to config
- [ ] Service ID copied to config
- [ ] Template ID copied to config
- [ ] ENABLED set to true
- [ ] TEST_MODE set to false
- [ ] Backend reset password endpoint ready
- [ ] Tested email sending with real email
- [ ] Verified emails received in inbox
- [ ] Checked template rendering looks good

### Rollback to Test Mode
If there are issues, temporarily switch back:
```javascript
const TEST_MODE = true;  // Enable test mode
const EMAILJS_CONFIG = {
  ENABLED: false,        // Disable EmailJS
};
```

All codes will print to console for testing.
