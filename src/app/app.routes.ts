import { Routes } from '@angular/router';
import { GameComponent } from './game/game.component';
import { SkinShopComponent } from './components/skin-shop/skin-shop.component';

export const routes: Routes = [
  { path: '', component: GameComponent },
  { path: 'skins', component: SkinShopComponent },
];
