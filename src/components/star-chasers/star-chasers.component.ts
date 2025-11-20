import { ChangeDetectionStrategy, Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { StarChasersBase } from './star-chasers.base';

@Component({
  selector: 'app-star-chasers',
  standalone: true,
  templateUrl: './star-chasers.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule],
  host: {
    'class': 'block w-full h-full'
  }
})
export class StarChasersComponent extends StarChasersBase {}
