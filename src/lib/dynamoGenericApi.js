/**
 * Generic DynamoDB API for EDGE2 projects
 * Handles CRUD operations for multiple record types using a single table design.
 */

import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import {
    DynamoDBDocumentClient,
    QueryCommand,
    PutCommand,
    DeleteCommand,
    GetCommand
} from "@aws-sdk/lib-dynamodb";
import { cognitoConfig } from "@/config";
import { getFrontendCredentials } from "@/lib/dynamoAuth";

// Using the table name from infrastructure/main.tf
const TABLE_NAME = "EDGE2-LIMS-Data";

let cachedDocClient = null;
let cachedIdToken = null;

/**
 * Gets a DynamoDB Document Client, reusing it if the idToken is the same
 * @param {string} idToken - The Cognito ID Token
 */
const getDocClient = (idToken) => {
    if (cachedDocClient && cachedIdToken === idToken) {
        return cachedDocClient;
    }

    // console.log("Creating new DynamoDB client...");
    const credentials = getFrontendCredentials(idToken);
    const client = new DynamoDBClient({
        region: cognitoConfig.region,
        credentials
    });

    cachedDocClient = DynamoDBDocumentClient.from(client);
    cachedIdToken = idToken;
    return cachedDocClient;
};

export const dynamoGenericApi = {
    /**
     * List all records of a specific type
     * @param {string} type - The record type (e.g., 'client', 'service', 'test')
     * @param {string} idToken - Cognito ID Token
     */
    async listByType(type, idToken) {
        try {
            const docClient = getDocClient(idToken);
            const command = new QueryCommand({
                TableName: TABLE_NAME,
                IndexName: "TypeIndex",
                KeyConditionExpression: "#type = :type",
                ExpressionAttributeNames: {
                    "#type": "type"
                },
                ExpressionAttributeValues: {
                    ":type": type
                }
            });

            const response = await docClient.send(command);
            return response.Items || [];
        } catch (error) {
            console.error(`DynamoDB listByType error for ${type}:`, error);
            throw error;
        }
    },

    /**
     * Get a single record by its ID
     * @param {string} id - The record ID
     * @param {string} idToken - Cognito ID Token
     */
    async getById(id, idToken) {
        try {
            const docClient = getDocClient(idToken);
            const command = new GetCommand({
                TableName: TABLE_NAME,
                Key: { id }
            });

            const response = await docClient.send(command);
            return response.Item;
        } catch (error) {
            console.error(`DynamoDB getById error for ${id}:`, error);
            throw error;
        }
    },

    /**
     * Create or update a record
     * @param {string} type - The record type
     * @param {Object} data - The record data
     * @param {string} idToken - Cognito ID Token
     */
    async save(type, data, idToken) {
        try {
            const docClient = getDocClient(idToken);

            // Ensure id exists (handle both existing and new records)
            const id = data.id || crypto.randomUUID();

            const item = {
                ...data,
                id,
                type,
                updated_at: new Date().toISOString()
            };

            // Check if it already exists to preserve created_at
            // skipCheck can be passed in data to avoid redundant getById
            if (!data.created_at && !data.skipCheck) {
                try {
                    const existing = await this.getById(id, idToken);
                    item.created_at = existing?.created_at || new Date().toISOString();
                } catch (e) {
                    item.created_at = new Date().toISOString();
                }
            } else {
                item.created_at = data.created_at || new Date().toISOString();
            }
            delete item.skipCheck;

            const command = new PutCommand({
                TableName: TABLE_NAME,
                Item: item
            });

            await docClient.send(command);
            return item;
        } catch (error) {
            console.error(`DynamoDB save error for ${type}:`, error);
            throw error;
        }
    },

    /**
     * Partially update a record by merging fields
     * @param {string} id - The record ID
     * @param {Object} partialData - The fields to update/merge
     * @param {string} idToken - Cognito ID Token
     */
    async patch(id, partialData, idToken) {
        try {
            const docClient = getDocClient(idToken);
            const existing = await this.getById(id, idToken);

            if (!existing) {
                throw new Error(`Record with ID ${id} not found`);
            }

            const updatedItem = {
                ...existing,
                ...partialData,
                updated_at: new Date().toISOString()
            };

            const command = new PutCommand({
                TableName: TABLE_NAME,
                Item: updatedItem
            });

            await docClient.send(command);
            return updatedItem;
        } catch (error) {
            console.error(`DynamoDB patch error for ${id}:`, error);
            throw error;
        }
    },

    /**
     * Find records of a specific type by an attribute
     * @param {string} type - The record type
     * @param {string} attrName - The attribute name to filter by
     * @param {any} attrValue - The value to match
     * @param {string} idToken - Cognito ID Token
     */
    async findByAttribute(type, attrName, attrValue, idToken) {
        try {
            const docClient = getDocClient(idToken);
            const command = new QueryCommand({
                TableName: TABLE_NAME,
                IndexName: "TypeIndex",
                KeyConditionExpression: "#type = :type",
                FilterExpression: "#attr = :val",
                ExpressionAttributeNames: {
                    "#type": "type",
                    "#attr": attrName
                },
                ExpressionAttributeValues: {
                    ":type": type,
                    ":val": attrValue
                }
            });

            const response = await docClient.send(command);
            return response.Items || [];
        } catch (error) {
            console.error(`DynamoDB findByAttribute error for ${type}/${attrName}:`, error);
            throw error;
        }
    },

    /**
     * Delete a record by ID
     * @param {string} id - The record ID
     * @param {string} idToken - Cognito ID Token
     */
    async delete(id, idToken) {
        try {
            const docClient = getDocClient(idToken);
            const command = new DeleteCommand({
                TableName: TABLE_NAME,
                Key: { id }
            });

            await docClient.send(command);
            return true;
        } catch (error) {
            console.error(`DynamoDB delete error for ${id}:`, error);
            throw error;
        }
    },

    /**
     * Alias for getById
     */
    async get(id, idToken) {
        return this.getById(id, idToken);
    }
};

export default dynamoGenericApi;
