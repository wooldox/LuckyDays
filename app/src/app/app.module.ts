import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { HttpClientModule } from '@angular/common/http';
import { registerLocaleData } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';

import { WindowRef } from './services/window/window-ref.service';
import { CountdownModule } from 'ngx-countdown';

import { NzLayoutModule } from 'ng-zorro-antd/layout';
import { NzGridModule } from 'ng-zorro-antd/grid';
import { NzDividerModule } from 'ng-zorro-antd/divider';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzMenuModule } from 'ng-zorro-antd/menu';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzTabsModule } from 'ng-zorro-antd/tabs';
import { NzSpinModule } from 'ng-zorro-antd/spin';
import { NzNotificationModule } from 'ng-zorro-antd/notification';
import { NzMessageModule } from 'ng-zorro-antd/message';
import { NZ_I18N } from 'ng-zorro-antd/i18n';
import { en_US } from 'ng-zorro-antd/i18n';
import en from '@angular/common/locales/en';

import { AppComponent } from './app.component';
import { MintComponent } from './mint/mint.component';
import { HelperComponent } from './helper/helper.component';

registerLocaleData(en);

const ngZorro = [
  NzLayoutModule,
  NzGridModule,
  NzDividerModule,
  NzButtonModule,
  NzInputModule,
  NzTabsModule,
  NzSpinModule,
  NzNotificationModule,
  NzMessageModule,
  NzMenuModule,
];

@NgModule({
  declarations: [AppComponent, MintComponent, HelperComponent],
  imports: [
    BrowserModule,
    BrowserAnimationsModule,
    FormsModule,
    ReactiveFormsModule,
    CountdownModule,
    HttpClientModule,
    ...ngZorro,
  ],
  providers: [WindowRef, { provide: NZ_I18N, useValue: en_US }],
  bootstrap: [AppComponent],
})
export class AppModule {}
