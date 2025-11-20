import React from 'react';
import { GroundingSource } from '../types';

interface HealthAnalysisProps {
  analysis: string;
  sources: GroundingSource[];
}

const HealthAnalysis: React.FC<HealthAnalysisProps> = ({ analysis, sources }) => {
  // Basic markdown formatting for bold text and lists
  const formatText = (text: string) => {
    return text.split('\n').map((line, index) => {
      // Headings
      if (line.startsWith('###')) return <h4 key={index} className="text-lg font-semibold text-slate-800 mt-4 mb-2">{line.replace('###', '')}</h4>;
      if (line.startsWith('##')) return <h3 key={index} className="text-xl font-bold text-teal-900 mt-6 mb-3">{line.replace('##', '')}</h3>;
      
      // Bullets
      if (line.trim().startsWith('-') || line.trim().startsWith('*')) {
        return (
            <li key={index} className="ml-4 text-slate-700 leading-relaxed">
                {line.replace(/^[-*]\s/, '').split('**').map((part, i) => 
                    i % 2 === 1 ? <strong key={i} className="font-semibold text-slate-900">{part}</strong> : part
                )}
            </li>
        );
      }

      // Paragraphs with bold support
      if (line.trim().length > 0) {
          return (
            <p key={index} className="mb-3 text-slate-700 leading-relaxed">
                 {line.split('**').map((part, i) => 
                    i % 2 === 1 ? <strong key={i} className="font-semibold text-slate-900">{part}</strong> : part
                )}
            </p>
          );
      }
      
      return null;
    });
  };

  return (
    <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100">
      <div className="prose prose-slate max-w-none">
        {formatText(analysis)}
      </div>

      {sources.length > 0 && (
        <div className="mt-8 pt-4 border-t border-slate-100">
          <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Verified Sources</h4>
          <div className="flex flex-wrap gap-2">
            {sources.map((source, idx) => (
              <a 
                key={idx} 
                href={source.uri} 
                target="_blank" 
                rel="noopener noreferrer"
                className="inline-flex items-center px-3 py-1.5 rounded-md bg-slate-50 text-xs text-teal-600 hover:bg-teal-50 border border-slate-200 transition-colors truncate max-w-[200px]"
              >
                <span className="truncate">{source.title}</span>
                <svg className="w-3 h-3 ml-1 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                </svg>
              </a>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default HealthAnalysis;