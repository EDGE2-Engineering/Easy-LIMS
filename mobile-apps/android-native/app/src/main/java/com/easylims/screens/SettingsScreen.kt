package com.easylims.screens

import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.automirrored.filled.ExitToApp
import androidx.compose.material.icons.filled.Info
import androidx.compose.material.icons.filled.Notifications
import androidx.compose.material.icons.filled.Person
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.navigation.NavController
import com.easylims.lib.SessionManager
import kotlinx.coroutines.launch

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun SettingsScreen(navController: NavController) {
    val context = LocalContext.current
    val coroutineScope = rememberCoroutineScope()

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Settings", fontWeight = FontWeight.Bold) },
                navigationIcon = {
                    IconButton(onClick = { navController.popBackStack() }) {
                        Icon(Icons.AutoMirrored.Filled.ArrowBack, contentDescription = "Back")
                    }
                }
            )
        }
    ) { padding ->
        LazyColumn(
            modifier = Modifier
                .fillMaxSize()
                .padding(padding)
        ) {
            item {
                SectionHeader("Master Data")
            }
            item {
                SettingsItem(
                    icon = Icons.Default.Business,
                    title = "Clients",
                    subtitle = "Manage your client database",
                    onClick = { navController.navigate("clients") }
                )
            }
            item {
                SettingsItem(
                    icon = Icons.Default.Build,
                    title = "Field Tests",
                    subtitle = "Configure on-site testing services",
                    onClick = { navController.navigate("field_tests") }
                )
            }
            item {
                SettingsItem(
                    icon = Icons.Default.Science,
                    title = "Lab Tests",
                    subtitle = "Manage laboratory testing parameters",
                    onClick = { navController.navigate("lab_tests") }
                )
            }
            item {
                SettingsItem(
                    icon = Icons.Default.Inventory,
                    title = "Sampling",
                    subtitle = "Configure material sampling methods",
                    onClick = { navController.navigate("sampling") }
                )
            }

            item {
                Divider(modifier = Modifier.padding(vertical = 8.dp), color = MaterialTheme.colorScheme.surfaceVariant)
                SectionHeader("System")
            }
            item {
                SettingsItem(
                    icon = Icons.Default.Settings,
                    title = "System Configuration",
                    subtitle = "General system settings",
                    onClick = { navController.navigate("system_config") }
                )
            }
            item {
                SettingsItem(
                    icon = Icons.Default.People,
                    title = "Users & Permissions",
                    subtitle = "Manage staff access and roles",
                    onClick = { navController.navigate("users") }
                )
            }

            item {
                Divider(modifier = Modifier.padding(vertical = 8.dp), color = MaterialTheme.colorScheme.surfaceVariant)
                SectionHeader("App Settings")
            }
            item {
                SettingsItem(
                    icon = Icons.Default.Notifications,
                    title = "Notifications",
                    subtitle = "Configure app alerts"
                )
            }
            item {
                SettingsItem(
                    icon = Icons.Default.Info,
                    title = "About",
                    subtitle = "App version and info"
                )
            }
            
            item {
                Spacer(modifier = Modifier.height(32.dp))
                Surface(
                    modifier = Modifier
                        .fillMaxWidth()
                        .clickable {
                            coroutineScope.launch {
                                SessionManager.clearSession(context)
                            }
                        },
                    color = MaterialTheme.colorScheme.errorContainer.copy(alpha = 0.1f)
                ) {
                    Row(
                        modifier = Modifier.padding(24.dp),
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Icon(Icons.AutoMirrored.Filled.ExitToApp, contentDescription = null, tint = MaterialTheme.colorScheme.error)
                        Spacer(modifier = Modifier.width(16.dp))
                        Text("Log Out", color = MaterialTheme.colorScheme.error, fontWeight = FontWeight.Bold, fontSize = 16.sp)
                    }
                }
            }
        }
    }
}

@Composable
fun SectionHeader(title: String) {
    Text(
        text = title.uppercase(),
        modifier = Modifier.padding(start = 24.dp, top = 16.dp, bottom = 8.dp),
        fontSize = 12.sp,
        fontWeight = FontWeight.Black,
        color = MaterialTheme.colorScheme.primary,
        letterSpacing = 1.5.sp
    )
}

@Composable
fun SettingsItem(icon: ImageVector, title: String, subtitle: String, onClick: () -> Unit = {}) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .clickable(onClick = onClick)
            .padding(24.dp),
        verticalAlignment = Alignment.CenterVertically
    ) {
        Icon(icon, contentDescription = null, tint = MaterialTheme.colorScheme.primary, modifier = Modifier.size(28.dp))
        Spacer(modifier = Modifier.width(20.dp))
        Column {
            Text(title, fontWeight = FontWeight.Bold, fontSize = 18.sp)
            Text(subtitle, color = MaterialTheme.colorScheme.onSurfaceVariant, fontSize = 14.sp)
        }
    }
}
