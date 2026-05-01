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
import com.easylims.models.LabTest
import com.easylims.viewmodels.LabTestsViewModel

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun LabTestsScreen(navController: NavController, viewModel: LabTestsViewModel = viewModel()) {
    val labTests by viewModel.labTests.collectAsState()
    val isLoading by viewModel.isLoading.collectAsState()
    var searchQuery by remember { mutableStateOf("") }
    var showDialog by remember { mutableStateOf(false) }
    var selectedTest by remember { mutableStateOf<LabTest?>(null) }

    val filteredTests = labTests.filter {
        it.testType.contains(searchQuery, ignoreCase = true)
    }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Lab Tests", fontWeight = FontWeight.Bold) },
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
                Icon(Icons.Default.Add, contentDescription = "Add Lab Test")
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
                placeholder = { Text("Search lab tests...") },
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
                        LabTestItem(
                            test = test,
                            onClick = {
                                selectedTest = test
                                showDialog = true
                            },
                            onDelete = { viewModel.deleteLabTest(test.id!!) }
                        )
                    }
                }
            }
        }

        if (showDialog) {
            LabTestDialog(
                test = selectedTest,
                onDismiss = { showDialog = false },
                onSave = { updatedTest ->
                    if (selectedTest == null) {
                        viewModel.addLabTest(updatedTest)
                    } else {
                        viewModel.updateLabTest(updatedTest)
                    }
                    showDialog = false
                }
            )
        }
    }
}

@Composable
fun LabTestItem(test: LabTest, onClick: () -> Unit, onDelete: () -> Unit) {
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
                        text = test.testType,
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
                Icon(Icons.Default.Science, contentDescription = null, modifier = Modifier.size(16.dp), tint = Color.Gray)
                Spacer(modifier = Modifier.width(4.dp))
                Text(text = "Method: ${test.testMethodSpecification ?: "NA"} | Days: ${test.numDays}", fontSize = 12.sp, color = Color.Gray)
            }
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun LabTestDialog(test: LabTest?, onDismiss: () -> Unit, onSave: (LabTest) -> Unit) {
    var testType by remember { mutableStateOf(test?.testType ?: "") }
    var price by remember { mutableStateOf(test?.price?.toString() ?: "0") }
    var method by remember { mutableStateOf(test?.testMethodSpecification ?: "") }
    var days by remember { mutableStateOf(test?.numDays?.toString() ?: "0") }

    AlertDialog(
        onDismissRequest = onDismiss,
        title = { Text(if (test == null) "Add Lab Test" else "Edit Lab Test") },
        text = {
            Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
                OutlinedTextField(
                    value = testType,
                    onValueChange = { testType = it },
                    label = { Text("Test Type") },
                    modifier = Modifier.fillMaxWidth()
                )
                OutlinedTextField(
                    value = price,
                    onValueChange = { price = it },
                    label = { Text("Price (₹)") },
                    modifier = Modifier.fillMaxWidth()
                )
                OutlinedTextField(
                    value = method,
                    onValueChange = { method = it },
                    label = { Text("Test Method") },
                    modifier = Modifier.fillMaxWidth()
                )
                OutlinedTextField(
                    value = days,
                    onValueChange = { days = it },
                    label = { Text("Number of Days") },
                    modifier = Modifier.fillMaxWidth()
                )
            }
        },
        confirmButton = {
            Button(onClick = {
                onSave(
                    LabTest(
                        id = test?.id,
                        testType = testType,
                        price = price.toDoubleOrNull() ?: 0.0,
                        testMethodSpecification = method,
                        numDays = days.toIntOrNull() ?: 0,
                        materials = test?.materials,
                        group = test?.group,
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
