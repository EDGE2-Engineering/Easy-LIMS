package com.easylims.models

import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable

@Serializable
data class Job(
    val id: String? = null,
    @SerialName("job_id")
    val jobId: String? = null,
    @SerialName("client_id")
    val clientId: String? = null,
    @SerialName("project_name")
    val projectName: String? = null,
    @SerialName("project_address")
    val projectAddress: String? = null,
    val status: String = "JOB_CREATED",
    @SerialName("created_at")
    val createdAt: String? = null,
    @SerialName("updated_at")
    val updatedAt: String? = null,
    val clients: JobClient? = null
)

@Serializable
data class JobClient(
    @SerialName("client_name")
    val clientName: String? = null
)
