import { isValidUrl } from '../utils/validators';

const MAX_LINKS = 10;

export default function LinkEditor({ links, onChange }) {
  const update = (idx, patch) => {
    onChange(links.map((l, i) => (i === idx ? { ...l, ...patch } : l)));
  };

  const remove = (idx) => {
    onChange(links.filter((_, i) => i !== idx));
  };

  const add = () => {
    if (links.length >= MAX_LINKS) return;
    onChange([...links, { label: '', url: '' }]);
  };

  const inputClass =
    "bg-gray-800/50 border border-gray-700/50 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-gray-500/50 transition-colors";

  return (
    <div className="space-y-2">
      {links.map((link, idx) => {
        const bad = link.url.trim() !== '' && !isValidUrl(link.url.trim());
        return (
          <div key={idx} className="flex gap-2 items-start">
            <input
              type="text"
              value={link.label}
              onChange={(e) => update(idx, { label: e.target.value })}
              placeholder="라벨 (예: Live, Demo)"
              maxLength={30}
              className={`${inputClass} w-28 shrink-0`}
            />
            <div className="flex-1">
              <input
                type="url"
                value={link.url}
                onChange={(e) => update(idx, { url: e.target.value })}
                placeholder="https://..."
                className={`${inputClass} w-full ${bad ? 'border-red-500/60' : ''}`}
              />
              {bad && <p className="text-xs text-red-400 mt-1">http(s):// URL을 입력해주세요.</p>}
            </div>
            <button
              type="button"
              onClick={() => remove(idx)}
              className="shrink-0 w-9 h-9 flex items-center justify-center rounded-lg bg-gray-800 text-gray-400 hover:text-red-400 hover:bg-gray-700 transition-colors"
              title="링크 제거"
            >
              ✕
            </button>
          </div>
        );
      })}
      {links.length < MAX_LINKS ? (
        <button
          type="button"
          onClick={add}
          className="w-full py-2 rounded-lg border border-dashed border-gray-700/60 text-gray-500 text-sm hover:border-gray-500/60 hover:text-gray-300 transition-colors"
        >
          + 링크 추가 ({links.length}/{MAX_LINKS})
        </button>
      ) : (
        <p className="text-xs text-gray-600">최대 {MAX_LINKS}개까지 추가할 수 있습니다.</p>
      )}
    </div>
  );
}
