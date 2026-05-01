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
import com.easylims.models.FieldTest
import com.easylims.viewmodels.FieldTestsViewModel

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun FieldTestsScreen(navController: NavController, viewModel: FieldTestsViewModel = viewModel()) {
    val fieldTests by viewModel.fieldTests.collectAsState()
    val isLoading by viewModel.isLoading.collectAsState()
    var searchQuery by remember { mutableStateOf("") }
    var showDialog by remember { mutableStateOf(false) }
    var selectedTest by remember { mutableStateOf<FieldTest?>(null) }

    val filteredTests = fieldTests.filter {
        it.serviceType.contains(searchQuery, ignoreCase = true)
    }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Field Tests", fontWeight = FontWeight.Bold) },
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
                    selectedTest = null
                    showDialog = true
                },
                containerColor = MaterialTheme.colorScheme.primary,
                contentColor = Color.White
            ) {
                Icon(Icons.Default.Add, contentDescription = "Add Field Test")
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
                placeholder = { Text("Search field tests...") },
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
                    verticalArrangement = Arrangement.spacedBy(12.dp)
                ) {
                    items(filteredTests) { test ->
                        FieldTestItem(
                            test = test,
                            onClick = {
                                selectedTest = test
                                showDialog = true
                            },
                            onDelete = { viewModel.deleteFieldTest(test.id!!) }
                        )
                    }
                }
            }
        }

        if (showDialog) {
            FieldTestDialog(
                test = selectedTest,
                onDismiss = { showDialog = false },
                onSave = { updatedTest ->
                    if (selectedTest == null) {
                        viewModel.addFieldTest(updatedTest)
                    } else {
                        viewModel.updateFieldTest(updatedTest)
                    }
                    showDialog = false
                }
            )
        }
    }
}

@Composable
fun FieldTestItem(test: FieldTest, onClick: () -> Unit, onDelete: () -> Unit) {
    Card(
        modifier = Modifier
            .fillMaxWidth()
            .clickable(onClick = onClick),
        shape = RoundedCornerShape(16.dp),
        elevation = CardDefaults.cardElevation(defaultElevation = 2.dp)
    ) {
        Column(modifier = Modifier.padding(16.dp)) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Column(modifier = Modifier.weight(1f)) {
                    Text(
                        text = test.serviceType,
                        fontSize = 18.sp,
                        fontWeight = FontWeight.Bold,
                        color = MaterialTheme.colorScheme.primary
                    )
                    Spacer(modifier = Modifier.height(4.dp))
                    Text(
                        text = "Price: ₹${test.price}",
                        fontSize = 14.sp,
                        fontWeight = FontWeight.Bold,
                        color = MaterialTheme.colorScheme.secondary
                    )
                }
                IconButton(onClick = onDelete) {
                    Icon(Icons.Default.Delete, contentDescription = "Delete", tint = MaterialTheme.colorScheme.error)
                }
            }
            
            Spacer(modifier = Modifier.height(8.dp))
            Row(verticalAlignment = Alignment.CenterVertically) {
                Icon(Icons.Default.Info, contentDescription = null, modifier = Modifier.size(16.dp), tint = Color.Gray)
                Spacer(modifier = Modifier.width(4.dp))
                Text(text = "Unit: ${test.unit ?: "NA"} | Qty: ${test.qty}", fontSize = 12.sp, color = Color.Gray)
            }
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun FieldTestDialog(test: FieldTest?, onDismiss: () -> Unit, onSave: (FieldTest) -> Unit) {
    var serviceType by remember { mutableStateOf(test?.serviceType ?: "") }
    var price by remember { mutableStateOf(test?.price?.toString() ?: "0") }
    var unit by remember { mutableStateOf(test?.unit ?: "") }
    var qty by remember { mutableStateOf(test?.qty?.toString() ?: "1") }

    AlertDialog(
        onDismissRequest = onDismiss,
        title = { Text(if (test == null) "Add Field Test" else "Edit Field Test") },
        text = {
            Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
                OutlinedTextField(
                    value = serviceType,
                    onValueChange = { serviceType = it },
                    label = { Text("Service Type") },
                    modifier = Modifier.fillMaxWidth()
                )
                OutlinedTextField(
                    value = price,
                    onValueChange = { price = it },
                    label = { Text("Price (₹)") },
                    modifier = Modifier.fillMaxWidth()
                )
                OutlinedTextField(
                    value = unit,
                    onValueChange = { unit = it },
                    label = { Text("Unit") },
                    modifier = Modifier.fillMaxWidth()
                )
                OutlinedTextField(
                    value = qty,
                    onValueChange = { qty = it },
                    label = { Text("Default Quantity") },
                    modifier = Modifier.fillMaxWidth()
                )
            }
        },
        confirmButton = {
            Button(onClick = {
                onSave(
                    FieldTest(
                        id = test?.id,
                        serviceType = serviceType,
                        price = price.toDoubleOrNull() ?: 0.0,
                        unit = unit,
                        qty = qty.toIntOrNull() ?: 1,
                        methodOfSampling = test?.methodOfSampling,
                        numBHs = test?.numBHs ?: 0,
                        measure = test?.measure,
                        hsnCode = test?.hsnCode,
                        tcList = test?.tcList,
                        techList = test?.techList
                    )
                )
            }) {
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
