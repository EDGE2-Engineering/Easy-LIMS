package com.easylims.models

import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable

@Serializable
data class TermCondition(
    val id: Int? = null,
    val text: String,
    val type: String = "general",
    @SerialName("created_at")
    val createdAt: String? = null
)
