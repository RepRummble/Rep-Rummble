import { Request, Response } from "express";
import { AuthRequest } from "../middleware/auth.middleware";
export declare const register: (req: Request, res: Response) => Promise<Response<any, Record<string, any>>>;
export declare const resendVerification: (req: Request, res: Response) => Promise<Response<any, Record<string, any>>>;
export declare const login: (req: Request, res: Response) => Promise<Response<any, Record<string, any>>>;
export declare const refresh: (req: Request, res: Response) => Promise<Response<any, Record<string, any>>>;
export declare const getMe: (req: AuthRequest, res: Response) => Promise<Response<any, Record<string, any>>>;
export declare const getOAuthUrl: (req: Request, res: Response) => Promise<void | Response<any, Record<string, any>>>;
export declare const logout: (req: AuthRequest, res: Response) => Promise<Response<any, Record<string, any>>>;
export declare const updateProfile: (req: AuthRequest, res: Response) => Promise<Response<any, Record<string, any>>>;
export declare const deleteAccount: (req: AuthRequest, res: Response) => Promise<Response<any, Record<string, any>>>;
//# sourceMappingURL=auth.controller.d.ts.map