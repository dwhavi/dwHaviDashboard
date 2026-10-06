import { useRef, useState } from 'react';
import { parsePlanFile } from '../data/projects';

export default function PlanUploadStep({ onDraft, onSkip }) {
  const fileRef = useRef(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [warnings, setWarnings] = useState([]);
  const [preview, setPreview] = useState(null);

  const handleFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setError('');
    setWarnings([]);
    setPreview(null);
    if (!/\.md$/i.test(file.name)) {
      setError('md 파일만 업로드할 수 있습니다.');
      return;
    }
    setLoading(true);
    try {
      const { data, warnings: w } = await parsePlanFile(file);
      setWarnings(w || []);
      setPreview(data);
    } catch (err) {
      setError(err.message || '기획서 파싱에 실패했습니다.');
    } finally {
      setLoading(false);
      e.target.value = '';
    }
  };

  return (
    <div className="space-y-4">
      <div className="text-center">
        <h3 className="text-base font-bold text-white mb-1">기획서로 시작하기</h3>
        <p className="text-xs text-gray-500">packageinfo.md 등 기획서 md를 올리면 폼이 자동 채워집니다.</p>
      </div>

      <input type="file" ref={fileRef} onChange={handleFile} accept=".md,text/markdown" className="hidden" />

      <div
        onClick={() => fileRef.current?.click()}
        className="w-full py-10 border-2 border-dashed border-gray-700/50 rounded-xl flex flex-col items-center justify-center gap-2 text-gray-500 hover:border-gray-500/60 hover:text-gray-300 transition-colors cursor-pointer"
      >
        {loading ? (
          <svg className="w-6 h-6 animate-spin" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
        ) : (
          <>
            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m6.75 12l-3-3m0 0l-3 3m3-3v6" />
            </svg>
            <span className="text-sm">클릭하여 기획서 md 선택</span>
            <span className="text-xs text-gray-600">.md · 200KB 이하</span>
          </>
        )}
      </div>

      {error && <p className="text-xs text-red-400 text-center">{error}</p>}

      {warnings.length > 0 && (
        <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg px-3 py-2">
          {warnings.map((w, i) => (
            <p key={i} className="text-xs text-yellow-300">⚠ {w}</p>
          ))}
        </div>
      )}

      {preview && (
        <div className="bg-gray-800/40 border border-gray-700/40 rounded-xl p-4 space-y-1.5">
          <p className="text-sm font-bold text-white">{preview.name}</p>
          {preview.summary && <p className="text-xs text-gray-400">{preview.summary}</p>}
          <div className="flex flex-wrap gap-1.5 pt-1">
            {(preview.tags || []).map((t, i) => (
              <span key={i} className="px-2 py-0.5 bg-gray-700/50 text-gray-300 text-[11px] rounded-full">{t}</span>
            ))}
            {(preview.techStack || []).slice(0, 5).map((t, i) => (
              <span key={'ts' + i} className="px-2 py-0.5 bg-indigo-500/20 text-indigo-300 text-[11px] rounded-full">{t}</span>
            ))}
          </div>
          <p className="text-xs text-gray-500 pt-1">
            기능 {preview.features?.length || 0}개 · 링크 {preview.serviceLinks?.length || 0}개 인식
          </p>
          <button
            type="button"
            onClick={() => onDraft(preview)}
            className="w-full mt-2 py-2 rounded-lg bg-white text-black text-sm font-medium hover:bg-gray-200 transition-colors"
          >
            이 내용으로 작성 계속하기 →
          </button>
        </div>
      )}

      <div className="flex items-center gap-3">
        <div className="flex-1 h-px bg-gray-800" />
        <span className="text-xs text-gray-600">또는</span>
        <div className="flex-1 h-px bg-gray-800" />
      </div>

      <button
        type="button"
        onClick={onSkip}
        className="w-full py-2 rounded-lg bg-gray-800 text-gray-300 text-sm hover:bg-gray-700 hover:text-white transition-colors"
      >
        빈 폼으로 시작
      </button>
    </div>
  );
}
