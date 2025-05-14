// utils/otpService.js - Revert to original
import { supabase } from './supabase';
import { Alert, Clipboard } from 'react-native';

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

// Simple development-only OTP display
export const sendOTPEmail = async (email, otp) => {
  // Log to console
  console.log(`[DEVELOPMENT] OTP for ${email}: ${otp}`);
  
  // Copy to clipboard for easier testing
  try {
    Clipboard.setString(otp);
  } catch (e) {
    console.error('Could not copy to clipboard:', e);
  }
  
  // Show in alert
  Alert.alert(
    "Development Mode",
    `Your verification code is: ${otp}\n\nThis code has been copied to your clipboard.\n\nIn production, this would be sent to: ${email}`,
    [{ text: "OK" }]
  );
  
  return true;
};