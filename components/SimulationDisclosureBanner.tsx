import React from 'react';
import { SESSION_REVIEW_MODEL, SIMULATION_LIVE_MODEL } from '../utils/modelDisclosure';

/**
 * Footer disclosure: models, limitations, networking-only use. Anchored to the bottom of the simulation view.
 */
export const SimulationDisclosureBanner: React.FC = () => {
  return (
    <footer
      className="shrink-0 border-t border-slate-700/90 bg-slate-800/90 backdrop-blur-md px-4 py-3 md:px-6 md:py-3.5"
      role="note"
    >
      <div className="mx-auto max-w-4xl space-y-2 text-left text-xs leading-relaxed text-slate-400 md:text-[13px] md:leading-relaxed">
        <p className="text-slate-300">
          <span className="font-semibold text-slate-200">Live session model</span>{' '}
          <span className="rounded-md bg-slate-900/50 px-1.5 py-0.5 font-mono text-[11px] text-indigo-200/95 md:text-xs">
            {SIMULATION_LIVE_MODEL}
          </span>
        </p>
        <p>
          After the session ends, Session Review scoring may use{' '}
          <span className="rounded-md bg-slate-900/50 px-1.5 py-0.5 font-mono text-[11px] text-indigo-200/90 md:text-xs">
            {SESSION_REVIEW_MODEL}
          </span>{' '}
          (not the same as the live voice model).
        </p>
        <p className="text-slate-400">
          AI can make mistakes. This tool does not provide professional, legal, financial, medical, or hiring advice and does
          not guarantee job outcomes. For{' '}
          <strong className="font-semibold text-slate-200">networking practice only</strong>
          —do not use for medical, legal, eligibility, or automated hiring decisions.
        </p>
      </div>
    </footer>
  );
};
