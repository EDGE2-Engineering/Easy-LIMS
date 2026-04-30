package com.easylims.lib

import android.content.Context
import androidx.datastore.core.DataStore
import androidx.datastore.preferences.core.Preferences
import androidx.datastore.preferences.core.edit
import androidx.datastore.preferences.core.stringPreferencesKey
import androidx.datastore.preferences.preferencesDataStore
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.map

val Context.dataStore: DataStore<Preferences> by preferencesDataStore(name = "settings")

object SessionManager {
    val USER_SESSION = stringPreferencesKey("user_session")

    fun getUserSession(context: Context): Flow<String?> {
        return context.dataStore.data.map { preferences ->
            preferences[USER_SESSION]
        }
    }

    suspend fun saveUserSession(context: Context, sessionData: String) {
        context.dataStore.edit { preferences ->
            preferences[USER_SESSION] = sessionData
        }
    }

    suspend fun clearSession(context: Context) {
        context.dataStore.edit { preferences ->
            preferences.remove(USER_SESSION)
        }
    }
}
