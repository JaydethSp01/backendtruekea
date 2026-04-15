declare namespace Express {
  export interface Request {
    userId?: number;
    requestId?: string;
    user?: any;
  }
}
