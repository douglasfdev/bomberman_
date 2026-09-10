import { provideHttpClient, withInterceptorsFromDi } from '@angular/common/http';
import { HttpSessionInterceptor } from './http.interceptor';

import { ApplicationConfig, provideBrowserGlobalErrorListeners } from '@angular/core';
import { provideClientHydration, withEventReplay } from '@angular/platform-browser';
import { provideRouter } from '@angular/router';
import { routes } from './app.routes';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideClientHydration(withEventReplay()),
    provideRouter(routes),
    provideHttpClient(withInterceptorsFromDi()),
    HttpSessionInterceptor,
  ],
};
