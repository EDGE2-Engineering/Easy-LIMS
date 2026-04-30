package com.easylims.viewmodels

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.easylims.lib.Supabase
import com.easylims.models.Expense
import io.github.jan.supabase.postgrest.from
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch

class ExpensesViewModel : ViewModel() {
    private val _expenses = MutableStateFlow<List<Expense>>(emptyList())
    val expenses: StateFlow<List<Expense>> = _expenses.asStateFlow()

    private val _isLoading = MutableStateFlow(false)
    val isLoading: StateFlow<Boolean> = _isLoading.asStateFlow()

    private val _error = MutableStateFlow<String?>(null)
    val error: StateFlow<String?> = _error.asStateFlow()

    init {
        fetchExpenses()
    }

    fun fetchExpenses() {
        viewModelScope.launch {
            _isLoading.value = true
            _error.value = null
            try {
                val result = Supabase.client.from("expenses")
                    .select()
                    .decodeList<Expense>()
                _expenses.value = result.sortedByDescending { it.date }
            } catch (e: Exception) {
                _error.value = "Failed to fetch expenses: ${e.message}"
            } finally {
                _isLoading.value = false
            }
        }
    }

    fun addExpense(expense: Expense) {
        viewModelScope.launch {
            _isLoading.value = true
            _error.value = null
            try {
                Supabase.client.from("expenses").insert(expense)
                fetchExpenses() // Refresh list
            } catch (e: Exception) {
                _error.value = "Failed to add expense: ${e.message}"
            } finally {
                _isLoading.value = false
            }
        }
    }

    fun updateExpense(expense: Expense) {
        viewModelScope.launch {
            _isLoading.value = true
            _error.value = null
            try {
                expense.id?.let {
                    Supabase.client.from("expenses").update(
                        {
                            set("description", expense.description)
                            set("amount", expense.amount)
                            set("date", expense.date)
                            set("remarks", expense.remarks)
                        }
                    ) {
                        filter { eq("id", it) }
                    }
                    fetchExpenses() // Refresh list
                }
            } catch (e: Exception) {
                _error.value = "Failed to update expense: ${e.message}"
            } finally {
                _isLoading.value = false
            }
        }
    }

    fun deleteExpense(id: String) {
        viewModelScope.launch {
            _isLoading.value = true
            _error.value = null
            try {
                Supabase.client.from("expenses").delete {
                    filter { eq("id", id) }
                }
                fetchExpenses() // Refresh list
            } catch (e: Exception) {
                _error.value = "Failed to delete expense: ${e.message}"
            } finally {
                _isLoading.value = false
            }
        }
    }
}
