package com.easylims

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.core.splashscreen.SplashScreen.Companion.installSplashScreen
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.compose.rememberNavController
import com.easylims.lib.SessionManager
import com.easylims.screens.*
import com.easylims.ui.theme.EasyLIMSTheme

class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        installSplashScreen()
        super.onCreate(savedInstanceState)
        setContent {
            EasyLIMSTheme {
                Surface(
                    modifier = Modifier.fillMaxSize(),
                    color = MaterialTheme.colorScheme.background
                ) {
                    AppNavigation()
                }
            }
        }
    }
}

@Composable
fun AppNavigation() {
    val context = LocalContext.current
    val session by SessionManager.getUserSession(context).collectAsState(initial = null)
    val navController = rememberNavController()

    if (session != null) {
        NavHost(navController = navController, startDestination = "home") {
            composable("home") { HomeScreen(navController) }
            composable("expenses") { ExpensesScreen(navController) }
            composable("attendance") { AttendanceScreen(navController) }
            composable("jobs") { JobsScreen(navController) }
            composable("settings") { SettingsScreen(navController) }
            composable("clients") { ClientsScreen(navController) }
            composable("field_tests") { FieldTestsScreen(navController) }
            composable("lab_tests") { LabTestsScreen(navController) }
            composable("sampling") { SamplingScreen(navController) }
            composable("users") { UsersScreen(navController) }
            composable("system_config") { SystemConfigScreen(navController) }
            composable("unit_types") { UnitTypesScreen(navController) }
            composable("hsn_codes") { HSNCodesScreen(navController) }
            composable("departments") { DepartmentsScreen(navController) }
            composable("materials") { MaterialsScreen(navController) }
            composable("terms") { TermsScreen(navController) }
            composable("technicals") { TechnicalsScreen(navController) }
        }
    } else {
        NavHost(navController = navController, startDestination = "login") {
            composable("login") { LoginScreen(navController) }
        }
    }
}
