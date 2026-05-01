package com.easylims.models

import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable

@Serializable
data class LabTest(
    val id: String? = null,
    @SerialName("test_type")
    val testType: String,
    val materials: List<String>? = emptyList(),
    val group: String? = null,
    @SerialName("test_method_specification")
    val testMethodSpecification: String? = null,
    @SerialName("num_days")
    val numDays: Int = 0,
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
