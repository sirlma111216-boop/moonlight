import { Link } from 'react-router';
import { useSession } from '@/store/session';
import { ReportPreview } from '@/components/ReportPreview';

export default function ReportPrint() {
  const status = useSession((s) => s.status);
  const bundle = useSession((s) => s.bundle);
  if (status === 'loading') return <p className="container" style={{ padding: 40 }}>불러오는 중…</p>;
  if (!bundle) return <p className="container" style={{ padding: 40 }}>세션이 없어요. <Link to="/">처음으로</Link></p>;
  return (
    <div className="container" style={{ paddingTop: 24, paddingBottom: 48 }}>
      <div className="row no-print" style={{ marginBottom: 16 }}>
        <button type="button" className="btn" onClick={() => window.print()}>
          인쇄 / PDF로 저장
        </button>
        <Link className="btn btn--ghost" to="/learn/s12/s12-submit">
          돌아가기
        </Link>
        <span className="caption">브라우저 인쇄 대화상자에서 ‘PDF로 저장’을 고르면 파일로 남길 수 있어요.</span>
      </div>
      <ReportPreview bundle={bundle} forPrint />
    </div>
  );
}
