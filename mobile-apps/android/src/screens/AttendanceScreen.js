import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, TextInput, ActivityIndicator, Alert, Modal, SafeAreaView, KeyboardAvoidingView, Platform } from 'react-native';
import { supabase } from '../lib/supabase';
import { Plus, Users, Calendar, X, ChevronLeft, ChevronRight, Edit2 } from 'lucide-react-native';
import { useNavigation } from '@react-navigation/native';

const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

export default function AttendanceScreen() {
  const navigation = useNavigation();
  const [view, setView] = useState('list'); // 'list' or 'history'
  const [employees, setEmployees] = useState([]);
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [attendance, setAttendance] = useState([]);
  const [loading, setLoading] = useState(true);
  
  const [modalVisible, setModalVisible] = useState(false);
  const [formData, setFormData] = useState({
    month: new Date().getMonth().toString(),
    year: new Date().getFullYear().toString(),
    totalWorkingDays: '',
    daysWorked: '',
  });

  useEffect(() => {
    if (view === 'list') fetchEmployees();
    else if (view === 'history' && selectedEmployee) fetchAttendance(selectedEmployee.id);
  }, [view, selectedEmployee]);

  async function fetchEmployees() {
    setLoading(true);
    const { data, error } = await supabase.from('users').select('*').order('full_name');
    if (error) Alert.alert('Error', error.message);
    else setEmployees(data || []);
    setLoading(false);
  }

  async function fetchAttendance(userId) {
    setLoading(true);
    const { data, error } = await supabase
      .from('employee_attendance')
      .select('*')
      .eq('user_id', userId)
      .order('year', { ascending: false })
      .order('month', { ascending: false });

    if (error) Alert.alert('Error', error.message);
    else setAttendance(data || []);
    setLoading(false);
  }

  const handleSelectEmployee = (emp) => {
    setSelectedEmployee(emp);
    setView('history');
  };

  const handleSave = async () => {
    if (!formData.totalWorkingDays || !formData.daysWorked) {
      Alert.alert('Error', 'Please fill all fields');
      return;
    }

    const payload = {
      user_id: selectedEmployee.id,
      month: parseInt(formData.month),
      year: parseInt(formData.year),
      total_working_days: parseFloat(formData.totalWorkingDays),
      days_worked: parseFloat(formData.daysWorked),
      updated_at: new Date().toISOString()
    };

    const { error } = await supabase
      .from('employee_attendance')
      .upsert(payload, { onConflict: 'user_id,month,year' });

    if (error) {
      Alert.alert('Error', error.message);
    } else {
      setModalVisible(false);
      fetchAttendance(selectedEmployee.id);
    }
  };

  const openAddModal = (existing = null) => {
    if (existing) {
      setFormData({
        month: existing.month.toString(),
        year: existing.year.toString(),
        totalWorkingDays: existing.total_working_days.toString(),
        daysWorked: existing.days_worked.toString()
      });
    } else {
      setFormData({
        month: new Date().getMonth().toString(),
        year: new Date().getFullYear().toString(),
        totalWorkingDays: '',
        daysWorked: ''
      });
    }
    setModalVisible(true);
  };

  const renderEmployee = ({ item }) => (
    <TouchableOpacity style={styles.card} onPress={() => handleSelectEmployee(item)}>
      <View style={styles.cardContent}>
        <View style={styles.iconContainer}>
          <Users color="#4F46E5" size={24} />
        </View>
        <View style={styles.cardTextContainer}>
          <Text style={styles.empName}>{item.full_name || item.username}</Text>
          <Text style={styles.empRole}>{item.role || 'Employee'} • {item.department || 'No Dept'}</Text>
        </View>
        <ChevronRight color="#D1D5DB" size={24} />
      </View>
    </TouchableOpacity>
  );

  const renderHistory = ({ item }) => {
    const percentage = (item.days_worked / item.total_working_days) * 100;
    return (
      <TouchableOpacity style={styles.card} onPress={() => openAddModal(item)}>
        <View style={styles.historyRow}>
          <View>
            <Text style={styles.historyMonth}>{MONTHS[item.month]} {item.year}</Text>
            <Text style={styles.historyDays}>{item.days_worked} / {item.total_working_days} Days</Text>
          </View>
          <View style={styles.badgeContainer}>
            <View style={[styles.badge, percentage >= 90 ? styles.badgeGreen : percentage >= 75 ? styles.badgeBlue : styles.badgeOrange]}>
              <Text style={[styles.badgeText, percentage >= 90 ? styles.textGreen : percentage >= 75 ? styles.textBlue : styles.textOrange]}>
                {percentage.toFixed(0)}%
              </Text>
            </View>
            <Edit2 color="#9CA3AF" size={16} style={{ marginLeft: 12 }} />
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity 
          onPress={() => view === 'history' ? setView('list') : navigation.goBack()} 
          style={styles.backButton}
          hitSlop={{ top: 20, bottom: 20, left: 20, right: 20 }}
        >
          <ChevronLeft color="#111827" size={28} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>
          {view === 'list' ? 'Attendance' : selectedEmployee?.full_name || selectedEmployee?.username}
        </Text>
        <View style={{ width: 28 }} />
      </View>

      {loading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color="#4F46E5" />
        </View>
      ) : (
        <FlatList
          data={view === 'list' ? employees : attendance}
          keyExtractor={(item) => item.id.toString()}
          renderItem={view === 'list' ? renderEmployee : renderHistory}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              {view === 'list' ? <Users size={48} color="#D1D5DB" /> : <Calendar size={48} color="#D1D5DB" />}
              <Text style={styles.emptyText}>No records found</Text>
            </View>
          }
        />
      )}

      {view === 'history' && (
        <TouchableOpacity style={styles.fab} onPress={() => openAddModal()}>
          <Plus color="#FFF" size={24} />
        </TouchableOpacity>
      )}

      <Modal visible={modalVisible} animationType="slide" transparent={true}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Work Log Entry</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <X color="#6B7280" size={24} />
              </TouchableOpacity>
            </View>

            <View style={styles.row}>
              <View style={[styles.formGroup, { flex: 1, marginRight: 12 }]}>
                <Text style={styles.label}>Month (0-11)</Text>
                <TextInput
                  style={styles.input}
                  placeholder="0"
                  keyboardType="numeric"
                  value={formData.month}
                  onChangeText={(t) => setFormData({...formData, month: t})}
                />
              </View>
              <View style={[styles.formGroup, { flex: 1 }]}>
                <Text style={styles.label}>Year</Text>
                <TextInput
                  style={styles.input}
                  placeholder="2025"
                  keyboardType="numeric"
                  value={formData.year}
                  onChangeText={(t) => setFormData({...formData, year: t})}
                />
              </View>
            </View>

            <View style={styles.row}>
              <View style={[styles.formGroup, { flex: 1, marginRight: 12 }]}>
                <Text style={styles.label}>Working Days</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Total Days"
                  keyboardType="numeric"
                  value={formData.totalWorkingDays}
                  onChangeText={(t) => setFormData({...formData, totalWorkingDays: t})}
                />
              </View>
              <View style={[styles.formGroup, { flex: 1 }]}>
                <Text style={styles.label}>Days Worked</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Days Worked"
                  keyboardType="numeric"
                  value={formData.daysWorked}
                  onChangeText={(t) => setFormData({...formData, daysWorked: t})}
                />
              </View>
            </View>

            <TouchableOpacity style={styles.saveButton} onPress={handleSave}>
              <Text style={styles.saveButtonText}>Save Log</Text>
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </Modal>
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
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  backButton: {
    padding: 12,
    marginLeft: -12,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  listContent: {
    padding: 16,
    paddingBottom: 100,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
    borderWidth: 1,
    borderColor: '#F3F4F6',
  },
  cardContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: '#EEF2FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  cardTextContainer: {
    flex: 1,
  },
  empName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 4,
  },
  empRole: {
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '500',
  },
  historyRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  historyMonth: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 4,
  },
  historyDays: {
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '500',
  },
  badgeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  badgeGreen: { backgroundColor: '#D1FAE5' },
  badgeBlue: { backgroundColor: '#DBEAFE' },
  badgeOrange: { backgroundColor: '#FFEDD5' },
  badgeText: { fontSize: 12, fontWeight: '700' },
  textGreen: { color: '#047857' },
  textBlue: { color: '#1D4ED8' },
  textOrange: { color: '#C2410C' },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 64,
  },
  emptyText: {
    marginTop: 16,
    fontSize: 16,
    color: '#9CA3AF',
    fontWeight: '500',
  },
  fab: {
    position: 'absolute',
    bottom: 24,
    right: 24,
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#4F46E5',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#4F46E5',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 5,
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 10,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#111827',
  },
  formGroup: {
    marginBottom: 16,
  },
  row: {
    flexDirection: 'row',
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#4B5563',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    color: '#111827',
  },
  saveButton: {
    backgroundColor: '#4F46E5',
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 16,
  },
  saveButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
});
