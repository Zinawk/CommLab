import React from 'react';
import {
  ChevronLeft,
  ChevronRight,
  LayoutGrid,
  Menu,
  PanelLeftClose,
} from 'lucide-react';

/**
 * Top navigation header for Signals and Systems Simulator.
 * Displays sidebar toggle, brand wordmark, active module/section breadcrumb,
 * and overview/previous/next navigation actions.
 */
export default function Header({
  isSidebarOpen,
  onToggleSidebar,
  currentSection,
  activeModule,
  isOverview,
  isModuleOverview,
  onHome,
  onSelectModule,
  onPrev,
  onNext,
  canPrev,
  canNext,
}) {
  return (
    <header className="w-full bg-white border-b border-[#E4DBD2] sticky top-0 z-30">
      <div className="w-full px-4 sm:px-6 h-14 flex items-center justify-between gap-3 sm:gap-6">
        {/* Left Zone: Sidebar Menu Toggle + Brand Wordmark + Active Breadcrumb */}
        <div className="flex items-center gap-3 min-w-0">
          <button
            type="button"
            onClick={onToggleSidebar}
            aria-label={isSidebarOpen ? 'Collapse simulation menu' : 'Open simulation menu'}
            aria-expanded={isSidebarOpen}
            className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
              isSidebarOpen
                ? 'bg-[#F5F0EA] hover:bg-[#EDE4DA] text-[#3B2923] border border-[#E4DBD2]'
                : 'bg-[#9A4324] hover:bg-[#7D341A] text-white border border-transparent'
            }`}
          >
            {isSidebarOpen ? (
              <PanelLeftClose className="w-4 h-4 shrink-0" />
            ) : (
              <Menu className="w-4 h-4 shrink-0" />
            )}
            <span className="hidden sm:inline">
              {isSidebarOpen ? 'Hide Menu' : 'Modules'}
            </span>
          </button>

          <button
            type="button"
            onClick={onHome}
            className="text-left min-w-0 cursor-pointer group focus:outline-none"
          >
            <span className="block text-sm sm:text-base font-bold tracking-tight text-[#3B2923] group-hover:text-[#9A4324] transition-colors truncate whitespace-nowrap">
              Signals and Systems Simulator
            </span>
          </button>

          {isModuleOverview && activeModule && (
            <span className="hidden md:inline-block text-xs text-[#6B5145] border-l border-[#E4DBD2] pl-3 truncate">
              {activeModule.label} – {activeModule.subtitle}
            </span>
          )}

          {currentSection && (
            <span className="hidden md:inline-flex items-center gap-1.5 text-xs text-[#6B5145] border-l border-[#E4DBD2] pl-3 truncate">
              <button
                type="button"
                onClick={() => onSelectModule(currentSection.moduleId)}
                className="hover:text-[#9A4324] hover:underline font-medium transition-colors cursor-pointer shrink-0"
              >
                {currentSection.moduleLabel}
              </button>
              <span aria-hidden="true">·</span>
              <span className="truncate">
                {currentSection.code} {currentSection.title}
              </span>
            </span>
          )}
        </div>

        {/* Right Zone: Simulation Overview + Previous/Next Topic Navigation */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={onHome}
            className={`hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
              isOverview
                ? 'bg-[#F3E7DF] text-[#9A4324] border border-[#C88A72]'
                : 'text-[#6B5145] hover:text-[#3B2923] hover:bg-[#F5F0EA] border border-transparent'
            }`}
          >
            <LayoutGrid className="w-3.5 h-3.5" />
            <span>Simulation Home Page</span>
          </button>

          {currentSection && (
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                disabled={!canPrev}
                onClick={onPrev}
                className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold rounded-lg bg-[#F5F0EA] hover:bg-[#EDE4DA] border border-[#E4DBD2] disabled:opacity-40 disabled:cursor-not-allowed text-[#3B2923] transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                aria-label="Previous topic"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Previous</span>
              </button>

              <button
                type="button"
                disabled={!canNext}
                onClick={onNext}
                className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold rounded-lg bg-[#F5F0EA] hover:bg-[#EDE4DA] border border-[#E4DBD2] disabled:opacity-40 disabled:cursor-not-allowed text-[#3B2923] transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                aria-label="Next topic"
              >
                <span className="hidden sm:inline">Next</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
