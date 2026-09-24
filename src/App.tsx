import { lazy, Suspense, useEffect } from 'react';
import { Navigate, Route, Routes } from 'react-router';
import { useSession } from '@/store/session';
import Landing from '@/pages/Landing';
import { Toast } from '@/components/Toast';

const StudentShell = lazy(() => import('@/pages/student/StudentShell'));
const ReportPrint = lazy(() => import('@/pages/student/ReportPrint'));
const TeacherApp = lazy(() => import('@/pages/teacher/TeacherApp'));

function Loading() {
  return (
    <div className="container" style={{ padding: '80px 16px' }} role="status">
      <p className="mono">Loading</p>
      <p className="muted">불러오는 중이에요…</p>
    </div>
  );
}

export default function App() {
  const bootstrap = useSession((s) => s.bootstrap);
  useEffect(() => {
    void bootstrap();
  }, [bootstrap]);
  return (
    <>
      <a className="skip-link" href="#main">
        본문으로 건너뛰기
      </a>
      <Suspense fallback={<Loading />}>
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/learn/*" element={<StudentShell />} />
          <Route path="/report/print" element={<ReportPrint />} />
          <Route path="/teacher/*" element={<TeacherApp />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>
      <Toast />
    </>
  );
}
