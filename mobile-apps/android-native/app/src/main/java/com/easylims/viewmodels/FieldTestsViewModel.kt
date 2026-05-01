package com.easylims.viewmodels

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.easylims.lib.Supabase
import com.easylims.models.FieldTest
import io.github.jan.supabase.postgrest.from
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.launch

class FieldTestsViewModel : ViewModel() {
    private val _fieldTests = MutableStateFlow<List<FieldTest>>(emptyList())
    val fieldTests: StateFlow<List<FieldTest>> = _fieldTests

    private val _isLoading = MutableStateFlow(false)
    val isLoading: StateFlow<Boolean> = _isLoading

    private val _errorMessage = MutableStateFlow<String?>(null)
    val errorMessage: StateFlow<String?> = _errorMessage

    init {
        fetchFieldTests()
    }

    fun fetchFieldTests() {
        viewModelScope.launch {
            _isLoading.value = true
            _errorMessage.value = null
            try {
                val results = Supabase.client.from("services").select().decodeList<FieldTest>()
                _fieldTests.value = results.sortedBy { it.serviceType ?: "" }
            } catch (e: Exception) {
                e.printStackTrace()
                _errorMessage.value = "Failed to load field tests: ${e.localizedMessage}"
            } finally {
                _isLoading.value = false
            }
        }
    }

    fun addFieldTest(fieldTest: FieldTest) {
        viewModelScope.launch {
            try {
                Supabase.client.from("services").insert(fieldTest)
                fetchFieldTests()
            } catch (e: Exception) {
                e.printStackTrace()
            }
        }
    }

    fun updateFieldTest(fieldTest: FieldTest) {
        viewModelScope.launch {
            try {
                fieldTest.id?.let { id ->
                    Supabase.client.from("services").update(fieldTest) {
                        filter {
                            eq("id", id)
                        }
                    }
                    fetchFieldTests()
                }
            } catch (e: Exception) {
                e.printStackTrace()
            }
        }
    }

    fun deleteFieldTest(testId: String) {
        viewModelScope.launch {
            try {
                Supabase.client.from("services").delete {
                    filter {
                        eq("id", testId)
                    }
                }
                fetchFieldTests()
            } catch (e: Exception) {
                e.printStackTrace()
            }
        }
    }
}
