package com.easylims.viewmodels

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.easylims.lib.Supabase
import com.easylims.models.TermCondition
import io.github.jan.supabase.postgrest.from
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.launch

class TermsViewModel : ViewModel() {
    private val _terms = MutableStateFlow<List<TermCondition>>(emptyList())
    val terms: StateFlow<List<TermCondition>> = _terms

    private val _isLoading = MutableStateFlow(false)
    val isLoading: StateFlow<Boolean> = _isLoading

    init {
        fetchTerms()
    }

    fun fetchTerms() {
        viewModelScope.launch {
            _isLoading.value = true
            try {
                val results = Supabase.client.from("terms_and_conditions").select().decodeList<TermCondition>()
                _terms.value = results.sortedBy { it.id }
            } catch (e: Exception) {
                e.printStackTrace()
            } finally {
                _isLoading.value = false
            }
        }
    }

    fun addTerm(text: String, type: String) {
        viewModelScope.launch {
            try {
                Supabase.client.from("terms_and_conditions").insert(mapOf("text" to text, "type" to type))
                fetchTerms()
            } catch (e: Exception) {
                e.printStackTrace()
            }
        }
    }

    fun updateTerm(id: Int, text: String, type: String) {
        viewModelScope.launch {
            try {
                Supabase.client.from("terms_and_conditions").update(mapOf("text" to text, "type" to type)) {
                    filter {
                        eq("id", id)
                    }
                }
                fetchTerms()
            } catch (e: Exception) {
                e.printStackTrace()
            }
        }
    }

    fun deleteTerm(id: Int) {
        viewModelScope.launch {
            try {
                Supabase.client.from("terms_and_conditions").delete {
                    filter {
                        eq("id", id)
                    }
                }
                fetchTerms()
            } catch (e: Exception) {
                e.printStackTrace()
            }
        }
    }
}
