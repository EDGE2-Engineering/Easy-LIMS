package com.easylims.viewmodels

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.easylims.lib.Supabase
import com.easylims.models.User
import io.github.jan.supabase.postgrest.from
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.launch

class UsersViewModel : ViewModel() {
    private val _users = MutableStateFlow<List<User>>(emptyList())
    val users: StateFlow<List<User>> = _users

    private val _isLoading = MutableStateFlow(false)
    val isLoading: StateFlow<Boolean> = _isLoading

    init {
        fetchUsers()
    }

    fun fetchUsers() {
        viewModelScope.launch {
            _isLoading.value = true
            try {
                val results = Supabase.client.from("users").select().decodeList<User>()
                _users.value = results.sortedBy { it.username }
            } catch (e: Exception) {
                e.printStackTrace()
            } finally {
                _isLoading.value = false
            }
        }
    }

    fun addUser(user: User) {
        viewModelScope.launch {
            try {
                Supabase.client.from("users").insert(user)
                fetchUsers()
            } catch (e: Exception) {
                e.printStackTrace()
            }
        }
    }

    fun updateUser(user: User) {
        viewModelScope.launch {
            try {
                user.id?.let { id ->
                    Supabase.client.from("users").update(user) {
                        filter {
                            eq("id", id)
                        }
                    }
                    fetchUsers()
                }
            } catch (e: Exception) {
                e.printStackTrace()
            }
        }
    }

    fun toggleUserStatus(user: User) {
        viewModelScope.launch {
            try {
                user.id?.let { id ->
                    val updatedUser = user.copy(isActive = !user.isActive)
                    Supabase.client.from("users").update(updatedUser) {
                        filter {
                            eq("id", id)
                        }
                    }
                    fetchUsers()
                }
            } catch (e: Exception) {
                e.printStackTrace()
            }
        }
    }
}
