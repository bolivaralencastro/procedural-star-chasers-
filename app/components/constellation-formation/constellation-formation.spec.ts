import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ConstellationFormation } from './constellation-formation';

describe('ConstellationFormation', () => {
  let component: ConstellationFormation;
  let fixture: ComponentFixture<ConstellationFormation>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ConstellationFormation]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ConstellationFormation);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
