import React, { useState, useRef, useEffect } from 'react';
import { StepDefinition } from '../types';
import { Layers, ChevronDown, Check, ArrowRight } from 'lucide-react';

interface CardStepSelectorProps {
  currentStepId: string;
  steps: StepDefinition[];
  onSelectStep: (targetStepId: string) => void;
  size?: 'compact' | 'medium' | 'full';
  disabled?: boolean;
}

export const CardStepSelector: React.FC<CardStepSelectorProps> = ({
  currentStepId,
  steps,
  onSelectStep,
  size = 'full',
  disabled = false,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [openUpwards, setOpenUpwards] = useState(true);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const activeItemRef = useRef<HTMLButtonElement>(null);

  const sortedSteps = [...steps].sort((a, b) => a.order - b.order);
  const currentStepIndex = sortedSteps.findIndex((s) => s.id === currentStepId);
  const currentStep = sortedSteps[currentStepIndex] || sortedSteps[0];

  // Check positioning relative to viewport when opened
  useEffect(() => {
    if (isOpen && triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect();
      const windowHeight = window.innerHeight;
      // If trigger is in the top 40% of the screen, open downwards; otherwise open upwards
      if (rect.top < windowHeight * 0.45) {
        setOpenUpwards(false);
      } else {
        setOpenUpwards(true);
      }
    }
  }, [isOpen]);

  // Auto-scroll to active step when opened
  useEffect(() => {
    if (isOpen && activeItemRef.current) {
      activeItemRef.current.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    }
  }, [isOpen]);

  // Handle clicking outside to close
  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside, true);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside, true);
    };
  }, [isOpen]);

  if (disabled) return null;

  const handleStepClick = (stepId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (stepId !== currentStepId) {
      onSelectStep(stepId);
    }
    setIsOpen(false);
  };

  return (
    <div
      ref={dropdownRef}
      className="relative w-full"
      onClick={(e) => e.stopPropagation()}
    >
      {/* Main Step Selector Trigger Button (No arrows, direct click) */}
      <button
        ref={triggerRef}
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          setIsOpen((prev) => !prev);
        }}
        className={`w-full flex items-center justify-between gap-1.5 rounded-lg border transition-all text-left shadow-2xs font-semibold ${
          isOpen
            ? 'bg-indigo-600 text-white border-indigo-600 ring-2 ring-indigo-300'
            : 'bg-white hover:bg-slate-50 text-slate-800 border-slate-200 hover:border-indigo-400'
        } ${
          size === 'compact'
            ? 'text-[9.5px] py-1 px-1.5'
            : size === 'medium'
            ? 'text-[10.5px] py-1.5 px-2'
            : 'text-xs py-1.5 px-2.5'
        }`}
        title="Cliquer pour changer directement d'étape"
      >
        <div className="flex items-center gap-1.5 min-w-0 truncate">
          <span
            className={`w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-bold shrink-0 transition-colors ${
              isOpen ? 'bg-white text-indigo-700' : 'bg-slate-900 text-white'
            }`}
          >
            {currentStep.order}
          </span>
          <span className="truncate font-bold">
            {size === 'compact'
              ? `S${currentStep.order}: ${currentStep.name}`
              : `Step ${currentStep.order}: ${currentStep.name}`}
          </span>
        </div>

        <div className="flex items-center gap-1 shrink-0 ml-1">
          <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded transition-colors hidden sm:inline-block ${
            isOpen ? 'bg-indigo-700/80 text-white' : 'bg-slate-100 text-slate-600'
          }`}>
            Changer
          </span>
          <ChevronDown
            className={`w-3.5 h-3.5 shrink-0 transition-transform duration-200 ${
              isOpen ? 'rotate-180 text-white' : 'text-slate-400'
            }`}
          />
        </div>
      </button>

      {/* Popover Step Menu Dropdown showing ALL steps directly */}
      {isOpen && (
        <div
          className={`absolute left-0 right-0 bg-white rounded-xl shadow-2xl border border-slate-200 p-2 z-50 text-slate-800 animate-in fade-in zoom-in-95 duration-150 space-y-1.5 min-w-[220px] sm:min-w-[250px] ${
            openUpwards ? 'bottom-full mb-1.5' : 'top-full mt-1.5'
          }`}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-1.5 py-1 border-b border-slate-100">
            <span className="text-[11px] font-bold text-slate-800 flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5 text-indigo-600" />
              Sélectionner une étape
            </span>
            <span className="text-[10px] text-slate-500 font-semibold bg-slate-100 px-1.5 py-0.5 rounded">
              {sortedSteps.length} étapes
            </span>
          </div>

          {/* List of all steps */}
          <div className="max-h-56 overflow-y-auto space-y-1 pr-0.5 scrollbar-thin">
            {sortedSteps.map((step) => {
              const isCurrent = step.id === currentStepId;
              return (
                <button
                  key={step.id}
                  ref={isCurrent ? activeItemRef : null}
                  type="button"
                  onClick={(e) => handleStepClick(step.id, e)}
                  className={`w-full flex items-center justify-between p-2 rounded-lg text-left transition-all group ${
                    isCurrent
                      ? 'bg-indigo-50/90 text-indigo-900 border border-indigo-200 font-bold shadow-2xs'
                      : 'hover:bg-slate-100 text-slate-700 hover:text-slate-900 font-medium'
                  }`}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <span
                      className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 transition-colors ${
                        isCurrent
                          ? 'bg-indigo-600 text-white'
                          : 'bg-slate-200 text-slate-700 group-hover:bg-indigo-100 group-hover:text-indigo-800'
                      }`}
                    >
                      {step.order}
                    </span>
                    <div className="min-w-0">
                      <p className="text-xs truncate leading-tight group-hover:text-indigo-950 font-bold">
                        {step.name}
                      </p>
                      {isCurrent ? (
                        <span className="text-[9px] text-indigo-600 font-semibold block">
                          Étape actuelle
                        </span>
                      ) : (
                        <span className="text-[9px] text-slate-400 group-hover:text-indigo-600 block">
                          Déplacer ici en 1 clic
                        </span>
                      )}
                    </div>
                  </div>

                  {isCurrent ? (
                    <span className="p-1 text-indigo-600 shrink-0 bg-white rounded-md shadow-2xs border border-indigo-100">
                      <Check className="w-3.5 h-3.5 stroke-[2.5]" />
                    </span>
                  ) : (
                    <span className="p-1 text-slate-400 group-hover:text-indigo-600 shrink-0 opacity-40 group-hover:opacity-100 transition-opacity">
                      <ArrowRight className="w-3.5 h-3.5" />
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
