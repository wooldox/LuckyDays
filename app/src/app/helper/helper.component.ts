import { Component, ElementRef, EventEmitter, Output, ViewChild } from '@angular/core';

@Component({
  selector: 'app-helper',
  templateUrl: './helper.component.html',
  styleUrls: ['./helper.component.scss'],
})
export class HelperComponent {
  @ViewChild('videoFrame', { static: false }) videoFrame!: ElementRef<any>;
  @Output() changeTab: EventEmitter<number> = new EventEmitter();

  constructor() {}
}
