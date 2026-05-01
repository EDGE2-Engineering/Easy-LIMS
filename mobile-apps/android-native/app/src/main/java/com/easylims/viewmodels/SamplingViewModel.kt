package com.easylims.viewmodels

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.easylims.lib.Supabase
import com.easylims.models.SamplingItem
import io.github.jan.supabase.postgrest.from
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.launch

class SamplingViewModel : ViewModel() {
    private val _samplingItems = MutableStateFlow<List<SamplingItem>>(emptyList())
    val samplingItems: StateFlow<List<SamplingItem>> = _samplingItems

    private val _isLoading = MutableStateFlow(false)
    val isLoading: StateFlow<Boolean> = _isLoading

    init {
        fetchSamplingItems()
    }

    fun fetchSamplingItems() {
        viewModelScope.launch {
            _isLoading.value = true
            try {
                val results = Supabase.client.from("sampling").select().decodeList<SamplingItem>()
                _samplingItems.value = results.sortedBy { it.serviceType }
            } catch (e: Exception) {
                e.printStackTrace()
            } finally {
                _isLoading.value = false
            }
        }
    }

    fun addSamplingItem(item: SamplingItem) {
        viewModelScope.launch {
            try {
                Supabase.client.from("sampling").insert(item)
                fetchSamplingItems()
            } catch (e: Exception) {
                e.printStackTrace()
            }
        }
    }

    fun updateSamplingItem(item: SamplingItem) {
        viewModelScope.launch {
            try {
                item.id?.let { id ->
                    Supabase.client.from("sampling").update(item) {
                        filter {
                            eq("id", id)
                        }
                    }
                    fetchSamplingItems()
                }
            } catch (e: Exception) {
                e.printStackTrace()
            }
        }
    }

    fun deleteSamplingItem(itemId: String) {
        viewModelScope.launch {
            try {
                Supabase.client.from("sampling").delete {
                    filter {
                        eq("id", itemId)
                    }
                }
                fetchSamplingItems()
            } catch (e: Exception) {
                e.printStackTrace()
            }
        }
    }
}
