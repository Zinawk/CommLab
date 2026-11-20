import React, { useState } from 'react';
import {
  Radio,
  Cpu,
  Binary,
  Waves,
  SlidersHorizontal,
  Sigma,
  Activity,
  Network,
  Volume2,
  AudioWaveform,
} from 'lucide-react';

import Header from './components/Header.jsx';
import TaskNavigation from './components/TaskNavigation.jsx';
import LandingOverview from './components/LandingOverview.jsx';
import ModuleOverview from './components/ModuleOverview.jsx';

import Student1Simulation from './modules/Student1/Simulation.jsx';
import Student2Simulation from './modules/Student2/Simulation.jsx';
import Student3Simulation from './modules/Student3/Simulation.jsx';
import Student4Simulation from './modules/Student4/Simulation.jsx';
import Student5Simulation from './modules/Student5/Simulation.jsx';
import Student6Simulation from './modules/Student6/Simulation.jsx';
import Student7Simulation from './modules/Student7/Simulation.jsx';
import Student8Simulation from './modules/Student8/Simulation.jsx';

const MODULES = [
  {
    id: 1,
    label: 'Module 1',
    subtitle: 'Signals, Systems and Stochastic Foundations',
    description:
      'Build intuition for how signals are represented in time and frequency, how linear systems transform inputs through Fourier concepts and convolution, and how random processes behave statistically.',
    sections: [
      {
        id: '1.1',
        code: '1.1',
        moduleId: 1,
        moduleLabel: 'Module 1',
        title: 'Fourier Analysis & Synthesis',
        summary:
          'Synthesize periodic waveforms from harmonics and inspect discrete magnitude and phase spectra.',
        icon: Radio,
        component: Student1Simulation,
        sectionProps: {},
      },
      {
        id: '1.2',
        code: '1.2',
        moduleId: 1,
        moduleLabel: 'Module 1',
        title: "Euler's Formula & Phasors",
        summary:
          'Explore the 3D complex exponential helix, rotating Argand vectors, and time projections.',
        icon: Cpu,
        component: Student2Simulation,
        sectionProps: {},
      },
      {
        id: '1.3',
        code: '1.3',
        moduleId: 1,
        moduleLabel: 'Module 1',
        title: 'System Analysis & Properties',
        summary:
          'Test linearity, time invariance, causality, stability, and impulse convolution step by step.',
        icon: Binary,
        component: Student3Simulation,
        sectionProps: {},
      },
      {
        id: '1.4',
        code: '1.4',
        moduleId: 1,
        moduleLabel: 'Module 1',
        title: 'Continuous-Time Convolution',
        summary:
          'Animate flip-and-shift integration y(t) = x(t) * h(t) with interactive shift scrubbers.',
        icon: Waves,
        component: Student4Simulation,
        sectionProps: {},
      },
      {
        id: '1.5',
        code: '1.5',
        moduleId: 1,
        moduleLabel: 'Module 1',
        title: 'DSB-SC Modulation',
        summary:
          'Compare suppressed-carrier waveforms, passband spectra, and coherent voice recovery.',
        icon: SlidersHorizontal,
        component: Student5Simulation,
        sectionProps: { section: 'dsb' },
      },
      {
        id: '1.6',
        code: '1.6',
        moduleId: 1,
        moduleLabel: 'Module 1',
        title: 'SSS vs WSS Stationarity',
        summary:
          'Contrast strict-sense, wide-sense, and non-stationary ensembles via slice PDFs and correlation.',
        icon: Sigma,
        component: Student5Simulation,
        sectionProps: { section: 'stationary' },
      },
      {
        id: '1.7',
        code: '1.7',
        moduleId: 1,
        moduleLabel: 'Module 1',
        title: 'Autocorrelation & Power Spectral Density',
        summary:
          'Compute lag-domain autocorrelation R(τ) and Wiener-Khinchin Power Spectral Density S(f).',
        icon: Activity,
        component: Student6Simulation,
        sectionProps: {},
      },
      {
        id: '1.8',
        code: '1.8',
        moduleId: 1,
        moduleLabel: 'Module 1',
        title: 'Random Signal & Noise',
        summary:
          'Analyze white Gaussian noise, low-pass filtered processes, empirical PDF/CDF, and SNR.',
        icon: Network,
        component: Student7Simulation,
        sectionProps: { section: 'random' },
      },
    ],
  },
  {
    id: 2,
    label: 'Module 2',
    subtitle: 'Analog Modulation',
    description:
      'See how baseband information signals modulate high-frequency carrier waves for communication, comparing full-carrier envelope transmission against bandwidth-efficient single-sideband schemes.',
    sections: [
      {
        id: '2.1',
        code: '2.1',
        moduleId: 2,
        moduleLabel: 'Module 2',
        title: 'Conventional AM',
        summary:
          'Adjust modulation index μ, inspect overmodulation distortion, and simulate diode-RC envelope detection across carrier and message frequencies.',
        icon: Volume2,
        component: Student8Simulation,
        sectionProps: {},
      },
      {
        id: '2.2',
        code: '2.2',
        moduleId: 2,
        moduleLabel: 'Module 2',
        title: 'SSB',
        summary:
          'Generate upper and lower single-sideband signals using the Hilbert transform and evaluate synchronous coherent demodulation.',
        icon: AudioWaveform,
        component: Student7Simulation,
        sectionProps: { section: 'ssb' },
      },
    ],
  },
];

const ALL_SECTIONS = MODULES.flatMap((mod) => mod.sections);

export default function App() {
  const [selectedModuleId, setSelectedModuleId] = useState(null);
  const [selectedSectionId, setSelectedSectionId] = useState(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(() =>
    typeof window !== 'undefined' ? window.innerWidth >= 1024 : true
  );
  const [customSectionTitle, setCustomSectionTitle] = useState(null);

  const isLandingOverview = selectedModuleId === null && selectedSectionId === null;
  const isModuleOverview = selectedModuleId !== null && selectedSectionId === null;
  const activeModule = MODULES.find((m) => m.id === selectedModuleId) || null;

  const currentIndex = ALL_SECTIONS.findIndex((s) => s.id === selectedSectionId);
  const currentSection = currentIndex >= 0 ? ALL_SECTIONS[currentIndex] : null;
  const displaySection = currentSection
    ? {
        ...currentSection,
        title:
          currentSection.id === '1.7' && customSectionTitle
            ? customSectionTitle
            : currentSection.title,
      }
    : null;
  const CurrentModuleComponent = currentSection ? currentSection.component : null;

  const canPrev = currentSection !== null && currentIndex > 0;
  const canNext = currentSection !== null && currentIndex < ALL_SECTIONS.length - 1;

  const scrollToTop = () => {
    if (typeof window !== 'undefined') {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handleGoHome = () => {
    setSelectedModuleId(null);
    setSelectedSectionId(null);
    setCustomSectionTitle(null);
    scrollToTop();
  };

  const handleSelectModule = (moduleId) => {
    setSelectedModuleId(moduleId);
    setSelectedSectionId(null);
    setCustomSectionTitle(null);
    scrollToTop();
  };

  const handleSelectSection = (id) => {
    if (id === null) {
      handleGoHome();
      return;
    }
    const found = ALL_SECTIONS.find((s) => s.id === id);
    setSelectedModuleId(found ? found.moduleId : null);
    setSelectedSectionId(id);
    setCustomSectionTitle(null);
    scrollToTop();
  };

  const handlePrev = () => {
    if (canPrev) {
      handleSelectSection(ALL_SECTIONS[currentIndex - 1].id);
    }
  };

  const handleNext = () => {
    if (canNext) {
      handleSelectSection(ALL_SECTIONS[currentIndex + 1].id);
    }
  };

  return (
    <div className="min-h-screen bg-white text-[#3B2923] flex flex-col font-sans antialiased">
      <Header
        isSidebarOpen={isSidebarOpen}
        onToggleSidebar={() => setIsSidebarOpen((prev) => !prev)}
        currentSection={displaySection}
        activeModule={activeModule}
        isOverview={isLandingOverview}
        isModuleOverview={isModuleOverview}
        onHome={handleGoHome}
        onSelectModule={handleSelectModule}
        onPrev={handlePrev}
        onNext={handleNext}
        canPrev={canPrev}
        canNext={canNext}
      />

      <div className="flex-1 flex min-h-0 relative">
        <TaskNavigation
          isOpen={isSidebarOpen}
          onClose={() => setIsSidebarOpen(false)}
          modules={MODULES}
          selectedModuleId={selectedModuleId}
          selectedSectionId={selectedSectionId}
          onSelectOverview={handleGoHome}
          onSelectModule={handleSelectModule}
          onSelectSection={handleSelectSection}
        />

        <main className="flex-1 min-w-0 w-full flex flex-col transition-all duration-300 ease-in-out">
          <div className="w-full max-w-[1680px] mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6 flex-1 flex flex-col">
            {isLandingOverview ? (
              <LandingOverview
                onSelectModule={handleSelectModule}
                onSelectSection={handleSelectSection}
              />
            ) : isModuleOverview ? (
              <ModuleOverview
                moduleData={activeModule}
                onBackToOverview={handleGoHome}
                onSelectSection={handleSelectSection}
              />
            ) : (
              <div className="flex-1 flex flex-col justify-start task-viewport">
                <CurrentModuleComponent
                  key={currentSection.id}
                  {...currentSection.sectionProps}
                  onTitleChange={setCustomSectionTitle}
                />
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
