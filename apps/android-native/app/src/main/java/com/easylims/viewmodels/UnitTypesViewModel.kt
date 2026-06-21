package com.easylims.viewmodels

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.easylims.lib.Supabase
import com.easylims.models.UnitType
import io.github.jan.supabase.postgrest.from
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.launch

class UnitTypesViewModel : ViewModel() {
    private val _unitTypes = MutableStateFlow<List<UnitType>>(emptyList())
    val unitTypes: StateFlow<List<UnitType>> = _unitTypes

    private val _isLoading = MutableStateFlow(false)
    val isLoading: StateFlow<Boolean> = _isLoading

    private val _errorMessage = MutableStateFlow<String?>(null)
    val errorMessage: StateFlow<String?> = _errorMessage

    init {
        fetchUnitTypes()
    }

    fun fetchUnitTypes() {
        viewModelScope.launch {
            _isLoading.value = true
            _errorMessage.value = null
            try {
                val results = Supabase.client.from("service_unit_types").select().decodeList<UnitType>()
                _unitTypes.value = results.sortedBy { it.unitType ?: "" }
            } catch (e: Exception) {
                e.printStackTrace()
                _errorMessage.value = "Failed to load units: ${e.localizedMessage}"
            } finally {
                _isLoading.value = false
            }
        }
    }

    fun addUnitType(name: String) {
        viewModelScope.launch {
            try {
                Supabase.client.from("service_unit_types").insert(mapOf("unit_type" to name))
                fetchUnitTypes()
            } catch (e: Exception) {
                e.printStackTrace()
                _errorMessage.value = "Failed to add unit: ${e.localizedMessage}"
            }
        }
    }

    fun updateUnitType(id: String, name: String) {
        viewModelScope.launch {
            try {
                Supabase.client.from("service_unit_types").update(mapOf("unit_type" to name)) {
                    filter {
                        eq("id", id)
                    }
                }
                fetchUnitTypes()
            } catch (e: Exception) {
                e.printStackTrace()
                _errorMessage.value = "Failed to update unit: ${e.localizedMessage}"
            }
        }
    }

    fun deleteUnitType(id: String) {
        viewModelScope.launch {
            try {
                Supabase.client.from("service_unit_types").delete {
                    filter {
                        eq("id", id)
                    }
                }
                fetchUnitTypes()
            } catch (e: Exception) {
                e.printStackTrace()
                _errorMessage.value = "Failed to delete unit: ${e.localizedMessage}"
            }
        }
    }
}
