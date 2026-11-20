import React, { useEffect } from 'react';
import { X, LayoutGrid, SlidersHorizontal } from 'lucide-react';

function SidebarContent({
  modules,
  selectedModuleId,
  selectedSectionId,
  onSelectOverview,
  onSelectModule,
  onSelectSection,
  onClose,
  closeOnSelectMobile = false,
}) {
  const isOverviewActive = selectedModuleId === null && selectedSectionId === null;

  const handleOverviewClick = () => {
    onSelectOverview();
    if (closeOnSelectMobile) onClose();
  };

  const handleModuleClick = (moduleId) => {
    onSelectModule(moduleId);
    if (closeOnSelectMobile) onClose();
  };

  const handleSectionClick = (sectionId) => {
    onSelectSection(sectionId);
    if (closeOnSelectMobile) onClose();
  };

  return (
    <div className="w-72 h-full bg-white text-[#3B2923] flex flex-col">
      {/* Sidebar Header */}
      <div className="px-4 py-3 flex items-center justify-between bg-[#F5F0EA] border-b border-[#E4DBD2] shrink-0">
        <div className="flex items-center gap-2 min-w-0">
          <SlidersHorizontal className="w-4 h-4 text-[#9A4324] shrink-0" />
          <div className="min-w-0">
            <h2 className="text-xs font-bold tracking-tight text-[#3B2923] truncate">
              Simulation Content
            </h2>
            <p className="text-[11px] text-[#6B5145] truncate">
              Modules &amp; Interactive Topics
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close simulation menu"
          className="p-1.5 text-[#6B5145] hover:text-[#3B2923] hover:bg-[#EDE4DA] rounded-md transition-colors cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Hierarchical Module & Topic Navigation */}
      <nav
        aria-label="Simulation Modules Navigation"
        className="flex-1 min-h-0 overflow-y-auto p-3 space-y-5"
      >
        {/* Simulation Overview */}
        <button
          type="button"
          onClick={handleOverviewClick}
          className={`w-full text-left flex items-center gap-2.5 px-3 py-2 rounded-lg border text-xs font-semibold transition-colors cursor-pointer ${
            isOverviewActive
              ? 'bg-[#F3E7DF] border-[#C88A72] text-[#9A4324]'
              : 'bg-[#F5F0EA] hover:bg-[#EDE4DA] border-[#E4DBD2] text-[#3B2923]'
          }`}
        >
          <LayoutGrid className="w-4 h-4 shrink-0" />
          <span className="truncate">Simulation Home Page</span>
        </button>

        {/* Module Groups */}
        {modules.map((mod) => {
          const isModulePageActive =
            selectedModuleId === mod.id && selectedSectionId === null;

          return (
            <div key={mod.id} className="space-y-2">
              {/* Clickable Module Heading (navigates to Module Overview page) */}
              <button
                type="button"
                onClick={() => handleModuleClick(mod.id)}
                className={`w-full text-left px-3 py-2 rounded-lg border transition-colors cursor-pointer ${
                  isModulePageActive
                    ? 'bg-[#F3E7DF] border-[#C88A72]'
                    : 'bg-[#F5F0EA] hover:bg-[#EDE4DA] border-[#E4DBD2]'
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <span
                    className={`text-xs font-bold ${
                      isModulePageActive ? 'text-[#9A4324]' : 'text-[#3B2923]'
                    }`}
                  >
                    {mod.label}
                  </span>
                  <span className="text-[11px] font-mono text-[#6B5145] tabular-nums">
                    {mod.sections.length} topics
                  </span>
                </div>
                <p className="text-[11px] text-[#6B5145] leading-snug mt-0.5">
                  {mod.subtitle}
                </p>
              </button>

              {/* Numbered Subsections */}
              <ul className="pl-2 space-y-1">
                {mod.sections.map((section) => {
                  const isSelected = section.id === selectedSectionId;

                  return (
                    <li key={section.id}>
                      <button
                        type="button"
                        onClick={() => handleSectionClick(section.id)}
                        aria-current={isSelected ? 'page' : undefined}
                        className={`w-full text-left flex items-center gap-2.5 px-2.5 py-2 rounded-lg border transition-colors cursor-pointer ${
                          isSelected
                            ? 'bg-[#F3E7DF] border-[#C88A72] text-[#9A4324]'
                            : 'bg-white hover:bg-[#F5F0EA] border-transparent hover:border-[#E4DBD2] text-[#3B2923]'
                        }`}
                      >
                        <span
                          className={`text-[11px] font-mono font-bold px-1.5 py-0.5 rounded shrink-0 tabular-nums transition-colors ${
                            isSelected
                              ? 'bg-[#9A4324] text-white'
                              : 'bg-[#F5F0EA] text-[#6B5145] border border-[#E4DBD2]'
                          }`}
                        >
                          {section.code}
                        </span>
                        <span
                          className={`text-xs leading-snug truncate ${
                            isSelected ? 'font-bold text-[#9A4324]' : 'font-medium text-[#3B2923]'
                          }`}
                        >
                          {section.title}
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            </div>
          );
        })}
      </nav>
    </div>
  );
}

/**
 * Collapsible left sidebar navigation component.
 * Desktop (lg+): sticky push sidebar that collapses smoothly to w-0 so the simulator expands full screen.
 * Mobile (< lg): slide-over left drawer with backdrop overlay and Escape key support.
 */
export default function TaskNavigation({
  isOpen,
  onClose,
  modules,
  selectedModuleId,
  selectedSectionId,
  onSelectOverview,
  onSelectModule,
  onSelectSection,
}) {
  useEffect(() => {
    function handleKeyDown(e) {
      if (e.key === 'Escape' && isOpen && typeof window !== 'undefined' && window.innerWidth < 1024) {
        onClose();
      }
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  return (
    <>
      {/* Desktop Sticky Collapsible Left Sidebar */}
      <aside
        aria-label="Simulation Navigation Sidebar"
        aria-hidden={!isOpen}
        className={`hidden lg:block shrink-0 sticky top-14 h-[calc(100vh-3.5rem)] bg-white overflow-hidden transition-[width,opacity] duration-300 ease-in-out ${
          isOpen
            ? 'w-72 opacity-100 border-r border-[#E4DBD2]'
            : 'w-0 opacity-0 border-r-0 pointer-events-none'
        }`}
      >
        <SidebarContent
          modules={modules}
          selectedModuleId={selectedModuleId}
          selectedSectionId={selectedSectionId}
          onSelectOverview={onSelectOverview}
          onSelectModule={onSelectModule}
          onSelectSection={onSelectSection}
          onClose={onClose}
          closeOnSelectMobile={false}
        />
      </aside>

      {/* Mobile Slide-Over Drawer */}
      <div
        className={`fixed inset-0 z-50 lg:hidden transition-opacity duration-300 ease-in-out ${
          isOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        }`}
        aria-hidden={!isOpen}
      >
        <div
          className="fixed inset-0 bg-[#3B2923]/30 backdrop-blur-[2px]"
          onClick={onClose}
          aria-hidden="true"
        />

        <aside
          role="dialog"
          aria-modal="true"
          aria-label="Simulation Navigation Sidebar"
          className={`fixed top-0 bottom-0 left-0 w-72 max-w-[85vw] bg-white border-r border-[#E4DBD2] shadow-lg transform transition-transform duration-300 ease-in-out ${
            isOpen ? 'translate-x-0' : '-translate-x-full'
          }`}
        >
          <SidebarContent
            modules={modules}
            selectedModuleId={selectedModuleId}
            selectedSectionId={selectedSectionId}
            onSelectOverview={onSelectOverview}
            onSelectModule={onSelectModule}
            onSelectSection={onSelectSection}
            onClose={onClose}
            closeOnSelectMobile={true}
          />
        </aside>
      </div>
    </>
  );
}
