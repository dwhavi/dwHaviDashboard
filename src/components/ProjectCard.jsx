export default function ProjectCard({ project, index, onClick }) {
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

  const status = statusConfig[project.status];
  const gradient = gradients[index % gradients.length];
  const initials = project.name.slice(0, 2).toUpperCase();
  const maxTech = 4;
  const visibleTech = project.techStack.slice(0, maxTech);
  const remainingTech = project.techStack.length - maxTech;

  return (
    <button
      onClick={() => onClick(project, index)}
      className="group w-full text-left bg-gray-800/50 border border-gray-700/50 rounded-xl overflow-hidden hover:border-gray-500/50 hover:shadow-lg hover:shadow-black/20 hover:scale-[1.02] transition-all duration-300 cursor-pointer"
    >
      {/* Screenshot area */}
      <div className={`relative w-full aspect-video bg-gradient-to-br ${gradient} flex items-center justify-center`}>
        {project.screenshot ? (
          <img src={project.screenshot} alt={project.name} className="w-full h-full object-cover" />
        ) : (
          <span className="text-4xl font-bold text-white/30 tracking-wider">{initials}</span>
        )}
        <div className="absolute top-3 right-3">
          <span className={`text-[11px] font-medium px-2 py-0.5 rounded-full border ${status.className}`}>
            {status.label}
          </span>
        </div>
      </div>

      {/* Content */}
      <div className="p-4 space-y-3">
        <div className="flex items-start justify-between gap-2">
          <h3 className="text-white font-semibold text-base leading-tight group-hover:text-white/90">
            {project.name}
          </h3>
          <span className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-gray-700/50 text-gray-400 whitespace-nowrap">
            {categoryMap[project.category]}
          </span>
        </div>

        <p className="text-gray-400 text-sm leading-relaxed line-clamp-2">
          {project.summary}
        </p>

        {/* Tech stack */}
        <div className="flex flex-wrap gap-1.5">
          {visibleTech.map((tech) => (
            <span
              key={tech}
              className="text-[11px] px-2 py-0.5 rounded-md bg-gray-700/50 text-gray-300"
            >
              {tech}
            </span>
          ))}
          {remainingTech > 0 && (
            <span className="text-[11px] px-2 py-0.5 rounded-md bg-gray-700/50 text-gray-500">
              +{remainingTech}
            </span>
          )}
        </div>

        {/* Footer links */}
        <div className="flex items-center gap-3 pt-1">
          <a
            href={project.githubUrl}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="text-gray-500 hover:text-white transition-colors"
          >
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z" />
            </svg>
          </a>
          {project.serviceUrl && (
            <a
              href={project.serviceUrl}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="text-gray-500 hover:text-white transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 6H5.25A2.25 2.25 0 003 8.25v10.5A2.25 2.25 0 005.25 21h10.5A2.25 2.25 0 0018 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25" />
              </svg>
            </a>
          )}
        </div>
      </div>
    </button>
  );
}
