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
           data-ad-client=""
           data-ad-slot=""
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

  async ngAfterViewInit() {
    if (!this.isBrowser) return;

    try {
      const res = await fetch('/api/ads/config');
      const cfg = await res.json();

      if (!cfg || !cfg.enabled) return;

      const ins = document.querySelector('.ad-container ins.adsbygoogle') as HTMLElement | null;
      if (!ins) return;

      if (cfg.adSenseClient) ins.setAttribute('data-ad-client', cfg.adSenseClient);

      const slot = cfg.slots && (cfg.slots.menu || cfg.slots.layout) ? (cfg.slots.menu || cfg.slots.layout) : null;
      if (slot) ins.setAttribute('data-ad-slot', slot);


      if (!(window as any).adsbygoogle) {
        const script = document.createElement('script');
        script.async = true;
        script.src = 'https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js';
        script.setAttribute('crossorigin', 'anonymous');
        document.head.appendChild(script);

        await new Promise((r) => setTimeout(r, 250));
      }

      try {
        ((window as any).adsbygoogle = (window as any).adsbygoogle || []).push({});
      } catch (e) {
        console.error('Erro ao inicializar anúncio do AdSense:', e);
      }
    } catch (err) {
      console.warn('Ad config fetch failed', err);
    }
  }
}