/**
 * DynamoDB Auth Helper
 * Exchanges Cognito tokens for temporary AWS credentials using Identity Pools
 */

import { fromCognitoIdentityPool } from "@aws-sdk/credential-providers";
import { cognitoConfig } from "@/config";

/**
 * Gets temporary AWS credentials for the authenticated user
 * @param {string} idToken - The ID Token from Cognito User Pool
 */
export const getFrontendCredentials = (idToken) => {
    if (!idToken) {
        throw new Error("No ID Token provided for AWS credentials exchange");
    }

    const logins = {
        [`cognito-idp.${cognitoConfig.region}.amazonaws.com/${cognitoConfig.userPoolId}`]: idToken
    };

    return fromCognitoIdentityPool({
        identityPoolId: cognitoConfig.identityPoolId,
        logins,
        clientConfig: {
            region: cognitoConfig.region
        }
    });
};
