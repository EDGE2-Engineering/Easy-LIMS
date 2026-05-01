package com.easylims.models

import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable
import kotlinx.serialization.json.JsonElement

@Serializable
data class SamplingItem(
    val id: String? = null,
    @SerialName("service_type")
    val serviceType: String? = null,
    val materials: JsonElement? = null,
    val group: String? = null,
    @SerialName("test_method_specification")
    val testMethodSpecification: String? = null,
    val unit: String? = null,
    val qty: Int? = 1,
    val price: Double? = 0.0,
    @SerialName("hsn_code")
    val hsnCode: String? = null,
    @SerialName("tc_list")
    val tcList: JsonElement? = null,
    @SerialName("tech_list")
    val techList: JsonElement? = null,
    @SerialName("created_at")
    val createdAt: String? = null
)
