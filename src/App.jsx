import { useState, useEffect, useCallback } from "react";
import { fetchProjects, createProject, updateProject, deleteProject, categories, getToken, setToken, clearToken } from "./data/projects";
import useDebounce from "./hooks/useDebounce";
import ProjectCard from "./components/ProjectCard";
import ProjectModal from "./components/ProjectModal";
import ProjectForm from "./components/ProjectForm";
import LoginModal from "./components/LoginModal";
import Toast from "./components/Toast";

const statusFilters = [
  { key: "all", label: "전체 상태" },
  { key: "active", label: "Active" },
  { key: "development", label: "Dev" },
  { key: "archived", label: "Archived" },
];

export default function App() {
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search, 300);
  const [activeCategory, setActiveCategory] = useState("all");
  const [activeStatus, setActiveStatus] = useState("all");
  const [selectedProject, setSelectedProject] = useState(null);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [editingProject, setEditingProject] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [allProjects, setAllProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [toasts, setToasts] = useState([]);
  const [isAdmin, setIsAdmin] = useState(!!getToken());
  const [showLogin, setShowLogin] = useState(window.location.hash === "#admin" && !getToken());

  const addToast = useCallback((message, type = "error") => {
    const id = Date.now();
    setToasts((prev) => [...prev, { id, message, type }]);
  }, []);

  const removeToast = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  // 프로젝트 목록 로드
  const loadProjects = useCallback(async () => {
    setLoading(true);
    try {
      const params = {};
      if (activeCategory !== "all") params.category = activeCategory;
      if (activeStatus !== "all") params.status = activeStatus;
      if (debouncedSearch.trim()) params.q = debouncedSearch.trim();
      const data = await fetchProjects(params);
      setAllProjects(data);
    } catch (err) {
      addToast("프로젝트를 불러오지 못했습니다.");
    } finally {
      setLoading(false);
    }
  }, [activeCategory, activeStatus, debouncedSearch, addToast]);

  useEffect(() => {
    loadProjects();
  }, [loadProjects]);

  // #admin 해시 접근 시 로그인 모달 오픈
  useEffect(() => {
    const handleHash = () => {
      if (window.location.hash === "#admin" && !getToken()) {
        setShowLogin(true);
      }
    };
    window.addEventListener("hashchange", handleHash);
    return () => window.removeEventListener("hashchange", handleHash);
  }, []);

  // Esc 키 처리
  useEffect(() => {
    const handleEsc = (e) => {
      if (e.key === "Escape") {
        if (selectedProject) setSelectedProject(null);
        else if (editingProject) setEditingProject(null);
        else if (showForm) setShowForm(false);
      }
    };
    document.addEventListener("keydown", handleEsc);
    return () => document.removeEventListener("keydown", handleEsc);
  }, [selectedProject, editingProject, showForm]);

  const handleCardClick = (project, index) => {
    setSelectedProject(project);
    setSelectedIndex(index);
  };

  const handleSaveProject = async (formData) => {
    try {
      if (formData.id) {
        // 수정 모드
        const { id, ...updateData } = formData;
        const updated = await updateProject(id, updateData);
        setAllProjects((prev) => prev.map((p) => (p.id === id ? { ...p, ...updated } : p)));
        setEditingProject(null);
        addToast("프로젝트가 수정되었습니다.", "success");
      } else {
        // 추가 모드
        const newProject = await createProject(formData);
        setAllProjects((prev) => [newProject, ...prev]);
        setShowForm(false);
        addToast("프로젝트가 추가되었습니다.", "success");
      }
    } catch (err) {
      addToast(formData.id ? "프로젝트 수정에 실패했습니다." : "프로젝트 추가에 실패했습니다.");
    }
  };

  const handleDeleteProject = async (id) => {
    if (!confirm("정말 삭제하시겠습니까?")) return;
    try {
      await deleteProject(id);
      setAllProjects((prev) => prev.filter((p) => p.id !== id));
      setSelectedProject(null);
      addToast("프로젝트가 삭제되었습니다.", "success");
    } catch (err) {
      addToast("삭제에 실패했습니다.");
    }
  };

  const handleEditProject = () => {
    setEditingProject(selectedProject);
    setSelectedProject(null);
  };

  const isFiltered = activeCategory !== "all" || activeStatus !== "all" || debouncedSearch.trim();

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      {/* Toast */}
      <Toast toasts={toasts} onRemove={removeToast} />

      {/* Header */}
      <header className="sticky top-0 z-40 bg-gray-950/80 backdrop-blur-xl border-b border-gray-800/50">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
              <span className="text-xs font-bold text-white">dw</span>
            </div>
            <h1 className="text-lg font-bold tracking-tight">dwHavi Dashboard</h1>
          </div>
          <div className="flex items-center gap-2">
            {isAdmin ? (
              <>
                <button
                  onClick={() => setShowForm(true)}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg bg-white text-black text-sm font-medium hover:bg-gray-200 transition-colors"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                  </svg>
                  프로젝트 추가
                </button>
                <button
                  onClick={() => { clearToken(); setIsAdmin(false); window.location.hash = ""; }}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-gray-800 text-gray-400 text-sm hover:bg-gray-700 hover:text-white transition-colors"
                  title="로그아웃"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15m3 0l3-3m0 0l-3-3m3 3H9" />
                  </svg>
                </button>
              </>
            ) : null}
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-6 space-y-5">
        {/* Search */}
        <div className="relative">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
          </svg>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="프로젝트 검색..."
            className="w-full bg-gray-800/50 border border-gray-700/50 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-gray-500/50 transition-colors"
          />
        </div>

        {/* Filter row: Categories + Status */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
          {/* Category Tabs */}
          <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
            {categories.map((cat) => (
              <button
                key={cat.key}
                onClick={() => setActiveCategory(cat.key)}
                className={`shrink-0 px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
                  activeCategory === cat.key
                    ? "bg-white text-black"
                    : "bg-gray-800 text-gray-400 hover:bg-gray-700 hover:text-gray-300"
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>

          {/* Status Filter */}
          <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide sm:ml-auto">
            {statusFilters.map((s) => (
              <button
                key={s.key}
                onClick={() => setActiveStatus(s.key)}
                className={`shrink-0 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors border ${
                  activeStatus === s.key
                    ? "bg-gray-700 text-white border-gray-600"
                    : "bg-transparent text-gray-500 border-gray-800 hover:text-gray-300 hover:border-gray-700"
                }`}
              >
                {s.label}
              </button>
            ))}
          </div>
        </div>

        {/* Project count */}
        {!loading && (
          <p className="text-xs text-gray-600">
            {allProjects.length}개 프로젝트
            {isFiltered && (
              <button
                onClick={() => { setActiveCategory("all"); setActiveStatus("all"); setSearch(""); }}
                className="ml-2 text-gray-400 hover:text-white transition-colors"
              >
                필터 초기화
              </button>
            )}
          </p>
        )}

        {/* Loading State */}
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="bg-gray-800/30 border border-gray-700/30 rounded-xl overflow-hidden animate-pulse">
                <div className="w-full aspect-video bg-gray-800/50" />
                <div className="p-4 space-y-3">
                  <div className="h-5 bg-gray-800/50 rounded w-2/3" />
                  <div className="h-4 bg-gray-800/50 rounded w-full" />
                  <div className="h-4 bg-gray-800/50 rounded w-4/5" />
                  <div className="flex gap-2">
                    <div className="h-5 bg-gray-800/50 rounded w-16" />
                    <div className="h-5 bg-gray-800/50 rounded w-20" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : allProjects.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {allProjects.map((project, i) => (
              <ProjectCard key={project.id} project={project} index={i} onClick={handleCardClick} />
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-24 text-gray-600">
            {isFiltered ? (
              <>
                <svg className="w-12 h-12 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
                </svg>
                <p className="text-sm mb-1">검색 결과가 없습니다</p>
                <button
                  onClick={() => { setActiveCategory("all"); setActiveStatus("all"); setSearch(""); }}
                  className="text-xs text-gray-400 hover:text-white transition-colors mt-2"
                >
                  필터 초기화
                </button>
              </>
            ) : (
              <>
                <svg className="w-12 h-12 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                </svg>
                <p className="text-sm mb-1">아직 등록된 프로젝트가 없습니다</p>
              </>
            )}
          </div>
        )}
      </main>

      {/* Modals */}
      {showLogin && (
        <LoginModal
          onClose={() => { setShowLogin(false); window.location.hash = ""; }}
          onLogin={(token) => {
            setToken(token);
            setIsAdmin(true);
            setShowLogin(false);
            addToast("관리자로 로그인되었습니다.", "success");
          }}
        />
      )}
      {selectedProject && (
        <ProjectModal
          project={selectedProject}
          index={selectedIndex}
          onClose={() => setSelectedProject(null)}
          onDelete={() => handleDeleteProject(selectedProject.id)}
          onEdit={handleEditProject}
          isAdmin={isAdmin}
        />
      )}
      {showForm && (
        <ProjectForm onClose={() => setShowForm(false)} onSave={handleSaveProject} />
      )}
      {editingProject && (
        <ProjectForm
          project={editingProject}
          onClose={() => setEditingProject(null)}
          onSave={handleSaveProject}
        />
      )}
    </div>
  );
}
