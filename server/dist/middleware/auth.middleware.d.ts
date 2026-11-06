import { Request, Response, NextFunction } from 'express';
/**
 * Tokens issued by Supabase's OAuth server to a third-party app are ordinary sign-in tokens for the
 * user plus a `client_id` claim, and their scopes do not limit what an API accepts. This API is for
 * Reprummble's own apps, so those tokens are refused (the signature is already checked by Supabase).
 */
export declare function isThirdPartyToken(token: string): boolean;
export interface AuthUser {
    id: string;
    email?: string;
    displayName?: string;
    /** True once the person has proven they own this email (link clicked, or a social provider vouched for it). */
    emailVerified?: boolean;
    isBypass?: boolean;
}
export interface AuthRequest extends Request {
    user?: AuthUser;
}
export declare const protect: (req: AuthRequest, res: Response, next: NextFunction) => Promise<void>;
export declare const optionalAuth: (req: AuthRequest, res: Response, next: NextFunction) => Promise<void>;
export declare const adminOnly: (req: AuthRequest, res: Response, next: NextFunction) => Promise<void>;
export declare const agentOnly: (req: AuthRequest, res: Response, next: NextFunction) => Promise<void>;
//# sourceMappingURL=auth.middleware.d.ts.map