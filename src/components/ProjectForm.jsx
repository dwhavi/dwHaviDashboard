import { useState, useRef } from "react";
import { fetchReadmeStructure, uploadScreenshot, uploadToDrive, resolveDriveUrl } from "../data/projects";

export default function ProjectForm({ onClose, onSave, project }) {
  const [form, setForm] = useState({
    name: project?.name || "",
    category: project?.category || "web",
    status: project?.status || "development",
    summary: project?.summary || "",
    description: project?.description || "",
    techStack: Array.isArray(project?.techStack) ? project.techStack.join(", ") : "",
    goals: Array.isArray(project?.goals) ? project.goals.join("\n") : "",
    features: Array.isArray(project?.features) ? project.features.join("\n") : "",
    githubUrl: project?.githubUrl || "",
    serviceUrl: project?.serviceUrl || "",
    tags: Array.isArray(project?.tags) ? project.tags.join(", ") : "",
    version: project?.version || "",
    license: project?.license || "",
    architecture: project?.architecture || "",
  });

  const [readmeLoading, setReadmeLoading] = useState(false);
  const [screenshotUrl, setScreenshotUrl] = useState(project?.screenshot || "");
  const [uploading, setUploading] = useState(false);
  const [screenshotTab, setScreenshotTab] = useState("upload"); // "upload" | "url"
  const [driveUrlInput, setDriveUrlInput] = useState("");
  const [driveUrlLoading, setDriveUrlLoading] = useState(false);
  const [uploadTarget, setUploadTarget] = useState("blob"); // "blob" | "drive"
  const [uploadError, setUploadError] = useState("");
  const fileInputRef = useRef(null);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleLoadReadme = async () => {
    if (!form.githubUrl) return;
    setReadmeLoading(true);
    setUploadError("");
    try {
      const data = await fetchReadmeStructure(form.githubUrl);
      if (data) {
        setForm({
          ...form,
          summary: data.summary || form.summary,
          description: data.description || form.description,
          techStack: Array.isArray(data.techStack) ? data.techStack.join(", ") : form.techStack,
          goals: Array.isArray(data.features) ? data.features.slice(0, 3).join("\n") : form.goals,
          features: Array.isArray(data.features) ? data.features.join("\n") : form.features,
          architecture: data.architecture || form.architecture,
        });
      }
    } catch (err) {
      setUploadError(err.message || "README 불러오기 실패");
    } finally {
      setReadmeLoading(false);
    }
  };

  const handleScreenshotUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setUploadError("");
    try {
      const url = uploadTarget === "drive" ? await uploadToDrive(file) : await uploadScreenshot(file);
      setScreenshotUrl(url);
    } catch (err) {
      setUploadError(err.message || "업로드 실패");
      console.error("Upload failed:", err);
    } finally {
      setUploading(false);
    }
  };

  const handleDriveUrlSubmit = async () => {
    const url = driveUrlInput.trim();
    if (!url) return;
    setDriveUrlLoading(true);
    setUploadError("");
    try {
      const resolvedUrl = await resolveDriveUrl(url);
      setScreenshotUrl(resolvedUrl);
      setDriveUrlInput("");
    } catch (err) {
      setUploadError(err.message || "URL 변환 실패");
      console.error("Drive URL failed:", err);
    } finally {
      setDriveUrlLoading(false);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const projectData = {
      ...form,
      screenshot: screenshotUrl,
      techStack: form.techStack.split(",").map((s) => s.trim()).filter(Boolean),
      goals: form.goals.split("\n").map((s) => s.trim()).filter(Boolean),
      features: form.features.split("\n").map((s) => s.trim()).filter(Boolean),
      tags: form.tags.split(",").map((s) => s.trim()).filter(Boolean),
      serviceUrl: form.serviceUrl || null,
    };
    if (project?.id) projectData.id = project.id;
    onSave(projectData);
  };

  const inputClass =
    "w-full bg-gray-800/50 border border-gray-700/50 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-gray-500/50 transition-colors";
  const labelClass = "block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5";

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-[fadeIn_0.2s_ease-out]"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg max-h-[85vh] overflow-y-auto bg-gray-900 border border-gray-700/50 rounded-2xl shadow-2xl animate-[slideUp_0.25s_ease-out]"
        onClick={(e) => e.stopPropagation()}
      >
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Header */}
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-white">{project ? "프로젝트 수정" : "프로젝트 추가"}</h2>
            <button
              type="button"
              onClick={onClose}
              className="w-8 h-8 flex items-center justify-center rounded-full bg-gray-800 text-gray-400 hover:text-white hover:bg-gray-700 transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* GitHub URL + README load */}
          <div className="space-y-2">
            <label className={labelClass}>GitHub URL</label>
            <div className="flex gap-2">
              <input
                type="url"
                name="githubUrl"
                value={form.githubUrl}
                onChange={handleChange}
                placeholder="https://github.com/..."
                className={inputClass}
              />
              <button
                type="button"
                onClick={handleLoadReadme}
                disabled={readmeLoading || !form.githubUrl}
                className="shrink-0 px-3 py-2 rounded-lg bg-gray-800 text-gray-300 text-sm hover:bg-gray-700 hover:text-white transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {readmeLoading ? (
                  <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                ) : (
                  "README 불러오기"
                )}
              </button>
            </div>
          </div>

          {/* Name + Category + Status */}
          <div className="grid grid-cols-3 gap-3">
            <div className="col-span-1">
              <label className={labelClass}>이름</label>
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

          {/* Version + License */}
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

          {/* Summary */}
          <div>
            <label className={labelClass}>요약</label>
            <input type="text" name="summary" value={form.summary} onChange={handleChange} className={inputClass} />
          </div>

          {/* Description */}
          <div>
            <label className={labelClass}>상세 설명</label>
            <textarea
              name="description"
              value={form.description}
              onChange={handleChange}
              rows={3}
              className={inputClass + " resize-none"}
            />
          </div>

          {/* Tech Stack */}
          <div>
            <label className={labelClass}>기술스택 (쉼표 구분)</label>
            <input
              type="text"
              name="techStack"
              value={form.techStack}
              onChange={handleChange}
              placeholder="React, Node.js, PostgreSQL"
              className={inputClass}
            />
          </div>

          {/* Goals */}
          <div>
            <label className={labelClass}>목표 (줄바꿈 구분)</label>
            <textarea
              name="goals"
              value={form.goals}
              onChange={handleChange}
              rows={3}
              className={inputClass + " resize-none"}
            />
          </div>

          {/* Features */}
          <div>
            <label className={labelClass}>주요 기능 (줄바꿈 구분)</label>
            <textarea
              name="features"
              value={form.features}
              onChange={handleChange}
              rows={3}
              className={inputClass + " resize-none"}
            />
          </div>

          {/* Architecture */}
          <div>
            <label className={labelClass}>아키텍처</label>
            <textarea
              name="architecture"
              value={form.architecture}
              onChange={handleChange}
              rows={3}
              placeholder="프로젝트 아키텍처 설명..."
              className={inputClass + " resize-none"}
            />
          </div>

          {/* Service URL */}
          <div>
            <label className={labelClass}>서비스 URL</label>
            <input
              type="url"
              name="serviceUrl"
              value={form.serviceUrl}
              onChange={handleChange}
              placeholder="https://..."
              className={inputClass}
            />
          </div>

          {/* Tags */}
          <div>
            <label className={labelClass}>태그 (쉼표 구분)</label>
            <input type="text" name="tags" value={form.tags} onChange={handleChange} className={inputClass} />
          </div>

          {/* Screenshot */}
          <div>
            <label className={labelClass}>스크린샷</label>
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleScreenshotUpload}
              accept="image/*"
              className="hidden"
            />

            {/* Tab buttons */}
            {!screenshotUrl && (
              <div className="flex gap-1 mb-3 bg-gray-800/50 rounded-lg p-1">
                <button
                  type="button"
                  onClick={() => { setScreenshotTab("upload"); setUploadError(""); }}
                  className={`flex-1 py-1.5 px-3 rounded-md text-xs font-medium transition-colors ${
                    screenshotTab === "upload"
                      ? "bg-gray-700 text-white"
                      : "text-gray-500 hover:text-gray-300"
                  }`}
                >
                  파일 업로드
                </button>
                <button
                  type="button"
                  onClick={() => { setScreenshotTab("url"); setUploadError(""); }}
                  className={`flex-1 py-1.5 px-3 rounded-md text-xs font-medium transition-colors ${
                    screenshotTab === "url"
                      ? "bg-gray-700 text-white"
                      : "text-gray-500 hover:text-gray-300"
                  }`}
                >
                  구글 드라이브 URL
                </button>
              </div>
            )}

            {/* Error message */}
            {uploadError && (
              <p className="text-xs text-red-400 mb-2">{uploadError}</p>
            )}

            {screenshotUrl ? (
              <div className="relative w-full h-32 rounded-lg overflow-hidden border border-gray-700/50">
                <img src={screenshotUrl} alt="screenshot" className="w-full h-full object-cover" />
                <button
                  type="button"
                  onClick={() => { setScreenshotUrl(""); setUploadError(""); }}
                  className="absolute top-2 right-2 w-6 h-6 flex items-center justify-center rounded-full bg-black/50 text-white/70 hover:text-white"
                >
                  ✕
                </button>
              </div>
            ) : screenshotTab === "url" ? (
              <div className="space-y-2">
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={driveUrlInput}
                    onChange={(e) => setDriveUrlInput(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleDriveUrlSubmit()}
                    placeholder="https://drive.google.com/file/d/..."
                    className={inputClass}
                  />
                  <button
                    type="button"
                    onClick={handleDriveUrlSubmit}
                    disabled={driveUrlLoading || !driveUrlInput.trim()}
                    className="shrink-0 px-3 py-2 rounded-lg bg-gray-800 text-gray-300 text-sm hover:bg-gray-700 hover:text-white transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    {driveUrlLoading ? (
                      <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                      </svg>
                    ) : "변환"}
                  </button>
                </div>
                <p className="text-xs text-gray-600">구글 드라이브 파일 링크를 붙여넣으면 공개 이미지 URL로 변환합니다.</p>
              </div>
            ) : (
              <div className="space-y-2">
                {/* Upload target toggle */}
                <div className="flex gap-1 mb-2">
                  <button
                    type="button"
                    onClick={() => setUploadTarget("blob")}
                    className={`px-2.5 py-1 rounded text-xs transition-colors ${
                      uploadTarget === "blob"
                        ? "bg-gray-700 text-white"
                        : "text-gray-600 hover:text-gray-400"
                    }`}
                  >
                    Vercel Blob
                  </button>
                  <button
                    type="button"
                    onClick={() => setUploadTarget("drive")}
                    className={`px-2.5 py-1 rounded text-xs transition-colors ${
                      uploadTarget === "drive"
                        ? "bg-gray-700 text-white"
                        : "text-gray-600 hover:text-gray-400"
                    }`}
                  >
                    구글 드라이브
                  </button>
                </div>
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
                    <>
                      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.5">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909M3.75 21h16.5A2.25 2.25 0 0022.5 18.75V5.25A2.25 2.25 0 0020.25 3H3.75A2.25 2.25 0 001.5 5.25v13.5A2.25 2.25 0 003.75 21z" />
                      </svg>
                      <span className="text-xs">
                        {uploadTarget === "drive" ? "구글 드라이브에 업로드" : "클릭하여 이미지 업로드"}
                      </span>
                    </>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Buttons */}
          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg bg-gray-800 text-gray-400 text-sm hover:bg-gray-700 hover:text-white transition-colors"
            >
              취소
            </button>
            <button
              type="submit"
              className="px-4 py-2 rounded-lg bg-white text-black text-sm font-medium hover:bg-gray-200 transition-colors"
            >
              {project ? "수정" : "저장"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
