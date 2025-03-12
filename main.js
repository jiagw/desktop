const { app, BrowserWindow, ipcMain, screen, session } = require('electron/main')
const path = require('node:path')

const createWindow = () => {
  // 配置请求头
  session.defaultSession.webRequest.onBeforeSendHeaders((details, callback) => {
    if (details.url.includes('hq.sinajs.cn')) {
      details.requestHeaders['Referer'] = 'https://finance.sina.com.cn'
    }
    callback({ requestHeaders: details.requestHeaders })
  })

  // 添加响应拦截器
  session.defaultSession.webRequest.onHeadersReceived((details, callback) => {
    if (details.url.includes('hq.sinajs.cn')) {
      console.log('收到API响应:', new Date().toLocaleTimeString())
      console.log('响应头:', JSON.stringify(details.responseHeaders, null, 2))
    }
    callback({ responseHeaders: details.responseHeaders })
  })

  session.defaultSession.webRequest.onCompleted((details) => {
    if (details.url.includes('hq.sinajs.cn')) {
      console.log('------------------------')
      console.log('数据更新时间:', new Date().toLocaleTimeString())
      console.log('状态码:', details.statusCode)
      if (details.statusCode === 200) {
        console.log('数据已更新')
      } else {
        console.log('数据更新失败')
      }
      console.log('------------------------')
    }
  })

  const win = new BrowserWindow({
    width: 100,
    height: 100,
    frame: false,
    show: true,
    skipTaskbar: true,
    transparent: true,
    resizable: false,
    alwaysOnTop: true,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
      webSecurity: false
    }
  })
  
  // 初始化悬浮球位置
  const { width: screenWidth, height: screenHeight } = screen.getPrimaryDisplay().workAreaSize
  win.setPosition(screenWidth - win.getSize()[0] - 20, screenHeight - win.getSize()[1] - 20)
  
  win.setIgnoreMouseEvents(false)

  // 在开发环境中使用 Vite 开发服务器
  if (process.env.NODE_ENV === 'development') {
    win.loadURL('http://localhost:5173')
    // 打开开发者工具
    win.webContents.openDevTools({ mode: 'detach' })
  } else {
    win.loadFile('dist/index.html')
  }
  
  // 获取窗口位置
  ipcMain.handle('window:get-position', () => {
    return win.getPosition()
  })
  
  // 启动数据刷新定时器
  let refreshInterval = null

  // 开始数据刷新
  ipcMain.on('start-refresh', (event, interval = 3000) => {
    if (refreshInterval) {
      clearInterval(refreshInterval)
    }
    refreshInterval = setInterval(() => {
      win.webContents.send('refresh-data')
      console.log('触发数据刷新:', new Date().toLocaleTimeString())
    }, interval)
    console.log('开始数据刷新，间隔:', interval, 'ms')
  })

  // 停止数据刷新
  ipcMain.on('stop-refresh', () => {
    if (refreshInterval) {
      clearInterval(refreshInterval)
      refreshInterval = null
      console.log('停止数据刷新')
    }
  })

  // 当窗口关闭时清理定时器
  win.on('closed', () => {
    if (refreshInterval) {
      clearInterval(refreshInterval)
      refreshInterval = null
    }
  })
  
  // 处理窗口移动
  ipcMain.on('window-move', (event, { x, y }) => {
    // 防止窗口移出屏幕
    const { width: screenWidth, height: screenHeight } = screen.getPrimaryDisplay().workAreaSize
    const [winWidth, winHeight] = win.getSize()
    
    const finalX = Math.max(0, Math.min(x, screenWidth - winWidth))
    const finalY = Math.max(0, Math.min(y, screenHeight - winHeight))
    
    win.setPosition(finalX, finalY)
  })

  // 处理窗口收缩
  ipcMain.on('window-collapse', () => {
    const [currentX, currentY] = win.getPosition()
    const { width: screenWidth } = screen.getPrimaryDisplay().workAreaSize
    const [winWidth] = win.getSize()
    
    // 判断窗口在屏幕的哪一侧
    if (currentX < screenWidth / 2) {
      // 在左半边，收缩到左边
      win.setPosition(-Math.floor(winWidth / 2), currentY)
    } else {
      // 在右半边，收缩到右边
      win.setPosition(screenWidth - Math.floor(winWidth / 2), currentY)
    }
  })

  // 处理窗口展开
  ipcMain.on('window-expand', () => {
    const [currentX, currentY] = win.getPosition()
    const { width: screenWidth } = screen.getPrimaryDisplay().workAreaSize
    const [winWidth] = win.getSize()
    
    // 判断窗口在屏幕的哪一侧
    if (currentX < screenWidth / 2) {
      // 在左半边，展开到左边
      win.setPosition(20, currentY)
    } else {
      // 在右半边，展开到右边
      win.setPosition(screenWidth - winWidth - 20, currentY)
    }
  })
}

app.whenReady().then(() => {
  createWindow()
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow()
})