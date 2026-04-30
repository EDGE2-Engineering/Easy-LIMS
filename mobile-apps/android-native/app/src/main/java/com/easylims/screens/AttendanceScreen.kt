package com.easylims.screens

import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Add
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.Person
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.lifecycle.viewmodel.compose.viewModel
import androidx.navigation.NavController
import com.easylims.models.EmployeeAttendance
import com.easylims.models.User
import com.easylims.viewmodels.AttendanceViewModel
import java.util.*

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun AttendanceScreen(navController: NavController, viewModel: AttendanceViewModel = viewModel()) {
    val employees by viewModel.employees.collectAsState()
    val attendanceHistory by viewModel.attendanceHistory.collectAsState()
    val isLoading by viewModel.isLoading.collectAsState()
    val error by viewModel.error.collectAsState()

    var selectedUser by remember { mutableStateOf<User?>(null) }
    var showAddDialog by remember { mutableStateOf(false) }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text(if (selectedUser == null) "Employees" else selectedUser?.fullName ?: selectedUser?.username ?: "Attendance", fontWeight = FontWeight.Bold) },
                navigationIcon = {
                    IconButton(onClick = { 
                        if (selectedUser != null) {
                            selectedUser = null
                        } else {
                            navController.popBackStack() 
                        }
                    }) {
                        Icon(Icons.AutoMirrored.Filled.ArrowBack, contentDescription = "Back")
                    }
                }
            )
        },
        floatingActionButton = {
            if (selectedUser != null) {
                FloatingActionButton(
                    onClick = { showAddDialog = true },
                    containerColor = MaterialTheme.colorScheme.primary
                ) {
                    Icon(Icons.Default.Add, contentDescription = "Add Work Log", tint = MaterialTheme.colorScheme.onPrimary)
                }
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

            if (isLoading && employees.isEmpty() && attendanceHistory.isEmpty()) {
                Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                    CircularProgressIndicator()
                }
            } else if (selectedUser == null) {
                // Employees List
                if (employees.isEmpty()) {
                    Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                        Text("No employees found", color = MaterialTheme.colorScheme.onSurfaceVariant)
                    }
                } else {
                    LazyColumn(
                        contentPadding = PaddingValues(16.dp),
                        verticalArrangement = Arrangement.spacedBy(12.dp)
                    ) {
                        items(employees) { employee ->
                            UserItem(user = employee, onClick = {
                                selectedUser = employee
                                viewModel.fetchAttendanceHistory(employee.id)
                            })
                        }
                    }
                }
            } else {
                // Attendance History
                if (attendanceHistory.isEmpty() && !isLoading) {
                    Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                        Text("No attendance records found for this employee", color = MaterialTheme.colorScheme.onSurfaceVariant)
                    }
                } else {
                    LazyColumn(
                        contentPadding = PaddingValues(16.dp),
                        verticalArrangement = Arrangement.spacedBy(12.dp)
                    ) {
                        items(attendanceHistory) { record ->
                            AttendanceItem(record = record)
                        }
                    }
                }
            }
        }
    }

    if (showAddDialog && selectedUser != null) {
        AttendanceDialog(
            user = selectedUser!!,
            onDismiss = { showAddDialog = false },
            onSave = { record ->
                viewModel.upsertAttendance(record)
                showAddDialog = false
            }
        )
    }
}

@Composable
fun UserItem(user: User, onClick: () -> Unit) {
    Card(
        modifier = Modifier
            .fillMaxWidth()
            .clickable(onClick = onClick),
        shape = RoundedCornerShape(12.dp),
        elevation = CardDefaults.cardElevation(defaultElevation = 2.dp)
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(16.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            Icon(Icons.Default.Person, contentDescription = "User", modifier = Modifier.size(40.dp), tint = MaterialTheme.colorScheme.primary)
            Spacer(modifier = Modifier.width(16.dp))
            Column {
                Text(text = user.fullName ?: user.username ?: "Unknown", fontWeight = FontWeight.Bold, fontSize = 18.sp)
                Text(text = "${user.role ?: "Employee"} • ${user.department ?: "No Dept"}", fontSize = 14.sp, color = MaterialTheme.colorScheme.onSurfaceVariant)
            }
        }
    }
}

@Composable
fun AttendanceItem(record: EmployeeAttendance) {
    val months = listOf("Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec")
    val monthName = if (record.month in 0..11) months[record.month] else "${record.month}"
    
    val percentage = if (record.totalWorkingDays > 0) (record.daysWorked / record.totalWorkingDays) * 100 else 0.0

    Card(
        modifier = Modifier.fillMaxWidth(),
        shape = RoundedCornerShape(12.dp),
        elevation = CardDefaults.cardElevation(defaultElevation = 1.dp)
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(16.dp),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically
        ) {
            Column {
                Text(text = "$monthName ${record.year}", fontWeight = FontWeight.Bold, fontSize = 16.sp)
                Text(text = "Worked: ${record.daysWorked} / ${record.totalWorkingDays}", fontSize = 14.sp, color = MaterialTheme.colorScheme.onSurfaceVariant)
            }
            Text(
                text = "${percentage.toInt()}%",
                fontWeight = FontWeight.ExtraBold,
                fontSize = 18.sp,
                color = if (percentage >= 90) MaterialTheme.colorScheme.primary else MaterialTheme.colorScheme.error
            )
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun AttendanceDialog(user: User, onDismiss: () -> Unit, onSave: (EmployeeAttendance) -> Unit) {
    val calendar = Calendar.getInstance()
    var year by remember { mutableStateOf(calendar.get(Calendar.YEAR).toString()) }
    var month by remember { mutableStateOf(calendar.get(Calendar.MONTH).toString()) }
    var totalWorkingDays by remember { mutableStateOf("") }
    var daysWorked by remember { mutableStateOf("") }

    AlertDialog(
        onDismissRequest = onDismiss,
        title = { Text("Log Work for ${user.fullName ?: user.username}") },
        text = {
            Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                OutlinedTextField(
                    value = year,
                    onValueChange = { year = it },
                    label = { Text("Year") },
                    modifier = Modifier.fillMaxWidth()
                )
                OutlinedTextField(
                    value = month,
                    onValueChange = { month = it },
                    label = { Text("Month (0-11)") },
                    modifier = Modifier.fillMaxWidth()
                )
                OutlinedTextField(
                    value = totalWorkingDays,
                    onValueChange = { totalWorkingDays = it },
                    label = { Text("Total Working Days") },
                    modifier = Modifier.fillMaxWidth()
                )
                OutlinedTextField(
                    value = daysWorked,
                    onValueChange = { daysWorked = it },
                    label = { Text("Days Worked") },
                    modifier = Modifier.fillMaxWidth()
                )
            }
        },
        confirmButton = {
            Button(
                onClick = {
                    val y = year.toIntOrNull() ?: calendar.get(Calendar.YEAR)
                    val m = month.toIntOrNull() ?: calendar.get(Calendar.MONTH)
                    val twd = totalWorkingDays.toDoubleOrNull() ?: 0.0
                    val dw = daysWorked.toDoubleOrNull() ?: 0.0

                    if (twd > 0) {
                        onSave(
                            EmployeeAttendance(
                                userId = user.id,
                                year = y,
                                month = m,
                                totalWorkingDays = twd,
                                daysWorked = dw
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
