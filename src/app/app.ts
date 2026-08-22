import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { AchievementNotificationComponent } from './components/achievement-notification/achievement-notification.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, AchievementNotificationComponent],
  template: `
    <router-outlet />
    <app-achievement-notification />
  `,
})
export class App {}
