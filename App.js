import React, { useEffect, useState } from "react";
import { NavigationContainer } from "@react-navigation/native";
import { createStackNavigator } from "@react-navigation/stack";
import Splashscreen from "./components/Splashscreen";
import LoginOption from "./components/option";
import Login from "./components/login";
import SignUp from "./components/signUp";
import Homepage from "./components/homepage";
import Account from "./components/account";
import Complete from "./components/complete";
import InProgress from "./components/inprogress";
import Todo from "./components/todo";


const Stack = createStackNavigator();

export default function App() {
  const [isShowSplash, setIsShowSplash] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsShowSplash(false);
    }, 3000);

    // Clear the timer when component unmounts
    return () => clearTimeout(timer);
  }, []);

  if (isShowSplash) {
    return <Splashscreen />;
  }

  return (
    <NavigationContainer>
      <Stack.Navigator initialRouteName="LoginOption" screenOptions={{ headerShown: false }}>
        <Stack.Screen name="LoginOption" component={LoginOption} />
        <Stack.Screen name="Login" component={Login} />
        <Stack.Screen name="SignUp" component={SignUp} />
        <Stack.Screen name="Homepage" component={Homepage} />
        <Stack.Screen name="Account" component={Account}/>
        <Stack.Screen name="InProgress" component={InProgress}/>
        <Stack.Screen name="Complete" component={Complete}/>
        <Stack.Screen name="Todo" component={Todo}/>  
      </Stack.Navigator>
    </NavigationContainer>
  );
}
