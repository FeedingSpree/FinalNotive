import React, { useState, useEffect } from "react";
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Image, Alert, ActivityIndicator } from "react-native";
import * as ImagePicker from 'expo-image-picker';
import Notive from "../assets/notive.png";
import DefaultPic from "../assets/default.jpg";
import { Feather } from '@expo/vector-icons';
import { supabase } from '../utils/supabase';

const Account = ({ navigation, route }) => {
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [profilePic, setProfilePic] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [user, setUser] = useState(null);

  useEffect(() => {
    loadUserData();
  }, []);

  const loadUserData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (user) {
        setUser(user);
        setEmail(user.email);
        
        // Get profile data
        const { data: profile } = await supabase
          .from('profiles')
          .select('username')
          .eq('id', user.id)
          .single();
        
        if (profile) {
          setUsername(profile.username || '');
        }
        
        // Get profile picture if passed from previous screen
        if (route.params?.profilePic) {
          setProfilePic(route.params.profilePic);
        }
      } else {
        navigation.navigate('Login');
      }
    } catch (error) {
      console.error('Error loading user data:', error);
      Alert.alert('Error', 'Failed to load user data');
    } finally {
      setLoading(false);
    }
  };

  const pickImage = async () => {
    let permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (permissionResult.granted === false) {
      Alert.alert("Permission required", "We need access to your gallery!");
      return;
    }

    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 1,
    });

    if (!result.canceled) {
      setProfilePic(result.assets[0].uri);
    }
  };

  const handleSave = async () => {
    if (!user) return;

    setSaving(true);
    try {
      // Update username in profiles table
      if (username.trim()) {
        const { error: profileError } = await supabase
          .from('profiles')
          .update({ 
            username: username.trim(),
            updated_at: new Date().toISOString()
          })
          .eq('id', user.id);

        if (profileError) throw profileError;
      }

      // Update email if changed
      if (email !== user.email) {
        const { error: emailError } = await supabase.auth.updateUser({
          email: email.trim()
        });

        if (emailError) throw emailError;
        
        Alert.alert(
          "Email Updated",
          "Please check your new email address for a confirmation link."
        );
      }

      // Update password if new password provided
      if (newPassword.trim()) {
        if (newPassword.length < 6) {
          Alert.alert("Error", "Password must be at least 6 characters long");
          return;
        }

        const { error: passwordError } = await supabase.auth.updateUser({
          password: newPassword
        });

        if (passwordError) throw passwordError;
      }

      Alert.alert("Success", "Information saved successfully!");
      
      // Navigate back to homepage with updated profile picture
      navigation.navigate("Homepage", { profilePic });
      
    } catch (error) {
      console.error('Error saving profile:', error);
      Alert.alert("Error", error.message || "Failed to save information");
    } finally {
      setSaving(false);
    }
  };

  const handleLogout = async () => {
    Alert.alert(
      "Logout",
      "Are you sure you want to logout?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Logout",
          style: "destructive",
          onPress: async () => {
            try {
              const { error } = await supabase.auth.signOut();
              if (error) throw error;
              navigation.navigate('Login');
            } catch (error) {
              console.error('Logout error:', error);
              Alert.alert('Error', 'Failed to logout');
            }
          }
        }
      ]
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#8e44ad" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Image source={Notive} style={styles.logo} resizeMode="contain" />
        <TouchableOpacity 
          style={styles.logoutButton}
          onPress={handleLogout}
        >
          <Feather name="log-out" size={24} color="#fff" />
        </TouchableOpacity>
      </View>

      {/* Profile Picture */}
      <TouchableOpacity style={styles.avatarContainer} onPress={pickImage}>
        <Image 
          source={profilePic ? { uri: profilePic } : DefaultPic}
          style={styles.avatar}
        />
        <View style={styles.cameraIcon}>
          <Feather name="camera" size={20} color="#fff" />
        </View>
      </TouchableOpacity>
      <Text style={styles.changeImageText}>Click to change image</Text>

      {/* Card */}
      <View style={styles.card}>
        <Text style={styles.title}>Personal Information</Text>

        {/* Username Field */}
        <View style={styles.inputWrapper}>
          <Text style={styles.label}>Username</Text>
          <View style={styles.inputField}>
            <TextInput
              style={styles.input}
              value={username}
              onChangeText={setUsername}
              placeholder="Enter username"
              editable={!saving}
            />
            <Feather name="edit-2" size={18} color="#7e57c2" />
          </View>
        </View>

        {/* Email Field */}
        <View style={styles.inputWrapper}>
          <Text style={styles.label}>Email</Text>
          <View style={styles.inputField}>
            <TextInput
              style={styles.input}
              value={email}
              onChangeText={setEmail}
              placeholder="Enter email"
              keyboardType="email-address"
              autoCapitalize="none"
              editable={!saving}
            />
            <Feather name="edit-2" size={18} color="#7e57c2" />
          </View>
        </View>

        {/* New Password Field */}
        <View style={styles.inputWrapper}>
          <Text style={styles.label}>New Password (leave blank to keep current)</Text>
          <View style={styles.inputField}>
            <TextInput
              style={styles.input}
              value={newPassword}
              secureTextEntry
              onChangeText={setNewPassword}
              placeholder="Enter new password"
              editable={!saving}
            />
            <Feather name="edit-2" size={18} color="#7e57c2" />
          </View>
        </View>

        {/* Save Button */}
        <TouchableOpacity 
          style={[styles.saveButton, saving && styles.disabledButton]} 
          onPress={handleSave}
          disabled={saving}
        >
          {saving ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.saveButtonText}>Save</Text>
          )}
        </TouchableOpacity>

        {/* Back Button */}
        <TouchableOpacity 
          style={styles.backButton} 
          onPress={() => navigation.navigate("Homepage", { profilePic })}
        >
          <Text style={styles.backButtonText}>Back to Home</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

export default Account;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f5f5f5",
    alignItems: "center",
    justifyContent: "flex-start",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: "#f5f5f5",
  },
  header: {
    width: "100%",
    height: "30%",
    backgroundColor: "#8e44ad",
    borderBottomLeftRadius: 300,
    borderBottomRightRadius: 0,
    alignItems: "center",
    justifyContent: "center",
    position: 'relative',
  },
  logo: {
    width: 150,
    height: 80,
    marginTop: 40,
  },
  logoutButton: {
    position: 'absolute',
    top: 50,
    right: 20,
    padding: 10,
  },
  avatarContainer: {
    marginTop: -50,
    alignItems: "center",
    justifyContent: "center",
    position: 'relative',
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 3,
    borderColor: "#fff",
  },
  cameraIcon: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: '#8e44ad',
    borderRadius: 15,
    width: 30,
    height: 30,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#fff',
  },
  changeImageText: {
    fontSize: 14,
    color: "#5e3370",
    marginTop: 10,
    marginBottom: 10,
  },
  card: {
    backgroundColor: "#fff",
    width: "85%",
    marginTop: 10,
    borderRadius: 20,
    padding: 20,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  title: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#5e3370",
    marginBottom: 20,
  },
  inputWrapper: {
    width: "100%",
    marginBottom: 15,
  },
  label: {
    fontSize: 14,
    color: "#5e3370",
    marginBottom: 5,
  },
  inputField: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#9b59b6",
    borderRadius: 20,
    paddingHorizontal: 15,
    paddingVertical: 5,
    backgroundColor: "#fff",
  },
  input: {
    flex: 1,
    height: 40,
    fontSize: 14,
    color: "#333",
  },
  saveButton: {
    marginTop: 20,
    backgroundColor: "#8e44ad",
    paddingVertical: 12,
    paddingHorizontal: 50,
    borderRadius: 25,
    elevation: 5,
    minHeight: 48,
    justifyContent: 'center',
  },
  saveButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
  },
  disabledButton: {
    opacity: 0.7,
  },
  backButton: {
    marginTop: 10,
    paddingVertical: 10,
  },
  backButtonText: {
    color: "#5e3370",
    fontSize: 14,
    textDecorationLine: 'underline',
  },
});