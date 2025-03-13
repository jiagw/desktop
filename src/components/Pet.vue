<template>
  <div class="pet-container">
    <div 
      class="floating-ball" 
      ref="petRef"
      @mousedown="handleMouseDown"
      @contextmenu="handleContextMenu"
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
            {{  (limit?isPositive ? '+' : '-':'') }}{{ percentage?limit ?percentage.toFixed(2):percentage:'无效' }}
          </div>
        </div>
      </div>
    </div>
    <div ref="contextMenu" class="context-menu">
      <div class="search-container">
        <input
          type="text"
          v-model="searchQuery"
          @input="handleSearchInput"
          @blur="handleInputBlur"
        />
        <div v-if="searchResults.length > 0" class="search-results">
          <div
            v-for="stock in searchResults"
            :key="stock.code"
            class="search-item"
            @mousedown="selectStock(stock)"
          >
            {{ stock.name }} ({{ stock.code }})
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue'
const { ipcRenderer } = require('electron')
import { stocksData as defaultStocks } from '../assets/stocks'

const petRef = ref(null)
const contextMenu = ref(null)
const isDragging = ref(false)
const percentage = ref(0)
const stockCode = ref('sz000001') // 上证指数，腾讯API格式
const isPositive = ref(true)
const searchQuery = ref('')
const searchResults = ref([])
const stocksData = ref([]) // 改为响应式数据
const limit = ref(0) // 添加涨跌幅限制
const limitNum = ref(0) // 添加涨跌幅限制数值
let initialMouseX = 0
let initialMouseY = 0
let windowInitialX = 0
let windowInitialY = 0
let mouseDownTime = 0

// 加载股票数据
const loadStocksData = async () => {
  try {
    stocksData.value = defaultStocks
  } catch (error) {
    console.error('加载股票数据失败:', error)
  }
}

// 获取股票数据
const fetchStockData = async () => {
  try {
    const response = await fetch(`https://hq.sinajs.cn/list=${stockCode.value}`)
    const text = await response.text()
    const data = text.split(',')
    
    // 获取当前时间
    const now = new Date()
    const hours = now.getHours()
    const minutes = now.getMinutes()
    
    // 获取价格数据
    const currentPrice = parseFloat(data[3]) // 当前价格
    const prevClose = parseFloat(data[2])    // 昨日收盘价
    const complete = parseFloat(data[6])     // 集合竞价价格
    limit.value = parseFloat(data[21])       // 涨跌幅限制
    limitNum.value = parseFloat(data[10])    // 涨跌幅限制数值
    
    let changePercent
    // 在9:15-9:25之间使用集合竞价价格
    if (hours === 9 && minutes >= 15 && minutes <= 25) {
      changePercent = ((complete - prevClose) / prevClose) * 100
    } else {
      changePercent = ((currentPrice - prevClose) / prevClose) * 100
    }

    // 更新状态
    percentage.value = limit.value === 0 ? Math.floor(limitNum.value / 100) : Math.abs(changePercent)
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

// 右键菜单功能
const handleContextMenu = (e) => {
  e.preventDefault();
  e.stopPropagation();
  
  // 设置菜单位置
  const rect = contextMenu.value.getBoundingClientRect();
  const ballRect = petRef.value.getBoundingClientRect();
  const screenWidth = window.innerWidth;
  
  let finalX = ballRect.right + 5; // 默认在右侧5px
  if (finalX + rect.width > screenWidth) {
    finalX = ballRect.left - rect.width - 5; // 如果超出屏幕右侧，则显示在左侧
  }
  
  contextMenu.value.style.left = `${finalX}px`;
  contextMenu.value.style.top = `${ballRect.top}px`;
  contextMenu.value.style.display = 'block';
  
  // 聚焦输入框
  contextMenu.value.querySelector('input').focus();
}

// 处理搜索输入
const handleSearchInput = () => {
  if (!searchQuery.value.trim()) {
    searchResults.value = []
    return
  }
  console.log(stocksData.value);
  
  const query = searchQuery.value.toLowerCase()
  searchResults.value = stocksData.value.filter(stock =>
    stock.name.toLowerCase().includes(query) ||
    stock.code.toLowerCase().includes(query)
  ) // 只显示前5个结果
}

// 选择股票
const selectStock = (stock) => {
  stockCode.value = stock.code
  searchQuery.value = stock.name
  searchResults.value = []
  fetchStockData()
}

// 修改原有的handleInputBlur
const handleInputBlur = (e) => {
  // 延迟隐藏，以便用户能够点击搜索结果
  setTimeout(() => {
    if (!searchResults.value.length) {
      contextMenu.value.style.display = 'none'
    }
  }, 200)
}
onMounted(() => {
  document.addEventListener('mouseup', handleMouseUp)
  // 加载股票数据
  loadStocksData()
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

.context-menu {
  display: none;
  position: fixed;
  background: white;
  border: 1px solid #ccc;
  border-radius: 4px;
  padding: 10px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
  z-index: 1000;
  min-width: 80px;
}

.search-container {
  position: relative;
}

.search-results {
  position: absolute;
  top: 100%;
  left: 0;
  right: 0;
  background: white;
  border: 1px solid #ccc;
  border-radius: 4px;
  margin-top: 4px;
  max-height: 200px;
  overflow-y: auto;
  z-index: 1001;
}

.search-item {
  padding: 8px 12px;
  cursor: pointer;
  transition: background-color 0.2s;
}

.search-item:hover {
  background-color: #f5f5f5;
}

.context-menu input {
  padding: 8px;
  border: 1px solid #ccc;
  border-radius: 4px;
  width: 200px;
  font-size: 14px;
}
</style> 