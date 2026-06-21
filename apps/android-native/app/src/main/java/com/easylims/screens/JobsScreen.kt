package com.easylims.screens

import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.Add
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.lifecycle.viewmodel.compose.viewModel
import androidx.navigation.NavController
import com.easylims.models.Job
import com.easylims.viewmodels.JobsViewModel

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun JobsScreen(navController: NavController, viewModel: JobsViewModel = viewModel()) {
    val jobs by viewModel.jobs.collectAsState()
    val isLoading by viewModel.isLoading.collectAsState()
    val error by viewModel.error.collectAsState()

    var showDialog by remember { mutableStateOf(false) }
    var editingJob by remember { mutableStateOf<Job?>(null) }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Jobs", fontWeight = FontWeight.Bold) },
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
                    editingJob = null
                    showDialog = true 
                },
                containerColor = MaterialTheme.colorScheme.primary
            ) {
                Icon(Icons.Default.Add, contentDescription = "Add Job", tint = MaterialTheme.colorScheme.onPrimary)
            }
        }
    ) { padding ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(padding)
        ) {
            if (error != null) {
                Text(
                    text = error!!,
                    color = MaterialTheme.colorScheme.error,
                    modifier = Modifier.padding(16.dp)
                )
            }

            if (isLoading && jobs.isEmpty()) {
                Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                    CircularProgressIndicator()
                }
            } else if (jobs.isEmpty()) {
                Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                    Text("No jobs found", color = MaterialTheme.colorScheme.onSurfaceVariant)
                }
            } else {
                LazyColumn(
                    contentPadding = PaddingValues(16.dp),
                    verticalArrangement = Arrangement.spacedBy(12.dp)
                ) {
                    items(jobs) { job ->
                        JobItem(job = job, onClick = {
                            editingJob = job
                            showDialog = true
                        })
                    }
                }
            }
        }
    }

    if (showDialog) {
        JobDialog(
            job = editingJob,
            onDismiss = { showDialog = false },
            onSave = { updatedJob ->
                viewModel.upsertJob(updatedJob)
                showDialog = false
            }
        )
    }
}

@Composable
fun JobItem(job: Job, onClick: () -> Unit) {
    Card(
        modifier = Modifier
            .fillMaxWidth()
            .clickable(onClick = onClick),
        shape = RoundedCornerShape(12.dp),
        elevation = CardDefaults.cardElevation(defaultElevation = 2.dp)
    ) {
        Column(modifier = Modifier.padding(16.dp)) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Text(
                    text = job.jobId ?: "NEW JOB",
                    fontWeight = FontWeight.ExtraBold,
                    fontSize = 18.sp,
                    fontFamily = androidx.compose.ui.text.font.FontFamily.Monospace,
                    color = MaterialTheme.colorScheme.primary
                )
                Surface(
                    color = when (job.status) {
                        "JOB_COMPLETE", "REPORT_RELEASED" -> MaterialTheme.colorScheme.primaryContainer
                        "UNDER_TESTING", "TECHNICIANS_ASSIGNED" -> MaterialTheme.colorScheme.secondaryContainer
                        "JOB_CREATED" -> MaterialTheme.colorScheme.surfaceVariant
                        "TEST_DATA_UNDER_REVIEW" -> MaterialTheme.colorScheme.tertiaryContainer
                        else -> MaterialTheme.colorScheme.surfaceVariant
                    },
                    shape = RoundedCornerShape(8.dp)
                ) {
                    Text(
                        text = job.status.replace("_", " "),
                        modifier = Modifier.padding(horizontal = 8.dp, vertical = 4.dp),
                        fontSize = 10.sp,
                        fontWeight = FontWeight.Bold
                    )
                }
            }
            
            Spacer(modifier = Modifier.height(4.dp))
            
            Text(
                text = job.projectName ?: "Untitled Project",
                fontWeight = FontWeight.Bold,
                fontSize = 16.sp,
                color = MaterialTheme.colorScheme.onSurface
            )
            
            if (job.clients?.clientName != null) {
                Spacer(modifier = Modifier.height(4.dp))
                Text(
                    text = job.clients.clientName,
                    fontSize = 14.sp,
                    color = MaterialTheme.colorScheme.onSurfaceVariant
                )
            }

            if (!job.projectAddress.isNullOrBlank()) {
                Spacer(modifier = Modifier.height(4.dp))
                Text(
                    text = job.projectAddress,
                    fontSize = 13.sp,
                    color = MaterialTheme.colorScheme.onSurfaceVariant
                )
            }
            
            Spacer(modifier = Modifier.height(8.dp))
            Text(
                text = "Created: ${job.createdAt?.take(10) ?: "N/A"}",
                fontSize = 12.sp,
                color = MaterialTheme.colorScheme.outline
            )
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun JobDialog(job: Job?, onDismiss: () -> Unit, onSave: (Job) -> Unit) {
    var projectName by remember { mutableStateOf(job?.projectName ?: "") }
    var location by remember { mutableStateOf(job?.projectAddress ?: "") }
    var status by remember { mutableStateOf(job?.status ?: "JOB_CREATED") }

    val statuses = listOf("JOB_CREATED", "UNDER_TESTING", "TESTING_COMPLETE", "JOB_COMPLETE")

    AlertDialog(
        onDismissRequest = onDismiss,
        title = { Text(if (job == null) "New Job" else "Edit Job: ${job.jobId}") },
        text = {
            Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                OutlinedTextField(
                    value = projectName,
                    onValueChange = { projectName = it },
                    label = { Text("Project Name") },
                    modifier = Modifier.fillMaxWidth()
                )
                OutlinedTextField(
                    value = location,
                    onValueChange = { location = it },
                    label = { Text("Location") },
                    modifier = Modifier.fillMaxWidth()
                )
                
                Text("Status", style = MaterialTheme.typography.labelLarge)
                Column(modifier = Modifier.fillMaxWidth(), verticalArrangement = Arrangement.spacedBy(4.dp)) {
                    statuses.chunked(2).forEach { rowStatuses ->
                        Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                            rowStatuses.forEach { s ->
                                FilterChip(
                                    selected = status == s,
                                    onClick = { status = s },
                                    label = { Text(s.replace("_", " "), fontSize = 10.sp) }
                                )
                            }
                        }
                    }
                }
            }
        },
        confirmButton = {
            Button(
                onClick = {
                    if (projectName.isNotBlank()) {
                        onSave(
                            Job(
                                id = job?.id,
                                jobId = job?.jobId,
                                clientId = job?.clientId,
                                projectName = projectName,
                                projectAddress = location.ifBlank { null },
                                status = status,
                                createdAt = job?.createdAt,
                                updatedAt = null, // Will be set by Supabase
                                clients = job?.clients
                            )
                        )
                    }
                }
            ) {
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
