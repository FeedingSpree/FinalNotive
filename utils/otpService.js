// utils/otpService.js
import { supabase } from './supabase';
import { openInbox } from 'react-native-email-link';
import { Linking } from 'react-native';

// Generate a random 6-digit OTP
export const generateOTP = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

// Store OTP in Supabase
export const storeOTP = async (email, otp) => {
  // Set expiration to 10 minutes from now
  const expiresAt = new Date();
  expiresAt.setMinutes(expiresAt.getMinutes() + 10);
  
  try {
    // First, clear any existing OTPs for this email
    await supabase
      .from('otp_codes')
      .delete()
      .eq('email', email);
      
    // Then, insert the new OTP
    const { error } = await supabase
      .from('otp_codes')
      .insert([
        { 
          email, 
          code: otp,
          expires_at: expiresAt.toISOString()
        }
      ]);
      
    if (error) throw error;
    return true;
  } catch (error) {
    console.error('Error storing OTP:', error);
    return false;
  }
};

// Verify OTP from Supabase
export const verifyOTP = async (email, code) => {
  try {
    // Get the OTP record
    const { data, error } = await supabase
      .from('otp_codes')
      .select('*')
      .eq('email', email)
      .eq('code', code)
      .gt('expires_at', new Date().toISOString())
      .single();
      
    if (error || !data) {
      return false;
    }
    
    // Delete the used OTP
    await supabase
      .from('otp_codes')
      .delete()
      .eq('id', data.id);
      
    return true;
  } catch (error) {
    console.error('Error verifying OTP:', error);
    return false;
  }
};

// Open email app with OTP info
export const sendOTPEmail = async (email, otp) => {
  // Always log to console for development/debugging
  console.log(`[DEVELOPMENT] OTP for ${email}: ${otp}`);
  
  try {
    // Create a mailto link with the OTP
    const subject = encodeURIComponent('Your Verification Code');
    const body = encodeURIComponent(`Your verification code is: ${otp}\n\nThis code will expire in 10 minutes.`);
    const mailtoLink = `mailto:${email}?subject=${subject}&body=${body}`;
    
    // Open the email app with the link
    const canOpen = await Linking.canOpenURL(mailtoLink);
    if (canOpen) {
      await Linking.openURL(mailtoLink);
    } else {
      // Try to open inbox as a fallback
      await openInbox();
    }
    
    return true;
  } catch (error) {
    console.error('Error opening email app:', error);
    // Return true anyway so the flow continues with console logs
    return true;
  }
};