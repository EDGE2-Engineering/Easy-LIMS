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
import com.easylims.models.SamplingItem
import com.easylims.viewmodels.SamplingViewModel

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun SamplingScreen(navController: NavController, viewModel: SamplingViewModel = viewModel()) {
    val samplingItems by viewModel.samplingItems.collectAsState()
    val isLoading by viewModel.isLoading.collectAsState()
    var searchQuery by remember { mutableStateOf("") }
    var showDialog by remember { mutableStateOf(false) }
    var selectedItem by remember { mutableStateOf<SamplingItem?>(null) }

    val filteredItems = samplingItems.filter {
        it.serviceType.contains(searchQuery, ignoreCase = true)
    }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Sampling", fontWeight = FontWeight.Bold) },
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
                    selectedItem = null
                    showDialog = true
                },
                containerColor = MaterialTheme.colorScheme.primary,
                contentColor = Color.White
            ) {
                Icon(Icons.Default.Add, contentDescription = "Add Sampling")
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
                placeholder = { Text("Search sampling items...") },
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
                    items(filteredItems) { item ->
                        SamplingItemView(
                            item = item,
                            onClick = {
                                selectedItem = item
                                showDialog = true
                            },
                            onDelete = { viewModel.deleteSamplingItem(item.id!!) }
                        )
                    }
                }
            }
        }

        if (showDialog) {
            SamplingDialog(
                item = selectedItem,
                onDismiss = { showDialog = false },
                onSave = { updatedItem ->
                    if (selectedItem == null) {
                        viewModel.addSamplingItem(updatedItem)
                    } else {
                        viewModel.updateSamplingItem(updatedItem)
                    }
                    showDialog = false
                }
            )
        }
    }
}

@Composable
fun SamplingItemView(item: SamplingItem, onClick: () -> Unit, onDelete: () -> Unit) {
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
                        text = item.serviceType,
                        fontSize = 18.sp,
                        fontWeight = FontWeight.Bold,
                        color = MaterialTheme.colorScheme.primary
                    )
                    Spacer(modifier = Modifier.height(4.dp))
                    Text(
                        text = "Price: ₹${item.price}",
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
                Icon(Icons.Default.Inventory, contentDescription = null, modifier = Modifier.size(16.dp), tint = Color.Gray)
                Spacer(modifier = Modifier.width(4.dp))
                Text(text = "Group: ${item.group ?: "NA"} | Unit: ${item.unit ?: "NA"}", fontSize = 12.sp, color = Color.Gray)
            }
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun SamplingDialog(item: SamplingItem?, onDismiss: () -> Unit, onSave: (SamplingItem) -> Unit) {
    var serviceType by remember { mutableStateOf(item?.serviceType ?: "") }
    var price by remember { mutableStateOf(item?.price?.toString() ?: "0") }
    var unit by remember { mutableStateOf(item?.unit ?: "") }
    var group by remember { mutableStateOf(item?.group ?: "") }

    AlertDialog(
        onDismissRequest = onDismiss,
        title = { Text(if (item == null) "Add Sampling" else "Edit Sampling") },
        text = {
            Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
                OutlinedTextField(
                    value = serviceType,
                    onValueChange = { serviceType = it },
                    label = { Text("Sampling Type") },
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
                    value = group,
                    onValueChange = { group = it },
                    label = { Text("Group") },
                    modifier = Modifier.fillMaxWidth()
                )
            }
        },
        confirmButton = {
            Button(onClick = {
                onSave(
                    SamplingItem(
                        id = item?.id,
                        serviceType = serviceType,
                        price = price.toDoubleOrNull() ?: 0.0,
                        unit = unit,
                        group = group,
                        materials = item?.materials,
                        testMethodSpecification = item?.testMethodSpecification,
                        qty = item?.qty ?: 1,
                        hsnCode = item?.hsnCode,
                        tcList = item?.tcList,
                        techList = item?.techList
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
