import { SupabaseClient, User } from '@supabase/supabase-js';
declare let supabase: SupabaseClient | null;
export interface AuthResult {
    success: boolean;
    user?: User;
    session?: any;
    error?: string;
}
export interface SignUpResult extends AuthResult {
    /** True when the person must click the link we emailed before they can sign in. */
    needsVerification?: boolean;
    /** True when the email already has an account (Supabase hides this from the response on purpose). */
    alreadyRegistered?: boolean;
}
/**
 * Sign up with email and password.
 *
 * This uses the normal sign-up flow, so when "Confirm email" is on in the Supabase
 * dashboard Supabase emails a verification link and gives no session until it is clicked.
 * (The old admin createUser call marked every email as verified without checking.)
 */
export declare function signUpWithEmail(email: string, password: string, metadata?: {
    displayName?: string;
}): Promise<SignUpResult>;
/** Sends the verification email again. Callers should not reveal whether the address exists. */
export declare function resendVerification(email: string): Promise<void>;
/**
 * Sign in with email and password
 */
export declare function signInWithEmail(email: string, password: string): Promise<AuthResult>;
/**
 * Verify JWT token from Supabase
 */
export declare function verifyToken(token: string): Promise<AuthResult>;
/**
 * Get OAuth URL for social login
 */
export type OAuthProvider = 'google' | 'facebook' | 'apple' | 'twitter' | 'azure';
export declare function getOAuthUrl(provider: OAuthProvider, redirectTo: string): Promise<{
    url: string | null;
    error?: string;
}>;
/**
 * Sign out user
 */
export declare function signOut(token: string): Promise<{
    success: boolean;
    error?: string;
}>;
/**
 * Get user by ID
 */
export declare function getUserById(userId: string): Promise<AuthResult>;
/**
 * Update user metadata
 */
export declare function updateUserMetadata(userId: string, metadata: Record<string, any>): Promise<AuthResult>;
/**
 * Delete user
 */
export declare function deleteUser(userId: string): Promise<{
    success: boolean;
    error?: string;
}>;
export { supabase };
declare const _default: {
    signUpWithEmail: typeof signUpWithEmail;
    resendVerification: typeof resendVerification;
    signInWithEmail: typeof signInWithEmail;
    verifyToken: typeof verifyToken;
    getOAuthUrl: typeof getOAuthUrl;
    signOut: typeof signOut;
    getUserById: typeof getUserById;
    updateUserMetadata: typeof updateUserMetadata;
    deleteUser: typeof deleteUser;
};
export default _default;
export type KeyStatus = 'valid' | 'rejected' | 'missing' | 'unreachable';
/**
 * Whether Supabase actually accepts the keys this server holds. "Configured" only means a value is
 * set; a rotated or mistyped key still looks configured and then fails every sign-in with
 * "Invalid API key". Checked at most once a minute, and the keys themselves are never reported.
 */
export declare function checkSupabaseKeys(): Promise<{
    anon: KeyStatus;
    service: KeyStatus;
}>;
/**
 * Trades a refresh token for a new access token. Supabase rotates refresh tokens, so the new one in
 * the result replaces the old one, which cannot be used again.
 */
export declare function refreshSession(refreshToken: string): Promise<AuthResult>;
//# sourceMappingURL=supabase.service.d.ts.map