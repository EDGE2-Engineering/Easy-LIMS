package com.easylims.models

import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable

@Serializable
data class FieldTest(
    val id: String? = null,
    @SerialName("service_type")
    val serviceType: String,
    val price: Double,
    val unit: String? = null,
    val qty: Int = 1,
    @SerialName("method_of_sampling")
    val methodOfSampling: String? = "NA",
    @SerialName("num_bhs")
    val numBHs: Int = 0,
    val measure: String? = "NA",
    @SerialName("hsn_code")
    val hsnCode: String? = null,
    @SerialName("tc_list")
    val tcList: List<String>? = emptyList(),
    @SerialName("tech_list")
    val techList: List<String>? = emptyList(),
    @SerialName("created_at")
    val createdAt: String? = null
)
