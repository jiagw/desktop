<template>
  <div class="pet-container">
    <div 
      class="floating-ball" 
      ref="petRef"
      @mousedown="handleMouseDown"
      :class="{ 'positive': isPositive, 'negative': !isPositive }"
    >
      <div class="ball-content">
        <div class="percentage-circle">
          <svg viewBox="0 0 36 36" class="circular-chart">
            <path
              d="M18 2.0845
                a 15.9155 15.9155 0 0 1 0 31.831
                a 15.9155 15.9155 0 0 1 0 -31.831"
              fill="none"
              stroke="#eee"
              stroke-width="2"
            />
            <path
              d="M18 2.0845
                a 15.9155 15.9155 0 0 1 0 31.831
                a 15.9155 15.9155 0 0 1 0 -31.831"
              fill="none"
              :stroke="isPositive ? '#f44336' : '#4caf50'"
              stroke-width="2"
              :stroke-dasharray="`${percentage}, 100`"
              class="percentage-value"
            />
          </svg>
          <div class="percentage-text" :class="{ 'positive': isPositive, 'negative': !isPositive }">
            {{ isPositive ? '+' : '-' }}{{ percentage.toFixed(2) }}%
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue'
const { ipcRenderer } = require('electron')

const petRef = ref(null)
const isDragging = ref(false)
const percentage = ref(0)
const stockCode = ref('sh688189') // 岩山科技，腾讯API格式
const isPositive = ref(true)
let initialMouseX = 0
let initialMouseY = 0
let windowInitialX = 0
let windowInitialY = 0
let mouseDownTime = 0

// 获取股票数据
const fetchStockData = async () => {
  try {
    const response = await fetch(`https://hq.sinajs.cn/list=${stockCode.value}`)
    const text = await response.text()
    const data = text.split(',')
    
    // 获取涨跌幅
    const currentPrice = parseFloat(data[3])
    const prevClose = parseFloat(data[2])
    const changePercent = ((currentPrice - prevClose) / prevClose) * 100
    
    // 更新状态
    percentage.value = Math.abs(changePercent)
    isPositive.value = changePercent >= 0
  } catch (error) {
    console.error('获取股票数据失败:', error)
  }
}

// 监听主进程的刷新信号
ipcRenderer.on('refresh-data', fetchStockData)

// 处理鼠标按下事件
const handleMouseDown = (e) => {
  isDragging.value = false
  initialMouseX = e.screenX
  initialMouseY = e.screenY
  mouseDownTime = Date.now()
  
  // 获取窗口初始位置
  ipcRenderer.invoke('window:get-position').then(([x, y]) => {
    windowInitialX = x
    windowInitialY = y
    
    document.addEventListener('mousemove', handleMouseMove)
    document.addEventListener('mouseup', handleMouseUp)
  })
}

// 处理鼠标移动事件
const handleMouseMove = (e) => {
  // 计算移动距离
  const deltaX = e.screenX - initialMouseX
  const deltaY = e.screenY - initialMouseY
  
  // 如果移动距离超过阈值，标记为拖动状态
  if (!isDragging.value && (Math.abs(deltaX) > 5 || Math.abs(deltaY) > 5)) {
    isDragging.value = true
  }
  
  if (isDragging.value) {
    // 计算新位置
    const newX = windowInitialX + deltaX
    const newY = windowInitialY + deltaY
    
    // 发送新位置到主进程
    ipcRenderer.send('window-move', { x: newX, y: newY })
  }
}

// 处理鼠标松开事件
const handleMouseUp = (e) => {
  document.removeEventListener('mousemove', handleMouseMove)
  document.removeEventListener('mouseup', handleMouseUp)
  isDragging.value = false
}

onMounted(() => {
  document.addEventListener('mouseup', handleMouseUp)
  // 初始获取数据
  fetchStockData()
  // 启动定时刷新
  ipcRenderer.send('start-refresh', 3000)
})

onUnmounted(() => {
  document.removeEventListener('mousemove', handleMouseMove)
  document.removeEventListener('mouseup', handleMouseUp)
  // 停止定时刷新
  ipcRenderer.send('stop-refresh')
  // 移除事件监听
  ipcRenderer.removeAllListeners('refresh-data')
})
</script>

<style scoped>
.pet-container {
  width: 100%;
  height: 100vh;
  display: flex;
  justify-content: center;
  align-items: center;
  overflow: hidden;
}

.floating-ball {
  width: 60px;
  height: 60px;
  position: relative;
  cursor: pointer;
  transition: all 0.3s ease;
  background: rgba(255, 255, 255, 0.95);
  border-radius: 50%;
  box-shadow: 0 4px 8px rgba(0,0,0,0.2);
}

.floating-ball.positive {
  background: rgba(255, 235, 235, 0.95);
}

.floating-ball.negative {
  background: rgba(235, 255, 235, 0.95);
}

.ball-content {
  width: 100%;
  height: 100%;
  position: relative;
  display: flex;
  justify-content: center;
  align-items: center;
}

.percentage-circle {
  width: 80%;
  height: 80%;
  position: relative;
  display: flex;
  justify-content: center;
  align-items: center;
}

.circular-chart {
  width: 100%;
  height: 100%;
  transform: rotate(-90deg);
}

.percentage-value {
  transition: stroke-dasharray 0.3s ease;
}

.percentage-text {
  position: absolute;
  font-size: 12px;
  font-weight: bold;
}

.percentage-text.positive {
  color: #f44336;
}

.percentage-text.negative {
  color: #4caf50;
}

@keyframes float {
  0%, 100% {
    transform: translateY(0);
  }
  50% {
    transform: translateY(-5px);
  }
}

.floating-ball {
  animation: float 3s ease-in-out infinite;
}
</style> 