package com.easylims.screens

import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.navigation.NavController

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun SystemConfigScreen(navController: NavController) {
    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("System Configuration", fontWeight = FontWeight.Bold) },
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
                ConfigItem(
                    icon = Icons.Default.Straighten,
                    title = "Units",
                    subtitle = "Manage measurement units",
                    onClick = { navController.navigate("unit_types") }
                )
            }
            item {
                ConfigItem(
                    icon = Icons.Default.Dialpad,
                    title = "HSN Codes",
                    subtitle = "Manage GST billing codes",
                    onClick = { navController.navigate("hsn_codes") }
                )
            }
            item {
                ConfigItem(
                    icon = Icons.Default.Gavel,
                    title = "Terms & Conditions",
                    subtitle = "Standard document terms",
                    onClick = { navController.navigate("terms") }
                )
            }
            item {
                ConfigItem(
                    icon = Icons.Default.Engineering,
                    title = "Technicals",
                    subtitle = "Technical specifications",
                    onClick = { navController.navigate("technicals") }
                )
            }
            item {
                ConfigItem(
                    icon = Icons.Default.AccountTree,
                    title = "Departments",
                    subtitle = "Organizational departments",
                    onClick = { navController.navigate("departments") }
                )
            }
            item {
                ConfigItem(
                    icon = Icons.Default.Category,
                    title = "Materials",
                    subtitle = "Material types",
                    onClick = { navController.navigate("materials") }
                )
            }
        }
    }
}

@Composable
fun ConfigItem(icon: ImageVector, title: String, subtitle: String, onClick: () -> Unit) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .clickable(onClick = onClick)
            .padding(20.dp),
        verticalAlignment = Alignment.CenterVertically
    ) {
        Icon(icon, contentDescription = null, tint = MaterialTheme.colorScheme.primary, modifier = Modifier.size(24.dp))
        Spacer(modifier = Modifier.width(16.dp))
        Column {
            Text(title, fontWeight = FontWeight.Bold, fontSize = 16.sp)
            Text(subtitle, color = MaterialTheme.colorScheme.onSurfaceVariant, fontSize = 12.sp)
        }
        Spacer(modifier = Modifier.weight(1f))
        Icon(Icons.Default.ChevronRight, contentDescription = null, tint = Color.LightGray)
    }
}
