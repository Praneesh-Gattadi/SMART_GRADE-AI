import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Layout } from './components/layout/Layout';
import { ProtectedRoute } from './components/auth/ProtectedRoute';
import { Login } from './pages/auth/Login';
import { Signup } from './pages/auth/Signup';
import { Dashboard } from './pages/Dashboard';
import { Evaluate } from './pages/Evaluate';
import { Students } from './pages/Students';
import { History } from './pages/History';
import { Analytics } from './pages/Analytics';
import { Settings } from './pages/Settings';
import { ManualReview } from './pages/ManualReview';
import { FacultyList } from './pages/admin/FacultyList';
import { InstitutionLogin } from './pages/auth/InstitutionLogin';
import { InstitutionSelect } from './pages/auth/InstitutionSelect';
import { RegisterInstitution } from './pages/auth/RegisterInstitution';
import { useAuthStore } from './store/authStore';
import './index.css';

function App() {
  const { token } = useAuthStore();

  return (
    <Router>
      <Routes>
        {/* Public Routes - Only accessible when NOT logged in */}
        <Route
          path="/login"
          element={token ? <Navigate to="/" replace /> : <InstitutionSelect />}
        />
        <Route
          path="/signup"
          element={token ? <Navigate to="/" replace /> : <Signup />}
        />
        <Route
          path="/org/:slug/login"
          element={<InstitutionLogin />}
        />
        <Route
          path="/register-institution"
          element={<RegisterInstitution />}
        />

        {/* Protected Routes - Require authentication */}
        <Route
          path="/*"
          element={
            <ProtectedRoute>
              <Layout>
                <Routes>
                  <Route path="/" element={<Dashboard />} />
                  <Route path="/evaluate" element={<Evaluate />} />
                  <Route path="/students" element={<Students />} />
                  <Route path="/admin/faculty" element={<FacultyList />} />
                  <Route path="/history" element={<History />} />
                  <Route path="/analytics" element={<Analytics />} />
                  <Route path="/review" element={<ManualReview />} />
                  <Route path="/settings" element={<Settings />} />
                </Routes>
              </Layout>
            </ProtectedRoute>
          }
        />
      </Routes>
    </Router>
  );
}

export default App;
