const { expect, test } = require('@playwright/test');
const { TodoPage } = require('./pages/todo-page');

test.describe('todo workflow', () => {
  test('user can add and complete a task', async ({ page }) => {
    const todoPage = new TodoPage(page);

    await todoPage.goto();
    await todoPage.addTask('E2E task');

    await expect(todoPage.taskTitle('E2E task')).toBeVisible();

    await todoPage.taskToggle('E2E task').click();
    await expect(todoPage.taskStatus('completed')).toBeVisible();
  });
});
