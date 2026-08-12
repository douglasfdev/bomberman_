// src/app/components/ad-banner.component.ts
import { Component, AfterViewInit, Inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser, NgIf } from '@angular/common';

@Component({
  selector: 'app-ad-banner',
  standalone: true,
  imports: [NgIf],
  template: `
    <div class="ad-container">
      <ins *ngIf="isBrowser"
           class="adsbygoogle"
           style="display:block"
           data-ad-client="ca-pub-SEU_PUBLISHER_ID"
           data-ad-slot="SEU_AD_SLOT_ID"
           data-ad-format="auto"
           data-full-width-responsive="true"></ins>
    </div>
  `,
  styles: [`.ad-container { margin: 20px 0; }`]
})
export class AdBannerComponent implements AfterViewInit {
  isBrowser: boolean;

  constructor(@Inject(PLATFORM_ID) private platformId: object) {
    this.isBrowser = isPlatformBrowser(this.platformId);
  }

  ngAfterViewInit() {
    if (this.isBrowser) {
      // O setTimeout garante que o Angular renderizou o <ins> antes de o script do Google tentar encontrá-lo.
      setTimeout(() => {
        try {
          ((window as any).adsbygoogle = (window as any).adsbygoogle || []).push({});
        } catch (e) {
          console.error('Erro ao inicializar anúncio do AdSense:', e);
        }
      }, 100);
    }
  }
}