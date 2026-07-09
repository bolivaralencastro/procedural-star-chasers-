import { AfterViewInit, ChangeDetectorRef, Directive, ElementRef, EventEmitter, HostListener, Input, OnDestroy, Output, ViewChild, inject } from '@angular/core';
import { AudioService } from '../../game/audio/audio.service';
import { ScreenWakeLockService } from '../../game/services/screen-wake-lock.service';
import { RadioChatterService } from '../../game/services/radio-chatter.service';
import { ConstellationService } from '../../game/services/constellation.service';
import { StarChasersEngine } from '../../game/core/star-chasers.engine';
import { Ship } from '../../game/entities/ship';
import { ContextMenuState, MouseState } from '../../game/input/input-manager';

@Directive()
export class StarChasersBase implements AfterViewInit, OnDestroy {
  @ViewChild('gameCanvas', { static: true }) canvasRef!: ElementRef<HTMLCanvasElement>;
  @ViewChild('contextMenuEl') contextMenuRef?: ElementRef<HTMLDivElement>;
  @Output() toggleFullscreenRequest = new EventEmitter<void>();
  @Output() openAboutRequest = new EventEmitter<void>();
  @Input() isFullscreen = false;

  private cdr = inject(ChangeDetectorRef);
  public audioService = AudioService.shared;
  public wakeLockService = ScreenWakeLockService.shared;
  private radioService = RadioChatterService.shared;
  private constellationService = ConstellationService.shared;

  private engine = new StarChasersEngine({
    audioService: this.audioService,
    wakeLockService: this.wakeLockService,
    radioService: this.radioService,
    constellationService: this.constellationService,
    notifyUi: () => this.cdr.detectChanges(),
    onToggleFullscreen: () => this.toggleFullscreenRequest.emit(),
    onOpenAbout: () => this.openAboutRequest.emit(),
  });

  // Exposed bindings for the template
  get ships(): Ship[] { return this.engine.ships; }
  get contextMenu(): ContextMenuState { return this.engine.contextMenu; }
  get mouse(): MouseState { return this.engine.getMouse(); }
  get targetStar() { return this.engine.targetStar; }
  get asteroids() { return this.engine.asteroids; }
  get cameraPosition() { return this.engine.cameraPosition; }
  get worldWidth() { return this.engine.worldWidth; }
  get worldHeight() { return this.engine.worldHeight; }
  get viewportWidth() { return this.engine.viewportWidth; }
  get viewportHeight() { return this.engine.viewportHeight; }
  get focusedShipId() { return this.engine.focusedShipId; }
  get followShipId() { return this.engine.followShipId; }
  get followedShipCodename() { return this.engine.getFollowedShip()?.codename ?? 'Ship'; }

  public mobileMenuVisible = this.engine.mobileMenuVisible;
  public mouseInteractionEnabled = this.engine.mouseInteractionEnabled;
  public inputDisabled = this.engine.inputDisabled;
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

  public onOpenAbout(event: Event) {
    this.engine.onOpenAbout(event);
  }

  public toggleMobileMenu() {
    this.engine.toggleMobileMenu();
  }

  public releaseCameraFollow() {
    this.engine.followShip(null);
  }

  public focusShip(shipId: number) {
    this.engine.followShip(shipId);
    this.engine.updater.updateCamera(true);
  }

  public onMinimapPointer(event: MouseEvent) {
    const target = event.currentTarget as HTMLElement | null;
    if (!target || this.worldWidth === 0 || this.worldHeight === 0) {
      return;
    }

    const rect = target.getBoundingClientRect();
    const ratioX = (event.clientX - rect.left) / rect.width;
    const ratioY = (event.clientY - rect.top) / rect.height;
    const worldX = ratioX * this.worldWidth;
    const worldY = ratioY * this.worldHeight;

    const clickedShip = this.ships.find(ship => {
      const shipX = (ship.position.x / this.worldWidth) * rect.width;
      const shipY = (ship.position.y / this.worldHeight) * rect.height;
      const dx = event.clientX - (rect.left + shipX);
      const dy = event.clientY - (rect.top + shipY);
      return Math.sqrt(dx * dx + dy * dy) < 10;
    });

    if (clickedShip) {
      this.focusShip(clickedShip.id);
      return;
    }

    this.engine.followShip(null);
    this.engine.moveCameraTo(worldX, worldY);
  }

  toggleConstellationMode() {
    this.engine.toggleConstellationMode();
  }

  ngAfterViewInit(): void {
    this.engine.attachView(() => this.canvasRef.nativeElement, () => this.contextMenuRef?.nativeElement);
    this.engine.initialize();
  }

  ngOnDestroy(): void {
    this.engine.destroy();
  }
}
