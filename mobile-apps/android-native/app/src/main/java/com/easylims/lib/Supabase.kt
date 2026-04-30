package com.easylims.lib

import io.github.jan.supabase.createSupabaseClient
import io.github.jan.supabase.gotrue.Auth
import io.github.jan.supabase.postgrest.Postgrest

object Supabase {
    private const val SUPABASE_URL = "https://ymhkdcizaurcnybkyxdm.supabase.co"
    private const val SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InltaGtkY2l6YXVyY255Ymt5eGRtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjYwNjE2MzQsImV4cCI6MjA4MTYzNzYzNH0.Hg_Do0d0rqbCmiBBrgmI9n70-kFdS0y1hR_3vRi6PRI"

    val client = createSupabaseClient(
        supabaseUrl = SUPABASE_URL,
        supabaseKey = SUPABASE_KEY
    ) {
        install(Postgrest)
        install(Auth)
    }
}
