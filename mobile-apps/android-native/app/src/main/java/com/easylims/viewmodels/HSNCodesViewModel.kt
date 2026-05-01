package com.easylims.viewmodels

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.easylims.lib.Supabase
import com.easylims.models.HSNCode
import io.github.jan.supabase.postgrest.from
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.launch

class HSNCodesViewModel : ViewModel() {
    private val _hsnCodes = MutableStateFlow<List<HSNCode>>(emptyList())
    val hsnCodes: StateFlow<List<HSNCode>> = _hsnCodes

    private val _isLoading = MutableStateFlow(false)
    val isLoading: StateFlow<Boolean> = _isLoading

    init {
        fetchHSNCodes()
    }

    fun fetchHSNCodes() {
        viewModelScope.launch {
            _isLoading.value = true
            try {
                val results = Supabase.client.from("hsn_codes").select().decodeList<HSNCode>()
                _hsnCodes.value = results.sortedBy { it.code ?: "" }
            } catch (e: Exception) {
                e.printStackTrace()
            } finally {
                _isLoading.value = false
            }
        }
    }

    fun addHSNCode(code: String, description: String) {
        viewModelScope.launch {
            try {
                Supabase.client.from("hsn_codes").insert(mapOf("code" to code, "description" to description))
                fetchHSNCodes()
            } catch (e: Exception) {
                e.printStackTrace()
            }
        }
    }

    fun updateHSNCode(id: String, code: String, description: String) {
        viewModelScope.launch {
            try {
                Supabase.client.from("hsn_codes").update(mapOf("code" to code, "description" to description)) {
                    filter {
                        eq("id", id)
                    }
                }
                fetchHSNCodes()
            } catch (e: Exception) {
                e.printStackTrace()
            }
        }
    }

    fun deleteHSNCode(id: String) {
        viewModelScope.launch {
            try {
                Supabase.client.from("hsn_codes").delete {
                    filter {
                        eq("id", id)
                    }
                }
                fetchHSNCodes()
            } catch (e: Exception) {
                e.printStackTrace()
            }
        }
    }
}
