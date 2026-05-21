/**
 * Email Service
 * Handles sending verification emails
 * 
 * Options:
 * 1. EmailJS (Free tier: 200 emails/month) - No backend needed
 * 2. Backend API - More control, requires server
 * 3. Test Mode - For development (logs to console)
 */

// ============================================
// OPTION 1: EmailJS Setup (Recommended for quick setup)
// ============================================
// 1. Install: npm install @emailjs/browser
// 2. Sign up at https://www.emailjs.com/ (Free: 200 emails/month)
// 3. Create an email service (Gmail, Outlook, etc.)
// 4. Create an email template with variables: {{to_email}} and {{verification_code}}
// 5. Get your Public Key, Service ID, and Template ID from dashboard
// 6. Uncomment the import below and fill in the values:

// Import EmailJS (install with: npm install @emailjs/browser)
// Dynamic import for React Native compatibility
let emailjs = null;
try {
  emailjs = require('@emailjs/browser').default || require('@emailjs/browser');
} catch (e) {
  // EmailJS not installed yet - will use test mode
  console.warn('EmailJS not installed. Run: npm install @emailjs/browser');
}

// Use centralized config and template registry
import { EMAILJS_CONFIG, getTemplateConfig, validateEmailJSConfig } from './emailConfig';

// ============================================
// OPTION 2: Backend API
// ============================================
// Set your backend API URL here (optional)
const BACKEND_API_URL = ''; // e.g. 'https://your-api.com/api/send-verification'

// Test mode controlled by config
const TEST_MODE = EMAILJS_CONFIG && typeof EMAILJS_CONFIG.TEST_MODE !== 'undefined'
  ? EMAILJS_CONFIG.TEST_MODE
  : true;

/**
 * Send verification email
 * @param {string} email - Recipient email
 * @param {string} code - Verification code
 * @returns {Promise<boolean>} - Success status
 */
/**
 * Generic send function that accepts a template key.
 * templateKey should match a key in `EMAILJS_CONFIG.TEMPLATES` (see emailConfig.js)
 */
export const sendEmail = async (email, code, templateKey = 'SIGNUP_VERIFICATION') => {
  try {
    const template = getTemplateConfig(templateKey);
    if (!template) {
      throw new Error(`Template not found: ${templateKey}`);
    }

    // Test mode: log and return success
    if (TEST_MODE) {
      console.log('\n========================================');
      console.log(`📧 EMAIL - ${template.NAME} (TEST MODE)`);
      console.log('========================================');
      console.log(`To: ${email}`);
      console.log(`Template: ${templateKey}`);
      console.log(`Subject: ${getSubjectForTemplate(templateKey)}`);
      console.log(`Code: ${code}`);
      console.log('========================================\n');
      return true;
    }

    // Option: Backend API if configured and not test mode
    if (BACKEND_API_URL) {
      const resp = await fetch(BACKEND_API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, code, subject: getSubjectForTemplate(templateKey), templateKey })
      });
      return resp.ok;
    }

    // EmailJS (production)
    if (!EMAILJS_CONFIG || !EMAILJS_CONFIG.ENABLED) {
      console.warn('EmailJS disabled in configuration');
      return false;
    }

    if (!emailjs) {
      throw new Error('EmailJS library not installed');
    }

    const emailData = {
      [template.VARIABLES.TO_EMAIL]: email,
      [template.VARIABLES.CODE]: code,
      [template.VARIABLES.FROM_NAME]: EMAILJS_CONFIG.DEFAULT_FROM_NAME,
      [template.VARIABLES.SUBJECT]: getSubjectForTemplate(templateKey)
    };

    // Debug: Log what's being sent to EmailJS
    console.log(`📤 Sending email with variables:`, emailData);
    console.log(`📋 Template ID: ${template.ID}`);
    console.log(`📋 Variable mapping (${templateKey}):`, template.VARIABLES);

    await emailjs.send(EMAILJS_CONFIG.SERVICE_ID, template.ID, emailData, EMAILJS_CONFIG.PUBLIC_KEY);
    console.log(`✅ ${template.NAME} email sent to: ${email}`);
    return true;
  } catch (err) {
    console.error(`Email send error (${templateKey}):`, err);
    return false;
  }
};

const getSubjectForTemplate = (templateKey) => {
  const map = {
    SIGNUP_VERIFICATION: 'Verify Your Email',
    PASSWORD_RESET: 'Reset Your Password'
  };
  return map[templateKey] || 'Verification Code';
};

// Backwards compatible helper
export const sendVerificationEmail = (email, code) => sendEmail(email, code, 'SIGNUP_VERIFICATION');
export const sendPasswordResetEmail = (email, code) => sendEmail(email, code, 'PASSWORD_RESET');

/**
 * Check if email service is configured
 */
export const isEmailConfigured = () => {
  return !TEST_MODE && (BACKEND_API_URL !== '' || false); // Add EmailJS check if using
};
