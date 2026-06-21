package com.easylims.models

import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable

@Serializable
data class EmployeeAttendance(
    val id: String? = null,
    @SerialName("user_id")
    val userId: String,
    val month: Int,
    val year: Int,
    @SerialName("total_working_days")
    val totalWorkingDays: Double,
    @SerialName("days_worked")
    val daysWorked: Double,
    @SerialName("updated_at")
    val updatedAt: String? = null
)
