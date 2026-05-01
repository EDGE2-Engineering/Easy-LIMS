package com.easylims.screens

import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.navigation.NavController
import com.easylims.lib.SessionManager
import kotlinx.coroutines.launch
import org.json.JSONObject

@Composable
fun HomeScreen(navController: NavController) {
    val context = LocalContext.current
    val coroutineScope = rememberCoroutineScope()
    val sessionString by SessionManager.getUserSession(context).collectAsState(initial = null)
    
    var userName by remember { mutableStateOf("User") }

    LaunchedEffect(sessionString) {
        if (sessionString != null) {
            try {
                val json = JSONObject(sessionString!!)
                userName = json.optString("fullName", json.optString("username", "User"))
            } catch (e: Exception) {
                // ignore parsing error
            }
        }
    }

    Column(
        modifier = Modifier
            .fillMaxSize()
            .padding(24.dp)
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(top = 16.dp, bottom = 24.dp),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically
        ) {
            Column {
                Text("Welcome back,", fontSize = 16.sp, color = MaterialTheme.colorScheme.onSurfaceVariant)
                Text(userName, fontSize = 32.sp, fontWeight = FontWeight.ExtraBold)
            }
            
            Button(
                onClick = {
                    coroutineScope.launch {
                        SessionManager.clearSession(context)
                    }
                },
                colors = ButtonDefaults.buttonColors(containerColor = MaterialTheme.colorScheme.errorContainer)
            ) {
                Text("Log Out", color = MaterialTheme.colorScheme.onErrorContainer)
            }
        }

        Card(
            modifier = Modifier
                .fillMaxWidth()
                .padding(bottom = 16.dp)
                .clickable { navController.navigate("expenses") },
            shape = RoundedCornerShape(16.dp),
            elevation = CardDefaults.cardElevation(defaultElevation = 2.dp)
        ) {
            Column(modifier = Modifier.padding(24.dp)) {
                Text("Expenses", fontSize = 22.sp, fontWeight = FontWeight.Bold)
                Text("Manage company expenses and reports", color = MaterialTheme.colorScheme.onSurfaceVariant)
            }
        }

        Card(
            modifier = Modifier
                .fillMaxWidth()
                .padding(bottom = 16.dp)
                .clickable { navController.navigate("attendance") },
            shape = RoundedCornerShape(16.dp),
            elevation = CardDefaults.cardElevation(defaultElevation = 2.dp)
        ) {
            Column(modifier = Modifier.padding(24.dp)) {
                Text("Attendance", fontSize = 22.sp, fontWeight = FontWeight.Bold)
                Text("Track employee work logs and wages", color = MaterialTheme.colorScheme.onSurfaceVariant)
            }
        }

        Card(
            modifier = Modifier
                .fillMaxWidth()
                .padding(bottom = 16.dp)
                .clickable { navController.navigate("jobs") },
            shape = RoundedCornerShape(16.dp),
            elevation = CardDefaults.cardElevation(defaultElevation = 2.dp)
        ) {
            Column(modifier = Modifier.padding(24.dp)) {
                Text("Jobs", fontSize = 22.sp, fontWeight = FontWeight.Bold)
                Text("View and update active service jobs", color = MaterialTheme.colorScheme.onSurfaceVariant)
            }
        }

        Card(
            modifier = Modifier
                .fillMaxWidth()
                .clickable { navController.navigate("settings") },
            shape = RoundedCornerShape(16.dp),
            elevation = CardDefaults.cardElevation(defaultElevation = 2.dp)
        ) {
            Column(modifier = Modifier.padding(24.dp)) {
                Text("Settings", fontSize = 22.sp, fontWeight = FontWeight.Bold)
                Text("App configuration and profile", color = MaterialTheme.colorScheme.onSurfaceVariant)
            }
        }
    }
}
