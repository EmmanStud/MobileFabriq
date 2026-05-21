# EmailJS Variable Not Rendering - Root Cause & Fix

## 🔴 The Problem

Your EmailJS template uses `{{reset_code}}`, but the system was sending it as `verification_code`.

```
Template says:          {{reset_code}}
System was sending:     verification_code: "123456"
Result:                 ❌ Variable doesn't render (doesn't match)
```

## ✅ What Was Fixed

### 1. Updated emailConfig.js

**Before:**
```javascript
PASSWORD_RESET: {
  VARIABLES: {
    CODE: 'verification_code',  // ❌ Wrong name
  }
}
```

**After:**
```javascript
PASSWORD_RESET: {
  VARIABLES: {
    CODE: 'reset_code',  // ✅ Matches {{reset_code}} in template
  }
}
```

### 2. Added Debug Logging to emailService.js

Now when email is sent, console shows exactly what's being passed:

```
📤 Sending email with variables:
{
  to_email: "user@gmail.com",
  reset_code: "123456",        // ✅ This key must match {{reset_code}} in template
  from_name: "Hannah Vanessa Boutique",
  subject: "Reset Your Password"
}

📋 Template ID: template_q2v5s8a
📋 Variable mapping (PASSWORD_RESET): {
  TO_EMAIL: 'to_email',
  CODE: 'reset_code',
  FROM_NAME: 'from_name',
  SUBJECT: 'subject'
}
```

## 🔍 How to Verify in EmailJS Dashboard

### Step 1: Check Your Template Variables

Go to EmailJS Dashboard → Email Templates → `template_q2v5s8a`

Look for your template body:

```html
<h2>Reset Your Password</h2>
<p>Your verification code is:</p>
<h1>{{reset_code}}</h1>
```

**Variable names inside {{ }} must EXACTLY match** the keys you send in `emailjs.send()`.

### Step 2: Check Variable Case Sensitivity

❌ **Wrong:**
```html
{{Reset_Code}}     <!-- Capital R and C -->
{{resetCode}}      <!-- camelCase -->
{{reset Code}}     <!-- Space in middle -->
```

✅ **Correct:**
```html
{{reset_code}}     <!-- Lowercase with underscore -->
```

### Step 3: Verify the Send Parameters

EmailJS requires exact match between:

1. **Template variable name:** `{{reset_code}}`
2. **JavaScript object key:** `reset_code: "123456"`

```javascript
// ✅ Correct
emailjs.send(serviceId, templateId, {
  reset_code: "123456"  // Key matches {{reset_code}}
})

// ❌ Wrong
emailjs.send(serviceId, templateId, {
  verification_code: "123456"  // Doesn't match {{reset_code}}
})
```

## 🛠️ Common Mistakes That Break EmailJS Variables

| Mistake | Example | Result |
|---------|---------|--------|
| **Case mismatch** | Template: `{{reset_code}}`<br/>Send: `RESET_CODE` | Variable empty ❌ |
| **Typo in variable name** | Template: `{{reset_code}}`<br/>Send: `reset_cod` | Variable empty ❌ |
| **Extra spaces** | Template: `{{ reset_code }}`<br/>Send: `reset_code` | Might not work ⚠️ |
| **Wrong key name** | Template: `{{resetCode}}`<br/>Send: `reset_code` | Variable empty ❌ |
| **Forgetting to send it** | Template: `{{reset_code}}`<br/>Send: `{email: "..."}` | Variable missing ❌ |

## 📋 Current Setup (Correct)

### emailConfig.js
```javascript
PASSWORD_RESET: {
  ID: 'template_q2v5s8a',
  VARIABLES: {
    TO_EMAIL: 'to_email',
    CODE: 'reset_code',     // Maps to {{reset_code}} in template
    FROM_NAME: 'from_name',
    SUBJECT: 'subject'
  }
}
```

### emailService.js
```javascript
const emailData = {
  [template.VARIABLES.TO_EMAIL]: email,           // to_email: "user@gmail.com"
  [template.VARIABLES.CODE]: code,                // reset_code: "123456"
  [template.VARIABLES.FROM_NAME]: 'Hannah Vanessa Boutique',
  [template.VARIABLES.SUBJECT]: 'Reset Your Password'
};

emailjs.send(SERVICE_ID, template.ID, emailData, PUBLIC_KEY);
```

**Result:** `reset_code: "123456"` gets inserted into `{{reset_code}}` ✅

## 🧪 How to Test

1. Open browser console (F12)
2. Click "Forgot Password" in your app
3. Enter email, click "Send Code"
4. Check console output:

```
📤 Sending email with variables: {
  to_email: "your.email@gmail.com",
  reset_code: "123456",           // ← This should appear
  from_name: "Hannah Vanessa Boutique",
  subject: "Reset Your Password"
}
📋 Template ID: template_q2v5s8a
📋 Variable mapping (PASSWORD_RESET): {
  TO_EMAIL: "to_email",
  CODE: "reset_code",             // ← Should be "reset_code", not "verification_code"
  FROM_NAME: "from_name",
  SUBJECT: "subject"
}
✅ Password Reset Verification email sent to: your.email@gmail.com
```

5. Check your Gmail inbox
6. Email should now have the reset code visible ✅

## ⚡ If It Still Doesn't Work

### Checklist:

- [ ] EmailJS dashboard shows template with `{{reset_code}}`
- [ ] Console shows `reset_code: "123456"` in "Sending email with variables"
- [ ] No typos in template variable names
- [ ] Capitals/underscores match exactly
- [ ] EmailJS is not in TEST_MODE (emailConfig.js: `TEST_MODE: false`)
- [ ] EmailJS credentials are correct in emailConfig.js
- [ ] Email template is published in EmailJS dashboard

### Debug Steps:

1. **Log template object in emailService.js:**
   ```javascript
   console.log('Template config:', template);
   ```

2. **Verify variable name mapping:**
   ```javascript
   console.log('CODE variable name:', template.VARIABLES.CODE);
   console.log('Actual email data:', emailData);
   ```

3. **Check EmailJS dashboard template source:**
   - Copy exact variable name from template HTML
   - Paste into emailConfig.js VARIABLES object

## 📞 EmailJS Support Tips

- EmailJS variables must start with `{{` and end with `}}`
- Variable names are case-sensitive
- Spaces inside `{{ }}` can cause issues
- Always test with "Test send" in EmailJS dashboard first
- Check spam folder if email doesn't appear in inbox

---

**Your setup is now fixed!** The password reset emails should now show the code. ✅
