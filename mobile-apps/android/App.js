import React, { useEffect, useState } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { supabase } from './src/lib/supabase';
import { ActivityIndicator, View } from 'react-native';

// Import Screens
import LoginScreen from './src/screens/LoginScreen';
import HomeScreen from './src/screens/HomeScreen';
import ExpensesScreen from './src/screens/ExpensesScreen';
import AttendanceScreen from './src/screens/AttendanceScreen';

const Stack = createNativeStackNavigator();

import AsyncStorage from '@react-native-async-storage/async-storage';

export default function App() {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);

  const checkSession = async () => {
    try {
      const storedSession = await AsyncStorage.getItem('user_session');
      if (storedSession) {
        setSession(JSON.parse(storedSession));
      } else {
        setSession(null);
      }
    } catch (e) {
      console.error('Failed to load session', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    checkSession();
    
    // Simple polling or event listener could be added here for more complex apps
    // For now, we'll check session on mount and provide a way to refresh
    const interval = setInterval(checkSession, 1000); // Poll every second for demo/simplicity
    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F9FAFB' }}>
        <ActivityIndicator size="large" color="#4F46E5" />
      </View>
    );
  }

  return (
    <NavigationContainer>
      <Stack.Navigator
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: '#F9FAFB' }
        }}
      >
        {session && session.user ? (
          <>
            <Stack.Screen name="Home" component={HomeScreen} />
            <Stack.Screen name="Expenses" component={ExpensesScreen} />
            <Stack.Screen name="Attendance" component={AttendanceScreen} />
          </>
        ) : (
          <Stack.Screen name="Login" component={LoginScreen} />
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}
