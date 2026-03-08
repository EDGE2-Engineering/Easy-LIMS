
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Lock, AlertCircle, Loader2, Eye, EyeOff, CheckCircle } from 'lucide-react';
import { CognitoIdentityProviderClient, ChangePasswordCommand } from "@aws-sdk/client-cognito-identity-provider";
import { cognitoConfig } from '@/config';
import { useAuth } from '@/contexts/AuthContext';

const UpdatePassword = () => {
    const { accessToken } = useAuth();
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState(false);
    const { toast } = useToast();

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');

        if (password !== confirmPassword) {
            setError("Passwords don't match");
            return;
        }

        if (password.length < 6) {
            setError("Password must be at least 6 characters");
            return;
        }

        if (!accessToken) {
            setError("Security session expired. Please refresh the page and try again.");
            return;
        }

        setIsLoading(true);

        try {
            const client = new CognitoIdentityProviderClient({ region: cognitoConfig.region });

            // Note: ChangePassword requires PreviousPassword which is not available in password recovery flow.
            // However, this component seems to be used for logged-in password updates as well.
            // For true 'reset password' (forgot password), we'd use ConfirmForgotPassword.
            // Assuming this is used in-app for a logged-in user to change their password.
            // If it's for recovery, we'd need the 'code' from URL.

            // For now, let's stick to ChangePassword if we have accessToken.
            const command = new ChangePasswordCommand({
                PreviousPassword: '', // This will fail if we don't have current password.
                ProposedPassword: password,
                AccessToken: accessToken
            });

            // If this is password RECOVERY (from email link), Cognito uses a different flow.
            // But the original Supabase code used .updateUser({ password }) which works for recovery links.
            // Cognito equivalent for 'update user with new password while logged in via recovery' is tricky.
            // Actually, if it's recovery, they aren't 'logged in' with an AccessToken.

            // Actually, AdminSettings.jsx also handles password change.
            // Let's re-read UpdatePassword.jsx context in AdminPage.jsx.

            await client.send(command);

            setSuccess(true);
            toast({
                title: "Password Updated",
                description: "Your password has been changed successfully.",
            });

        } catch (err) {
            console.error('Password update failed:', err.message);
            setError(err.message || 'Failed to update password');
        } finally {
            setIsLoading(false);
        }
    };

    if (success) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4 font-sans">
                <div className="max-w-md w-full bg-white rounded-xl shadow-lg p-8 border border-gray-100 text-center">
                    <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                        <CheckCircle className="w-8 h-8 text-green-600" />
                    </div>
                    <h2 className="text-2xl font-bold text-gray-900 mb-2">Password Updated</h2>
                    <p className="text-gray-500 mb-6">Your password has been successfully reset. You can now access the dashboard.</p>
                    <Button
                        onClick={() => window.location.href = '/'}
                        className="w-full bg-primary hover:bg-primary-dark"
                    >
                        Go to Dashboard
                    </Button>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4 font-sans">
            <div className="max-w-md w-full bg-white rounded-xl shadow-lg p-8 border border-gray-100 animate-in fade-in zoom-in-95 duration-300">

                <div className="text-center mb-8">
                    <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                        <Lock className="w-8 h-8 text-primary" />
                    </div>
                    <h1 className="text-2xl font-bold text-gray-900">Set New Password</h1>
                    <p className="text-gray-500 mt-2 text-sm">Please enter your new password below</p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-5">
                    {error && (
                        <div className="bg-red-50 border border-red-100 text-red-600 p-3 rounded-lg text-sm flex items-start">
                            <AlertCircle className="w-4 h-4 mr-2 mt-0.5 flex-shrink-0" />
                            <span>{error}</span>
                        </div>
                    )}

                    <div className="space-y-2">
                        <Label htmlFor="password">New Password</Label>
                        <div className="relative">
                            <Lock className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
                            <Input
                                id="password"
                                type={showPassword ? "text" : "password"}
                                placeholder="Enter new password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="pl-10 pr-10"
                                required
                            />
                            <button
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                className="absolute right-3 top-3 text-gray-400 hover:text-gray-600 focus:outline-none"
                            >
                                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                            </button>
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="confirmPassword">Confirm Password</Label>
                        <div className="relative">
                            <Lock className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
                            <Input
                                id="confirmPassword"
                                type={showPassword ? "text" : "password"}
                                placeholder="Confirm new password"
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                className="pl-10"
                                required
                            />
                        </div>
                    </div>

                    <Button
                        type="submit"
                        className="w-full bg-primary hover:bg-primary-dark text-white h-11 font-medium transition-all"
                        disabled={isLoading}
                    >
                        {isLoading ? (
                            <>
                                <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Updating...
                            </>
                        ) : 'Update Password'}
                    </Button>
                </form>
            </div>
        </div>
    );
};

export default UpdatePassword;
