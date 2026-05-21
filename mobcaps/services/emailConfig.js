/**
 * Centralized EmailJS configuration and template registry
 * Keep credentials here (one set), and register multiple templates by key.
 */
export const EMAILJS_CONFIG = {
  // Shared credentials
  PUBLIC_KEY: 'Jjn03sX_4VJbULO-Y',
  SERVICE_ID: 'service_mg7qfxd',
  ENABLED: true, // ✅ Production enabled

  // Toggle test mode in config (preferred over local TEST_MODE var)
  TEST_MODE: false,

  // Default values
  DEFAULT_FROM_NAME: 'Hannah Vanessa Boutique',

  // Templates used across the app
  TEMPLATES: {
    SIGNUP_VERIFICATION: {
      ID: 'template_67j9i2m',
      NAME: 'Signup Verification',
      VARIABLES: {
        TO_EMAIL: 'to_email',
        CODE: 'verification_code',
        FROM_NAME: 'from_name',
        SUBJECT: 'subject'
      }
    },

    PASSWORD_RESET: {
      ID: 'template_q2v5s8a',
      NAME: 'Password Reset Verification',
      VARIABLES: {
        TO_EMAIL: 'to_email',
        CODE: 'reset_code', // ✅ Matches {{reset_code}} in your EmailJS template
        FROM_NAME: 'from_name',
        SUBJECT: 'subject'
      }
    }
  }
};

export const getTemplateConfig = (templateKey) => {
  if (!EMAILJS_CONFIG || !EMAILJS_CONFIG.TEMPLATES) return null;
  return EMAILJS_CONFIG.TEMPLATES[templateKey] || null;
};

export const validateEmailJSConfig = () => {
  if (!EMAILJS_CONFIG) return false;
  const required = ['PUBLIC_KEY', 'SERVICE_ID'];
  const missing = required.filter(k => !EMAILJS_CONFIG[k]);
  if (missing.length) {
    console.warn('EmailJS config incomplete, missing:', missing);
    return false;
  }
  return true;
};
