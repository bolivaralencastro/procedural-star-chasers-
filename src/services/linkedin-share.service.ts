import { Injectable } from '@angular/core';

export interface LinkedInShareConfig {
  url: string;
  title?: string;
  summary?: string;
}

@Injectable({
  providedIn: 'root'
})
export class LinkedInShareService {
  private readonly SITE_URL = 'https://bolivaralencastro.github.io/procedural-star-chasers-/';
  private readonly LINKEDIN_SHARE_URL = 'https://www.linkedin.com/sharing/share-offsite/';

  /**
   * Opens LinkedIn share dialog with the site URL
   * Uses the standard LinkedIn share endpoint (no authentication needed)
   */
  shareOnLinkedIn(config?: LinkedInShareConfig): void {
    const url = config?.url || this.SITE_URL;
    
    // Construct LinkedIn share URL
    const shareUrl = `${this.LINKEDIN_SHARE_URL}?url=${encodeURIComponent(url)}`;
    
    // Open in a new window with standard LinkedIn share dialog
    window.open(
      shareUrl,
      'linkedinShare',
      'width=550,height=680'
    );
  }

  /**
   * Copy share link to clipboard
   */
  async copyShareLink(): Promise<boolean> {
    try {
      await navigator.clipboard.writeText(this.SITE_URL);
      return true;
    } catch (err) {
      console.error('Failed to copy share link:', err);
      return false;
    }
  }

  /**
   * Generate shareable link with UTM parameters for analytics
   */
  generateTrackingLink(source: string = 'about-dialog'): string {
    const params = new URLSearchParams({
      ref: 'Star-Chasers',
      utm_source: 'site',
      utm_medium: 'social',
      utm_campaign: 'share',
      utm_term: source,
      utm_content: 'about'
    });
    
    return `${this.SITE_URL}?${params.toString()}`;
  }

  /**
   * Open LinkedIn share for a specific post
   * Can be used with OAuth integration in the future
   */
  shareViaLinkedInAPI(comment: string): void {
    // This is prepared for future OAuth 2.0 integration
    // Currently uses the standard share dialog
    this.shareOnLinkedIn();
    console.log('Share with comment:', comment);
  }

  /**
   * Get shareable text for the site
   */
  getShareText(): string {
    return `🚀 Exploring Procedural Star Chasers — Where Space Becomes Symphony

An indie masterpiece of procedural cosmos where three sentient vessels navigate a universe of perpetual motion. A meditation on autonomy, emergence, and the delicate balance between individual ambition and collective survival.

Experience impossible geometries, ambient soundscapes, and narratives told through mechanics. 🎮✨`;
  }

  /**
   * Get hashtags for social sharing
   */
  getShareHashtags(): string {
    return '#IndieDeveloper #GameDev #ProceduralGeneration #WebGame #InteractiveArt #SpaceSimulation';
  }

  /**
   * Generate complete social media share text with hashtags
   */
  getCompleteShareText(): string {
    return `${this.getShareText()}\n\n${this.getShareHashtags()}`;
  }
}
