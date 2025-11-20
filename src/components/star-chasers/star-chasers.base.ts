import { AfterViewInit, ChangeDetectorRef, ElementRef, EventEmitter, HostListener, Input, OnDestroy, Output, ViewChild, inject } from '@angular/core';
import { AudioService } from '../../services/audio.service';
import { ScreenWakeLockService } from '../../services/screen-wake-lock.service';
import { RadioChatterService } from '../../services/radio-chatter.service';
import { ConstellationService } from '../../services/constellation.service';
import { StarChasersEngine } from './star-chasers.engine';
import { Ship } from '../../models/ship';
import { ContextMenuState, MouseState } from './input-manager';

export class StarChasersBase implements AfterViewInit, OnDestroy {
  @ViewChild('gameCanvas') canvasRef!: ElementRef<HTMLCanvasElement>;
  @ViewChild('contextMenuEl') contextMenuRef?: ElementRef<HTMLDivElement>;
  @Output() toggleFullscreenRequest = new EventEmitter<void>();
  @Input() isFullscreen = false;

  private cdr = inject(ChangeDetectorRef);
  public audioService = inject(AudioService);
  public wakeLockService = inject(ScreenWakeLockService);
  private radioService = inject(RadioChatterService);
  private constellationService = inject(ConstellationService);

  private engine = new StarChasersEngine({
    audioService: this.audioService,
    wakeLockService: this.wakeLockService,
    radioService: this.radioService,
    constellationService: this.constellationService,
    cdr: this.cdr,
    onToggleFullscreen: () => this.toggleFullscreenRequest.emit(),
  });

  // Exposed bindings for the template
  get ships(): Ship[] { return this.engine.ships; }
  get contextMenu(): ContextMenuState { return this.engine.contextMenu; }
  get mouse(): MouseState { return this.engine.getMouse(); }

  public mobileMenuVisible = this.engine.mobileMenuVisible;
  public mouseInteractionEnabled = this.engine.mouseInteractionEnabled;
  public isMobile = this.engine.isMobile;

  @HostListener('window:resize')
  onResize() {
    this.engine.handleResize();
  }

  @HostListener('document:mousemove', ['$event'])
  onMouseMove(event: MouseEvent) {
    this.engine.handleMouseMove(event);
  }

  @HostListener('document:keydown', ['$event'])
  onKeyDown(event: KeyboardEvent) {
    this.engine.handleKeyDown(event);
  }

  @HostListener('document:keyup', ['$event'])
  onKeyUp(event: KeyboardEvent) {
    this.engine.handleKeyUp(event);
  }

  @HostListener('document:touchmove', ['$event'])
  onTouchMove(event: TouchEvent) {
    this.engine.handleTouchMove(event);
  }

  @HostListener('document:mousedown', ['$event'])
  onMouseDown(event: MouseEvent) {
    this.engine.handleMouseDown(event);
  }

  @HostListener('document:touchstart', ['$event'])
  onTouchStart(event: TouchEvent) {
    this.engine.handleTouchStart(event);
  }

  @HostListener('document:mouseup')
  @HostListener('document:touchend')
  onMouseUp() {
    this.engine.handlePointerEnd();
  }

  public onContextMenu(event: MouseEvent) {
    this.engine.onContextMenu(event);
  }

  public toggleMouseInteraction(event: Event) {
    this.engine.toggleMouseInteraction(event);
  }

  public onToggleAudio(event: Event) {
    this.engine.onToggleAudio(event);
  }

  public onToggleFullscreen(event: Event) {
    this.engine.onToggleFullscreen(event);
  }

  public onToggleWakeLock(event: Event) {
    this.engine.onToggleWakeLock(event);
  }

  public toggleMobileMenu() {
    this.engine.toggleMobileMenu();
  }

  public toggleConstellationMode() {
    this.engine.toggleConstellationMode();
  }

  ngAfterViewInit(): void {
    this.engine.attachView(this.canvasRef, this.contextMenuRef);
    this.engine.initialize();
  }

  ngOnDestroy(): void {
    this.engine.destroy();
  }
}
