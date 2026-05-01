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

    init {
        fetchUnitTypes()
    }

    fun fetchUnitTypes() {
        viewModelScope.launch {
            _isLoading.value = true
            try {
                val results = Supabase.client.from("unit_types").select().decodeList<UnitType>()
                _unitTypes.value = results.sortedBy { it.unitType }
            } catch (e: Exception) {
                e.printStackTrace()
            } finally {
                _isLoading.value = false
            }
        }
    }

    fun addUnitType(name: String) {
        viewModelScope.launch {
            try {
                Supabase.client.from("unit_types").insert(mapOf("unit_type" to name))
                fetchUnitTypes()
            } catch (e: Exception) {
                e.printStackTrace()
            }
        }
    }

    fun updateUnitType(id: String, name: String) {
        viewModelScope.launch {
            try {
                Supabase.client.from("unit_types").update(mapOf("unit_type" to name)) {
                    filter {
                        eq("id", id)
                    }
                }
                fetchUnitTypes()
            } catch (e: Exception) {
                e.printStackTrace()
            }
        }
    }

    fun deleteUnitType(id: String) {
        viewModelScope.launch {
            try {
                Supabase.client.from("unit_types").delete {
                    filter {
                        eq("id", id)
                    }
                }
                fetchUnitTypes()
            } catch (e: Exception) {
                e.printStackTrace()
            }
        }
    }
}
