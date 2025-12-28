import { Link } from 'react-router-dom'

const Navigation = () => {
  return (
    <nav className="bg-white shadow-sm border-b">
      <div className="container mx-auto px-4">
        <div className="flex justify-between items-center h-16">
          <Link to="/" className="text-xl font-bold text-gray-800 hover:text-primary transition-colors">
            React App v4
          </Link>
          <div className="flex space-x-4">
            <Link 
              to="/" 
              className="text-gray-600 hover:text-primary px-3 py-2 rounded-md text-sm font-medium transition-colors"
            >
              Home
            </Link>
            <Link 
              to="/about" 
              className="text-gray-600 hover:text-secondary px-3 py-2 rounded-md text-sm font-medium transition-colors"
            >
              About
            </Link>
          </div>
        </div>
      </div>
    </nav>
  )
}

export default Navigation