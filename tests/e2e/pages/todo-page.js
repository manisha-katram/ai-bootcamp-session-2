class TodoPage {
  constructor(page) {
    this.page = page;
    this.titleInput = page.getByLabel('Task title');
    this.addTaskButton = page.getByRole('button', { name: 'Add task' });
  }

  async goto() {
    await this.page.goto('/');
  }

  async addTask(title) {
    await this.titleInput.fill(title);
    await this.addTaskButton.click();
  }

  taskTitle(title) {
    return this.page.getByText(title, { exact: true });
  }

  taskToggle(title) {
    return this.page.getByRole('checkbox', { name: `Toggle completion for ${title}` });
  }

  taskStatus(status) {
    return this.page.getByText(status, { exact: true });
  }
}

module.exports = { TodoPage };
