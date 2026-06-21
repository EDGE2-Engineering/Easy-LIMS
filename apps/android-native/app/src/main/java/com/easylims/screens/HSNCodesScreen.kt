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
import com.easylims.models.HSNCode
import com.easylims.viewmodels.HSNCodesViewModel

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun HSNCodesScreen(navController: NavController, viewModel: HSNCodesViewModel = viewModel()) {
    val hsnCodes by viewModel.hsnCodes.collectAsState()
    val isLoading by viewModel.isLoading.collectAsState()
    var searchQuery by remember { mutableStateOf("") }
    var showDialog by remember { mutableStateOf(false) }
    var selectedCode by remember { mutableStateOf<HSNCode?>(null) }

    val filteredCodes = hsnCodes.filter {
        (it.code?.contains(searchQuery, ignoreCase = true) ?: false) ||
                (it.description?.contains(searchQuery, ignoreCase = true) ?: false)
    }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("HSN & SAC Codes", fontWeight = FontWeight.Bold) },
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
                    selectedCode = null
                    showDialog = true
                },
                containerColor = MaterialTheme.colorScheme.primary,
                contentColor = Color.White
            ) {
                Icon(Icons.Default.Add, contentDescription = "Add HSN Code")
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
                placeholder = { Text("Search codes...") },
                leadingIcon = { Icon(Icons.Default.Search, contentDescription = null) },
                shape = RoundedCornerShape(12.dp)
            )

            val errorMessage by viewModel.errorMessage.collectAsState()
            if (errorMessage != null) {
                Text(
                    text = errorMessage!!,
                    color = MaterialTheme.colorScheme.error,
                    modifier = Modifier.padding(horizontal = 16.dp, vertical = 8.dp),
                    fontSize = 12.sp
                )
            }

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
                    items(filteredCodes) { hsn ->
                        HSNItem(
                            hsn = hsn,
                            onClick = {
                                selectedCode = hsn
                                showDialog = true
                            },
                            onDelete = { viewModel.deleteHSNCode(hsn.getIdString()) }
                        )
                    }
                }
            }
        }

        if (showDialog) {
            HSNDialog(
                hsn = selectedCode,
                onDismiss = { showDialog = false },
                onSave = { code, desc ->
                    if (selectedCode == null) {
                        viewModel.addHSNCode(code, desc)
                    } else {
                        viewModel.updateHSNCode(selectedCode!!.getIdString(), code, desc)
                    }
                    showDialog = false
                }
            )
        }
    }
}

@Composable
fun HSNItem(hsn: HSNCode, onClick: () -> Unit, onDelete: () -> Unit) {
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
                Text(
                    text = hsn.code ?: "",
                    fontSize = 18.sp,
                    fontWeight = FontWeight.Bold,
                    color = MaterialTheme.colorScheme.primary
                )
                IconButton(onClick = onDelete) {
                    Icon(Icons.Default.Delete, contentDescription = "Delete", tint = MaterialTheme.colorScheme.error)
                }
            }
            if (hsn.description != null) {
                Spacer(modifier = Modifier.height(4.dp))
                Text(text = hsn.description, fontSize = 14.sp, color = Color.Gray)
            }
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun HSNDialog(hsn: HSNCode?, onDismiss: () -> Unit, onSave: (String, String) -> Unit) {
    var code by remember { mutableStateOf(hsn?.code ?: "") }
    var description by remember { mutableStateOf(hsn?.description ?: "") }

    AlertDialog(
        onDismissRequest = onDismiss,
        title = { Text(if (hsn == null) "Add HSN Code" else "Edit HSN Code") },
        text = {
            Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
                OutlinedTextField(
                    value = code,
                    onValueChange = { code = it },
                    label = { Text("Code") },
                    modifier = Modifier.fillMaxWidth()
                )
                OutlinedTextField(
                    value = description,
                    onValueChange = { description = it },
                    label = { Text("Description") },
                    modifier = Modifier.fillMaxWidth()
                )
            }
        },
        confirmButton = {
            Button(onClick = { onSave(code, description) }) {
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
