import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, SafeAreaView } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { LogOut, Receipt, Users } from 'lucide-react-native';
import { supabase } from '../lib/supabase';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function HomeScreen() {
  const navigation = useNavigation();
  const [userName, setUserName] = useState('');

  useEffect(() => {
    const fetchUser = async () => {
      const sessionStr = await AsyncStorage.getItem('user_session');
      if (sessionStr) {
        const session = JSON.parse(sessionStr);
        setUserName(session.fullName || session.username || 'User');
      }
    };
    fetchUser();
  }, []);

  async function handleLogout() {
    await AsyncStorage.removeItem('user_session');
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>Welcome back,</Text>
          <Text style={styles.title}>{userName}</Text>
        </View>
        <TouchableOpacity 
          onPress={handleLogout} 
          style={styles.logoutButton}
          hitSlop={{ top: 20, bottom: 20, left: 20, right: 20 }}
        >
          <LogOut color="#EF4444" size={24} />
        </TouchableOpacity>
      </View>

      <View style={styles.content}>
        <TouchableOpacity 
          style={[styles.card, styles.expensesCard]} 
          onPress={() => navigation.navigate('Expenses')}
        >
          <View style={styles.iconContainer}>
            <Receipt color="#10B981" size={32} />
          </View>
          <Text style={styles.cardTitle}>Expenses</Text>
          <Text style={styles.cardSubtitle}>Manage company expenses and reports</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={[styles.card, styles.attendanceCard]} 
          onPress={() => navigation.navigate('Attendance')}
        >
          <View style={styles.iconContainer}>
            <Users color="#3B82F6" size={32} />
          </View>
          <Text style={styles.cardTitle}>Attendance</Text>
          <Text style={styles.cardSubtitle}>Track employee work logs and wages</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingTop: 32,
    paddingBottom: 24,
  },
  greeting: {
    fontSize: 16,
    color: '#6B7280',
    fontWeight: '500',
  },
  title: {
    fontSize: 32,
    fontWeight: '800',
    color: '#111827',
  },
  logoutButton: {
    padding: 12,
    backgroundColor: '#FEE2E2',
    borderRadius: 12,
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
    gap: 20,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 12,
    elevation: 3,
    borderWidth: 1,
    borderColor: '#F3F4F6',
  },
  expensesCard: {
    borderTopWidth: 4,
    borderTopColor: '#10B981',
  },
  attendanceCard: {
    borderTopWidth: 4,
    borderTopColor: '#3B82F6',
  },
  iconContainer: {
    width: 64,
    height: 64,
    borderRadius: 20,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  cardTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 8,
  },
  cardSubtitle: {
    fontSize: 15,
    color: '#6B7280',
    fontWeight: '500',
    lineHeight: 22,
  },
});
