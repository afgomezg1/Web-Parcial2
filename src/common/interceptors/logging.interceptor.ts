import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { Observable, tap } from 'rxjs';

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request = context.switchToHttp().getRequest<{ method: string; url: string }>();
    const startedAt = Date.now();

    return next.handle().pipe(
      tap(() => {
        const ms = Date.now() - startedAt;
        // eslint-disable-next-line no-console
        console.log(`[${request.method}] ${request.url} - ${ms}ms`);
      }),
    );
  }
}
