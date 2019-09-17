const { remote, ipcRenderer, shell } = require('electron');
const dateFns = require('date-fns');

const db = require('./db');
const mainProcess = remote.require('./index');
const currentWindow = remote.getCurrentWindow();

class MonitorApplication {
  formHandler;
  sysButton;
  jsonHolder;
  statsParent;
  taskParent;

  taskDayTotals;

  today;
  currentDate;
  dateElement;
  dateBackward;
  dateForward;

  sysInfo;

  constructor() {
    this.onCreation();
    mainProcess.getSystemInfo();
    setInterval(() => {
      mainProcess.getSystemInfo();
    }, 30000)
  }

  onCreation() {
    this.formHandler = document.querySelector('#tasks-form');
    this.statsParentInfo = document.querySelector('#stats-parent-cpu-info');
    this.statsParentCont = document.querySelector('#stats-parent-cont');
    this.taskParent = document.querySelector('#task-parent-container');
    this.taskDayTotals = document.querySelector('#task-parent-heading__task-counter');
    this.dateElement = document.querySelector('#task-parent-heading__date-control-date');
    this.dateBackward = document.querySelector('#task-parent-heading__dat-control-back');
    this.dateForward = document.querySelector('#task-parent-heading__dat-control-forward');

    this.currentDate = this.today = new Date();
    this.dateElement.textContent = dateFns.format(this.currentDate, 'MM/dd/yyyy');

    this.setUpAddTaskForm();
    this.getTasks(this.currentDate);
    
    ipcRenderer.on('sys-info', (event, systemInfo) => {
      this.getSystemInfo(systemInfo);
    });
  }

  getSystemInfo(info) {
    this.renderStats(info);
  }

  setUpAddTaskForm() {
    this.formHandler.addEventListener('submit', (e) => {
      e.preventDefault();
      if (this.formHandler.elements[0].value.length > 0) {
        this.createTask(this.formHandler.elements[0].value)
        this.formHandler.elements[0].value = null;
      } else {
        this.formHandler.elements[0].style.border = '1px solid red';
        this.formHandler.elements[0].placeholder = 'You have to put something...';
      } 
    });

    this.formHandler.addEventListener('input', (e) => {
      this.formHandler.elements[0].style.border = 'none';
      this.formHandler.elements[0].placeholder = "What do you need to do...";
    })

    this.dateBackward.addEventListener('click', () => {
      this.changeDateBackward();
    });

    this.dateForward.addEventListener('click', () => {
      this.changeDateForward();
    });
  }

  getTasks(date) {
    db('tasks')
      .select()
      .where({ created_at: dateFns.format(date, 'MM/dd/yyyy') })
      .then(tasks => this.renderTasks(tasks))
      .catch(e => console.log(e));
  }

  calculateTaskTotals(tasks) {
    const total = tasks.length;
    const totalComplete = tasks.filter(task => task.complete).length;
    return `${totalComplete}/${total}`;
  }

  createTask(taskText) {
    db('tasks')
      .insert({
        task_text: taskText,
        complete: false,
        created_at: dateFns.format(this.currentDate, 'MM/dd/yyy')
      })
      .then(() => this.getTasks(this.currentDate))
      .catch(e => console.log(e));
  }

  updateTaskComplete(taskId, updatedValue) {
    db('tasks')
      .where({ id: taskId })
      .update({
        complete: updatedValue,
        updated_at: dateFns.format(this.today, 'MM/dd/yyy')
      })
      .then(() => this.getTasks(this.currentDate))
      .catch(e => console.log(e));
  }

  updateTaskText(taskId, updatedText) {
    db('tasks')
      .where({ id: taskId })
      .update({
        task_text: updatedText,
        updated_at: dateFns.format(this.today, 'MM/dd/yyy')
      }).catch(e => console.log(e));
  }

  deleteTask(taskId) {
    db('tasks')
      .where({ id: taskId })
      .del()
      .then(() => this.getTasks(this.currentDate))
      .catch(e => console.log(e))
  }

  changeDateBackward() {
    if (dateFns.differenceInDays(this.today, this.currentDate) < 7 && dateFns.differenceInDays(this.today, this.currentDate) >= -7) {
      this.currentDate = dateFns.subDays(this.currentDate, 1);
      this.dateElement.textContent = dateFns.format(this.currentDate, 'MM/dd/yyy');
      this.getTasks(this.currentDate);
    }
  }

  changeDateForward() {
    if (dateFns.differenceInDays(this.today, this.currentDate) <= 7 && dateFns.differenceInDays(this.today, this.currentDate) > -7) {
      this.currentDate = dateFns.addDays(this.currentDate, 1);
      this.dateElement.textContent = dateFns.format(this.currentDate, 'MM/dd/yyy');
      this.getTasks(this.currentDate);
    }
  }

  renderTasks(tasks) {
    while (this.taskParent.lastChild) {
      this.taskParent.removeChild(this.taskParent.lastChild);
    }

    this.taskDayTotals.textContent = this.calculateTaskTotals(tasks);

    if (tasks.length) {
      tasks.forEach(task => {
        const taskCont = document.createElement('div');
        taskCont.className = 'task-parent-container__tasks'
        this.taskParent.appendChild(taskCont);

        taskCont.insertAdjacentHTML('afterbegin', `
          <div class="checkbox">
            <input
              type="checkbox" 
              value="${task.complete}"
              id="complete-${task.id}"
            >
            <label for="complete-${task.id}"></label>
          </div>
          <input type="text" value="${task.task_text}" id="input-${task.id}">
          <button class="red" id="del-${task.id}">DELETE</button>
        `);

        const checkBox = document.getElementById(`complete-${task.id}`);
        checkBox.addEventListener('click', () => {
          checkBox.setAttribute('value', task.complete === 1 ? 0 : 1);
          this.updateTaskComplete(task.id, checkBox.value);
        });
        if (task.complete) {
          checkBox.setAttribute('checked', null);
        }

        const taskInput = document.getElementById(`input-${task.id}`);
        taskInput.addEventListener('blur', () => this.updateTaskText(task.id, taskInput.value));
        if (task.complete) {
          taskInput.setAttribute('disabled', null);
        }

        const deleteBtn = document.getElementById(`del-${task.id}`);
        deleteBtn.addEventListener('click', () => this.deleteTask(task.id));
      });
    } else {
      const emptyTasks = document.createElement('h2');
      emptyTasks.textContent = `You're done! Grab a beer and put your feet up. \u{1F91F}`
      this.taskParent.appendChild(emptyTasks);
    }
  }

  renderStats(stats) {
    while (this.statsParentCont.lastChild) {
      this.statsParentCont.removeChild(this.statsParentCont.lastChild);
    }

    while (this.statsParentInfo.lastChild) {
      this.statsParentInfo.removeChild(this.statsParentInfo.lastChild);
    }

    if (stats) {
      stats.forEach(stat => {
        if (stat.battery) {
          this.renderBatteryData(stat.battery);
        } else if (stat.memory) {
          this.renderMemData(stat.memory);
        } else if (stat.cpuTemp) {
          this.renderCpuTemp(stat.cpuTemp);
        } else if (stat.system) {
          this.renderCpuInfo(stat.system);
        }
      })
    }
  }

  renderCpuInfo(systemObj) {
    const cpuInfo = document.querySelector('#stats-parent-cpu-info');

    const harddisk = systemObj.harddrive.find(drive => {
      return drive.identifier === 'disk1s1';
    });

    cpuInfo.insertAdjacentHTML('afterbegin', `
      <div class="stats-parent-cpu-info__header">
        <img class="stats-parent-cpu-info__img" src="./static/monitor.png" alt="Monitor">
        <p>${systemObj.users[0].user} - ${systemObj.os.codename}</p>
      </div>
      <hr>
      <p class="stats-parent-cpu-info__stats">CPU: ${systemObj.cpu.manufacturer} ${systemObj.cpu.brand}</p>
      <p class="stats-parent-cpu-info__stats">Storage: ${harddisk.label} ${harddisk.physical} - ${(harddisk.size / 1000000000).toFixed(0)}GB</p>
      <p class="stats-parent-cpu-info__stats">Wifi: ${systemObj.wifi[0].ssid}</p>
    `)
  }

  renderBatteryData(batteryObj) {
    let colour;
    if (batteryObj.ischarging || batteryObj.percent > 80) {
      colour = 'limegreen';
    } else if (batteryObj.percent < 80 && batteryObj.percent > 49) {
      colour = 'yellow';
    } else {
      colour = 'red';
    }
    this.renderSVGCircle('Battery', batteryObj.percent, 7, colour);
  }

  renderMemData(memObj) {
    let memInUse = ((memObj.active / memObj.total) * 100).toFixed(2);

    let colour;
    if (memInUse > 65) {
      colour = 'red';
    } else if (memInUse > 45 && memInUse < 65) {
      colour = 'yellow';
    } else {
      colour = 'limegreen';
    }
    this.renderSVGCircle('Memory', memInUse, 7, colour);
  }

  renderCpuTemp(cpuObj) {
    this.renderSVGCircle('Temp', 1, 7, 'white');
  }

  renderSVGCircle(name, value, stroke, colour) {
    const statCont = document.createElement('div');
    statCont.classList = 'stats-parent__stat-cont';
    this.statsParentCont.appendChild(statCont);

    statCont.insertAdjacentHTML('afterbegin', `
      <svg
        class="progress-ring"
        height="120"
        width="120"
      >
        <circle
          id="circle-${name}"
          class="progress-ring__circle"
          stroke="${colour}"
          stroke-width="${stroke}"
          fill="transparent"
          r="${60 - (stroke * 2)}"
          cx="60"
          cy="60"
        />
      </svg>
      <div class="progress-ring__text">
        <p>${value}</p>
        <p>${name}</p>
      </div>
    `)

    const circle = document.querySelector(`#circle-${name}`);
    const radius = circle.r.baseVal.value;
    const circumference = radius * 2 * Math.PI;

    circle.style.strokeDasharray = `${circumference} ${circumference}`;
    circle.style.strokeDashoffset = `${circumference}`;

    const offset = circumference - value / 100 * circumference;
    circle.style.strokeDashoffset = offset;
  }
}

window.onload = new MonitorApplication();