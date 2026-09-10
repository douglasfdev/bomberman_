import { inject } from '@angular/core';
import { HttpRequest, HttpHandler, HttpEvent, HttpInterceptor } from '@angular/common/http';
import { Observable } from 'rxjs';

export class HttpSessionInterceptor implements HttpInterceptor {
  intercept(request: HttpRequest<unknown>, next: HttpHandler): Observable<HttpEvent<unknown>> {
    // Clone the request and add withCredentials: true to include cookies
    const modifiedRequest = request.clone({
      withCredentials: true,
    });
    return next.handle(modifiedRequest);
  }
}