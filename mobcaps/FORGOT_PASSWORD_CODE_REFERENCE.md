# Forgot Password - Code Reference

## Service Functions

### passwordResetService.generateResetCode(email)
Generates a 6-digit verification code for password reset.

**Input:**
- `email` (string) - User's email address

**Returns:**
```javascript
// Success
{
  success: true,
  code: "123456",        // 6-digit code
  email: "user@gmail.com"
}

// Error
{
  success: false,
  error: "EMAIL NOT FOUND IN OUR SYSTEM"
}
```

**Example:**
```javascript
const result = await passwordResetService.generateResetCode('user@gmail.com');
if (result.success) {
  await sendPasswordResetEmail(result.email, result.code);
}
```

---

### passwordResetService.verifyResetCode(email, inputCode)
Verifies that the code entered by user matches the generated code.

**Input:**
- `email` (string) - User's email
- `inputCode` (string) - Code entered by user (6 digits)

**Returns:**
```javascript
// Success
{
  success: true,
  verified: true
}

// Errors
{
  success: false,
  error: "INVALID CODE. PLEASE TRY AGAIN"
}
// or
{
  success: false,
  error: "CODE EXPIRED. PLEASE REQUEST A NEW ONE"
}
// or
{
  success: false,
  error: "NO RESET CODE FOUND. PLEASE REQUEST A NEW ONE"
}
```

**Example:**
```javascript
const result = await passwordResetService.verifyResetCode(email, '123456');
if (result.success) {
  // Show password reset form
}
```

---

### passwordResetService.resetPassword(email, newPassword)
Updates the user's password in the database.

**Input:**
- `email` (string) - User's email
- `newPassword` (string) - New password (not hashed, will be hashed)

**Returns:**
```javascript
// Success
{
  success: true,
  message: "PASSWORD RESET SUCCESSFULLY"
}

// Error
{
  success: false,
  error: "FAILED TO RESET PASSWORD"
}
```

**Example:**
```javascript
const result = await passwordResetService.resetPassword(email, newPassword);
if (result.success) {
  // Show success modal
  // Redirect to login
}
```

---

## Validator Functions

### resetValidators.email(value)
Validates email address format.

**Returns:** Error message string or empty string if valid

```javascript
resetValidators.email('') // "THIS FIELD IS REQUIRED"
resetValidators.email('user@yahoo.com') // "PLEASE ENTER A VALID GMAIL ADDRESS"
resetValidators.email('user@gmail.com') // "" (valid)
```

---

### resetValidators.resetCode(value)
Validates reset code format (must be exactly 6 digits).

**Returns:** Error message string or empty string if valid

```javascript
resetValidators.resetCode('') // "PLEASE ENTER THE CODE"
resetValidators.resetCode('12345') // "CODE MUST BE 6 DIGITS"
resetValidators.resetCode('123456') // "" (valid)
```

---

### resetValidators.newPassword(value)
Validates new password strength.

**Returns:** Error message string or empty string if valid

**Requirements:**
- Minimum 8 characters
- At least one uppercase letter
- At least one lowercase letter
- At least one digit
- At least one special character (!@#$%^&*)

```javascript
resetValidators.newPassword('short') // "MINIMUM 8 CHARACTERS REQUIRED"
resetValidators.newPassword('password') // "MUST INCLUDE UPPERCASE LETTER"
resetValidators.newPassword('PASSWORD123') // "MUST INCLUDE LOWERCASE LETTER"
resetValidators.newPassword('Password') // "MUST INCLUDE A NUMBER"
resetValidators.newPassword('Password1') // "MUST INCLUDE A SPECIAL CHARACTER"
resetValidators.newPassword('Password1!') // "" (valid)
```

---

### resetValidators.confirmPassword(value, newPassword)
Validates that confirm password matches new password.

**Returns:** Error message string or empty string if valid

```javascript
resetValidators.confirmPassword('', 'Password1!') // "THIS FIELD IS REQUIRED"
resetValidators.confirmPassword('Different1!', 'Password1!') // "PASSWORDS DO NOT MATCH"
resetValidators.confirmPassword('Password1!', 'Password1!') // "" (valid)
```

---

## EmailJS Functions

### sendPasswordResetEmail(email, code)
Sends password reset code via EmailJS.

**Input:**
- `email` (string) - Recipient's email
- `code` (string) - 6-digit reset code

**Returns:** Promise<boolean>
- `true` if sent successfully
- `false` if failed

**Example:**
```javascript
const sent = await sendPasswordResetEmail('user@gmail.com', '123456');
if (sent) {
  console.log('Email sent successfully');
} else {
  console.log('Failed to send email');
}
```

**Note:** In test mode, code is logged to console instead of emailed.

---

## Component State Management

### forgotPasswordForm State
```javascript
const [forgotPasswordForm, setForgotPasswordForm] = useState({
  email: '',                    // User's email
  code: '',                     // 6-digit code
  newPassword: '',              // New password
  confirmPassword: '',          // Confirm new password
  step: 'email'                 // 'email' | 'code' | 'reset'
});
```

### Navigation Between Steps
```javascript
// Email → Code
setForgotPasswordForm(prev => ({ ...prev, step: 'code' }));

// Code → Reset
setForgotPasswordForm(prev => ({ ...prev, step: 'reset' }));

// Reset Complete
setForgotPasswordForm(prev => ({ ...prev, step: 'email' }));
```

---

## UI Components

### Step 1: Email Input
Shows when `forgotPasswordForm.step === 'email'`
```jsx
<TextInput
  style={[styles.authInput, errors.email && styles.inputErrorBorder]}
  placeholder="example@gmail.com"
  value={forgotPasswordForm.email}
  onChangeText={(val) => setForgotPasswordForm({ ...forgotPasswordForm, email: val })}
/>
{errors.email && <Text style={styles.warningText}>{errors.email}</Text>}
```

### Step 2: Code Input
Shows when `forgotPasswordForm.step === 'code'`
```jsx
<TextInput
  style={[styles.authInput, errors.code && styles.inputErrorBorder]}
  placeholder="000000"
  keyboardType="number-pad"
  maxLength={6}
  value={forgotPasswordForm.code}
  onChangeText={(val) => setForgotPasswordForm({ ...forgotPasswordForm, code: val })}
/>
{errors.code && <Text style={styles.warningText}>{errors.code}</Text>}
```

### Step 3: Password Reset
Shows when `forgotPasswordForm.step === 'reset'`
```jsx
<TextInput
  style={[styles.authInput, errors.newPassword && styles.inputErrorBorder]}
  placeholder="••••••••"
  secureTextEntry
  value={forgotPasswordForm.newPassword}
  onChangeText={(val) => setForgotPasswordForm({ ...forgotPasswordForm, newPassword: val })}
/>

<TextInput
  style={[styles.authInput, errors.confirmPassword && styles.inputErrorBorder]}
  placeholder="••••••••"
  secureTextEntry
  value={forgotPasswordForm.confirmPassword}
  onChangeText={(val) => setForgotPasswordForm({ ...forgotPasswordForm, confirmPassword: val })}
/>
```

### Success Modal
Shows when `successModal === true`
```jsx
<Modal visible={successModal} transparent animationType="fade">
  <View style={styles.successOverlay}>
    <View style={styles.successModalBox}>
      <Text style={styles.successTitle}>✓ Success!</Text>
      <Text style={styles.successMessage}>Your password has been reset successfully.</Text>
      <Text style={styles.successSubtext}>You can now log in with your new password.</Text>
    </View>
  </View>
</Modal>
```

---

## Error Handling Examples

### Email Validation Error
```javascript
const emailError = resetValidators.email(email);
if (emailError) {
  setErrors({ email: emailError });
  return; // Stop here, don't send code
}
```

### Code Verification Error
```javascript
const codeError = resetValidators.resetCode(code);
if (codeError) {
  setErrors({ code: codeError });
  return;
}

// If no validation error, verify with backend
const result = await passwordResetService.verifyResetCode(email, code);
if (!result.success) {
  setErrors({ code: result.error }); // Backend error
  return;
}
```

### Password Reset Error
```javascript
const passwordError = resetValidators.newPassword(newPassword);
const confirmError = resetValidators.confirmPassword(confirmPassword, newPassword);

if (passwordError || confirmError) {
  setErrors({ newPassword: passwordError, confirmPassword: confirmError });
  return;
}

// If no validation error, reset password
const result = await passwordResetService.resetPassword(email, newPassword);
if (!result.success) {
  setErrors({ general: result.error }); // Backend error
  return;
}
```

---

## Test Mode Debug

To see reset codes in test mode, check the console output:

```
========================================
📧 PASSWORD RESET EMAIL (TEST MODE)
========================================
To: user@gmail.com
Subject: Hannah Vanessa - Password Reset Code
Code: 123456
========================================
```

Copy the code and paste into app to test the verification step.

---

## API Endpoint Reference

### MongoDB Backend Endpoint
```
PUT /api/users/reset-password

Body:
{
  "email": "user@gmail.com",
  "password": "hashedPasswordFromSHA256"
}

Response Success:
{
  "success": true,
  "message": "Password updated"
}

Response Error:
{
  "error": "User not found"
}
```

This endpoint should:
1. Find user by email
2. Update password field (password already hashed)
3. Save to database
4. Return success/error

---

## Configuration Checklist

- [ ] EmailJS enabled in `emailService.js` (if using real email)
- [ ] EmailJS credentials set (PUBLIC_KEY, SERVICE_ID, TEMPLATE_ID)
- [ ] MongoDB backend `/api/users/reset-password` endpoint created
- [ ] Test mode active for development (`TEST_MODE = true`)
- [ ] "Forgot Password?" link visible in login screen
- [ ] All validation rules working
- [ ] Success modal displays correctly
- [ ] Auto-redirect to login after success
- [ ] Error messages display inline (no alerts)
