package com.easylims.models

import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable
import kotlinx.serialization.json.JsonElement
import kotlinx.serialization.json.jsonPrimitive

@Serializable
data class UnitType(
    val id: JsonElement? = null,
    @SerialName("unit_type")
    val unitType: String? = null,
    @SerialName("created_at")
    val createdAt: String? = null
) {
    fun getIdString(): String {
        return id?.jsonPrimitive?.content ?: ""
    }
}
