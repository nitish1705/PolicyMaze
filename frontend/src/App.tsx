import { Route, Routes } from 'react-router-dom'
import Layout from './components/Layout'
import CatalogPage from './pages/CatalogPage'
import CheckEligibility from './pages/CheckEligibility'
import ComparePage from './pages/ComparePage'
import Dashboard from './pages/Dashboard'
import MyDocumentsPage from './pages/MyDocumentsPage'
import RulesPage from './pages/RulesPage'

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/" element={<Dashboard />} />
        <Route path="/catalog" element={<CatalogPage />} />
        <Route path="/check" element={<CheckEligibility />} />
        <Route path="/compare" element={<ComparePage />} />
        <Route path="/documents" element={<MyDocumentsPage />} />
        <Route path="/rules" element={<RulesPage />} />
      </Route>
    </Routes>
  )
}
