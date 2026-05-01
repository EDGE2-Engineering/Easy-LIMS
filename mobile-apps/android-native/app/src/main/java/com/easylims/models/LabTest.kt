package com.easylims.models

import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable
import kotlinx.serialization.json.JsonElement
import kotlinx.serialization.json.jsonArray
import kotlinx.serialization.json.jsonPrimitive

@Serializable
data class LabTest(
    val id: String? = null,
    @SerialName("test_type")
    val testType: String? = null,
    val materials: JsonElement? = null,
    val group: String? = null,
    @SerialName("test_method_specification")
    val testMethodSpecification: String? = null,
    @SerialName("num_days")
    val numDays: JsonElement? = null,
    val price: JsonElement? = null,
    @SerialName("hsn_code")
    val hsnCode: String? = null,
    @SerialName("tc_list")
    val tcList: JsonElement? = null,
    @SerialName("tech_list")
    val techList: JsonElement? = null,
    @SerialName("created_at")
    val createdAt: String? = null
) {
    fun getMaterialsList(): List<String> {
        return materials?.toSafeList() ?: emptyList()
    }

    fun getPriceDouble(): Double {
        return price?.jsonPrimitive?.content?.toDoubleOrNull() ?: 0.0
    }

    fun getNumDaysInt(): Int {
        return numDays?.jsonPrimitive?.content?.toIntOrNull() ?: 0
    }
}

fun JsonElement.toSafeList(): List<String> {
    return try {
        this.jsonArray.map { it.jsonPrimitive.content }
    } catch (e: Exception) {
        try {
            listOf(this.jsonPrimitive.content)
        } catch (e2: Exception) {
            emptyList()
        }
    }
}
