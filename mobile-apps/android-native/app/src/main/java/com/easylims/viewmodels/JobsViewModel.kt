package com.easylims.viewmodels

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.easylims.lib.Supabase
import com.easylims.models.Job
import io.github.jan.supabase.postgrest.from
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import io.github.jan.supabase.postgrest.query.Columns
import kotlinx.coroutines.launch

class JobsViewModel : ViewModel() {
    private val _jobs = MutableStateFlow<List<Job>>(emptyList())
    val jobs: StateFlow<List<Job>> = _jobs.asStateFlow()

    private val _isLoading = MutableStateFlow(false)
    val isLoading: StateFlow<Boolean> = _isLoading.asStateFlow()

    private val _error = MutableStateFlow<String?>(null)
    val error: StateFlow<String?> = _error.asStateFlow()

    init {
        fetchJobs()
    }

    fun fetchJobs() {
        viewModelScope.launch {
            _isLoading.value = true
            _error.value = null
            try {
                val result = Supabase.client.from("jobs")
                    .select(Columns.raw("*, clients(client_name)"))
                    .decodeList<Job>()
                _jobs.value = result.sortedByDescending { it.createdAt }
            } catch (e: Exception) {
                _error.value = "Failed to fetch jobs: ${e.message}"
            } finally {
                _isLoading.value = false
            }
        }
    }

    fun upsertJob(job: Job) {
        viewModelScope.launch {
            _isLoading.value = true
            _error.value = null
            try {
                Supabase.client.from("jobs").upsert(job)
                fetchJobs()
            } catch (e: Exception) {
                _error.value = "Failed to save job: ${e.message}"
            } finally {
                _isLoading.value = false
            }
        }
    }
}
