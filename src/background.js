'use strict'

import { app, protocol, BrowserWindow, ipcMain, dialog } from 'electron'
import {
  createProtocol,
  installVueDevtools
} from 'vue-cli-plugin-electron-builder/lib'
import path from 'path'

const EAU = require('electron-asar-hot-updater');
const isDevelopment = process.env.NODE_ENV !== 'production'

// Keep a global reference of the window object, if you don't, the window will
// be closed automatically when the JavaScript object is garbage collected.
let win

// Scheme must be registered before the app is ready
protocol.registerSchemesAsPrivileged([{scheme: 'app', privileges: { secure: true, standard: true } }])

function createWindow () {
  // Create the browser window.
  win = new BrowserWindow({ 
    width: 1600,
    height: 1080,
    useContentSize: true,
    frame: false,
    icon: path.join(__static, 'icon.png'),
    webPreferences: {
      webPreferences: {webSecurity: false},
      nodeIntegration: true
    } 
  })

  if (process.env.WEBPACK_DEV_SERVER_URL) {
    // Load the url of the dev server if in development mode
    win.loadURL(process.env.WEBPACK_DEV_SERVER_URL)
    if (!process.env.IS_TEST) win.webContents.openDevTools()
  } else {
    createProtocol('app')
    // Load the index.html when not in development
    win.loadURL('app://./index.html')
  }

  win.on('closed', () => {
    win = null
  })
}

// Quit when all windows are closed.
app.on('window-all-closed', () => {
  // On macOS it is common for applications and their menu bar
  // to stay active until the user quits explicitly with Cmd + Q
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

app.on('activate', () => {
  // On macOS it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  if (win === null) {
    createWindow()
  }
})

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.on('ready', async () => {
  if (isDevelopment && !process.env.IS_TEST) {
    // Install Vue Devtools
    // Devtools extensions are broken in Electron 6.0.0 and greater
    // See https://github.com/nklayman/vue-cli-plugin-electron-builder/issues/378 for more info
    // Electron will not launch with Devtools extensions installed on Windows 10 with dark mode
    // If you are not using Windows 10 dark mode, you may uncomment these lines
    // In addition, if the linked issue is closed, you can upgrade electron and uncomment these lines
    // try {
    //   await installVueDevtools()
    // } catch (e) {
    //   console.error('Vue Devtools failed to install:', e.toString())
    // }

  }

  //更新
  EAU.init({
    'api': 'https://mhwee.com/update.php', // The API EAU will talk to
    'server': false, // Where to check. true: server side, false: client side, default: true.
    'debug': false, // Default: false.
    'headers': { Authorization: 'token' }, // Default: {}
    'formatRes': function(res) { return res } // 对返回的数据进行格式化操作的回调函数，保证EAU可以正常操作操作数据。比如格式化后返回：{version: xx, asar: xx}
  });

  EAU.check(function (error, last, body) {
    if (error) {
      if (error === 'no_update_available') { return false; }
      dialog.showErrorBox('info', error)
      return false
    }

    EAU.progress(function (state) {
      // The state is an object that looks like this:
      // {
      //     percent: 0.5,               
      //     speed: 554732,              
      //     size: {
      //         total: 90044871,        
      //         transferred: 27610959   
      //     },
      //     time: {
      //         elapsed: 36.235,        
      //         remaining: 81.403       
      //     }
      // }
    })

    EAU.download(function (error) {
      if (error) {
        dialog.showErrorBox('info', error)
        return false
      }
      // dialog.showErrorBox('info', 'App updated successfully! Restart it please.')
      if (process.platform === 'darwin') {
        app.relaunch()
        app.quit()
      } else {
        app.quit()
      }
    })
  })

  createWindow()
})

ipcMain.on('window-all-closed', () => {
  app.quit()
})

ipcMain.on('hide-window', () => {
  win.minimize()
})

ipcMain.on('check-vc', (event, arg) => {
  //检查环境
  let regedit = require('regedit');
  regedit.setExternalVBSLocation('resources/regedit/vbs');
  regedit.list(['HKLM\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Uninstall\\{05360E8D-2964-400C-8C25-1921B7F5CA49}'], function(err, result) {
    event.reply('vc-editdata', result)
  })
})

// Exit cleanly on request from parent process in development mode.
if (isDevelopment) {
  if (process.platform === 'win32') {
    process.on('message', data => {
      if (data === 'graceful-exit') {
        app.quit()
      }
    })
  } else {
    process.on('SIGTERM', () => {
      app.quit()
    })
  }
}
