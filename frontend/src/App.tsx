import { Route, Routes } from 'react-router-dom'
import Layout from './components/Layout'
import AssessmentHistory from './pages/AssessmentHistory'
import CatalogPage from './pages/CatalogPage'
import CheckEligibility from './pages/CheckEligibility'
import ComparePage from './pages/ComparePage'
import Dashboard from './pages/Dashboard'
import LoginPage from './pages/LoginPage'
import MyDocumentsPage from './pages/MyDocumentsPage'
import RegisterPage from './pages/RegisterPage'

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route element={<Layout />}>
        <Route path="/" element={<Dashboard />} />
        <Route path="/catalog" element={<CatalogPage />} />
        <Route path="/check" element={<CheckEligibility />} />
        <Route path="/compare" element={<ComparePage />} />
        <Route path="/documents" element={<MyDocumentsPage />} />
        <Route path="/history" element={<AssessmentHistory />} />
      </Route>
    </Routes>
  )
}
