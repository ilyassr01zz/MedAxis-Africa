import React from 'react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { BrowserRouter, MemoryRouter, Routes, Route } from 'react-router-dom'
import ProtectedRoute from './protected-route'
import * as AuthHooks from '../hooks/use-auth'

// Mock the useAuth hook at the module level
vi.mock('../hooks/use-auth', () => ({
  useAuth: vi.fn(),
}))

/**
 * Test Suite: ProtectedRoute — RBAC Coverage
 *
 * Tests that ProtectedRoute correctly:
 *   1. Redirects unauthenticated users to /
 *   2. Redirects authenticated users with NO matching role to /
 *   3. Allows authenticated users with CORRECT role to access content
 *   4. Handles multiple allowed roles correctly
 *   5. Denies access when allowedRoles is empty
 */
describe('ProtectedRoute', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should redirect unauthenticated users to / (login page)', () => {
    AuthHooks.useAuth.mockReturnValue({
      isAuthenticated: false,
      user: null,
    })

    render(
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<div>Login Page</div>} />
          <Route element={<ProtectedRoute allowedRoles={['DOCTOR']} />}>
            <Route
              path="/doctor"
              element={<div>Doctor Portal - Protected Content</div>}
            />
          </Route>
        </Routes>
      </BrowserRouter>
    )

    expect(screen.getByText('Login Page')).toBeInTheDocument()
    expect(screen.queryByText('Doctor Portal - Protected Content')).not.toBeInTheDocument()
  })

  it('should redirect authenticated PATIENT to / when trying to access DOCTOR route', () => {
    AuthHooks.useAuth.mockReturnValue({
      isAuthenticated: true,
      user: {
        id: 'PAT-001',
        name: 'Youssef',
        role: 'PATIENT',
      },
    })

    render(
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<div>Login Page</div>} />
          <Route element={<ProtectedRoute allowedRoles={['DOCTOR']} />}>
            <Route
              path="/doctor"
              element={<div>Doctor Portal - DOCTOR Only</div>}
            />
          </Route>
        </Routes>
      </BrowserRouter>
    )

    expect(screen.getByText('Login Page')).toBeInTheDocument()
    expect(screen.queryByText('Doctor Portal - DOCTOR Only')).not.toBeInTheDocument()
  })

  it('should redirect authenticated PHARMACIST to / when trying to access DOCTOR route', () => {
    AuthHooks.useAuth.mockReturnValue({
      isAuthenticated: true,
      user: {
        id: 'PH-001',
        name: 'Fatima Qadiri',
        role: 'PHARMACIST',
      },
    })

    render(
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<div>Login Page</div>} />
          <Route element={<ProtectedRoute allowedRoles={['DOCTOR']} />}>
            <Route
              path="/doctor"
              element={<div>Doctor Portal - DOCTOR Only</div>}
            />
          </Route>
        </Routes>
      </BrowserRouter>
    )

    expect(screen.getByText('Login Page')).toBeInTheDocument()
    expect(screen.queryByText('Doctor Portal - DOCTOR Only')).not.toBeInTheDocument()
  })

  it('should allow authenticated DOCTOR to access /doctor route', () => {
    AuthHooks.useAuth.mockReturnValue({
      isAuthenticated: true,
      user: {
        id: 'DOC-001',
        name: 'Dr. Ahmed Benali',
        role: 'DOCTOR',
      },
    })

    render(
      <MemoryRouter initialEntries={['/doctor']}>
        <Routes>
          <Route path="/" element={<div>Login Page</div>} />
          <Route element={<ProtectedRoute allowedRoles={['DOCTOR']} />}>
            <Route
              path="/doctor"
              element={<div>Doctor Portal - Protected Content</div>}
            />
          </Route>
        </Routes>
      </MemoryRouter>
    )

    expect(screen.getByText('Doctor Portal - Protected Content')).toBeInTheDocument()
    expect(screen.queryByText('Login Page')).not.toBeInTheDocument()
  })

  it('should allow users with any of the allowed roles to access the route', () => {
    AuthHooks.useAuth.mockReturnValue({
      isAuthenticated: true,
      user: {
        id: 'ADM-001',
        name: 'System Administrator',
        role: 'ADMIN',
      },
    })

    render(
      <MemoryRouter initialEntries={['/admin']}>
        <Routes>
          <Route path="/" element={<div>Login Page</div>} />
          <Route element={<ProtectedRoute allowedRoles={['DOCTOR', 'ADMIN']} />}>
            <Route
              path="/admin"
              element={<div>Admin Dashboard</div>}
            />
          </Route>
        </Routes>
      </MemoryRouter>
    )

    expect(screen.getByText('Admin Dashboard')).toBeInTheDocument()
    expect(screen.queryByText('Login Page')).not.toBeInTheDocument()
  })

  it('should redirect PHARMACIST to / when route allows only DOCTOR and ADMIN', () => {
    AuthHooks.useAuth.mockReturnValue({
      isAuthenticated: true,
      user: {
        id: 'PH-001',
        name: 'Fatima Qadiri',
        role: 'PHARMACIST',
      },
    })

    render(
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<div>Login Page</div>} />
          <Route element={<ProtectedRoute allowedRoles={['DOCTOR', 'ADMIN']} />}>
            <Route
              path="/admin"
              element={<div>Admin Dashboard</div>}
            />
          </Route>
        </Routes>
      </BrowserRouter>
    )

    expect(screen.getByText('Login Page')).toBeInTheDocument()
    expect(screen.queryByText('Admin Dashboard')).not.toBeInTheDocument()
  })

  it('should deny all access when allowedRoles is empty', () => {
    AuthHooks.useAuth.mockReturnValue({
      isAuthenticated: true,
      user: {
        id: 'DOC-001',
        name: 'Dr. Ahmed Benali',
        role: 'DOCTOR',
      },
    })

    render(
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<div>Login Page</div>} />
          <Route element={<ProtectedRoute allowedRoles={[]} />}>
            <Route
              path="/restricted"
              element={<div>Restricted Area</div>}
            />
          </Route>
        </Routes>
      </BrowserRouter>
    )

    expect(screen.getByText('Login Page')).toBeInTheDocument()
    expect(screen.queryByText('Restricted Area')).not.toBeInTheDocument()
  })

  it('should allow REGULATOR to access /regulator route', () => {
    AuthHooks.useAuth.mockReturnValue({
      isAuthenticated: true,
      user: {
        id: 'REG-001',
        name: 'Regulatory Admin',
        role: 'REGULATOR',
      },
    })

    render(
      <MemoryRouter initialEntries={['/regulator']}>
        <Routes>
          <Route path="/" element={<div>Login Page</div>} />
          <Route element={<ProtectedRoute allowedRoles={['REGULATOR']} />}>
            <Route
              path="/regulator"
              element={<div>Regulatory Dashboard</div>}
            />
          </Route>
        </Routes>
      </MemoryRouter>
    )

    expect(screen.getByText('Regulatory Dashboard')).toBeInTheDocument()
    expect(screen.queryByText('Login Page')).not.toBeInTheDocument()
  })

  it('should allow PATIENT to access /patient route', () => {
    AuthHooks.useAuth.mockReturnValue({
      isAuthenticated: true,
      user: {
        id: 'PAT-001',
        name: 'Youssef',
        role: 'PATIENT',
      },
    })

    render(
      <MemoryRouter initialEntries={['/patient']}>
        <Routes>
          <Route path="/" element={<div>Login Page</div>} />
          <Route element={<ProtectedRoute allowedRoles={['PATIENT']} />}>
            <Route
              path="/patient"
              element={<div>My Prescriptions</div>}
            />
          </Route>
        </Routes>
      </MemoryRouter>
    )

    expect(screen.getByText('My Prescriptions')).toBeInTheDocument()
    expect(screen.queryByText('Login Page')).not.toBeInTheDocument()
  })
})
