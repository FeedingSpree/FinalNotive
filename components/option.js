import React from "react";
import Notive from "../assets/notive.png";
import { View, Text, Image, TouchableOpacity, StyleSheet } from "react-native";

const App = ({ navigation }) => {
  return (
    <View style={styles.container}>
      {/* Top Section with Background Color */}
      <View style={styles.topSection}>
        <Image source={Notive} style={styles.icon} />
        <Text style={styles.heading}>Let’s make every day count.</Text>
      </View>

      {/* Bottom Section */}
      <View style={styles.bottomSection}>
        <Text style={styles.subText}>
          Create your Notive account and streamline your tasks, schedule, and
          to-dos.
        </Text>

        <TouchableOpacity
          style={styles.button}
          onPress={() => navigation.navigate("Login")}
        >
          <Text style={styles.buttonText}>Login</Text>
        </TouchableOpacity>

        <Text style={styles.orText}>-- or --</Text>

        <TouchableOpacity
          style={styles.button}
          onPress={() => navigation.navigate("SignUp")}
        >
          <Text style={styles.buttonText}>Sign up</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};


const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F2F2F2",
    alignItems: "center",
  },
  topSection: {
    width: "100%",
    height: "40%",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#9B59B6",
    borderBottomLeftRadius: 50,
    borderBottomRightRadius: 50,
  },
  icon: {
    width: 100,
    height: 100,
    marginBottom: 10,
    marginTop: 20,
  },
  heading: {
    color: "white",
    fontSize: 18,
    fontWeight: "bold",
    textAlign: "center",
  },
  bottomSection: {
    width: "80%",
    alignItems: "center",
    marginTop: 20,
  },
  subText: {
    fontSize: 14,
    color: "#555",
    textAlign: "center",
    marginTop: 60,
    marginBottom: 60,
  },
  button: {
    backgroundColor: "#9B59B6",
    paddingVertical: 12,
    width: "50%",
    alignItems: "center",
    borderRadius: 8,
    marginBottom: 10,
  },
  buttonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "bold",
  },
  orText: {
    color: "#888",
    fontSize: 14,
    marginBottom: 10,
  },
});

export default App;