package com.easylims.models

import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable

@Serializable
data class User(
    val id: String? = null,
    val username: String,
    val password: String? = null,
    @SerialName("full_name")
    val fullName: String? = null,
    val role: String,
    val department: String? = null,
    @SerialName("is_active")
    val isActive: Boolean = true,
    @SerialName("created_at")
    val createdAt: String? = null
)
