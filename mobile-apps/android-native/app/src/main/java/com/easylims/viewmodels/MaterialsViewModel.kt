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

    init {
        fetchMaterials()
    }

    fun fetchMaterials() {
        viewModelScope.launch {
            _isLoading.value = true
            try {
                val results = Supabase.client.from("materials").select().decodeList<MaterialMaster>()
                _materials.value = results.sortedBy { it.name }
            } catch (e: Exception) {
                e.printStackTrace()
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
            }
        }
    }
}
