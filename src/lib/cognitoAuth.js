/**
 * Cognito auth helper using react-oidc-context.
 * Provides compatibility layer with existing auth interface.
 */

export const cognitoAuth = {
    /**
     * Gets the current session from Cognito auth state.
     * Returns session object compatible with existing code.
     */
    getSession(auth) {
        if (!auth || !auth.isAuthenticated || !auth.user) {
            return null;
        }

        // Map Cognito user profile to expected session format
        return {
            user: {
                id: auth.user.profile.sub,
                email: auth.user.profile.email,
                username: auth.user.profile.email, // Use email as username
                full_name: auth.user.profile.name || auth.user.profile.email,
                name: auth.user.profile.name || auth.user.profile.email,
                // Role mapping - check custom attributes or groups
                role: auth.user.profile['custom:role'] || auth.user.profile.role || 'standard',
                is_active: true,
            },
            expiresAt: new Date(auth.user.expires_at * 1000).toISOString(),
            idToken: auth.user.id_token, // Critical for DynamoDB access
        };
    },

    /**
     * Checks if user is authenticated.
     */
    isAuthenticated(auth) {
        return auth && auth.isAuthenticated;
    },

    /**
     * Signs out the user with Cognito logout redirect.
     */
    signOut(clientId, logoutUri, cognitoDomain) {
        const domainPrefix = cognitoDomain.startsWith('http') ? cognitoDomain : `https://${cognitoDomain}.auth.us-east-1.amazoncognito.com`;
        const encodedLogoutUri = encodeURIComponent(logoutUri || window.location.origin);
        window.location.href = `${domainPrefix}/logout?client_id=${clientId}&logout_uri=${encodedLogoutUri}`;
    },
};

export default cognitoAuth;
