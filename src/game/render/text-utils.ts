/**
 * Text rendering utilities for the star-chasers game
 */

export class TextUtils {
  /**
   * Wraps text to fit within a maximum width by breaking it into lines
   */
  static wrapText(
    ctx: CanvasRenderingContext2D,
    text: string,
    maxWidth: number,
    font: string = 'bold 14px "Courier New", monospace'
  ): string[] {
    ctx.save();
    ctx.font = font;

    const words = text.split(' ');
    const lines: string[] = [];
    let currentLine = '';

    words.forEach(word => {
      const testLine = currentLine ? `${currentLine} ${word}` : word;
      const metrics = ctx.measureText(testLine);
      if (metrics.width > maxWidth && currentLine) {
        lines.push(currentLine);
        currentLine = word;
      } else {
        currentLine = testLine;
      }
    });

    if (currentLine) {
      lines.push(currentLine);
    }

    ctx.restore();
    return lines;
  }

  /**
   * Generates a random delay within a range
   */
  static getRandomDelay(range: [number, number]): number {
    const [min, max] = range;
    return min + Math.random() * (max - min);
  }
}
