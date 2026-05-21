# Forgot Password - Quick Usage Examples

## Basic Usage Flow

### 1. User Clicks "Forgot Password?" Link
```javascript
// In Home.jsx login screen
<TouchableOpacity
  style={styles.forgotPasswordLink}
  onPress={() => {
    setAuthMode('forgotPassword');
    setForgotPasswordForm({ email: '', code: '', newPassword: '', confirmPassword: '', step: 'email' });
    setErrors({});
  }}
>
  <Text style={styles.forgotPasswordText}>Forgot Password?</Text>
</TouchableOpacity>
```

### 2. User Enters Email and Clicks "Send Code"
```javascript
// Form state
const [forgotPasswordForm, setForgotPasswordForm] = useState({
  email: 'user@gmail.com',
  code: '',
  newPassword: '',
  confirmPassword: '',
  step: 'email'
});

// Handler
const handleForgotPasswordEmail = async () => {
  setErrors({});
  
  // Step 1: Validate email
  const emailError = resetValidators.email(forgotPasswordForm.email);
  if (emailError) {
    setErrors({ email: emailError });
    return;
  }

  // Step 2: Generate reset code
  setIsLoading(true);
  const result = await passwordResetService.generateResetCode(forgotPasswordForm.email);
  
  if (result.success) {
    // Step 3: Send code via email
    await sendPasswordResetEmail(result.email, result.code);
    
    // Step 4: Move to code verification step
    setForgotPasswordForm(prev => ({ ...prev, step: 'code' }));
    setAuthMessage('CHECK YOUR EMAIL FOR THE RESET CODE');
  } else {
    setErrors({ email: result.error });
  }
  
  setIsLoading(false);
};
```

### 3. User Enters Code and Clicks "Verify Code"
```javascript
// Form state updated
const [forgotPasswordForm, setForgotPasswordForm] = useState({
  email: 'user@gmail.com',
  code: '123456',        // User entered this
  newPassword: '',
  confirmPassword: '',
  step: 'code'
});

// Handler
const handleForgotPasswordCode = async () => {
  setErrors({});
  
  // Step 1: Validate code format
  const codeError = resetValidators.resetCode(forgotPasswordForm.code);
  if (codeError) {
    setErrors({ code: codeError });
    return;
  }

  // Step 2: Verify code with backend
  setIsLoading(true);
  const result = await passwordResetService.verifyResetCode(
    forgotPasswordForm.email,
    forgotPasswordForm.code
  );
  
  if (result.success) {
    // Step 3: Move to password reset step
    setForgotPasswordForm(prev => ({ ...prev, step: 'reset' }));
    setAuthMessage('CODE VERIFIED. ENTER YOUR NEW PASSWORD');
  } else {
    // Code invalid or expired
    setErrors({ code: result.error });
  }
  
  setIsLoading(false);
};
```

### 4. User Sets New Password and Clicks "Reset Password"
```javascript
// Form state updated
const [forgotPasswordForm, setForgotPasswordForm] = useState({
  email: 'user@gmail.com',
  code: '123456',
  newPassword: 'NewPassword123!',          // User entered this
  confirmPassword: 'NewPassword123!',      // Must match
  step: 'reset'
});

// Handler
const handleForgotPasswordReset = async () => {
  setErrors({});
  
  // Step 1: Validate new password strength
  const passwordError = resetValidators.newPassword(forgotPasswordForm.newPassword);
  const confirmError = resetValidators.confirmPassword(
    forgotPasswordForm.confirmPassword,
    forgotPasswordForm.newPassword
  );
  
  if (passwordError || confirmError) {
    setErrors({ newPassword: passwordError, confirmPassword: confirmError });
    return;
  }

  // Step 2: Send reset to backend
  setIsLoading(true);
  const result = await passwordResetService.resetPassword(
    forgotPasswordForm.email,
    forgotPasswordForm.newPassword
  );
  
  if (result.success) {
    // Step 3: Show success modal
    setSuccessModal(true);
    
    // Step 4: Auto-redirect after 3 seconds
    setTimeout(() => {
      setForgotPasswordForm({ email: '', code: '', newPassword: '', confirmPassword: '', step: 'email' });
      setAuthMode('login');
      setSuccessModal(false);
      setErrors({});
    }, 3000);
  } else {
    setErrors({ general: result.error });
  }
  
  setIsLoading(false);
};
```

---

## Testing Scenarios

### Scenario 1: Happy Path (Success)
```
Email: user@gmail.com ✓
Code: 123456 ✓
New Password: NewPassword123! ✓
Result: ✓ Success Modal → Auto-redirect to login
```

### Scenario 2: Email Not Found
```
Email: notregistered@gmail.com
→ Error: "EMAIL NOT FOUND IN OUR SYSTEM"
→ User stays on email step
```

### Scenario 3: Invalid Code
```
Email: user@gmail.com ✓
Code: 000000 (wrong)
→ Error: "INVALID CODE. PLEASE TRY AGAIN"
→ User stays on code step
```

### Scenario 4: Code Expired
```
Email: user@gmail.com ✓
Code: 123456 (but 16 minutes have passed)
→ Error: "CODE EXPIRED. PLEASE REQUEST A NEW ONE"
→ User must restart (go back to email step)
```

### Scenario 5: Weak Password
```
Email: user@gmail.com ✓
Code: 123456 ✓
New Password: short
→ Error: "MINIMUM 8 CHARACTERS REQUIRED"
→ User stays on reset step
```

### Scenario 6: Password Mismatch
```
Email: user@gmail.com ✓
Code: 123456 ✓
New Password: NewPassword123!
Confirm Password: DifferentPassword123!
→ Error: "PASSWORDS DO NOT MATCH"
→ User stays on reset step
```

---

## Component Integration

### Step 1 Form Rendering
```jsx
{authMode === 'forgotPassword' && forgotPasswordForm.step === 'email' && (
  <View style={styles.inputGroup}>
    <Text style={styles.inputLabel}>EMAIL ADDRESS</Text>
    <TextInput
      style={[styles.authInput, errors.email && styles.inputErrorBorder]}
      placeholder="example@gmail.com"
      value={forgotPasswordForm.email}
      onChangeText={(val) => {
        setForgotPasswordForm({ ...forgotPasswordForm, email: val });
      }}
    />
    {errors.email && <Text style={styles.warningText}>{errors.email}</Text>}
  </View>
)}
```

### Button Text Changes By Step
```jsx
<TouchableOpacity 
  style={[styles.authSubmitBtn, isLoading && styles.authSubmitBtnDisabled]} 
  onPress={handleAction}
  disabled={isLoading}
>
  <Text style={styles.authSubmitText}>
    {isLoading ? 'PLEASE WAIT...' : authMode === 'forgotPassword' ? (
      forgotPasswordForm.step === 'email' ? 'SEND CODE' :
      forgotPasswordForm.step === 'code' ? 'VERIFY CODE' :
      'RESET PASSWORD'
    ) : 'SIGN IN'}
  </Text>
</TouchableOpacity>
```

### Success Modal
```jsx
<Modal visible={successModal} transparent animationType="fade">
  <View style={styles.successOverlay}>
    <View style={styles.successModalBox}>
      <Text style={styles.successTitle}>✓ Success!</Text>
      <Text style={styles.successMessage}>
        Your password has been reset successfully.
      </Text>
      <Text style={styles.successSubtext}>
        You can now log in with your new password.
      </Text>
    </View>
  </View>
</Modal>
```

---

## Test Mode Console Output

When in test mode (development), you'll see:

```
========================================
📧 PASSWORD RESET EMAIL (TEST MODE)
========================================
To: user@gmail.com
Subject: Hannah Vanessa - Password Reset Code
Code: 427815
========================================

🔐 Reset code generated for user@gmail.com: 427815
✅ Reset code verified for user@gmail.com
✅ Password reset successfully for user@gmail.com
```

---

## Common Validation Patterns

### Email Validation
```javascript
const emailError = resetValidators.email(value);
// Returns: "" (valid) or error message
// Format: xxx@gmail.com only
```

### Code Validation
```javascript
const codeError = resetValidators.resetCode(value);
// Returns: "" (valid) or error message
// Format: exactly 6 digits (0-9)
```

### Password Validation
```javascript
const passwordError = resetValidators.newPassword(value);
// Returns: "" (valid) or error message
// Must have: 8+ chars, uppercase, lowercase, digit, special char

const confirmError = resetValidators.confirmPassword(confirm, original);
// Returns: "" (valid) or error message
// Must match original password exactly
```

---

## Backend Integration Example

### Node.js/Express Endpoint
```javascript
// PUT /api/users/reset-password
router.put('/reset-password', async (req, res) => {
  const { email, password } = req.body;
  
  try {
    // Find user
    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      return res.status(404).json({ 
        error: 'User not found' 
      });
    }
    
    // Password already hashed from frontend
    // Don't hash again - store as-is
    user.password = password;
    user.lastPasswordChange = new Date();
    
    await user.save();
    
    res.json({ 
      success: true, 
      message: 'Password updated successfully' 
    });
  } catch (error) {
    res.status(500).json({ 
      error: error.message 
    });
  }
});
```

---

## Full Handler Router

```javascript
const handleForgotPasswordAction = async () => {
  if (forgotPasswordForm.step === 'email') {
    await handleForgotPasswordEmail();
  } else if (forgotPasswordForm.step === 'code') {
    await handleForgotPasswordCode();
  } else if (forgotPasswordForm.step === 'reset') {
    await handleForgotPasswordReset();
  }
};

// Called by main action handler
const handleAction = async () => {
  if (authMode === 'login') {
    await handleLogin();
  } else if (authMode === 'signup') {
    await handleSignup();
  } else if (authMode === 'verify') {
    await handleVerification();
  } else if (authMode === 'forgotPassword') {
    await handleForgotPasswordAction();
  }
};
```

---

## State Reset on Navigation

```javascript
// Going back from forgot password to login
<TouchableOpacity
  style={styles.toggleAuth}
  onPress={() => {
    setAuthMode('login');
    setForgotPasswordForm({ 
      email: '', 
      code: '', 
      newPassword: '', 
      confirmPassword: '', 
      step: 'email' 
    });
    setErrors({});
  }}
>
  <Text style={styles.toggleText}>Back to Sign In</Text>
</TouchableOpacity>
```

---

## Debugging Tips

### Check Step
```javascript
console.log('Current step:', forgotPasswordForm.step);
// email | code | reset
```

### Check Errors
```javascript
console.log('Current errors:', errors);
// { email: "...", code: "...", etc }
```

### Check Loading State
```javascript
console.log('Is loading:', isLoading);
// true | false
```

### Check Form Data
```javascript
console.log('Form data:', forgotPasswordForm);
// { email: "...", code: "...", newPassword: "...", ... }
```

### View Reset Code (Test Mode)
```javascript
console.log('Reset codes:', passwordResetService.resetCodes);
// { "user@gmail.com": { code: "123456", timestamp: ..., expiresIn: ... } }
```
