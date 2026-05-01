package com.easylims.viewmodels

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.easylims.lib.Supabase
import com.easylims.models.LabTest
import io.github.jan.supabase.postgrest.from
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.launch

class LabTestsViewModel : ViewModel() {
    private val _labTests = MutableStateFlow<List<LabTest>>(emptyList())
    val labTests: StateFlow<List<LabTest>> = _labTests

    private val _isLoading = MutableStateFlow(false)
    val isLoading: StateFlow<Boolean> = _isLoading

    init {
        fetchLabTests()
    }

    fun fetchLabTests() {
        viewModelScope.launch {
            _isLoading.value = true
            try {
                val results = Supabase.client.from("tests").select().decodeList<LabTest>()
                _labTests.value = results.sortedBy { it.testType }
            } catch (e: Exception) {
                e.printStackTrace()
            } finally {
                _isLoading.value = false
            }
        }
    }

    fun addLabTest(labTest: LabTest) {
        viewModelScope.launch {
            try {
                Supabase.client.from("tests").insert(labTest)
                fetchLabTests()
            } catch (e: Exception) {
                e.printStackTrace()
            }
        }
    }

    fun updateLabTest(labTest: LabTest) {
        viewModelScope.launch {
            try {
                labTest.id?.let { id ->
                    Supabase.client.from("tests").update(labTest) {
                        filter {
                            eq("id", id)
                        }
                    }
                    fetchLabTests()
                }
            } catch (e: Exception) {
                e.printStackTrace()
            }
        }
    }

    fun deleteLabTest(testId: String) {
        viewModelScope.launch {
            try {
                Supabase.client.from("tests").delete {
                    filter {
                        eq("id", testId)
                    }
                }
                fetchLabTests()
            } catch (e: Exception) {
                e.printStackTrace()
            }
        }
    }
}
