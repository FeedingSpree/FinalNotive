import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Image,
  Alert,
  ActivityIndicator,
  Modal,
} from "react-native";
import Notive from "../assets/notive.png";
import { supabase } from "../utils/supabase";
import { generateOTP, storeOTP, verifyOTP, sendOTPEmail } from "../utils/otpService";
import { recordLoginAttempt } from "../utils/securityService";

const Login = ({ navigation }) => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [failedAttempts, setFailedAttempts] = useState(0);
  const [showCooldown, setShowCooldown] = useState(false);
  const [cooldownTime, setCooldownTime] = useState(0);
  
  // 2FA states
  const [showOtpModal, setShowOtpModal] = useState(false);
  const [otp, setOtp] = useState("");
  const [otpLoading, setOtpLoading] = useState(false);
  const [tempSession, setTempSession] = useState(null);

  // Cooldown timer
  useEffect(() => {
    let timer;
    if (showCooldown && cooldownTime > 0) {
      timer = setTimeout(() => {
        setCooldownTime(prevTime => {
          if (prevTime <= 1) {
            setShowCooldown(false);
            return 0;
          }
          return prevTime - 1;
        });
      }, 1000);
    }
    
    return () => clearTimeout(timer);
  }, [showCooldown, cooldownTime]);

  // Email validation regex
  const validateEmail = (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const handleLogin = async () => {
    // Check if in cooldown period
    if (showCooldown) {
      Alert.alert(
        "Too Many Attempts",
        `Please wait ${cooldownTime} seconds before trying again.`
      );
      return;
    }
    
    // Validation
    if (!email || !password) {
      Alert.alert("Error", "Please fill in all fields");
      return;
    }

    // Trim and lowercase the email
    const cleanEmail = email.trim().toLowerCase();
    
    // Validate email format
    if (!validateEmail(cleanEmail)) {
      Alert.alert("Error", "Please enter a valid email address");
      return;
    }

    setLoading(true);

    try {
      // First step of authentication: verify credentials
      const { data, error } = await supabase.auth.signInWithPassword({
        email: cleanEmail,
        password: password,
      });

      if (error) {
        // Record failed login attempt
        await recordLoginAttempt(cleanEmail, false);
        
        // Increment failed attempts counter
        setFailedAttempts(prev => {
          const newCount = prev + 1;
          
          // If too many attempts, trigger cooldown
          if (newCount >= 3) {
            setShowCooldown(true);
            setCooldownTime(30); // 30 second cooldown
            return 0; // Reset counter
          }
          
          return newCount;
        });
        
        throw error;
      }
      
      // Reset failed attempts
      setFailedAttempts(0);
      
      // Record successful login attempt 
      await recordLoginAttempt(cleanEmail, true);
      
      // Store the session temporarily
      setTempSession(data);
      
      // Generate and store OTP
      const generatedOtp = generateOTP();
      const stored = await storeOTP(cleanEmail, generatedOtp);
      
      if (!stored) {
        throw new Error("Failed to generate verification code");
      }
      
      // Send OTP (in development, this just logs to console)
      await sendOTPEmail(cleanEmail, generatedOtp);
      
      // Show OTP modal
      setShowOtpModal(true);

    } catch (error) {
      console.error('Login error:', error);
      
      // Handle specific Supabase errors
      let errorMessage = "Login failed. Please try again.";
      
      if (error.message) {
        if (error.message.includes("Invalid login credentials")) {
          errorMessage = "Invalid email or password";
        } else if (error.message.includes("Email not confirmed")) {
          errorMessage = "Please verify your email before logging in";
        } else if (error.message.includes("Too many requests")) {
          errorMessage = "Too many login attempts. Please try again later";
        } else {
          errorMessage = error.message;
        }
      }
      
      // Add attempt counter to message if needed
      if (failedAttempts > 0) {
        errorMessage += `\n\nFailed attempts: ${failedAttempts}/3`;
        if (failedAttempts === 2) {
          errorMessage += "\nWarning: One more failed attempt will trigger a cooldown.";
        }
      }
      
      Alert.alert("Error", errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const checkOtp = async () => {
    if (!otp || otp.length !== 6) {
      Alert.alert("Error", "Please enter the 6-digit code");
      return;
    }
    
    setOtpLoading(true);
    
    try {
      // Verify OTP
      const verified = await verifyOTP(email.trim().toLowerCase(), otp);
      
      if (!verified) {
        throw new Error("Invalid or expired verification code");
      }
      
      // OTP verified successfully
      console.log('Login successful with 2FA:', tempSession.user?.id);
      
      // Close the OTP modal
      setShowOtpModal(false);
      
      // Clear the OTP input
      setOtp("");
      
      // Navigate to homepage
      navigation.navigate("Homepage");
    } catch (error) {
      console.error('OTP verification error:', error);
      Alert.alert("Error", error.message || "Failed to verify code. Please try again.");
    } finally {
      setOtpLoading(false);
    }
  };

  const resendOtp = async () => {
    setOtpLoading(true);
    try {
      const generatedOtp = generateOTP();
      const stored = await storeOTP(email.trim().toLowerCase(), generatedOtp);
      
      if (!stored) {
        throw new Error("Failed to generate verification code");
      }
      
      await sendOTPEmail(email.trim().toLowerCase(), generatedOtp);
      Alert.alert("Success", "A new verification code has been sent");
    } catch (error) {
      console.error('Error resending OTP:', error);
      Alert.alert("Error", "Failed to resend verification code");
    } finally {
      setOtpLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    if (!email) {
      Alert.alert("Error", "Please enter your email address first");
      return;
    }

    const cleanEmail = email.trim().toLowerCase();
    
    if (!validateEmail(cleanEmail)) {
      Alert.alert("Error", "Please enter a valid email address");
      return;
    }

    setLoading(true);

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(cleanEmail, {
        redirectTo: 'your-app-scheme://reset-password', // You'll need to configure this
      });

      if (error) {
        throw error;
      }

      Alert.alert(
        "Success",
        "Password reset instructions have been sent to your email",
        [{ text: "OK" }]
      );
    } catch (error) {
      console.error('Password reset error:', error);
      Alert.alert("Error", error.message || "Failed to send reset instructions");
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      {/* Header Logo */}
      <View style={styles.header}>
        <Image source={Notive} style={styles.logo} resizeMode="contain" />
      </View>

      {/* Card Body */}
      <View style={styles.card}>
        <Text style={styles.title}>Login</Text>

        <TextInput
          style={styles.input}
          placeholder="E-mail"
          placeholderTextColor="#7e57c2"
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
          editable={!loading && !showCooldown}
        />
        <TextInput
          style={styles.input}
          placeholder="Password"
          placeholderTextColor="#7e57c2"
          secureTextEntry
          value={password}
          onChangeText={setPassword}
          editable={!loading && !showCooldown}
        />

        {/* Cooldown Message */}
        {showCooldown && (
          <Text style={styles.cooldownText}>
            Too many failed attempts. Please wait {cooldownTime} seconds.
          </Text>
        )}

        <TouchableOpacity onPress={handleForgotPassword} disabled={loading || showCooldown}>
          <Text style={[styles.forgot, (loading || showCooldown) && styles.disabledText]}>
            Forgot Password?
          </Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={[
            styles.loginButton, 
            (loading || showCooldown) && styles.disabledButton
          ]} 
          onPress={handleLogin}
          disabled={loading || showCooldown}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.loginText}>Login</Text>
          )}
        </TouchableOpacity>

        <Text style={styles.signupText}>
          No account yet?{" "}
          <Text 
            style={styles.join} 
            onPress={() => navigation.navigate("SignUp")}
          >
            Join Us!
          </Text>
        </Text>
      </View>
      
      {/* OTP Verification Modal */}
      <Modal
        visible={showOtpModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowOtpModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.otpModalContainer}>
            <Text style={styles.otpTitle}>Two-Factor Authentication</Text>
            <Text style={styles.otpDescription}>
              A verification code has been sent to your email. Please enter the code below.
            </Text>
            
            <TextInput
              style={styles.otpInput}
              placeholder="Enter 6-digit code"
              placeholderTextColor="#7e57c2"
              value={otp}
              onChangeText={setOtp}
              keyboardType="number-pad"
              maxLength={6}
              editable={!otpLoading}
            />
            
            <TouchableOpacity 
              style={[styles.verifyButton, otpLoading && styles.disabledButton]} 
              onPress={checkOtp}
              disabled={otpLoading}
            >
              {otpLoading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.verifyText}>Verify</Text>
              )}
            </TouchableOpacity>
            
            <TouchableOpacity onPress={resendOtp} disabled={otpLoading}>
              <Text style={styles.resendText}>
                Didn't receive a code? <Text style={styles.resendLink}>Resend</Text>
              </Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.cancelButton} 
              onPress={() => setShowOtpModal(false)}
              disabled={otpLoading}
            >
              <Text style={styles.cancelText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
};

export default Login;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f5f5f5",
    alignItems: "center",
  },
  header: {
    width: "100%",
    height: "35%",
    backgroundColor: "#9B59B6",
    borderBottomLeftRadius: 100,
    alignItems: "center",
    justifyContent: "center",
  },
  logo: {
    width: 140,
    height: 140,
  },
  card: {
    backgroundColor: "#fff",
    width: "85%",
    marginTop: -40,
    borderRadius: 20,
    padding: 30,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.2,
    shadowRadius: 10,
    elevation: 8,
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#4a148c",
    textAlign: "center",
    marginBottom: 20,
  },
  input: {
    height: 45,
    borderColor: "#9b59b6",
    borderWidth: 1,
    borderRadius: 25,
    paddingHorizontal: 20,
    marginBottom: 15,
    fontSize: 14,
    color: "#333",
  },
  forgot: {
    alignSelf: "flex-end",
    color: "#6A1B9A",
    fontWeight: "600",
    marginBottom: 20,
  },
  cooldownText: {
    color: "#FF5252",
    fontSize: 14,
    textAlign: "center",
    marginBottom: 15,
  },
  loginButton: {
    backgroundColor: "#9B59B6",
    borderRadius: 25,
    paddingVertical: 12,
    alignItems: "center",
    shadowColor: "#9B59B6",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.5,
    shadowRadius: 5,
    elevation: 5,
  },
  loginText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
  },
  signupText: {
    textAlign: "center",
    marginTop: 20,
    fontSize: 14,
    color: "#333",
  },
  join: {
    color: "#6A1B9A",
    fontWeight: "600",
  },
  disabledButton: {
    opacity: 0.7,
  },
  disabledText: {
    opacity: 0.7,
  },
  
  // OTP Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  otpModalContainer: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 30,
    width: '85%',
    alignItems: 'center',
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 10,
  },
  otpTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#4a148c',
    marginBottom: 15,
    textAlign: 'center',
  },
  otpDescription: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginBottom: 20,
  },
  otpInput: {
    width: '100%',
    height: 50,
    borderColor: '#9b59b6',
    borderWidth: 1,
    borderRadius: 25,
    paddingHorizontal: 20,
    marginBottom: 20,
    fontSize: 18,
    color: '#333',
    textAlign: 'center',
    letterSpacing: 5,
  },
  verifyButton: {
    backgroundColor: '#9B59B6',
    borderRadius: 25,
    paddingVertical: 12,
    alignItems: 'center',
    width: '100%',
    shadowColor: '#9B59B6',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.5,
    shadowRadius: 5,
    elevation: 5,
  },
  verifyText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  resendText: {
    fontSize: 14,
    color: '#666',
    marginTop: 20,
    textAlign: 'center',
  },
  resendLink: {
    color: '#9B59B6',
    fontWeight: '600',
  },
  cancelButton: {
    marginTop: 20,
    padding: 10,
  },
  cancelText: {
    color: '#FF5252',
    fontSize: 14,
    fontWeight: '600',
  },
});