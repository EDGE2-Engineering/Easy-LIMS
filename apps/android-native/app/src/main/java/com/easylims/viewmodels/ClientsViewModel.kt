package com.easylims.viewmodels

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.easylims.lib.Supabase
import com.easylims.models.Client
import io.github.jan.supabase.postgrest.from
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.launch

class ClientsViewModel : ViewModel() {
    private val _clients = MutableStateFlow<List<Client>>(emptyList())
    val clients: StateFlow<List<Client>> = _clients

    private val _isLoading = MutableStateFlow(false)
    val isLoading: StateFlow<Boolean> = _isLoading

    private val _errorMessage = MutableStateFlow<String?>(null)
    val errorMessage: StateFlow<String?> = _errorMessage

    init {
        fetchClients()
    }

    fun fetchClients() {
        viewModelScope.launch {
            _isLoading.value = true
            _errorMessage.value = null
            try {
                val results = Supabase.client.from("clients").select().decodeList<Client>()
                _clients.value = results.sortedBy { it.clientName ?: "" }
            } catch (e: Exception) {
                e.printStackTrace()
                _errorMessage.value = "Failed to load clients: ${e.localizedMessage}"
            } finally {
                _isLoading.value = false
            }
        }
    }

    fun addClient(client: Client) {
        viewModelScope.launch {
            try {
                Supabase.client.from("clients").insert(client)
                fetchClients()
            } catch (e: Exception) {
                e.printStackTrace()
            }
        }
    }

    fun updateClient(client: Client) {
        viewModelScope.launch {
            try {
                client.id?.let { id ->
                    Supabase.client.from("clients").update(client) {
                        filter {
                            eq("id", id)
                        }
                    }
                    fetchClients()
                }
            } catch (e: Exception) {
                e.printStackTrace()
            }
        }
    }

    fun deleteClient(clientId: String) {
        viewModelScope.launch {
            try {
                Supabase.client.from("clients").delete {
                    filter {
                        eq("id", clientId)
                    }
                }
                fetchClients()
            } catch (e: Exception) {
                e.printStackTrace()
            }
        }
    }
}
