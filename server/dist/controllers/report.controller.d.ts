import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
export declare const getReportHistory: (req: AuthRequest, res: Response) => Promise<Response<any, Record<string, any>>>;
export declare const downloadReport: (req: AuthRequest, res: Response) => Promise<Response<any, Record<string, any>>>;
//# sourceMappingURL=report.controller.d.ts.map