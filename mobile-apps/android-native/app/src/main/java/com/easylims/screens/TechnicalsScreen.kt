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
import com.easylims.models.TechnicalSpec
import com.easylims.viewmodels.TechnicalsViewModel

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun TechnicalsScreen(navController: NavController, viewModel: TechnicalsViewModel = viewModel()) {
    val technicals by viewModel.technicals.collectAsState()
    val isLoading by viewModel.isLoading.collectAsState()
    var searchQuery by remember { mutableStateOf("") }
    var showDialog by remember { mutableStateOf(false) }
    var selectedTech by remember { mutableStateOf<TechnicalSpec?>(null) }

    val filteredTechs = technicals.filter {
        it.text.contains(searchQuery, ignoreCase = true) || it.type.contains(searchQuery, ignoreCase = true)
    }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Technical Specifications", fontWeight = FontWeight.Bold) },
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
                    selectedTech = null
                    showDialog = true
                },
                containerColor = MaterialTheme.colorScheme.primary,
                contentColor = Color.White
            ) {
                Icon(Icons.Default.Add, contentDescription = "Add Technical")
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
                placeholder = { Text("Search specifications...") },
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
                    items(filteredTechs) { tech ->
                        TechnicalItem(
                            tech = tech,
                            onClick = {
                                selectedTech = tech
                                showDialog = true
                            },
                            onDelete = { viewModel.deleteTechnical(tech.id!!) }
                        )
                    }
                }
            }
        }

        if (showDialog) {
            TechnicalDialog(
                tech = selectedTech,
                onDismiss = { showDialog = false },
                onSave = { text, type ->
                    if (selectedTech == null) {
                        viewModel.addTechnical(text, type)
                    } else {
                        viewModel.updateTechnical(selectedTech!!.id!!, text, type)
                    }
                    showDialog = false
                }
            )
        }
    }
}

@Composable
fun TechnicalItem(tech: TechnicalSpec, onClick: () -> Unit, onDelete: () -> Unit) {
    Card(
        modifier = Modifier
            .fillMaxWidth()
            .clickable(onClick = onClick),
        shape = RoundedCornerShape(12.dp),
        elevation = CardDefaults.cardElevation(defaultElevation = 1.dp)
    ) {
        Column(modifier = Modifier.padding(16.dp)) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Badge(
                    containerColor = MaterialTheme.colorScheme.tertiaryContainer,
                    contentColor = MaterialTheme.colorScheme.onTertiaryContainer
                ) {
                    Text(tech.type.uppercase(), fontSize = 10.sp, fontWeight = FontWeight.Bold, modifier = Modifier.padding(horizontal = 4.dp, vertical = 2.dp))
                }
                IconButton(onClick = onDelete, modifier = Modifier.size(24.dp)) {
                    Icon(Icons.Default.Delete, contentDescription = "Delete", tint = MaterialTheme.colorScheme.error, modifier = Modifier.size(16.dp))
                }
            }
            Spacer(modifier = Modifier.height(8.dp))
            Text(
                text = tech.text,
                fontSize = 14.sp,
                color = MaterialTheme.colorScheme.onSurface
            )
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun TechnicalDialog(tech: TechnicalSpec?, onDismiss: () -> Unit, onSave: (String, String) -> Unit) {
    var text by remember { mutableStateOf(tech?.text ?: "") }
    var type by remember { mutableStateOf(tech?.type ?: "") }

    AlertDialog(
        onDismissRequest = onDismiss,
        title = { Text(if (tech == null) "Add Technical Spec" else "Edit Technical Spec") },
        text = {
            Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
                OutlinedTextField(
                    value = text,
                    onValueChange = { text = it },
                    label = { Text("Specification Text") },
                    modifier = Modifier.fillMaxWidth(),
                    minLines = 3
                )
                OutlinedTextField(
                    value = type,
                    onValueChange = { type = it },
                    label = { Text("Type (e.g. Concrete, Steel)") },
                    modifier = Modifier.fillMaxWidth()
                )
            }
        },
        confirmButton = {
            Button(onClick = { onSave(text, type) }) {
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
