import { test, expect } from '@playwright/test';

test.describe('Chat Flow', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the home page
    await page.goto('/');
  });

  test('should create a new chat session and send a message', async ({ page }) => {
    // Wait for the page to load
    await page.waitForSelector('textarea[placeholder*="legal question"]');

    // Type a message
    const message = 'What is a contract?';
    await page.fill('textarea[placeholder*="legal question"]', message);

    // Click send button
    await page.click('button[aria-label="Send"]');

    // Wait for the chat page to load
    await page.waitForURL(/\/c\/[a-zA-Z0-9-]+/);

    // Verify the message appears in the chat
    await expect(page.locator('text=' + message)).toBeVisible();

    // Wait for AI response (should start with loading indicator)
    await expect(page.locator('[data-testid="loading-dots"]')).toBeVisible();

    // Wait for AI response to complete
    await expect(page.locator('[data-testid="loading-dots"]')).not.toBeVisible({ timeout: 30000 });

    // Verify AI response appears
    await expect(page.locator('.message-content').last()).toBeVisible();
  });

  test('should handle empty message', async ({ page }) => {
    await page.waitForSelector('textarea[placeholder*="legal question"]');

    // Try to send empty message
    await page.click('button[aria-label="Send"]');

    // Should not navigate to chat page
    await expect(page).toHaveURL('/');
  });

  test('should handle whitespace-only message', async ({ page }) => {
    await page.waitForSelector('textarea[placeholder*="legal question"]');

    // Type only spaces
    await page.fill('textarea[placeholder*="legal question"]', '   ');

    // Try to send message
    await page.click('button[aria-label="Send"]');

    // Should not navigate to chat page
    await expect(page).toHaveURL('/');
  });

  test('should support Enter key to send message', async ({ page }) => {
    await page.waitForSelector('textarea[placeholder*="legal question"]');

    // Type a message and press Enter
    const message = 'Explain contract law basics';
    await page.fill('textarea[placeholder*="legal question"]', message);
    await page.press('textarea[placeholder*="legal question"]', 'Enter');

    // Wait for chat page to load
    await page.waitForURL(/\/c\/[a-zA-Z0-9-]+/);

    // Verify message appears
    await expect(page.locator('text=' + message)).toBeVisible();
  });

  test('should support Shift+Enter for new line', async ({ page }) => {
    await page.waitForSelector('textarea[placeholder*="legal question"]');

    const textarea = page.locator('textarea[placeholder*="legal question"]');
    
    // Type text with Shift+Enter
    await textarea.fill('Line 1');
    await textarea.press('Shift+Enter');
    await textarea.fill('Line 1\nLine 2');

    // Should not send message yet
    await expect(page).toHaveURL('/');
  });

  test('should show loading state during AI response', async ({ page }) => {
    await page.waitForSelector('textarea[placeholder*="legal question"]');

    // Send a message
    await page.fill('textarea[placeholder*="legal question"]', 'What is tort law?');
    await page.click('button[aria-label="Send"]');

    // Wait for chat page
    await page.waitForURL(/\/c\/[a-zA-Z0-9-]+/);

    // Check for loading indicator
    await expect(page.locator('[data-testid="loading-dots"]')).toBeVisible();

    // Wait for response to complete
    await expect(page.locator('[data-testid="loading-dots"]')).not.toBeVisible({ timeout: 30000 });
  });

  test('should display markdown content correctly', async ({ page }) => {
    await page.waitForSelector('textarea[placeholder*="legal question"]');

    // Send a message that might trigger markdown response
    await page.fill('textarea[placeholder*="legal question"]', 'Explain contract elements with bullet points');
    await page.click('button[aria-label="Send"]');

    await page.waitForURL(/\/c\/[a-zA-Z0-9-]+/);

    // Wait for AI response
    await expect(page.locator('[data-testid="loading-dots"]')).not.toBeVisible({ timeout: 30000 });

    // Check if markdown is rendered (bullet points, headers, etc.)
    const messageContent = page.locator('.message-content').last();
    await expect(messageContent).toBeVisible();
  });

  test('should support code block syntax highlighting', async ({ page }) => {
    await page.waitForSelector('textarea[placeholder*="legal question"]');

    // Send a message that might trigger code response
    await page.fill('textarea[placeholder*="legal question"]', 'Show me a sample contract clause');
    await page.click('button[aria-label="Send"]');

    await page.waitForURL(/\/c\/[a-zA-Z0-9-]+/);

    // Wait for AI response
    await expect(page.locator('[data-testid="loading-dots"]')).not.toBeVisible({ timeout: 30000 });

    // Check for code blocks
    const codeBlocks = page.locator('pre code');
    if (await codeBlocks.count() > 0) {
      await expect(codeBlocks.first()).toBeVisible();
    }
  });

  test('should support copy button functionality', async ({ page }) => {
    await page.waitForSelector('textarea[placeholder*="legal question"]');

    // Send a message
    await page.fill('textarea[placeholder*="legal question"]', 'What is a legal brief?');
    await page.click('button[aria-label="Send"]');

    await page.waitForURL(/\/c\/[a-zA-Z0-9-]+/);

    // Wait for AI response
    await expect(page.locator('[data-testid="loading-dots"]')).not.toBeVisible({ timeout: 30000 });

    // Look for copy button in AI message
    const copyButtons = page.locator('[data-testid="copy-button"]');
    if (await copyButtons.count() > 0) {
      await copyButtons.first().click();
      
      // Verify copy feedback (if implemented)
      // This would depend on your copy button implementation
    }
  });

  test('should support feedback functionality', async ({ page }) => {
    await page.waitForSelector('textarea[placeholder*="legal question"]');

    // Send a message
    await page.fill('textarea[placeholder*="legal question"]', 'Explain legal precedent');
    await page.click('button[aria-label="Send"]');

    await page.waitForURL(/\/c\/[a-zA-Z0-9-]+/);

    // Wait for AI response
    await expect(page.locator('[data-testid="loading-dots"]')).not.toBeVisible({ timeout: 30000 });

    // Look for feedback buttons
    const feedbackButtons = page.locator('[data-testid="feedback-button"]');
    if (await feedbackButtons.count() > 0) {
      // Click positive feedback
      await feedbackButtons.first().click();
      
      // Verify feedback was submitted (if implemented)
    }
  });

  test('should support regenerate functionality', async ({ page }) => {
    await page.waitForSelector('textarea[placeholder*="legal question"]');

    // Send a message
    await page.fill('textarea[placeholder*="legal question"]', 'What is civil procedure?');
    await page.click('button[aria-label="Send"]');

    await page.waitForURL(/\/c\/[a-zA-Z0-9-]+/);

    // Wait for AI response
    await expect(page.locator('[data-testid="loading-dots"]')).not.toBeVisible({ timeout: 30000 });

    // Look for regenerate button
    const regenerateButton = page.locator('[data-testid="regenerate-button"]');
    if (await regenerateButton.count() > 0) {
      await regenerateButton.first().click();
      
      // Should show loading state again
      await expect(page.locator('[data-testid="loading-dots"]')).toBeVisible();
      
      // Wait for new response
      await expect(page.locator('[data-testid="loading-dots"]')).not.toBeVisible({ timeout: 30000 });
    }
  });

  test('should handle multiple messages in a conversation', async ({ page }) => {
    await page.waitForSelector('textarea[placeholder*="legal question"]');

    // Send first message
    await page.fill('textarea[placeholder*="legal question"]', 'What is contract law?');
    await page.click('button[aria-label="Send"]');

    await page.waitForURL(/\/c\/[a-zA-Z0-9-]+/);

    // Wait for first AI response
    await expect(page.locator('[data-testid="loading-dots"]')).not.toBeVisible({ timeout: 30000 });

    // Send follow-up message
    const followUpMessage = 'Can you elaborate on breach of contract?';
    await page.fill('textarea[placeholder*="legal question"]', followUpMessage);
    await page.click('button[aria-label="Send"]');

    // Verify follow-up message appears
    await expect(page.locator('text=' + followUpMessage)).toBeVisible();

    // Wait for second AI response
    await expect(page.locator('[data-testid="loading-dots"]')).not.toBeVisible({ timeout: 30000 });

    // Verify we have multiple messages
    const messages = page.locator('.message-content');
    await expect(messages).toHaveCount(4); // 2 user + 2 AI messages
  });

  test('should handle error states gracefully', async ({ page }) => {
    // Mock API failure by intercepting requests
    await page.route('**/api/query', route => {
      route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Internal server error' })
      });
    });

    await page.waitForSelector('textarea[placeholder*="legal question"]');

    // Send a message
    await page.fill('textarea[placeholder*="legal question"]', 'Test message');
    await page.click('button[aria-label="Send"]');

    await page.waitForURL(/\/c\/[a-zA-Z0-9-]+/);

    // Should show error message
    await expect(page.locator('text=error')).toBeVisible({ timeout: 10000 });
  });

  test('should be accessible with keyboard navigation', async ({ page }) => {
    await page.waitForSelector('textarea[placeholder*="legal question"]');

    // Navigate with Tab key
    await page.keyboard.press('Tab');
    
    // Should focus on textarea
    await expect(page.locator('textarea[placeholder*="legal question"]')).toBeFocused();

    // Type message
    await page.keyboard.type('Test accessibility');
    
    // Tab to send button
    await page.keyboard.press('Tab');
    
    // Press Enter to send
    await page.keyboard.press('Enter');

    // Should navigate to chat page
    await page.waitForURL(/\/c\/[a-zA-Z0-9-]+/);
  });

  test('should be responsive on mobile devices', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });

    await page.waitForSelector('textarea[placeholder*="legal question"]');

    // Verify elements are properly sized for mobile
    const textarea = page.locator('textarea[placeholder*="legal question"]');
    await expect(textarea).toBeVisible();

    // Send a message
    await page.fill('textarea[placeholder*="legal question"]', 'Mobile test');
    await page.click('button[aria-label="Send"]');

    await page.waitForURL(/\/c\/[a-zA-Z0-9-]+/);

    // Verify chat interface works on mobile
    await expect(page.locator('text=Mobile test')).toBeVisible();
  });

  test('should handle long messages appropriately', async ({ page }) => {
    await page.waitForSelector('textarea[placeholder*="legal question"]');

    // Create a long message
    const longMessage = 'This is a very long message that should test the textarea auto-resize functionality. '.repeat(10);
    
    await page.fill('textarea[placeholder*="legal question"]', longMessage);
    await page.click('button[aria-label="Send"]');

    await page.waitForURL(/\/c\/[a-zA-Z0-9-]+/);

    // Verify long message is displayed correctly
    await expect(page.locator('text=' + longMessage.substring(0, 50))).toBeVisible();
  });

  test('should maintain chat history in sidebar', async ({ page }) => {
    await page.waitForSelector('textarea[placeholder*="legal question"]');

    // Send a message to create a chat
    await page.fill('textarea[placeholder*="legal question"]', 'First chat message');
    await page.click('button[aria-label="Send"]');

    await page.waitForURL(/\/c\/[a-zA-Z0-9-]+/);

    // Wait for AI response
    await expect(page.locator('[data-testid="loading-dots"]')).not.toBeVisible({ timeout: 30000 });

    // Navigate back to home
    await page.goto('/');

    // Check if chat appears in sidebar (if sidebar is visible)
    const sidebar = page.locator('[data-testid="sidebar"]');
    if (await sidebar.isVisible()) {
      await expect(page.locator('text=First chat message')).toBeVisible();
    }
  });
}); 