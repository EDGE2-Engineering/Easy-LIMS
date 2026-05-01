package com.easylims.models

import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable

@Serializable
data class SamplingItem(
    val id: String? = null,
    @SerialName("service_type")
    val serviceType: String,
    val materials: List<String>? = emptyList(),
    val group: String? = null,
    @SerialName("test_method_specification")
    val testMethodSpecification: String? = null,
    val unit: String? = null,
    val qty: Int = 1,
    val price: Double,
    @SerialName("hsn_code")
    val hsnCode: String? = null,
    @SerialName("tc_list")
    val tcList: List<String>? = emptyList(),
    @SerialName("tech_list")
    val techList: List<String>? = emptyList(),
    @SerialName("created_at")
    val createdAt: String? = null
)
