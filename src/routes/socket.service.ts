import { Inject, Injectable, OnDestroy, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { io, Socket } from 'socket.io-client';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class SocketService implements OnDestroy {
  private socket: Socket | undefined;

  constructor(@Inject(PLATFORM_ID) private platformId: Object) {
    if (isPlatformBrowser(this.platformId)) {
      // A conexão só é iniciada no navegador
      this.socket = io('http://localhost:4200'); // URL do seu servidor Socket.io
    }
  }

  joinRoom(roomName: string): void {
    this.socket?.emit('join_room', roomName);
  }

  listen(eventName: string): Observable<any> {
    return new Observable((subscriber) => {
      this.socket?.on(eventName, (data) => {
        subscriber.next(data);
      });
    });
  }

  ngOnDestroy(): void {
    this.socket?.disconnect();
  }
}