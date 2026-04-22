import { useEffect } from "react";

export default function ProjectModal({ project, index, onClose, onDelete, onEdit, isAdmin }) {
  const gradients = [
    "from-indigo-500 to-purple-600",
    "from-emerald-500 to-teal-600",
    "from-rose-500 to-pink-600",
    "from-amber-500 to-orange-600",
    "from-blue-500 to-cyan-600",
    "from-violet-500 to-fuchsia-600",
    "from-indigo-500 to-blue-600",
    "from-rose-500 to-orange-600",
  ];

  const categoryMap = {
    web: "Web App",
    mobile: "Mobile",
    ai: "AI/ML",
    devops: "DevOps",
    tool: "Tools",
  };

  const statusConfig = {
    active: { label: "Active", className: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30" },
    development: { label: "Development", className: "bg-amber-500/20 text-amber-400 border-amber-500/30" },
    archived: { label: "Archived", className: "bg-gray-500/20 text-gray-400 border-gray-500/30" },
  };

  const gradient = gradients[index % gradients.length];
  const initials = project?.name?.slice(0, 2).toUpperCase() || "";
  const status = project ? statusConfig[project.status] : null;

  useEffect(() => {
    const handleEsc = (e) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handleEsc);
    return () => document.removeEventListener("keydown", handleEsc);
  }, [onClose]);

  if (!project) return null;

  const formatDate = (dateStr) => {
    if (!dateStr) return "-";
    return new Date(dateStr).toLocaleDateString("ko-KR", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  const SectionTitle = ({ children }) => (
    <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">{children}</h3>
  );

  const InfoRow = ({ label, value }) => (
    <div className="flex items-center gap-3 text-sm">
      <span className="text-gray-600 shrink-0 w-24">{label}</span>
      <span className="text-gray-300">{value || "-"}</span>
    </div>
  );

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-[fadeIn_0.2s_ease-out]"
      onClick={onClose}
    >
      <div
        className="w-full max-w-3xl max-h-[90vh] overflow-y-auto bg-gray-900 border border-gray-700/50 rounded-2xl shadow-2xl animate-[slideUp_0.25s_ease-out]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Screenshot */}
        <div className={`relative w-full aspect-video bg-gradient-to-br ${gradient} flex items-center justify-center rounded-t-2xl`}>
          {project.screenshot ? (
            <img src={project.screenshot} alt={project.name} className="w-full h-full object-cover rounded-t-2xl" />
          ) : (
            <span className="text-6xl font-bold text-white/20 tracking-widest">{initials}</span>
          )}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center rounded-full bg-black/30 text-white/70 hover:text-white hover:bg-black/50 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Header - Name + Badges */}
          <div className="flex items-center gap-3 flex-wrap">
            <h2 className="text-2xl font-bold text-white">{project.name}</h2>
            <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-gray-700/50 text-gray-300">
              {categoryMap[project.category]}
            </span>
            <span className={`text-xs font-medium px-2.5 py-1 rounded-full border ${status.className}`}>
              {status.label}
            </span>
            {project.version && (
              <span className="text-xs font-mono px-2.5 py-1 rounded-full bg-blue-500/15 text-blue-400 border border-blue-500/20">
                v{project.version}
              </span>
            )}
          </div>

          {/* Meta Info Grid */}
          <div className="grid grid-cols-2 gap-x-6 gap-y-2 p-4 bg-gray-800/30 rounded-xl border border-gray-800/50">
            <InfoRow label="생성일" value={formatDate(project.createdAt)} />
            <InfoRow label="최근 업데이트" value={formatDate(project.updatedAt)} />
            <InfoRow label="버전" value={project.version ? `v${project.version}` : "-"} />
            <InfoRow label="라이선스" value={project.license || "-"} />
          </div>

          {/* Summary */}
          <div>
            <SectionTitle>요약</SectionTitle>
            <p className="text-gray-300 text-sm leading-relaxed">{project.summary}</p>
          </div>

          {/* Description */}
          <div>
            <SectionTitle>상세 설명</SectionTitle>
            <p className="text-gray-400 text-sm leading-relaxed">{project.description}</p>
          </div>

          {/* Architecture */}
          {project.architecture && (
            <div>
              <SectionTitle>아키텍처</SectionTitle>
              <p className="text-gray-400 text-sm leading-relaxed bg-gray-800/30 p-4 rounded-xl border border-gray-800/50">
                {project.architecture}
              </p>
            </div>
          )}

          {/* Tech Stack */}
          {project.techStack && project.techStack.length > 0 && (
          <div>
            <SectionTitle>Tech Stack</SectionTitle>
            <div className="flex flex-wrap gap-2">
              {project.techStack.map((tech) => (
                <span key={tech} className="text-xs px-2.5 py-1 rounded-md bg-gray-800 text-gray-300 border border-gray-700/50">
                  {tech}
                </span>
              ))}
            </div>
          </div>
          )}

          {/* Two column: Goals + Features */}
          {(project.goals?.length > 0 || project.features?.length > 0) && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            {project.goals && project.goals.length > 0 && (
            <div>
              <SectionTitle>목표</SectionTitle>
              <ul className="space-y-1.5">
                {project.goals.map((goal) => (
                  <li key={goal} className="flex items-start gap-2 text-sm text-gray-400">
                    <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
                    {goal}
                  </li>
                ))}
              </ul>
            </div>
            )}
            {project.features && project.features.length > 0 && (
            <div>
              <SectionTitle>주요 기능</SectionTitle>
              <ul className="space-y-1.5">
                {project.features.map((feature) => (
                  <li key={feature} className="flex items-start gap-2 text-sm text-gray-400">
                    <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-blue-500 shrink-0" />
                    {feature}
                  </li>
                ))}
              </ul>
            </div>
            )}
          </div>
          )}

          {/* Tags */}
          {project.tags && project.tags.length > 0 && (
            <div>
              <SectionTitle>Tags</SectionTitle>
              <div className="flex flex-wrap gap-1.5">
                {project.tags.map((tag) => (
                  <span key={tag} className="text-xs px-2 py-0.5 rounded-full bg-gray-800/50 text-gray-500">
                    #{tag}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Links */}
          <div className="flex items-center gap-3 pt-2 border-t border-gray-800">
            <a
              href={project.githubUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-gray-800 text-gray-300 hover:bg-gray-700 hover:text-white transition-colors text-sm"
            >
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z" />
              </svg>
              GitHub
            </a>
            {project.serviceUrl && (
              <a
                href={project.serviceUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-white text-black hover:bg-gray-200 transition-colors text-sm font-medium"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 6H5.25A2.25 2.25 0 003 8.25v10.5A2.25 2.25 0 005.25 21h10.5A2.25 2.25 0 0018 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25" />
                </svg>
                Visit Site
              </a>
            )}
          </div>

          {/* Action buttons */}
          {isAdmin && (
          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              onClick={() => onEdit?.()}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-gray-800 text-gray-300 hover:bg-gray-700 hover:text-white transition-colors text-sm"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" />
              </svg>
              수정
            </button>
            <button
              onClick={() => onDelete?.()}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-red-500/10 text-red-400 border border-red-500/20 hover:bg-red-500/20 transition-colors text-sm"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
              </svg>
              삭제
            </button>
          </div>
          )}
        </div>
      </div>
    </div>
  );
}
