// Accessibility utilities for DocBare

export interface AccessibilityConfig {
  enableKeyboardNavigation: boolean;
  enableScreenReaderSupport: boolean;
  enableHighContrast: boolean;
  enableReducedMotion: boolean;
  enableFocusIndicators: boolean;
}

export const defaultAccessibilityConfig: AccessibilityConfig = {
  enableKeyboardNavigation: true,
  enableScreenReaderSupport: true,
  enableHighContrast: false,
  enableReducedMotion: false,
  enableFocusIndicators: true,
};

// ARIA helpers
export const ariaHelpers = {
  // Live regions for dynamic content
  liveRegion: (politeness: 'polite' | 'assertive' | 'off' = 'polite') => ({
    'aria-live': politeness,
    'aria-atomic': 'true',
  }),

  // Expandable content
  expandable: (expanded: boolean, controls?: string) => ({
    'aria-expanded': expanded,
    ...(controls && { 'aria-controls': controls }),
  }),

  // Pressed state for buttons
  pressed: (pressed: boolean) => ({
    'aria-pressed': pressed,
  }),

  // Current state for navigation
  current: (current: boolean) => ({
    'aria-current': current ? 'page' : undefined,
  }),

  // Described by
  describedBy: (id: string) => ({
    'aria-describedby': id,
  }),

  // Labelled by
  labelledBy: (id: string) => ({
    'aria-labelledby': id,
  }),

  // Hidden from screen readers
  hidden: () => ({
    'aria-hidden': 'true',
  }),

  // Required field
  required: () => ({
    'aria-required': 'true',
  }),

  // Invalid field
  invalid: (invalid: boolean) => ({
    'aria-invalid': invalid ? 'true' : 'false',
  }),

  // Busy state
  busy: (busy: boolean) => ({
    'aria-busy': busy,
  }),

  // Progress indicator
  progress: (value: number, min: number = 0, max: number = 100) => ({
    'role': 'progressbar',
    'aria-valuenow': value,
    'aria-valuemin': min,
    'aria-valuemax': max,
  }),

  // Status message
  status: (message: string) => ({
    'role': 'status',
    'aria-live': 'polite',
    'aria-atomic': 'true',
  }),

  // Alert message
  alert: (message: string) => ({
    'role': 'alert',
    'aria-live': 'assertive',
    'aria-atomic': 'true',
  }),

  // Dialog
  dialog: (modal: boolean = false) => ({
    'role': 'dialog',
    'aria-modal': modal,
  }),

  // List
  list: () => ({
    'role': 'list',
  }),

  // List item
  listItem: () => ({
    'role': 'listitem',
  }),

  // Tab
  tab: (selected: boolean, controls?: string) => ({
    'role': 'tab',
    'aria-selected': selected,
    ...(controls && { 'aria-controls': controls }),
  }),

  // Tab panel
  tabPanel: (labelledBy?: string) => ({
    'role': 'tabpanel',
    ...(labelledBy && { 'aria-labelledby': labelledBy }),
  }),

  // Tab list
  tabList: () => ({
    'role': 'tablist',
  }),

  // Combobox
  combobox: (expanded: boolean, controls?: string) => ({
    'role': 'combobox',
    'aria-expanded': expanded,
    ...(controls && { 'aria-controls': controls }),
  }),

  // Option
  option: (selected: boolean) => ({
    'role': 'option',
    'aria-selected': selected,
  }),
};

// Keyboard navigation helpers
export const keyboardNavigation = {
  // Handle arrow key navigation in lists
  handleArrowKeys: (
    event: React.KeyboardEvent,
    currentIndex: number,
    totalItems: number,
    onIndexChange: (index: number) => void,
    orientation: 'horizontal' | 'vertical' = 'vertical'
  ) => {
    const isVertical = orientation === 'vertical';
    const arrowUp = isVertical ? 'ArrowUp' : 'ArrowLeft';
    const arrowDown = isVertical ? 'ArrowDown' : 'ArrowRight';

    if (event.key === arrowUp) {
      event.preventDefault();
      const newIndex = currentIndex > 0 ? currentIndex - 1 : totalItems - 1;
      onIndexChange(newIndex);
    } else if (event.key === arrowDown) {
      event.preventDefault();
      const newIndex = currentIndex < totalItems - 1 ? currentIndex + 1 : 0;
      onIndexChange(newIndex);
    }
  },

  // Handle Enter and Space for activation
  handleActivation: (
    event: React.KeyboardEvent,
    onActivate: () => void
  ) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      onActivate();
    }
  },

  // Handle Escape for closing
  handleEscape: (
    event: React.KeyboardEvent,
    onClose: () => void
  ) => {
    if (event.key === 'Escape') {
      event.preventDefault();
      onClose();
    }
  },

  // Handle Tab for focus management
  handleTab: (
    event: React.KeyboardEvent,
    onTabOut?: () => void
  ) => {
    if (event.key === 'Tab' && onTabOut) {
      onTabOut();
    }
  },
};

// Focus management
export const focusManagement = {
  // Trap focus within a container
  trapFocus: (containerRef: React.RefObject<HTMLElement>) => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Tab') return;

      const container = containerRef.current;
      if (!container) return;

      const focusableElements = container.querySelectorAll(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      );

      const firstElement = focusableElements[0] as HTMLElement;
      const lastElement = focusableElements[focusableElements.length - 1] as HTMLElement;

      if (event.shiftKey) {
        if (document.activeElement === firstElement) {
          event.preventDefault();
          lastElement.focus();
        }
      } else {
        if (document.activeElement === lastElement) {
          event.preventDefault();
          firstElement.focus();
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  },

  // Focus first focusable element
  focusFirst: (containerRef: React.RefObject<HTMLElement>) => {
    const container = containerRef.current;
    if (!container) return;

    const focusableElement = container.querySelector(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    ) as HTMLElement;

    if (focusableElement) {
      focusableElement.focus();
    }
  },

  // Focus last focusable element
  focusLast: (containerRef: React.RefObject<HTMLElement>) => {
    const container = containerRef.current;
    if (!container) return;

    const focusableElements = container.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );

    const lastElement = focusableElements[focusableElements.length - 1] as HTMLElement;
    if (lastElement) {
      lastElement.focus();
    }
  },

  // Store and restore focus
  storeFocus: () => {
    const activeElement = document.activeElement as HTMLElement;
    return () => {
      if (activeElement && typeof activeElement.focus === 'function') {
        activeElement.focus();
      }
    };
  },
};

// Screen reader announcements
export const screenReader = {
  // Announce message to screen readers
  announce: (message: string, politeness: 'polite' | 'assertive' = 'polite') => {
    const announcement = document.createElement('div');
    announcement.setAttribute('aria-live', politeness);
    announcement.setAttribute('aria-atomic', 'true');
    announcement.className = 'sr-only';
    announcement.textContent = message;

    document.body.appendChild(announcement);

    // Remove after announcement
    setTimeout(() => {
      document.body.removeChild(announcement);
    }, 1000);
  },

  // Announce page title
  announcePageTitle: (title: string) => {
    screenReader.announce(`Page loaded: ${title}`);
  },

  // Announce loading state
  announceLoading: (message: string = 'Loading...') => {
    screenReader.announce(message, 'assertive');
  },

  // Announce completion
  announceComplete: (message: string) => {
    screenReader.announce(message, 'polite');
  },

  // Announce error
  announceError: (message: string) => {
    screenReader.announce(`Error: ${message}`, 'assertive');
  },
};

// Color contrast utilities
export const colorContrast = {
  // Calculate relative luminance
  getRelativeLuminance: (r: number, g: number, b: number): number => {
    const [rs, gs, bs] = [r, g, b].map(c => {
      c = c / 255;
      return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
    });
    return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
  },

  // Calculate contrast ratio
  getContrastRatio: (l1: number, l2: number): number => {
    const lighter = Math.max(l1, l2);
    const darker = Math.min(l1, l2);
    return (lighter + 0.05) / (darker + 0.05);
  },

  // Check if contrast meets WCAG AA standards
  meetsWCAGAA: (contrastRatio: number, isLargeText: boolean = false): boolean => {
    return isLargeText ? contrastRatio >= 3 : contrastRatio >= 4.5;
  },

  // Check if contrast meets WCAG AAA standards
  meetsWCAGAAA: (contrastRatio: number, isLargeText: boolean = false): boolean => {
    return isLargeText ? contrastRatio >= 4.5 : contrastRatio >= 7;
  },
};

// Accessibility validation
export const accessibilityValidation = {
  // Validate form field
  validateFormField: (field: HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement): string[] => {
    const errors: string[] = [];

    // Check for label
    const label = field.labels?.[0];
    if (!label && !field.getAttribute('aria-label') && !field.getAttribute('aria-labelledby')) {
      errors.push('Form field must have a label or aria-label or aria-labelledby');
    }

    // Check for required field
    if (field.required && !field.getAttribute('aria-required')) {
      errors.push('Required field should have aria-required="true"');
    }

    // Check for invalid field
    if (field.validity.valid === false && field.getAttribute('aria-invalid') !== 'true') {
      errors.push('Invalid field should have aria-invalid="true"');
    }

    return errors;
  },

  // Validate button
  validateButton: (button: HTMLButtonElement): string[] => {
    const errors: string[] = [];

    // Check for accessible name
    if (!button.textContent?.trim() && !button.getAttribute('aria-label')) {
      errors.push('Button must have text content or aria-label');
    }

    return errors;
  },

  // Validate image
  validateImage: (img: HTMLImageElement): string[] => {
    const errors: string[] = [];

    // Check for alt text
    if (!img.alt && !img.getAttribute('aria-label')) {
      errors.push('Image must have alt text or aria-label');
    }

    return errors;
  },

  // Validate link
  validateLink: (link: HTMLAnchorElement): string[] => {
    const errors: string[] = [];

    // Check for accessible name
    if (!link.textContent?.trim() && !link.getAttribute('aria-label')) {
      errors.push('Link must have text content or aria-label');
    }

    // Check for href
    if (!link.href && !link.getAttribute('aria-label')) {
      errors.push('Link must have href attribute');
    }

    return errors;
  },
};

// Utility functions
export const accessibilityUtils = {
  // Generate unique ID
  generateId: (prefix: string = 'id'): string => {
    return `${prefix}-${Math.random().toString(36).substr(2, 9)}`;
  },

  // Check if element is visible
  isVisible: (element: HTMLElement): boolean => {
    const style = window.getComputedStyle(element);
    return style.display !== 'none' && style.visibility !== 'hidden' && element.offsetParent !== null;
  },

  // Check if element is focusable
  isFocusable: (element: HTMLElement): boolean => {
    const tabIndex = element.tabIndex;
    return tabIndex >= 0 && accessibilityUtils.isVisible(element);
  },

  // Get all focusable elements
  getFocusableElements: (container: HTMLElement): HTMLElement[] => {
    const focusableSelectors = [
      'button:not([disabled])',
      'input:not([disabled])',
      'select:not([disabled])',
      'textarea:not([disabled])',
      'a[href]',
      '[tabindex]:not([tabindex="-1"])',
      '[contenteditable="true"]'
    ];

    return Array.from(container.querySelectorAll(focusableSelectors.join(','))) as HTMLElement[];
  },

  // Check if user prefers reduced motion
  prefersReducedMotion: (): boolean => {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  },

  // Check if user prefers high contrast
  prefersHighContrast: (): boolean => {
    return window.matchMedia('(prefers-contrast: high)').matches;
  },
};

// Export all utilities
export default {
  ariaHelpers,
  keyboardNavigation,
  focusManagement,
  screenReader,
  colorContrast,
  accessibilityValidation,
  accessibilityUtils,
  defaultAccessibilityConfig,
}; 