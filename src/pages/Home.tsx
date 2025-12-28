import { useState } from 'react'

const Home = () => {
  const [count, setCount] = useState(0)

  return (
    <div className="text-center">
      <h1 className="text-5xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent mb-8">
        React + TypeScript + Tailwind CSS v4.0
      </h1>
      
      <div className="max-w-md mx-auto bg-white rounded-xl shadow-lg p-8 border border-gray-100">
        <div className="flex justify-center space-x-6 mb-8">
          <div className="relative">
            <div className="w-16 h-16 bg-gradient-to-br from-blue-400 to-blue-600 rounded-lg flex items-center justify-center text-white font-bold text-lg shadow-lg hover:shadow-xl transition-shadow">
              V
            </div>
            <div className="absolute -top-1 -right-1 w-4 h-4 bg-green-500 rounded-full animate-pulse"></div>
          </div>
          <div className="relative">
            <div className="w-16 h-16 bg-gradient-to-br from-cyan-400 to-blue-500 rounded-lg flex items-center justify-center text-white font-bold text-lg shadow-lg hover:shadow-xl transition-shadow animate-spin-slow">
              R
            </div>
          </div>
          <div className="relative">
            <div className="w-16 h-16 bg-gradient-to-br from-purple-400 to-purple-600 rounded-lg flex items-center justify-center text-white font-bold text-lg shadow-lg hover:shadow-xl transition-shadow">
              T
            </div>
            <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-yellow-500 rounded-full animate-bounce"></div>
          </div>
        </div>
        
        <h2 className="text-2xl font-semibold text-gray-700 mb-6">
          Vite + React + Tailwind v4
        </h2>
        
        <button 
          onClick={() => setCount((count) => count + 1)}
          className="bg-gradient-to-r from-primary to-secondary hover:from-blue-600 hover:to-indigo-700 text-white font-semibold py-3 px-6 rounded-lg shadow-md hover:shadow-lg transform hover:scale-105 transition-all duration-200"
        >
          Count is {count}
        </button>
        
        <p className="mt-6 text-gray-600 text-sm">
          Edit <code className="bg-gray-100 px-2 py-1 rounded text-xs font-mono">src/pages/Home.tsx</code> to test HMR
        </p>
      </div>
      
      <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl mx-auto">
        <div className="bg-white rounded-lg p-6 shadow-md hover:shadow-lg transition-shadow">
          <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mb-4">
            <span className="text-2xl">⚡</span>
          </div>
          <h3 className="font-semibold text-lg mb-2">Lightning Fast</h3>
          <p className="text-gray-600 text-sm">Vite provides instant HMR and blazing fast builds</p>
        </div>
        
        <div className="bg-white rounded-lg p-6 shadow-md hover:shadow-lg transition-shadow">
          <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mb-4">
            <span className="text-2xl">🎨</span>
          </div>
          <h3 className="font-semibold text-lg mb-2">Tailwind v4.0</h3>
          <p className="text-gray-600 text-sm">New CSS-first configuration with improved performance</p>
        </div>
        
        <div className="bg-white rounded-lg p-6 shadow-md hover:shadow-lg transition-shadow">
          <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mb-4">
            <span className="text-2xl">🔒</span>
          </div>
          <h3 className="font-semibold text-lg mb-2">Type Safe</h3>
          <p className="text-gray-600 text-sm">Full TypeScript support for better development experience</p>
        </div>
      </div>
    </div>
  )
}

export default Home