package com.easylims.screens

import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.lifecycle.viewmodel.compose.viewModel
import androidx.navigation.NavController
import com.easylims.models.Department
import com.easylims.viewmodels.DepartmentsViewModel

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun DepartmentsScreen(navController: NavController, viewModel: DepartmentsViewModel = viewModel()) {
    val departments by viewModel.departments.collectAsState()
    val isLoading by viewModel.isLoading.collectAsState()
    var searchQuery by remember { mutableStateOf("") }
    var showDialog by remember { mutableStateOf(false) }
    var selectedDept by remember { mutableStateOf<Department?>(null) }

    val filteredDepts = departments.filter {
        it.name.contains(searchQuery, ignoreCase = true)
    }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Departments", fontWeight = FontWeight.Bold) },
                navigationIcon = {
                    IconButton(onClick = { navController.popBackStack() }) {
                        Icon(Icons.AutoMirrored.Filled.ArrowBack, contentDescription = "Back")
                    }
                }
            )
        },
        floatingActionButton = {
            FloatingActionButton(
                onClick = {
                    selectedDept = null
                    showDialog = true
                },
                containerColor = MaterialTheme.colorScheme.primary,
                contentColor = Color.White
            ) {
                Icon(Icons.Default.Add, contentDescription = "Add Department")
            }
        }
    ) { padding ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(padding)
        ) {
            OutlinedTextField(
                value = searchQuery,
                onValueChange = { searchQuery = it },
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(16.dp),
                placeholder = { Text("Search departments...") },
                leadingIcon = { Icon(Icons.Default.Search, contentDescription = null) },
                shape = RoundedCornerShape(12.dp)
            )

            if (isLoading) {
                Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                    CircularProgressIndicator()
                }
            } else {
                LazyColumn(
                    modifier = Modifier.fillMaxSize(),
                    contentPadding = PaddingValues(16.dp),
                    verticalArrangement = Arrangement.spacedBy(8.dp)
                ) {
                    items(filteredDepts) { dept ->
                        DepartmentItem(
                            dept = dept,
                            onClick = {
                                selectedDept = dept
                                showDialog = true
                            },
                            onDelete = { viewModel.deleteDepartment(dept.id!!) }
                        )
                    }
                }
            }
        }

        if (showDialog) {
            DepartmentDialog(
                dept = selectedDept,
                onDismiss = { showDialog = false },
                onSave = { name ->
                    if (selectedDept == null) {
                        viewModel.addDepartment(name)
                    } else {
                        viewModel.updateDepartment(selectedDept!!.id!!, name)
                    }
                    showDialog = false
                }
            )
        }
    }
}

@Composable
fun DepartmentItem(dept: Department, onClick: () -> Unit, onDelete: () -> Unit) {
    Card(
        modifier = Modifier
            .fillMaxWidth()
            .clickable(onClick = onClick),
        shape = RoundedCornerShape(12.dp),
        elevation = CardDefaults.cardElevation(defaultElevation = 1.dp)
    ) {
        Row(
            modifier = Modifier.padding(16.dp),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.SpaceBetween
        ) {
            Text(
                text = dept.name,
                fontSize = 16.sp,
                fontWeight = FontWeight.Medium
            )
            IconButton(onClick = onDelete) {
                Icon(Icons.Default.Delete, contentDescription = "Delete", tint = MaterialTheme.colorScheme.error)
            }
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun DepartmentDialog(dept: Department?, onDismiss: () -> Unit, onSave: (String) -> Unit) {
    var name by remember { mutableStateOf(dept?.name ?: "") }

    AlertDialog(
        onDismissRequest = onDismiss,
        title = { Text(if (dept == null) "Add Department" else "Edit Department") },
        text = {
            OutlinedTextField(
                value = name,
                onValueChange = { name = it },
                label = { Text("Department Name") },
                modifier = Modifier.fillMaxWidth(),
                placeholder = { Text("e.g. Civil Engineering") }
            )
        },
        confirmButton = {
            Button(onClick = { onSave(name) }) {
                Text("Save")
            }
        },
        dismissButton = {
            TextButton(onClick = onDismiss) {
                Text("Cancel")
            }
        }
    )
}
