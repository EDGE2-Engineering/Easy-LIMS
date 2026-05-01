package com.easylims.viewmodels

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.easylims.lib.Supabase
import com.easylims.models.MaterialMaster
import io.github.jan.supabase.postgrest.from
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.launch

class MaterialsViewModel : ViewModel() {
    private val _materials = MutableStateFlow<List<MaterialMaster>>(emptyList())
    val materials: StateFlow<List<MaterialMaster>> = _materials

    private val _isLoading = MutableStateFlow(false)
    val isLoading: StateFlow<Boolean> = _isLoading

    private val _errorMessage = MutableStateFlow<String?>(null)
    val errorMessage: StateFlow<String?> = _errorMessage

    init {
        fetchMaterials()
    }

    fun fetchMaterials() {
        viewModelScope.launch {
            _isLoading.value = true
            _errorMessage.value = null
            try {
                val results = Supabase.client.from("materials").select().decodeList<MaterialMaster>()
                _materials.value = results.sortedBy { it.name ?: "" }
            } catch (e: Exception) {
                e.printStackTrace()
                _errorMessage.value = "Failed to load materials: ${e.localizedMessage}"
            } finally {
                _isLoading.value = false
            }
        }
    }

    fun addMaterial(name: String) {
        viewModelScope.launch {
            try {
                Supabase.client.from("materials").insert(mapOf("name" to name))
                fetchMaterials()
            } catch (e: Exception) {
                e.printStackTrace()
                _errorMessage.value = "Failed to add material: ${e.localizedMessage}"
            }
        }
    }

    fun updateMaterial(id: String, name: String) {
        viewModelScope.launch {
            try {
                Supabase.client.from("materials").update(mapOf("name" to name)) {
                    filter {
                        eq("id", id)
                    }
                }
                fetchMaterials()
            } catch (e: Exception) {
                e.printStackTrace()
                _errorMessage.value = "Failed to update material: ${e.localizedMessage}"
            }
        }
    }

    fun deleteMaterial(id: String) {
        viewModelScope.launch {
            try {
                Supabase.client.from("materials").delete {
                    filter {
                        eq("id", id)
                    }
                }
                fetchMaterials()
            } catch (e: Exception) {
                e.printStackTrace()
                _errorMessage.value = "Failed to delete material: ${e.localizedMessage}"
            }
        }
    }
}
