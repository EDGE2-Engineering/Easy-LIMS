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
import com.easylims.models.UnitType
import com.easylims.viewmodels.UnitTypesViewModel

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun UnitTypesScreen(navController: NavController, viewModel: UnitTypesViewModel = viewModel()) {
    val unitTypes by viewModel.unitTypes.collectAsState()
    val isLoading by viewModel.isLoading.collectAsState()
    var searchQuery by remember { mutableStateOf("") }
    var showDialog by remember { mutableStateOf(false) }
    var selectedUnit by remember { mutableStateOf<UnitType?>(null) }

    val filteredUnits = unitTypes.filter {
        it.unitType?.contains(searchQuery, ignoreCase = true) == true
    }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Measurement Units", fontWeight = FontWeight.Bold) },
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
                    selectedUnit = null
                    showDialog = true
                },
                containerColor = MaterialTheme.colorScheme.primary,
                contentColor = Color.White
            ) {
                Icon(Icons.Default.Add, contentDescription = "Add Unit")
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
                placeholder = { Text("Search units...") },
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
                    items(filteredUnits) { unit ->
                        UnitItem(
                            unit = unit,
                            onClick = {
                                selectedUnit = unit
                                showDialog = true
                            },
                            onDelete = { viewModel.deleteUnitType(unit.getIdString()) }
                        )
                    }
                }
            }
        }

        if (showDialog) {
            UnitDialog(
                unit = selectedUnit,
                onDismiss = { showDialog = false },
                onSave = { name ->
                    if (selectedUnit == null) {
                        viewModel.addUnitType(name)
                    } else {
                        viewModel.updateUnitType(selectedUnit!!.getIdString(), name)
                    }
                    showDialog = false
                }
            )
        }
    }
}

@Composable
fun UnitItem(unit: UnitType, onClick: () -> Unit, onDelete: () -> Unit) {
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
                text = unit.unitType ?: "",
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
fun UnitDialog(unit: UnitType?, onDismiss: () -> Unit, onSave: (String) -> Unit) {
    var name by remember { mutableStateOf(unit?.unitType ?: "") }

    AlertDialog(
        onDismissRequest = onDismiss,
        title = { Text(if (unit == null) "Add Unit Type" else "Edit Unit Type") },
        text = {
            OutlinedTextField(
                value = name,
                onValueChange = { name = it },
                label = { Text("Unit Name") },
                modifier = Modifier.fillMaxWidth(),
                placeholder = { Text("e.g. Per Meter") }
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
