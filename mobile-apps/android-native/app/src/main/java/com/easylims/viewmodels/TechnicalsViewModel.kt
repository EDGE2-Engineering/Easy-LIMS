package com.easylims.viewmodels

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.easylims.lib.Supabase
import com.easylims.models.TechnicalSpec
import io.github.jan.supabase.postgrest.from
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.launch

class TechnicalsViewModel : ViewModel() {
    private val _technicals = MutableStateFlow<List<TechnicalSpec>>(emptyList())
    val technicals: StateFlow<List<TechnicalSpec>> = _technicals

    private val _isLoading = MutableStateFlow(false)
    val isLoading: StateFlow<Boolean> = _isLoading

    init {
        fetchTechnicals()
    }

    fun fetchTechnicals() {
        viewModelScope.launch {
            _isLoading.value = true
            try {
                val results = Supabase.client.from("technicals").select().decodeList<TechnicalSpec>()
                _technicals.value = results.sortedBy { it.id }
            } catch (e: Exception) {
                e.printStackTrace()
            } finally {
                _isLoading.value = false
            }
        }
    }

    fun addTechnical(text: String, type: String) {
        viewModelScope.launch {
            try {
                Supabase.client.from("technicals").insert(mapOf("text" to text, "type" to type))
                fetchTechnicals()
            } catch (e: Exception) {
                e.printStackTrace()
            }
        }
    }

    fun updateTechnical(id: Int, text: String, type: String) {
        viewModelScope.launch {
            try {
                Supabase.client.from("technicals").update(mapOf("text" to text, "type" to type)) {
                    filter {
                        eq("id", id)
                    }
                }
                fetchTechnicals()
            } catch (e: Exception) {
                e.printStackTrace()
            }
        }
    }

    fun deleteTechnical(id: Int) {
        viewModelScope.launch {
            try {
                Supabase.client.from("technicals").delete {
                    filter {
                        eq("id", id)
                    }
                }
                fetchTechnicals()
            } catch (e: Exception) {
                e.printStackTrace()
            }
        }
    }
}
