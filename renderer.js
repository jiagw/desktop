const { ipcRenderer } = require('electron')

const pet = document.getElementById('pet')
let isDragging = false
let initialMouseX
let initialMouseY
let lastMouseX
let lastMouseY
let frameId

function updatePosition(e) {
  if (!isDragging) return
  
  const deltaX = e.clientX - lastMouseX
  const deltaY = e.clientY - lastMouseY
  
  lastMouseX = e.clientX
  lastMouseY = e.clientY

  frameId = requestAnimationFrame(() => {
    ipcRenderer.send('window-move', { mouseX: deltaX, mouseY: deltaY })
  })
}

pet.addEventListener('mousedown', (e) => {
  isDragging = true
  initialMouseX = e.clientX
  initialMouseY = e.clientY
  lastMouseX = e.clientX
  lastMouseY = e.clientY
  
  document.addEventListener('mousemove', updatePosition)
})

document.addEventListener('mouseup', () => {
  if (isDragging) {
    isDragging = false
    document.removeEventListener('mousemove', updatePosition)
    if (frameId) {
      cancelAnimationFrame(frameId)
    }
  }
})

// 添加简单的动画效果
let isAnimating = false
pet.addEventListener('click', () => {
  if (isAnimating) return
  
  isAnimating = true
  pet.style.transform = 'scale(0.8)'
  setTimeout(() => {
    pet.style.transform = 'scale(1)'
    isAnimating = false
  }, 200)
})

const func = async () => {
    const response = await window.versions.ping()
    console.log(response) // 打印 'pong'
  }
  
  func()