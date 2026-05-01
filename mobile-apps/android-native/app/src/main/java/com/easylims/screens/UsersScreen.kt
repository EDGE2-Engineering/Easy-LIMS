package com.easylims.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
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
import com.easylims.models.User
import com.easylims.viewmodels.UsersViewModel

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun UsersScreen(navController: NavController, viewModel: UsersViewModel = viewModel()) {
    val users by viewModel.users.collectAsState()
    val isLoading by viewModel.isLoading.collectAsState()
    var searchQuery by remember { mutableStateOf("") }
    var showDialog by remember { mutableStateOf(false) }
    var selectedUser by remember { mutableStateOf<User?>(null) }

    val filteredUsers = users.filter {
        it.username.contains(searchQuery, ignoreCase = true) ||
                (it.fullName?.contains(searchQuery, ignoreCase = true) ?: false)
    }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Users", fontWeight = FontWeight.Bold) },
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
                    selectedUser = null
                    showDialog = true
                },
                containerColor = MaterialTheme.colorScheme.primary,
                contentColor = Color.White
            ) {
                Icon(Icons.Default.PersonAdd, contentDescription = "Add User")
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
                placeholder = { Text("Search users...") },
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
                    items(filteredUsers) { user ->
                        UserItem(
                            user = user,
                            onClick = {
                                selectedUser = user
                                showDialog = true
                            },
                            onToggleStatus = { viewModel.toggleUserStatus(user) }
                        )
                    }
                }
            }
        }

        if (showDialog) {
            UserDialog(
                user = selectedUser,
                onDismiss = { showDialog = false },
                onSave = { updatedUser ->
                    if (selectedUser == null) {
                        viewModel.addUser(updatedUser)
                    } else {
                        viewModel.updateUser(updatedUser)
                    }
                    showDialog = false
                }
            )
        }
    }
}

@Composable
fun UserItem(user: User, onClick: () -> Unit, onToggleStatus: () -> Unit) {
    Card(
        modifier = Modifier
            .fillMaxWidth()
            .clickable(onClick = onClick),
        shape = RoundedCornerShape(16.dp),
        elevation = CardDefaults.cardElevation(defaultElevation = 2.dp)
    ) {
        Row(
            modifier = Modifier.padding(16.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            Box(
                modifier = Modifier
                    .size(48.dp)
                    .background(
                        if (user.isActive) MaterialTheme.colorScheme.primaryContainer else Color.LightGray,
                        CircleShape
                    ),
                contentAlignment = Alignment.Center
            ) {
                Text(
                    text = user.fullName?.take(1)?.uppercase() ?: user.username.take(1).uppercase(),
                    fontWeight = FontWeight.Bold,
                    color = if (user.isActive) MaterialTheme.colorScheme.onPrimaryContainer else Color.DarkGray
                )
            }
            
            Spacer(modifier = Modifier.width(16.dp))
            
            Column(modifier = Modifier.weight(1f)) {
                Text(
                    text = user.fullName ?: user.username,
                    fontSize = 16.sp,
                    fontWeight = FontWeight.Bold
                )
                Text(
                    text = user.role?.uppercase() ?: "TECHNICIAN",
                    fontSize = 12.sp,
                    color = MaterialTheme.colorScheme.secondary,
                    fontWeight = FontWeight.Bold
                )
                if (user.department != null) {
                    Text(text = user.department, fontSize = 12.sp, color = Color.Gray)
                }
            }
            
            IconButton(onClick = onToggleStatus) {
                Icon(
                    imageVector = if (user.isActive) Icons.Default.Block else Icons.Default.CheckCircle,
                    contentDescription = "Toggle Status",
                    tint = if (user.isActive) MaterialTheme.colorScheme.error else Color(0xFF4CAF50)
                )
            }
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun UserDialog(user: User?, onDismiss: () -> Unit, onSave: (User) -> Unit) {
    var username by remember { mutableStateOf(user?.username ?: "") }
    var fullName by remember { mutableStateOf(user?.fullName ?: "") }
    var password by remember { mutableStateOf(user?.password ?: "") }
    var role by remember { mutableStateOf(user?.role ?: "technician") }
    var department by remember { mutableStateOf(user?.department ?: "") }

    val roles = listOf("admin", "technician", "viewer")

    AlertDialog(
        onDismissRequest = onDismiss,
        title = { Text(if (user == null) "Add User" else "Edit User") },
        text = {
            Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
                OutlinedTextField(
                    value = username,
                    onValueChange = { username = it },
                    label = { Text("Username") },
                    modifier = Modifier.fillMaxWidth()
                )
                OutlinedTextField(
                    value = fullName,
                    onValueChange = { fullName = it },
                    label = { Text("Full Name") },
                    modifier = Modifier.fillMaxWidth()
                )
                if (user == null) {
                    OutlinedTextField(
                        value = password,
                        onValueChange = { password = it },
                        label = { Text("Password") },
                        modifier = Modifier.fillMaxWidth()
                    )
                }
                
                Text("Role", fontWeight = FontWeight.Bold, fontSize = 14.sp)
                Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    roles.forEach { r ->
                        FilterChip(
                            selected = role == r,
                            onClick = { role = r },
                            label = { Text(r.uppercase()) }
                        )
                    }
                }
                
                OutlinedTextField(
                    value = department,
                    onValueChange = { department = it },
                    label = { Text("Department") },
                    modifier = Modifier.fillMaxWidth()
                )
            }
        },
        confirmButton = {
            Button(onClick = {
                onSave(
                    User(
                        id = user?.id,
                        username = username,
                        fullName = fullName,
                        password = if (user == null) password else user.password,
                        role = role,
                        department = department,
                        isActive = user?.isActive ?: true
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
