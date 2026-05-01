package com.easylims.viewmodels

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.easylims.lib.Supabase
import com.easylims.models.Department
import io.github.jan.supabase.postgrest.from
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.launch

class DepartmentsViewModel : ViewModel() {
    private val _departments = MutableStateFlow<List<Department>>(emptyList())
    val departments: StateFlow<List<Department>> = _departments

    private val _isLoading = MutableStateFlow(false)
    val isLoading: StateFlow<Boolean> = _isLoading

    private val _errorMessage = MutableStateFlow<String?>(null)
    val errorMessage: StateFlow<String?> = _errorMessage

    init {
        fetchDepartments()
    }

    fun fetchDepartments() {
        viewModelScope.launch {
            _isLoading.value = true
            _errorMessage.value = null
            try {
                val results = Supabase.client.from("departments").select().decodeList<Department>()
                _departments.value = results.sortedBy { it.name ?: "" }
            } catch (e: Exception) {
                e.printStackTrace()
                _errorMessage.value = "Failed to load departments: ${e.localizedMessage}"
            } finally {
                _isLoading.value = false
            }
        }
    }

    fun addDepartment(name: String) {
        viewModelScope.launch {
            try {
                Supabase.client.from("departments").insert(mapOf("name" to name))
                fetchDepartments()
            } catch (e: Exception) {
                e.printStackTrace()
                _errorMessage.value = "Failed to add department: ${e.localizedMessage}"
            }
        }
    }

    fun updateDepartment(id: String, name: String) {
        viewModelScope.launch {
            try {
                Supabase.client.from("departments").update(mapOf("name" to name)) {
                    filter {
                        eq("id", id)
                    }
                }
                fetchDepartments()
            } catch (e: Exception) {
                e.printStackTrace()
                _errorMessage.value = "Failed to update department: ${e.localizedMessage}"
            }
        }
    }

    fun deleteDepartment(id: String) {
        viewModelScope.launch {
            try {
                Supabase.client.from("departments").delete {
                    filter {
                        eq("id", id)
                    }
                }
                fetchDepartments()
            } catch (e: Exception) {
                e.printStackTrace()
                _errorMessage.value = "Failed to delete department: ${e.localizedMessage}"
            }
        }
    }
}
