import { useState, useEffect, KeyboardEvent } from 'react'

type Priority = 'emergency' | 'urgent' | 'normal' | 'low'

interface Todo {
  id: string
  text: string
  completed: boolean
  depth: number
  priority: Priority
  children?: Todo[]
}

export default function TodoApp() {
  const [currentDate, setCurrentDate] = useState(new Date())
  const [todos, setTodos] = useState<Todo[]>([])
  const [inputValue, setInputValue] = useState('')
  const [inputDepth, setInputDepth] = useState(0)
  const [inputPriority, setInputPriority] = useState<Priority>('normal')

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      weekday: 'long'
    })
  }

  const navigateDate = (direction: 'prev' | 'next') => {
    const newDate = new Date(currentDate)
    newDate.setDate(newDate.getDate() + (direction === 'next' ? 1 : -1))
    setCurrentDate(newDate)
  }

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Tab') {
      e.preventDefault()
      if (e.shiftKey) {
        setInputDepth(Math.max(0, inputDepth - 1))
      } else {
        setInputDepth(Math.min(2, inputDepth + 1))
      }
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      const priorities: Priority[] = ['low', 'normal', 'urgent', 'emergency']
      const currentIndex = priorities.indexOf(inputPriority)
      const nextIndex = (currentIndex + 1) % priorities.length
      setInputPriority(priorities[nextIndex])
    } else if (e.key === 'ArrowDown') {
      e.preventDefault()
      const priorities: Priority[] = ['low', 'normal', 'urgent', 'emergency']
      const currentIndex = priorities.indexOf(inputPriority)
      const prevIndex = currentIndex === 0 ? priorities.length - 1 : currentIndex - 1
      setInputPriority(priorities[prevIndex])
    } else if (e.key === 'Backspace' && inputValue === '' && inputDepth > 0) {
      setInputDepth(inputDepth - 1)
    } else if (e.key === 'Enter' && inputValue.trim() && !e.nativeEvent.isComposing) {
      addTodo()
    }
  }

  const addTodo = () => {
    if (!inputValue.trim()) return

    const newTodo: Todo = {
      id: Date.now().toString(),
      text: inputValue.trim(),
      completed: false,
      depth: inputDepth,
      priority: inputPriority
    }

    setTodos([...todos, newTodo])
    setInputValue('')
    setInputPriority('normal')
  }

  const toggleTodo = (id: string) => {
    const updated = [...todos]
    const todoIndex = updated.findIndex(todo => todo.id === id)
    const clickedTodo = updated[todoIndex]
    
    updated[todoIndex] = { ...clickedTodo, completed: !clickedTodo.completed }
    
    if (updated[todoIndex].completed) {
      updateChildrenCompletion(updated, todoIndex, true)
    }
    
    updateParentCompletion(updated)
    setTodos(updated)
  }

  const updateChildrenCompletion = (todoList: Todo[], parentIndex: number, completed: boolean) => {
    const parentTodo = todoList[parentIndex]
    
    for (let i = parentIndex + 1; i < todoList.length; i++) {
      const todo = todoList[i]
      
      if (todo.depth <= parentTodo.depth) break
      
      if (todo.depth === parentTodo.depth + 1) {
        todoList[i] = { ...todo, completed }
        if (completed) {
          updateChildrenCompletion(todoList, i, completed)
        }
      }
    }
  }

  const updateParentCompletion = (todoList: Todo[]) => {
    for (let i = todoList.length - 1; i >= 0; i--) {
      const todo = todoList[i]
      if (todo.depth < 2) {
        const children = getDirectChildren(todoList, i)
        
        if (children.length > 0) {
          const allChildrenCompleted = children.every(child => child.completed)
          const anyChildUncompleted = children.some(child => !child.completed)
          
          if (allChildrenCompleted && !todo.completed) {
            todoList[i] = { ...todo, completed: true }
          } else if (anyChildUncompleted && todo.completed) {
            todoList[i] = { ...todo, completed: false }
          }
        }
      }
    }
  }

  const getDirectChildren = (todoList: Todo[], parentIndex: number) => {
    const parentTodo = todoList[parentIndex]
    const children: Todo[] = []
    
    for (let i = parentIndex + 1; i < todoList.length; i++) {
      const todo = todoList[i]
      
      if (todo.depth <= parentTodo.depth) break
      
      if (todo.depth === parentTodo.depth + 1) {
        children.push(todo)
      }
    }
    
    return children
  }

  const getDepthPadding = (depth: number) => {
    return depth * 24
  }

  const getPriorityLabel = (priority: Priority) => {
    switch (priority) {
      case 'emergency': return '비상!'
      case 'urgent': return '긴급'
      case 'normal': return '보통'
      case 'low': return '여유'
    }
  }

  const getPriorityStyle = (priority: Priority) => {
    switch (priority) {
      case 'emergency': return 'bg-red-100'
      case 'urgent': return 'bg-orange-50'
      case 'normal': return 'bg-white'
      case 'low': return 'bg-green-50'
    }
  }

  const getPriorityTextStyle = (priority: Priority) => {
    switch (priority) {
      case 'emergency': return 'text-red-800 font-bold'
      case 'urgent': return 'text-orange-700'
      case 'normal': return 'text-yellow-700'
      case 'low': return 'text-green-700'
    }
  }

  const getDepthFontWeight = (depth: number) => {
    switch (depth) {
      case 0: return 'font-bold'
      case 1: return 'font-semibold'
      case 2: return 'font-normal'
      default: return 'font-normal'
    }
  }

  const sortedTodos = [...todos].sort((a, b) => {
    if (a.depth !== b.depth) return 0
    
    const priorityOrder = { emergency: 0, urgent: 1, normal: 2, low: 3 }
    return priorityOrder[a.priority] - priorityOrder[b.priority]
  })

  return (
    <div 
      className="min-h-screen flex items-center justify-center px-4"
      style={{
        backgroundColor: '#f8f8f8',
        backgroundImage: `
          linear-gradient(rgba(0,0,0,.06) 1px, transparent 1px),
          linear-gradient(90deg, rgba(0,0,0,.06) 1px, transparent 1px)
        `,
        backgroundSize: '20px 20px'
      }}
    >
      <div className="w-full max-w-2xl">
        <div className="flex items-center justify-center mb-8">
          <button 
            onClick={() => navigateDate('prev')}
            className="p-3 hover:bg-white hover:shadow-md rounded-full transition-all border-2 border-gray-300 bg-gray-50"
          >
            <svg className="w-6 h-6 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          
          <h1 className="text-3xl font-bold mx-8 text-center min-w-[300px] text-gray-800 drop-shadow-sm">
            {formatDate(currentDate)}
          </h1>
          
          <button 
            onClick={() => navigateDate('next')}
            className="p-3 hover:bg-white hover:shadow-md rounded-full transition-all border-2 border-gray-300 bg-gray-50"
          >
            <svg className="w-6 h-6 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>

        {/* TodoList - 완료된 할 일들이 표시되는 영역 */}
        <div 
          className="bg-white rounded-lg shadow-lg border-2 border-gray-300 mb-4"
          style={{
            boxShadow: '0 8px 25px rgba(0,0,0,0.1), 0 0 0 1px rgba(0,0,0,0.05)',
            background: `
              linear-gradient(135deg, #ffffff 0%, #fefefe 100%),
              repeating-linear-gradient(
                transparent 0px,
                transparent 30px,
                #e5e7eb 30px,
                #e5e7eb 31px
              )
            `,
            maxHeight: '400px',
            overflowY: 'auto'
          }}
        >
          <div className="p-6">
            <div className="space-y-0">
              {sortedTodos.map((todo, index) => (
                <div 
                  key={todo.id}
                  className={`flex items-center py-3 hover:bg-gray-50 border-b-2 border-dashed border-gray-200 ${getPriorityStyle(todo.priority)}`}
                  style={{ paddingLeft: getDepthPadding(todo.depth) }}
                >
                  <div className="flex items-center text-gray-400 mr-3">
                    {Array.from({ length: todo.depth + 1 }, (_, i) => (
                      <div key={i} className="w-1 h-1 bg-gray-300 rounded-full mx-1" />
                    ))}
                  </div>
                  <span className={`text-sm font-bold mr-2 min-w-12 text-center ${getPriorityTextStyle(todo.priority)} bg-white rounded px-1`}>
                    [{getPriorityLabel(todo.priority)}]
                  </span>
                  <input
                    type="checkbox"
                    checked={todo.completed}
                    onChange={() => toggleTodo(todo.id)}
                    className="mr-3 h-4 w-4 text-blue-600 rounded"
                  />
                  <span 
                    className={`flex-1 ${todo.completed ? 'line-through text-gray-500' : getPriorityTextStyle(todo.priority)} ${getDepthFontWeight(todo.depth)}`}
                  >
                    {todo.text}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* TodoInput - 새로운 할 일을 입력하는 영역 */}
        <div 
          className="bg-white rounded-lg shadow-lg border-2 border-gray-300"
          style={{
            boxShadow: '0 8px 25px rgba(0,0,0,0.1), 0 0 0 1px rgba(0,0,0,0.05)',
            background: 'linear-gradient(135deg, #ffffff 0%, #fefefe 100%)'
          }}
        >
          <div className="p-6">
            <div 
              className={`flex items-center border-t-2 border-b-2 border-dashed border-gray-300 py-2 ${getPriorityStyle(inputPriority)} rounded-md`}
              style={{ paddingLeft: getDepthPadding(inputDepth) }}
            >
              <div className="flex items-center text-gray-400 mr-2">
                {Array.from({ length: inputDepth + 1 }, (_, i) => (
                  <div key={i} className="w-2 h-2 bg-gray-400 rounded-full mx-1" />
                ))}
              </div>
              <span className={`text-sm font-bold mr-2 min-w-12 text-center ${getPriorityTextStyle(inputPriority)} bg-white rounded px-1`}>
                [{getPriorityLabel(inputPriority)}]
              </span>
              <div className="w-px h-6 bg-gray-400 border-r border-dashed border-gray-400 mr-2"></div>
              <input
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="할 일을 입력하세요..."
                className="flex-1 outline-none text-lg bg-transparent font-medium"
                autoFocus
              />
            </div>
            <p className="text-sm text-gray-600 mt-3 font-medium">
              현재 깊이: {inputDepth + 1}단계 | Tab/Shift+Tab: 깊이 조절, ↑↓: 우선순위, Enter: 추가
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
