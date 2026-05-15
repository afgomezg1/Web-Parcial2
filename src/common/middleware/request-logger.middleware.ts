import { Injectable, NestMiddleware } from '@nestjs/common';
import { NextFunction, Request, Response } from 'express';

@Injectable()
export class RequestLoggerMiddleware implements NestMiddleware {
  use(req: Request, _res: Response, next: NextFunction): void {
    // eslint-disable-next-line no-console
    console.log(`Incoming request: ${req.method} ${req.originalUrl}`);
    next();
  }
}
