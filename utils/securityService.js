// utils/securityService.js
import { supabase } from './supabase';
import { Platform } from 'react-native';
import NetInfo from '@react-native-community/netinfo';

// Record a login attempt
export const recordLoginAttempt = async (email, success) => {
  try {
    // Get device information
    const deviceInfo = {
      platform: Platform.OS,
      version: Platform.Version,
      brand: Platform.OS === 'android' ? 'Android Device' : 'iOS Device',
      timestamp: new Date().toISOString()
    };
    
    // Get IP address (simplified for development)
    let ipAddress = '0.0.0.0';
    try {
      // Attempt to get connection info
      const connectionInfo = await NetInfo.fetch();
      if (connectionInfo && connectionInfo.details && connectionInfo.details.ipAddress) {
        ipAddress = connectionInfo.details.ipAddress;
      }
    } catch (err) {
      console.log('Could not get IP address:', err);
    }
    
    // Record the attempt in Supabase
    const { error } = await supabase
      .from('login_attempts')
      .insert([{
        email,
        ip_address: ipAddress,
        device_info: JSON.stringify(deviceInfo),
        success
      }]);
      
    if (error) throw error;
    
    // If failed attempt, check for suspicious activity
    if (!success) {
      await checkSuspiciousActivity(email);
    }
    
    return true;
  } catch (error) {
    console.error('Error recording login attempt:', error);
    return false;
  }
};

// Check for suspicious login activity
export const checkSuspiciousActivity = async (email) => {
  try {
    // Get recent failed attempts
    const { data: recentAttempts, error } = await supabase
      .from('login_attempts')
      .select('*')
      .eq('email', email)
      .eq('success', false)
      .gt('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString());
      
    if (error) throw error;
    
    // If too many failed attempts
    if (recentAttempts && recentAttempts.length >= 5) {
      // Send security alert
      await sendSecurityAlert(email, recentAttempts);
      return true;
    }
    
    // Check for multiple IPs
    const uniqueIPs = new Set();
    recentAttempts.forEach(attempt => {
      if (attempt.ip_address) {
        uniqueIPs.add(attempt.ip_address);
      }
    });
    
    if (uniqueIPs.size >= 3) {
      // Send security alert for multiple IPs
      await sendSecurityAlert(email, recentAttempts);
      return true;
    }
    
    return false;
  } catch (error) {
    console.error('Error checking suspicious activity:', error);
    return false;
  }
};

// Send security alert
export const sendSecurityAlert = async (email, attempts) => {
  try {
    // For development, just log the alert
    console.log(`[SECURITY ALERT] Suspicious login activity detected for ${email}`);
    console.log('Recent attempts:', attempts);
    
    // Find user in profiles
    const { data: profile } = await supabase
      .from('profiles')
      .select('*')
      .eq('email', email)
      .single();
      
    if (profile) {
      // Record security alert in database
      await supabase
        .from('security_alerts')
        .insert([{
          user_id: profile.id,
          email: email,
          alert_type: 'suspicious_login',
          details: JSON.stringify(attempts),
          created_at: new Date().toISOString()
        }]);
    }
    
    // In production, you would send an email here
    
    return true;
  } catch (error) {
    console.error('Error sending security alert:', error);
    return false;
  }
};