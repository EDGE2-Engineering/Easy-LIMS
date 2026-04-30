package com.easylims.viewmodels

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.easylims.lib.Supabase
import com.easylims.models.EmployeeAttendance
import com.easylims.models.User
import io.github.jan.supabase.postgrest.from
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch

class AttendanceViewModel : ViewModel() {
    private val _employees = MutableStateFlow<List<User>>(emptyList())
    val employees: StateFlow<List<User>> = _employees.asStateFlow()

    private val _attendanceHistory = MutableStateFlow<List<EmployeeAttendance>>(emptyList())
    val attendanceHistory: StateFlow<List<EmployeeAttendance>> = _attendanceHistory.asStateFlow()

    private val _isLoading = MutableStateFlow(false)
    val isLoading: StateFlow<Boolean> = _isLoading.asStateFlow()

    private val _error = MutableStateFlow<String?>(null)
    val error: StateFlow<String?> = _error.asStateFlow()

    init {
        fetchEmployees()
    }

    fun fetchEmployees() {
        viewModelScope.launch {
            _isLoading.value = true
            _error.value = null
            try {
                val result = Supabase.client.from("users")
                    .select()
                    .decodeList<User>()
                _employees.value = result.sortedBy { it.fullName ?: it.username }
            } catch (e: Exception) {
                _error.value = "Failed to fetch employees: ${e.message}"
            } finally {
                _isLoading.value = false
            }
        }
    }

    fun fetchAttendanceHistory(userId: String) {
        viewModelScope.launch {
            _isLoading.value = true
            _error.value = null
            try {
                val result = Supabase.client.from("employee_attendance")
                    .select {
                        filter { eq("user_id", userId) }
                    }
                    .decodeList<EmployeeAttendance>()
                
                _attendanceHistory.value = result.sortedWith(compareByDescending<EmployeeAttendance> { it.year }.thenByDescending { it.month })
            } catch (e: Exception) {
                _error.value = "Failed to fetch attendance: ${e.message}"
            } finally {
                _isLoading.value = false
            }
        }
    }

    fun upsertAttendance(attendance: EmployeeAttendance) {
        viewModelScope.launch {
            _isLoading.value = true
            _error.value = null
            try {
                Supabase.client.from("employee_attendance").upsert(attendance, onConflict = "user_id,month,year")
                fetchAttendanceHistory(attendance.userId)
            } catch (e: Exception) {
                _error.value = "Failed to save attendance: ${e.message}"
            } finally {
                _isLoading.value = false
            }
        }
    }
}
