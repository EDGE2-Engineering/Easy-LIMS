import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs) {
	return twMerge(clsx(inputs));
}

import { CognitoIdentityProviderClient, GetUserCommand } from "@aws-sdk/client-cognito-identity-provider";


export function getUserDetailsForUserID(userID, idToken) {
	const client = new CognitoIdentityProviderClient({
		region: "us-east-1"
	});

	async function getUser(accessToken) {
		const command = new GetUserCommand({
			AccessToken: accessToken
		});

		const response = await client.send(command);
		console.log(response);
	}
}