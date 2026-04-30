package com.easylims.models

import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable

@Serializable
data class User(
    val id: String,
    val username: String? = null,
    @SerialName("full_name")
    val fullName: String? = null,
    val role: String? = null,
    val department: String? = null,
    @SerialName("base_salary")
    val baseSalary: Double? = null
)
