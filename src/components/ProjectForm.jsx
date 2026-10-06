import { useState, useRef } from 'react';
import { uploadScreenshot } from '../data/projects';
import LinkEditor from './LinkEditor';
import { isValidUrl } from '../utils/validators';
import PlanUploadStep from './PlanUploadStep';

function draftToForm(d) {
  return {
    name: d.name || '',
    category: d.category || 'web',
    status: d.status || 'development',
    summary: d.summary || '',
    description: d.description || '',
    techStack: Array.isArray(d.techStack) ? d.techStack.join(', ') : '',
    features: Array.isArray(d.features) ? d.features.join('\n') : '',
    githubUrl: d.githubUrl || '',
    tags: Array.isArray(d.tags) ? d.tags.join(', ') : '',
    version: d.version || '',
    license: d.license || '',
    planContent: d.planContent || '',
    planFilename: d.planFilename || '',
  };
}

function projectToForm(p) {
  return {
    name: p?.name || '',
    category: p?.category || 'web',
    status: p?.status || 'development',
    summary: p?.summary || '',
    description: p?.description || '',
    techStack: Array.isArray(p?.techStack) ? p.techStack.join(', ') : '',
    features: Array.isArray(p?.features) ? p.features.join('\n') : '',
    githubUrl: p?.githubUrl || '',
    tags: Array.isArray(p?.tags) ? p.tags.join(', ') : '',
    version: p?.version || '',
    license: p?.license || '',
    planContent: p?.planContent || '',
    planFilename: p?.planFilename || '',
  };
}

const EMPTY = {
  name: '', category: 'web', status: 'development', summary: '',
  description: '', techStack: '', features: '', githubUrl: '',
  tags: '', version: '', license: '', planContent: '', planFilename: '',
};

export default function ProjectForm({ onClose, onSave, project }) {
  const isEdit = !!project;
  // 신규: Step1(기획서) → Step2(폼). 수정: 바로 Step2.
  const [step, setStep] = useState(isEdit ? 2 : 1);
  const [form, setForm] = useState(isEdit ? projectToForm(project) : EMPTY);
  const [serviceLinks, setServiceLinks] = useState(
    Array.isArray(project?.serviceLinks) && project.serviceLinks.length > 0
      ? project.serviceLinks
      : (project?.serviceUrl ? [{ label: 'Live', url: project.serviceUrl }] : [])
  );
  const [screenshotUrl, setScreenshotUrl] = useState(project?.screenshot || project?.thumbnail || '');
  const [uploading, setUploading] = useState(false);
  const [formError, setFormError] = useState('');
  const fileInputRef = useRef(null);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleDraft = (draft) => {
    setForm(draftToForm(draft));
    setServiceLinks(Array.isArray(draft.serviceLinks) ? draft.serviceLinks : []);
    setStep(2);
  };

  const handleScreenshotUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setFormError('');
    try {
      const url = await uploadScreenshot(file);
      setScreenshotUrl(url);
    } catch (err) {
      setFormError(err.message || '업로드 실패');
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setFormError('');
    if (!form.name.trim()) {
      setFormError('프로젝트 이름을 입력해주세요.');
      return;
    }
    const badLink = serviceLinks.find((l) => l.url.trim() && !isValidUrl(l.url.trim()));
    if (badLink) {
      setFormError(`링크 URL을 확인해주세요: ${badLink.url}`);
      return;
    }
    const projectData = {
      ...form,
      screenshot: screenshotUrl,
      techStack: form.techStack.split(',').map((s) => s.trim()).filter(Boolean),
      features: form.features.split('\n').map((s) => s.trim()).filter(Boolean),
      tags: form.tags.split(',').map((s) => s.trim()).filter(Boolean),
      githubUrl: form.githubUrl.trim() || null,
      serviceLinks: serviceLinks
        .filter((l) => l.url.trim())
        .map((l) => ({ label: l.label.trim() || 'Link', url: l.url.trim() })),
    };
    if (project?.id) projectData.id = project.id;
    onSave(projectData);
  };

  const inputClass =
    'w-full bg-gray-800/50 border border-gray-700/50 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-gray-500/50 transition-colors';
  const labelClass = 'block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5';

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-[fadeIn_0.2s_ease-out]"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg max-h-[85vh] overflow-y-auto bg-gray-900 border border-gray-700/50 rounded-2xl shadow-2xl animate-[slideUp_0.25s_ease-out]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-white">
              {project ? '프로젝트 수정' : step === 1 ? '프로젝트 추가' : '프로젝트 추가 — 내용 입력'}
            </h2>
            <button
              type="button"
              onClick={onClose}
              className="w-8 h-8 flex items-center justify-center rounded-full bg-gray-800 text-gray-400 hover:text-white hover:bg-gray-700 transition-colors"
            >
              ✕
            </button>
          </div>

          {!isEdit && step === 1 && (
            <PlanUploadStep onDraft={handleDraft} onSkip={() => setStep(2)} />
          )}

          {(isEdit || step === 2) && (
            <form onSubmit={handleSubmit} className="space-y-4">
              {!isEdit && (
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="text-xs text-gray-500 hover:text-gray-300 transition-colors"
                >
                  ← 기획서 다시 올리기
                </button>
              )}

              {/* 기획서 원문 상태 */}
              {form.planFilename && (
                <p className="text-xs text-gray-500">
                  📄 기획서: {form.planFilename} ({(form.planContent || '').length.toLocaleString()}자)
                </p>
              )}

              {/* 이름 + 카테고리 + 상태 */}
              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-1">
                  <label className={labelClass}>이름 *</label>
                  <input type="text" name="name" value={form.name} onChange={handleChange} className={inputClass} />
                </div>
                <div>
                  <label className={labelClass}>카테고리</label>
                  <select name="category" value={form.category} onChange={handleChange} className={inputClass}>
                    <option value="web">Web App</option>
                    <option value="mobile">Mobile</option>
                    <option value="ai">AI/ML</option>
                    <option value="devops">DevOps</option>
                    <option value="tool">Tools</option>
                  </select>
                </div>
                <div>
                  <label className={labelClass}>상태</label>
                  <select name="status" value={form.status} onChange={handleChange} className={inputClass}>
                    <option value="active">Active</option>
                    <option value="development">Development</option>
                    <option value="archived">Archived</option>
                  </select>
                </div>
              </div>

              {/* 버전 + 라이선스 */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelClass}>버전</label>
                  <input type="text" name="version" value={form.version} onChange={handleChange} placeholder="1.0.0" className={inputClass} />
                </div>
                <div>
                  <label className={labelClass}>라이선스</label>
                  <input type="text" name="license" value={form.license} onChange={handleChange} placeholder="MIT" className={inputClass} />
                </div>
              </div>

              <div>
                <label className={labelClass}>요약</label>
                <input type="text" name="summary" value={form.summary} onChange={handleChange} className={inputClass} />
              </div>

              <div>
                <label className={labelClass}>상세 설명</label>
                <textarea name="description" value={form.description} onChange={handleChange} rows={3} className={inputClass + ' resize-none'} />
              </div>

              <div>
                <label className={labelClass}>기술스택 (쉼표 구분)</label>
                <input type="text" name="techStack" value={form.techStack} onChange={handleChange} placeholder="React, Node.js, PostgreSQL" className={inputClass} />
              </div>

              <div>
                <label className={labelClass}>주요 기능 (줄바꿈 구분)</label>
                <textarea name="features" value={form.features} onChange={handleChange} rows={3} className={inputClass + ' resize-none'} />
              </div>

              <div>
                <label className={labelClass}>GitHub URL</label>
                <input type="url" name="githubUrl" value={form.githubUrl} onChange={handleChange} placeholder="https://github.com/..." className={inputClass} />
              </div>

              {/* 링크 동적 리스트 */}
              <div>
                <label className={labelClass}>서비스 링크 (추가·제거 자유)</label>
                <LinkEditor links={serviceLinks} onChange={setServiceLinks} />
              </div>

              <div>
                <label className={labelClass}>태그 (쉼표 구분)</label>
                <input type="text" name="tags" value={form.tags} onChange={handleChange} className={inputClass} />
              </div>

              {/* 스크린샷 단일 업로드 */}
              <div>
                <label className={labelClass}>스크린샷</label>
                <input type="file" ref={fileInputRef} onChange={handleScreenshotUpload} accept="image/*" className="hidden" />
                {formError && <p className="text-xs text-red-400 mb-2">{formError}</p>}
                {screenshotUrl ? (
                  <div className="relative w-full h-32 rounded-lg overflow-hidden border border-gray-700/50">
                    <img src={screenshotUrl} alt="screenshot" className="w-full h-full object-cover" />
                    <button
                      type="button"
                      onClick={() => setScreenshotUrl('')}
                      className="absolute top-2 right-2 w-6 h-6 flex items-center justify-center rounded-full bg-black/50 text-white/70 hover:text-white"
                    >
                      ✕
                    </button>
                  </div>
                ) : (
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    className="w-full h-32 border-2 border-dashed border-gray-700/50 rounded-lg flex flex-col items-center justify-center gap-1.5 text-gray-600 hover:border-gray-500/50 hover:text-gray-400 transition-colors cursor-pointer"
                  >
                    {uploading ? (
                      <svg className="w-6 h-6 animate-spin" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                      </svg>
                    ) : (
                      <span className="text-xs">클릭하여 이미지 업로드 (1MB 이하)</span>
                    )}
                  </div>
                )}
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 rounded-lg bg-gray-800 text-gray-400 text-sm hover:bg-gray-700 hover:text-white transition-colors"
                >
                  취소
                </button>
                <button type="submit" className="px-4 py-2 rounded-lg bg-white text-black text-sm font-medium hover:bg-gray-200 transition-colors">
                  {project ? '수정' : '저장'}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
