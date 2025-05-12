import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Image,
  Alert,
  ActivityIndicator,
} from "react-native";
import Notive from "../assets/notive.png";
import { supabase } from "../utils/supabase"; // Import your supabase client

const SignUp = ({ navigation }) => {
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);

  // Email validation regex
  const validateEmail = (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const handleSignUp = async () => {
    // Validation
    if (!username || !email || !password || !confirmPassword) {
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

    if (password !== confirmPassword) {
      Alert.alert("Error", "Passwords do not match");
      return;
    }

    if (password.length < 6) {
      Alert.alert("Error", "Password must be at least 6 characters long");
      return;
    }

    setLoading(true);

    try {
      // Sign up with Supabase Auth
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: cleanEmail,
        password: password,
        options: {
          data: {
            username: username.trim(),
          }
        }
      });

      if (authError) {
        // Log the full error for debugging
        console.error('Auth Error:', authError);
        throw authError;
      }

      // If you have a profiles table, you might want to insert additional user data
      if (authData.user) {
        console.log('User created successfully:', authData.user.id);
        console.log('Attempting to create profile...');
        
        try {
          // First, let's check if we can query the profiles table
          const { data: testQuery, error: testError } = await supabase
            .from('profiles')
            .select('*')
            .limit(1);
            
          console.log('Test query result:', { testQuery, testError });
          
          // Now try to insert the profile
          const { data: profileData, error: profileError } = await supabase
            .from('profiles')
            .insert([
              {
                id: authData.user.id,
                username: username.trim(),
                email: cleanEmail,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
              }
            ])
            .select(); // Add select() to see what was inserted
            
          console.log('Profile insertion result:', { profileData, profileError });

          if (profileError) {
            console.error('Profile creation error:', profileError);
            console.error('Error details:', JSON.stringify(profileError, null, 2));
            
            // Try alternative approach - direct insert without auth context
            const { data: retryData, error: retryError } = await supabase
              .from('profiles')
              .insert([
                {
                  id: authData.user.id,
                  username: username.trim(),
                  email: cleanEmail,
                }
              ])
              .select();
              
            console.log('Retry result:', { retryData, retryError });
          } else {
            console.log('Profile created successfully:', profileData);
          }
        } catch (err) {
          console.error('Profile creation exception:', err);
          console.error('Exception details:', JSON.stringify(err, null, 2));
        }
      }

      Alert.alert(
        "Success", 
        "Registration successful! Please check your email to verify your account.",
        [
          {
            text: "OK",
            onPress: () => navigation.navigate("Login")
          }
        ]
      );

    } catch (error) {
      console.error('Sign up error:', error);
      
      // Handle specific Supabase errors
      let errorMessage = "Something went wrong during registration";
      
      if (error.message) {
        if (error.message.includes("invalid")) {
          errorMessage = "Please check your email address format";
        } else if (error.message.includes("already registered")) {
          errorMessage = "This email is already registered";
        } else if (error.message.includes("password")) {
          errorMessage = "Password requirements not met";
        } else {
          errorMessage = error.message;
        }
      }
      
      Alert.alert("Error", errorMessage);
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
        <Text style={styles.title}>Sign Up</Text>

        <TextInput
          style={styles.input}
          placeholder="Username"
          placeholderTextColor="#7e57c2"
          value={username}
          onChangeText={setUsername}
          autoCapitalize="none"
        />
        <TextInput
          style={styles.input}
          placeholder="E-mail"
          placeholderTextColor="#7e57c2"
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
        />
        <TextInput
          style={styles.input}
          placeholder="Password"
          placeholderTextColor="#7e57c2"
          secureTextEntry
          value={password}
          onChangeText={setPassword}
        />
        <TextInput
          style={styles.input}
          placeholder="Confirm Password"
          placeholderTextColor="#7e57c2"
          secureTextEntry
          value={confirmPassword}
          onChangeText={setConfirmPassword}
        />

        <TouchableOpacity 
          style={[styles.signupButton, loading && styles.disabledButton]} 
          onPress={handleSignUp}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.signupText}>Sign Up</Text>
          )}
        </TouchableOpacity>

        <Text style={styles.loginText}>
          Already have an account?{" "}
          <Text style={styles.join} onPress={() => navigation.navigate("Login")}>
            Login here!
          </Text>
        </Text>
      </View>
    </View>
  );
};

export default SignUp;

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
  signupButton: {
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
  signupText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
  },
  loginText: {
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
});