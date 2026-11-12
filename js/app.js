const STORAGE_KEY = "progressHubData";

const goalForm = document.getElementById("goalForm");
const goalNameInput = document.getElementById("goalName");
const goalDeadlineInput = document.getElementById("goalDeadline");
const goalsList = document.getElementById("goalsList");
const goalMessage = document.getElementById("goalMessage");

const taskForm = document.getElementById("taskForm");
const taskGoalSelect = document.getElementById("taskGoal");
const taskNameInput = document.getElementById("taskName");
const taskMessage = document.getElementById("taskMessage");
const taskList = document.getElementById("taskList");
const taskFilter = document.getElementById("taskFilter");

const activeGoalsCount = document.getElementById("activeGoalsCount");
const completedTasksCount = document.getElementById("completedTasksCount");
const remainingTasksCount = document.getElementById("remainingTasksCount");

let data = loadData();

function loadData() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
    if (saved && Array.isArray(saved.goals) && Array.isArray(saved.tasks)) {
      return {
        goals: saved.goals.filter(g => g && Number.isFinite(g.id) && typeof g.name === "string"),
        tasks: saved.tasks.filter(t => t && Number.isFinite(t.id) && Number.isFinite(t.goalId) && typeof t.name === "string")
      };
    }
  } catch (error) {
    console.warn("Saved ProgressHub data could not be loaded.", error);
  }
  return { goals: [], tasks: [] };
}

function saveData() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch (error) {
    goalMessage.textContent = "Your changes are shown, but the browser couldn't save them.";
    console.error("Could not save ProgressHub data.", error);
  }
}

function makeElement(tag, className, text) {
  const element = document.createElement(tag);
  if (className) element.className = className;
  if (text !== undefined) element.textContent = text;
  return element;
}

function getGoalTasks(goalId) {
  return data.tasks.filter(task => task.goalId === goalId);
}

function goalProgress(goalId) {
  const tasks = getGoalTasks(goalId);
  if (tasks.length === 0) return 0;
  return Math.round(tasks.filter(task => task.completed).length / tasks.length * 100);
}

function renderStats() {
  activeGoalsCount.textContent = data.goals.length;
  completedTasksCount.textContent = data.tasks.filter(task => task.completed).length;
  remainingTasksCount.textContent = data.tasks.filter(task => !task.completed).length;
}

function renderGoalSelect() {
  const previousValue = taskGoalSelect.value;
  taskGoalSelect.replaceChildren();

  if (data.goals.length === 0) {
    taskGoalSelect.appendChild(makeElement("option", "", "Create a goal first"));
    taskGoalSelect.value = "";
    taskGoalSelect.disabled = true;
    return;
  }

  taskGoalSelect.disabled = false;
  taskGoalSelect.appendChild(new Option("Choose a goal", ""));
  data.goals.forEach(goal => {
    taskGoalSelect.appendChild(new Option(goal.name, String(goal.id)));
  });

  if (data.goals.some(goal => String(goal.id) === previousValue)) {
    taskGoalSelect.value = previousValue;
  }
}

function renderGoals() {
  goalsList.replaceChildren();

  if (data.goals.length === 0) {
    const empty = makeElement("div", "empty-state");
    empty.append(
      makeElement("div", "empty-illustration", "◎"),
      makeElement("h3", "", "Your next goal starts here"),
      makeElement("p", "", "Add a goal above, then break it into manageable tasks.")
    );
    goalsList.appendChild(empty);
    return;
  }

  data.goals.forEach(goal => {
    const tasks = getGoalTasks(goal.id);
    const done = tasks.filter(task => task.completed).length;
    const percent = goalProgress(goal.id);

    const card = makeElement("article", "goal-card");
    const top = makeElement("div", "goal-card-top");
    const titleGroup = makeElement("div");
    titleGroup.appendChild(makeElement("h3", "", goal.name));

    if (goal.deadline) {
      titleGroup.appendChild(makeElement("p", "goal-date", `Target: ${goal.deadline}`));
    }

    top.append(titleGroup, makeElement("span", "goal-percentage", `${percent}%`));

    const track = makeElement("div", "goal-progress-track");
    const fill = makeElement("div", "goal-progress-fill");
    fill.style.width = `${percent}%`;
    track.appendChild(fill);

    const details = makeElement("div", "goal-card-details");
    details.append(
      makeElement("span", "", `${done} of ${tasks.length} tasks completed`),
      makeElement("span", "", `${tasks.length - done} remaining`)
    );

    const actions = makeElement("div", "goal-card-actions");
    const addTaskButton = makeElement("button", "small-button", "+ Add task");
    addTaskButton.type = "button";
    addTaskButton.addEventListener("click", () => {
      taskGoalSelect.value = String(goal.id);
      taskNameInput.focus();
      document.getElementById("tasks").scrollIntoView({ behavior: "smooth" });
    });

    const deleteButton = makeElement("button", "small-button delete-button", "Delete goal");
    deleteButton.type = "button";
    deleteButton.addEventListener("click", () => {
      const confirmed = window.confirm(`Delete "${goal.name}" and all its tasks?`);
      if (!confirmed) return;
      data.goals = data.goals.filter(item => item.id !== goal.id);
      data.tasks = data.tasks.filter(task => task.goalId !== goal.id);
      saveData();
      renderAll();
      goalMessage.textContent = "Goal and its tasks deleted.";
    });

    actions.append(addTaskButton, deleteButton);
    card.append(top, track, details, actions);
    goalsList.appendChild(card);
  });
}

function renderTasks() {
  taskList.replaceChildren();

  const filter = taskFilter.value;
  let tasks = [...data.tasks];

  if (filter === "pending") tasks = tasks.filter(task => !task.completed);
  if (filter === "completed") tasks = tasks.filter(task => task.completed);

  tasks.sort((a, b) => Number(a.completed) - Number(b.completed));

  if (tasks.length === 0) {
    const messages = {
      all: data.goals.length ? "No tasks yet. Add your first lesson above." : "Create a goal first, then add tasks to it.",
      pending: "There are no pending tasks in this view.",
      completed: "No completed tasks yet. Keep going!"
    };
    taskList.appendChild(makeElement("div", "task-empty", messages[filter]));
    return;
  }

  tasks.forEach(task => {
    const goal = data.goals.find(item => item.id === task.goalId);
    const row = makeElement("div", `task-row${task.completed ? " is-complete" : ""}`);

    const checkbox = makeElement("input", "task-checkbox");
    checkbox.type = "checkbox";
    checkbox.checked = Boolean(task.completed);
    checkbox.setAttribute("aria-label", `Mark ${task.name} as ${task.completed ? "pending" : "completed"}`);
    checkbox.addEventListener("change", () => {
      task.completed = checkbox.checked;
      saveData();
      renderAll();
    });

    const main = makeElement("div", "task-main");
    main.append(
      makeElement("p", "task-title", task.name),
      makeElement("span", "task-goal-label", goal ? goal.name : "Unassigned goal")
    );

    const deleteButton = makeElement("button", "small-button delete-button", "Delete");
    deleteButton.type = "button";
    deleteButton.addEventListener("click", () => {
      data.tasks = data.tasks.filter(item => item.id !== task.id);
      saveData();
      renderAll();
      taskMessage.textContent = "Task deleted.";
    });

    row.append(checkbox, main, deleteButton);
    taskList.appendChild(row);
  });
}

function renderAll() {
  renderStats();
  renderGoalSelect();
  renderGoals();
  renderTasks();
}

goalForm.addEventListener("submit", event => {
  event.preventDefault();

  const name = goalNameInput.value.trim();
  if (!name) {
    goalMessage.textContent = "Please enter a goal name.";
    return;
  }

  if (data.goals.some(goal => goal.name.toLowerCase() === name.toLowerCase())) {
    goalMessage.textContent = "A goal with that name already exists.";
    return;
  }

  const goal = {
    id: Date.now(),
    name,
    deadline: goalDeadlineInput.value
  };

  data.goals.push(goal);
  saveData();
  renderAll();
  goalForm.reset();
  taskGoalSelect.value = String(goal.id);
  goalMessage.textContent = `Goal "${name}" added. Now add its first task below.`;
});

taskForm.addEventListener("submit", event => {
  event.preventDefault();

  const goalId = Number(taskGoalSelect.value);
  const name = taskNameInput.value.trim();

  if (!data.goals.some(goal => goal.id === goalId)) {
    taskMessage.textContent = "Please create and select a goal first.";
    return;
  }
  if (!name) {
    taskMessage.textContent = "Please enter a task or lesson name.";
    return;
  }

  data.tasks.push({
    id: Date.now() + Math.floor(Math.random() * 1000),
    goalId,
    name,
    completed: false
  });

  saveData();
  renderAll();
  taskGoalSelect.value = String(goalId);
  taskNameInput.value = "";
  taskMessage.textContent = "Task added successfully.";
});

taskFilter.addEventListener("change", renderTasks);

renderAll();
