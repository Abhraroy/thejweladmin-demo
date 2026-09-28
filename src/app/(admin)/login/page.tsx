'use client'

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { adminLogin, createAdmin, checkAdminAuth } from './actions'

type Mode = 'login' | 'create'

export default function AdminLoginPage() {
  const router = useRouter()
  const [mode, setMode] = useState<Mode>('login')
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    key: ''
  })
  const [error, setError] = useState('')
  const [successMessage, setSuccessMessage] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [isCheckingAuth, setIsCheckingAuth] = useState(true)
  const [isAuthenticated, setIsAuthenticated] = useState(false)

  // Check if user is already authenticated on component mount
  useEffect(() => {
    const checkExistingAuth = async () => {
      try {
        const authResult = await checkAdminAuth()
        if (authResult.authenticated) {
          setIsAuthenticated(true)
          router.push('/dashboard')
          return
        }
      } catch (error) {
        console.error('Auth check failed:', error)
      } finally {
        setIsCheckingAuth(false)
      }
    }

    checkExistingAuth()
  }, [router])

  // Check for error parameters on component mount
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search)
    const errorParam = urlParams.get('error')

    if (errorParam === 'access_denied') {
      setError('Access denied. Admin privileges required.')
    }
  }, [])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))
    if (error) setError('')
    if (successMessage) setSuccessMessage('')
  }

  const switchMode = (newMode: Mode) => {
    setMode(newMode)
    setError('')
    setSuccessMessage('')
  }

  const handleSubmit = async (e: React.SubmitEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError('')
    setSuccessMessage('')

    try {
      if (mode === 'create') {
        const result = await createAdmin(formData)
        if (result.success) {
          setSuccessMessage(result.message || 'Admin created. You can now log in.')
          setFormData({ email: '', password: '', key: formData.key })
          setMode('login')
        } else {
          setError(result.error || 'Failed to create admin')
        }
      } else {
        const result = await adminLogin(formData)
        if (result.success) {
          router.push('/dashboard')
        } else {
          setError(result.error || 'Login failed')
        }
      }
    } catch (err: unknown) {
      console.error(mode === 'create' ? 'Create admin error:' : 'Login error:', err)
      setError('An unexpected error occurred. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  // Show loading while checking authentication or if already authenticated
  if (isCheckingAuth || isAuthenticated) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center px-4">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-white flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-lg shadow-md p-8 space-y-6">
          <div className="text-center space-y-2">
            <h1 className="text-3xl font-bold text-gray-900">
              Admin Portal
            </h1>
            <p className="text-gray-600">
              {mode === 'login' ? 'Sign in to access the admin dashboard' : 'Create a new admin account'}
            </p>
          </div>

          {/* Tab toggle */}
          <div className="flex rounded-lg border border-gray-900 p-1 bg-gray-50">
            <button
              type="button"
              onClick={() => switchMode('login')}
              className={`flex-1 cursor-pointer py-2 px-4 rounded-md text-sm font-medium transition-colors ${
                mode === 'login'
                  ? 'bg-[#360000] text-white shadow-sm'
                  : 'text-gray-600 hover:text-[#360000] hover:bg-white'
              }`}
            >
              Login
            </button>
            <button
              type="button"
              onClick={() => switchMode('create')}
              className={`flex-1 cursor-pointer py-2 px-4 rounded-md text-sm font-medium transition-colors ${
                mode === 'create'
                  ? 'bg-[#360000] text-white shadow-sm'
                  : 'text-gray-600 hover:text-[#360000] hover:bg-white'
              }`}
            >
              Create Admin
            </button>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
              {error}
            </div>
          )}

          {successMessage && (
            <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg text-sm">
              {successMessage}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-2">
              <label
                htmlFor="email"
                className="block text-sm font-medium text-gray-700"
              >
                Email
              </label>
              <input
                id="email"
                name="email"
                type="text"
                value={formData.email}
                onChange={handleChange}
                required
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-transparent outline-none transition-all bg-white text-gray-900 placeholder-gray-400"
                placeholder="Enter your email"
              />
            </div>

            <div className="space-y-2">
              <label
                htmlFor="password"
                className="block text-sm font-medium text-gray-700"
              >
                Password
              </label>
              <input
                id="password"
                name="password"
                type="password"
                value={formData.password}
                onChange={handleChange}
                required
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-transparent outline-none transition-all bg-white text-gray-900 placeholder-gray-400"
                placeholder="Enter your password"
              />
            </div>

            <div className="space-y-2">
              <label
                htmlFor="key"
                className="block text-sm font-medium text-gray-700"
              >
                Key
              </label>
              <input
                id="key"
                name="key"
                type="text"
                value={formData.key}
                onChange={handleChange}
                required
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-transparent outline-none transition-all bg-white text-gray-900 placeholder-gray-400"
                placeholder={mode === 'login' ? 'Enter admin key' : 'Enter admin key (required for creation)'}
              />
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-[#360000] hover:bg-[#360000]/80 disabled:bg-[#360000]/40 disabled:cursor-not-allowed text-white font-semibold py-3 px-4 rounded-lg transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-black focus:ring-offset-2 flex items-center justify-center"
            >
              {isLoading ? (
                <>
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  {mode === 'create' ? 'Creating...' : 'Signing in...'}
                </>
              ) : mode === 'create' ? (
                'Create Admin'
              ) : (
                'Login'
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
