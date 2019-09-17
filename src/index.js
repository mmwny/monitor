const { app, BrowserWindow, Tray, nativeImage } = require('electron');
const si = require('systeminformation');
const path = require('path');

// Handle creating/removing shortcuts on Windows when installing/uninstalling.
if (require('electron-squirrel-startup')) { // eslint-disable-line global-require
  app.quit();
}

// Keep a global reference of the window object, if you don't, the window will
// be closed automatically when the JavaScript object is garbage collected.
let mainWindow;
let tray;

app.dock.hide();

const createWindow = () => {
  // Create the browser window.
  mainWindow = new BrowserWindow({
    width: 550,
    height: 700,
    frame: false,
    show: false,
    fullscreenable: false,
    resizable: false,
    transparent: true,
    webPreferences: {
      nodeIntegration: true
    }
  });

  // and load the index.html of the app.
  mainWindow.loadURL(`file://${__dirname}/index.html`);


  mainWindow.on('blur', () => {
    if (!mainWindow.webContents.isDevToolsOpened()) {
      mainWindow.hide();
    }
  })

  // Open the DevTools.
  // mainWindow.webContents.openDevTools();

  // Emitted when the window is closed.
  // mainWindow.on('closed', () => {
    // Dereference the window object, usually you would store windows
    // in an array if your app supports multi windows, this is the time
    // when you should delete the corresponding element.
    // mainWindow = null;
  // });
};

const createTray = () => {
  let icon = nativeImage.createFromPath(path.join(__dirname, 'static', 'doc.png'));
  tray = new Tray(icon);

  tray.on('click', (e) => {
    toggleWindow();
  })
}

const toggleWindow = () => {
  if (mainWindow.isVisible()) {
    mainWindow.hide()
  } else {
    showWindow();
  }
}

const showWindow = () => {
  const trayPos = tray.getBounds();
  const windowPos = mainWindow.getBounds();
  let x = 0;
  let y = 0;

  if (process.platform == 'darwin') {
    x = Math.round(trayPos.x + (trayPos.width / 2) - (windowPos.width / 2));
    y = Math.round(trayPos.y + trayPos.height);
  } else {
    x = Math.round(trayPos.x + (trayPos.width / 2) - (windowPos.width / 2));
    y = Math.round(trayPos.y + trayPos.height * 10);
  }

  mainWindow.setPosition(x, y, false);
  mainWindow.show();
  mainWindow.focus();
}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.on('ready', () => {
  createWindow();
  createTray();
});

// Quit when all windows are closed.
app.on('window-all-closed', () => {
  // On OS X it is common for applications and their menu bar
  // to stay active until the user quits explicitly with Cmd + Q
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  // On OS X it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  if (mainWindow === null) {
    createWindow();
  }
});

// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and import them here.

exports.getSystemInfo = async () => {
  const systemInfo = await Promise.all([
    si.battery(),
    si.blockDevices(),
    si.cpu(),
    si.cpuTemperature(),
    si.mem(),
    si.osInfo(),
    si.system(),
    si.users(),
    si.wifiNetworks()
  ]);

  const system = [
    { battery: systemInfo[0] },
    { cpuTemp: systemInfo[3] },
    { memory: systemInfo[4] },
    { 
      system: {
        cpu: systemInfo[2],
        harddrive: systemInfo[1],
        os: systemInfo[5],
        system: systemInfo[6],
        users: systemInfo[7],
        wifi: systemInfo[8]
      } 
    }
  ]
  
  mainWindow.webContents.send('sys-info', system);
}
