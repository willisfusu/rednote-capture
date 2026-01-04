/**
 * ProgressBar Component
 * Shows progress for PDF generation and upload operations
 */

export interface ProgressBarOptions {
  /** Show percentage text */
  showPercentage?: boolean;

  /** Animation duration in ms */
  animationDuration?: number;
}

/**
 * Create a progress bar element
 */
export function createProgressBar(
  container: HTMLElement,
  options: ProgressBarOptions = {}
): HTMLElement {
  const { showPercentage = true } = options;

  const wrapper = document.createElement('div');
  wrapper.className = 'progress-wrapper';
  wrapper.innerHTML = `
    <div class="progress-bar">
      <div class="progress-fill" style="width: 0%"></div>
    </div>
    ${showPercentage ? '<span class="progress-text">0%</span>' : ''}
  `;

  container.appendChild(wrapper);
  return wrapper;
}

/**
 * Update progress bar value
 */
export function updateProgress(
  progressWrapper: HTMLElement,
  percent: number,
  options: ProgressBarOptions = {}
): void {
  const { animationDuration = 300 } = options;

  const fill = progressWrapper.querySelector('.progress-fill') as HTMLElement;
  const text = progressWrapper.querySelector('.progress-text');

  if (fill) {
    fill.style.transition = `width ${animationDuration}ms ease`;
    fill.style.width = `${Math.min(100, Math.max(0, percent))}%`;
  }

  if (text) {
    text.textContent = `${Math.round(percent)}%`;
  }
}

/**
 * Show indeterminate progress (loading animation)
 */
export function showIndeterminate(progressWrapper: HTMLElement): void {
  const fill = progressWrapper.querySelector('.progress-fill') as HTMLElement;
  const text = progressWrapper.querySelector('.progress-text');

  if (fill) {
    fill.classList.add('indeterminate');
    fill.style.width = '30%';
  }

  if (text) {
    text.textContent = 'Processing...';
  }
}

/**
 * Hide indeterminate progress
 */
export function hideIndeterminate(progressWrapper: HTMLElement): void {
  const fill = progressWrapper.querySelector('.progress-fill') as HTMLElement;

  if (fill) {
    fill.classList.remove('indeterminate');
  }
}

/**
 * Reset progress bar to initial state
 */
export function resetProgress(progressWrapper: HTMLElement): void {
  const fill = progressWrapper.querySelector('.progress-fill') as HTMLElement;
  const text = progressWrapper.querySelector('.progress-text');

  if (fill) {
    fill.style.transition = 'none';
    fill.style.width = '0%';
    fill.classList.remove('indeterminate');
  }

  if (text) {
    text.textContent = '0%';
  }
}

/**
 * CSS styles for progress bar (to be added to popup.css)
 *
 * .progress-wrapper {
 *   display: flex;
 *   align-items: center;
 *   gap: 8px;
 * }
 *
 * .progress-bar {
 *   flex: 1;
 *   height: 4px;
 *   background: #e5e5e5;
 *   border-radius: 2px;
 *   overflow: hidden;
 * }
 *
 * .progress-fill {
 *   height: 100%;
 *   background: #ff2442;
 *   border-radius: 2px;
 * }
 *
 * .progress-fill.indeterminate {
 *   animation: indeterminate 1.5s infinite;
 * }
 *
 * @keyframes indeterminate {
 *   0% { transform: translateX(-100%); }
 *   100% { transform: translateX(400%); }
 * }
 *
 * .progress-text {
 *   font-size: 12px;
 *   color: #666;
 *   min-width: 40px;
 * }
 */
