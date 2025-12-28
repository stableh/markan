const About = () => {
  return (
    <div className="max-w-6xl mx-auto">
      <h1 className="text-4xl font-bold text-gray-800 mb-8 text-center">About This Project</h1>
      
      <div className="grid md:grid-cols-2 gap-8 mb-12">
        <div className="bg-white rounded-xl shadow-lg p-8">
          <h2 className="text-2xl font-semibold text-gray-700 mb-6 flex items-center">
            <span className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center text-white text-sm font-bold mr-3">
              🚀
            </span>
            Technology Stack
          </h2>
          <div className="space-y-4">
            <div className="flex items-center p-3 bg-blue-50 rounded-lg">
              <div className="w-3 h-3 bg-blue-500 rounded-full mr-4"></div>
              <div>
                <p className="font-semibold text-gray-800">React 19 with TypeScript</p>
                <p className="text-sm text-gray-600">Latest React with full type safety</p>
              </div>
            </div>
            <div className="flex items-center p-3 bg-green-50 rounded-lg">
              <div className="w-3 h-3 bg-green-500 rounded-full mr-4"></div>
              <div>
                <p className="font-semibold text-gray-800">Vite 7.0</p>
                <p className="text-sm text-gray-600">Lightning-fast development server</p>
              </div>
            </div>
            <div className="flex items-center p-3 bg-purple-50 rounded-lg">
              <div className="w-3 h-3 bg-purple-500 rounded-full mr-4"></div>
              <div>
                <p className="font-semibold text-gray-800">Tailwind CSS v4.0</p>
                <p className="text-sm text-gray-600">CSS-first configuration with @theme</p>
              </div>
            </div>
            <div className="flex items-center p-3 bg-red-50 rounded-lg">
              <div className="w-3 h-3 bg-red-500 rounded-full mr-4"></div>
              <div>
                <p className="font-semibold text-gray-800">React Router v7</p>
                <p className="text-sm text-gray-600">Client-side routing</p>
              </div>
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-xl shadow-lg p-8">
          <h2 className="text-2xl font-semibold text-gray-700 mb-6 flex items-center">
            <span className="w-8 h-8 bg-secondary rounded-lg flex items-center justify-center text-white text-sm font-bold mr-3">
              ✨
            </span>
            New Features in v4.0
          </h2>
          <div className="space-y-4">
            <div className="flex items-center p-3 bg-yellow-50 rounded-lg">
              <div className="w-3 h-3 bg-yellow-500 rounded-full mr-4"></div>
              <div>
                <p className="font-semibold text-gray-800">CSS-First Configuration</p>
                <p className="text-sm text-gray-600">Configure with @theme in CSS</p>
              </div>
            </div>
            <div className="flex items-center p-3 bg-indigo-50 rounded-lg">
              <div className="w-3 h-3 bg-indigo-500 rounded-full mr-4"></div>
              <div>
                <p className="font-semibold text-gray-800">Vite Plugin Integration</p>
                <p className="text-sm text-gray-600">Native Vite plugin support</p>
              </div>
            </div>
            <div className="flex items-center p-3 bg-pink-50 rounded-lg">
              <div className="w-3 h-3 bg-pink-500 rounded-full mr-4"></div>
              <div>
                <p className="font-semibold text-gray-800">Performance Boost</p>
                <p className="text-sm text-gray-600">5x faster builds, 100x faster incremental</p>
              </div>
            </div>
            <div className="flex items-center p-3 bg-teal-50 rounded-lg">
              <div className="w-3 h-3 bg-teal-500 rounded-full mr-4"></div>
              <div>
                <p className="font-semibold text-gray-800">Auto Content Detection</p>
                <p className="text-sm text-gray-600">No manual content configuration needed</p>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-xl p-8 border border-gray-100">
        <h3 className="text-xl font-semibold text-gray-800 mb-4">Key Improvements in Tailwind CSS v4.0</h3>
        <div className="grid md:grid-cols-2 gap-6">
          <div>
            <h4 className="font-semibold text-gray-700 mb-2">Installation</h4>
            <p className="text-gray-600 text-sm mb-4">
              Just install <code className="bg-white px-2 py-1 rounded text-xs">@tailwindcss/vite</code> plugin 
              and add <code className="bg-white px-2 py-1 rounded text-xs">@import "tailwindcss"</code> to your CSS.
            </p>
          </div>
          <div>
            <h4 className="font-semibold text-gray-700 mb-2">Configuration</h4>
            <p className="text-gray-600 text-sm mb-4">
              Use <code className="bg-white px-2 py-1 rounded text-xs">@theme</code> directive in CSS 
              instead of JavaScript configuration files.
            </p>
          </div>
        </div>
        
        <div className="mt-6 p-4 bg-white rounded-lg border border-gray-200">
          <h4 className="font-semibold text-gray-700 mb-2">Example CSS Configuration:</h4>
          <pre className="text-sm text-gray-600 font-mono">
{`@import "tailwindcss";

@theme {
  --font-display: "system-ui", "sans-serif";
  --color-primary: #3b82f6;
  --color-secondary: #6366f1;
}`}
          </pre>
        </div>
      </div>
    </div>
  )
}

export default About