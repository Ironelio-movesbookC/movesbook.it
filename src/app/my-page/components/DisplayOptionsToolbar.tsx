import { Eye, EyeOff } from 'lucide-react';

interface DisplayOptionsToolbarProps {
  showAdBanner: boolean;
  showPersonalBanner: boolean;
  showLeftSidebar: boolean;
  showRightSidebar: boolean;
  onToggleAdBanner: (value: boolean) => void;
  onTogglePersonalBanner: (value: boolean) => void;
  onToggleLeftSidebar: (value: boolean) => void;
  onToggleRightSidebar: (value: boolean) => void;
}

/** Display toggles — toolbar bar is always visible so options never disappear from the page. */
export default function DisplayOptionsToolbar({
  showAdBanner,
  showPersonalBanner,
  showLeftSidebar,
  showRightSidebar,
  onToggleAdBanner,
  onTogglePersonalBanner,
  onToggleLeftSidebar,
  onToggleRightSidebar,
}: DisplayOptionsToolbarProps) {
  return (
    <div className="bg-white border-b px-4 py-1 shrink-0">
      <div className="flex items-center gap-4 overflow-x-auto">
        <label className="flex items-center gap-2 text-sm cursor-pointer whitespace-nowrap">
          <input
            type="checkbox"
            checked={showAdBanner}
            onChange={(e) => onToggleAdBanner(e.target.checked)}
            className="w-4 h-4"
          />
          <span className="flex items-center gap-1">
            {showAdBanner ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
            Advertising Banner
          </span>
        </label>
        <label className="flex items-center gap-2 text-sm cursor-pointer whitespace-nowrap">
          <input
            type="checkbox"
            checked={showPersonalBanner}
            onChange={(e) => onTogglePersonalBanner(e.target.checked)}
            className="w-4 h-4"
          />
          <span className="flex items-center gap-1">
            {showPersonalBanner ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
            Personal Banner & Picture
          </span>
        </label>
        <label className="flex items-center gap-2 text-sm cursor-pointer whitespace-nowrap">
          <input
            type="checkbox"
            checked={showLeftSidebar}
            onChange={(e) => onToggleLeftSidebar(e.target.checked)}
            className="w-4 h-4"
          />
          <span className="flex items-center gap-1">
            {showLeftSidebar ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
            Left Sidebar
          </span>
        </label>
        <label className="flex items-center gap-2 text-sm cursor-pointer whitespace-nowrap">
          <input
            type="checkbox"
            checked={showRightSidebar}
            onChange={(e) => onToggleRightSidebar(e.target.checked)}
            className="w-4 h-4"
          />
          <span className="flex items-center gap-1">
            {showRightSidebar ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
            Right Sidebar
          </span>
        </label>
      </div>
    </div>
  );
}
