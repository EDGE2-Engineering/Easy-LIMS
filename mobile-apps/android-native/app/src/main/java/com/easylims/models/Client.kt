package com.easylims.models

import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable

@Serializable
data class Client(
    val id: String? = null,
    @SerialName("client_name")
    val clientName: String,
    @SerialName("client_address")
    val clientAddress: String? = null,
    val category: String? = "General",
    val status: Boolean = true,
    val contacts: List<Contact>? = null,
    @SerialName("created_at")
    val createdAt: String? = null
)

@Serializable
data class Contact(
    @SerialName("contact_person")
    val contactPerson: String? = null,
    @SerialName("contact_email")
    val contactEmail: String? = null,
    @SerialName("contact_phone")
    val contactPhone: String? = null,
    @SerialName("is_primary")
    val isPrimary: Boolean = false
)
