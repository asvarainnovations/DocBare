'use client';

import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  DocumentTextIcon, 
  ExclamationTriangleIcon, 
  LightBulbIcon, 
  DocumentMagnifyingGlassIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  ClipboardDocumentIcon
} from '@heroicons/react/24/outline';
import axios from 'axios';
import ReactMarkdown from 'react-markdown';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { atomDark } from 'react-syntax-highlighter/dist/esm/styles/prism';
import AnimatedCopyButton from './AnimatedCopyButton';

interface DocumentAnalysisProps {
  documentId: string;
  documentName: string;
  userId: string;
  onClose?: () => void;
}

type AnalysisType = 'summary' | 'clauses' | 'risks' | 'insights';

interface AnalysisResult {
  analysis: string;
  analysisType: string;
  documentId: string;
  timestamp: string;
}

const analysisTypes: { type: AnalysisType; label: string; description: string; icon: any; color: string }[] = [
  {
    type: 'summary',
    label: 'Document Summary',
    description: 'Comprehensive overview of the document structure and key points',
    icon: DocumentTextIcon,
    color: 'bg-blue-500'
  },
  {
    type: 'clauses',
    label: 'Clause Extraction',
    description: 'Extract and categorize all legal clauses with explanations',
    icon: DocumentMagnifyingGlassIcon,
    color: 'bg-green-500'
  },
  {
    type: 'risks',
    label: 'Risk Assessment',
    description: 'Identify potential risks and provide mitigation strategies',
    icon: ExclamationTriangleIcon,
    color: 'bg-red-500'
  },
  {
    type: 'insights',
    label: 'Legal Insights',
    description: 'Strategic analysis and recommendations for the document',
    icon: LightBulbIcon,
    color: 'bg-purple-500'
  }
];

export default function DocumentAnalysis({ documentId, documentName, userId, onClose }: DocumentAnalysisProps) {
  const [selectedType, setSelectedType] = useState<AnalysisType | null>(null);
  const [results, setResults] = useState<Record<AnalysisType, AnalysisResult | null>>({
    summary: null,
    clauses: null,
    risks: null,
    insights: null
  });
  const [loading, setLoading] = useState<Record<AnalysisType, boolean>>({
    summary: false,
    clauses: false,
    risks: false,
    insights: false
  });
  const [errors, setErrors] = useState<Record<AnalysisType, string | null>>({
    summary: null,
    clauses: null,
    risks: null,
    insights: null
  });
  const [expandedSections, setExpandedSections] = useState<Set<AnalysisType>>(new Set());

  const toggleSection = useCallback((type: AnalysisType) => {
    setExpandedSections(prev => {
      const newSet = new Set(prev);
      if (newSet.has(type)) {
        newSet.delete(type);
      } else {
        newSet.add(type);
      }
      return newSet;
    });
  }, []);

  const runAnalysis = useCallback(async (type: AnalysisType) => {
    if (loading[type] || results[type]) return;

    setLoading(prev => ({ ...prev, [type]: true }));
    setErrors(prev => ({ ...prev, [type]: null }));

    try {
      const response = await axios.post('/api/documents/analyze', {
        documentId,
        analysisType: type,
        userId
      });

      setResults(prev => ({
        ...prev,
        [type]: response.data
      }));

      // Auto-expand the section when analysis completes
      setExpandedSections(prev => new Set([...prev, type]));

    } catch (error: any) {
      setErrors(prev => ({
        ...prev,
        [type]: error.response?.data?.error || 'Analysis failed'
      }));
    } finally {
      setLoading(prev => ({ ...prev, [type]: false }));
    }
  }, [documentId, userId, loading, results]);

  const runAllAnalyses = useCallback(async () => {
    for (const type of analysisTypes) {
      if (!results[type.type] && !loading[type.type]) {
        await runAnalysis(type.type);
      }
    }
  }, [results, loading, runAnalysis]);

  const clearResults = useCallback(() => {
    setResults({
      summary: null,
      clauses: null,
      risks: null,
      insights: null
    });
    setErrors({
      summary: null,
      clauses: null,
      risks: null,
      insights: null
    });
    setExpandedSections(new Set());
  }, []);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="bg-surface rounded-lg shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden"
        role="dialog"
        aria-labelledby="document-analysis-title"
        aria-describedby="document-analysis-description"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-700">
          <div>
            <h2 id="document-analysis-title" className="text-xl font-semibold text-white">
              Document Analysis
            </h2>
            <p id="document-analysis-description" className="text-gray-400 text-sm mt-1">
              {documentName}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={clearResults}
              className="px-3 py-1.5 text-sm bg-gray-700 hover:bg-gray-600 text-white rounded transition-colors"
              aria-label="Clear all analysis results"
            >
              Clear All
            </button>
            <button
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-white transition-colors"
              aria-label="Close document analysis"
            >
              ×
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* Quick Actions */}
          <div className="mb-6 p-4 bg-slate rounded-lg border border-gray-700">
            <h3 className="text-lg font-medium text-white mb-3">Quick Actions</h3>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={runAllAnalyses}
                disabled={Object.values(loading).some(Boolean)}
                className="px-4 py-2 bg-accent hover:bg-blue-600 disabled:opacity-50 text-white rounded-lg transition-colors flex items-center gap-2"
                aria-label="Run all document analyses"
              >
                <ClipboardDocumentIcon className="w-4 h-4" />
                Analyze All
              </button>
              {analysisTypes.map(({ type, label, icon: Icon, color }) => (
                <button
                  key={type}
                  onClick={() => runAnalysis(type)}
                  disabled={loading[type] || !!results[type]}
                  className={`px-4 py-2 ${color} hover:opacity-80 disabled:opacity-50 text-white rounded-lg transition-colors flex items-center gap-2`}
                  aria-label={`Run ${label.toLowerCase()} analysis`}
                >
                  <Icon className="w-4 h-4" />
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Analysis Results */}
          <div className="space-y-4">
            {analysisTypes.map(({ type, label, description, icon: Icon, color }) => {
              const isExpanded = expandedSections.has(type);
              const result = results[type];
              const isLoading = loading[type];
              const error = errors[type];

              return (
                <motion.div
                  key={type}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-slate rounded-lg border border-gray-700 overflow-hidden"
                >
                  {/* Section Header */}
                  <button
                    onClick={() => toggleSection(type)}
                    className="w-full p-4 flex items-center justify-between hover:bg-gray-800 transition-colors"
                    aria-expanded={isExpanded}
                    aria-controls={`analysis-${type}`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-lg ${color}`}>
                        <Icon className="w-5 h-5 text-white" />
                      </div>
                      <div className="text-left">
                        <h3 className="text-lg font-medium text-white">{label}</h3>
                        <p className="text-sm text-gray-400">{description}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {isLoading && (
                        <div className="w-5 h-5 border-2 border-accent border-t-transparent rounded-full animate-spin" />
                      )}
                      {result && (
                        <span className="text-xs bg-green-600 text-white px-2 py-1 rounded">
                          Complete
                        </span>
                      )}
                      {error && (
                        <span className="text-xs bg-red-600 text-white px-2 py-1 rounded">
                          Error
                        </span>
                      )}
                      {isExpanded ? (
                        <ChevronUpIcon className="w-5 h-5 text-gray-400" />
                      ) : (
                        <ChevronDownIcon className="w-5 h-5 text-gray-400" />
                      )}
                    </div>
                  </button>

                  {/* Section Content */}
                  <AnimatePresence>
                    {isExpanded && (
                      <motion.div
                        id={`analysis-${type}`}
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="border-t border-gray-700"
                      >
                        <div className="p-4">
                          {isLoading && (
                            <div className="flex items-center justify-center py-8">
                              <div className="text-center">
                                <div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin mx-auto mb-3" />
                                <p className="text-gray-400">Analyzing document...</p>
                              </div>
                            </div>
                          )}

                          {error && (
                            <div className="bg-red-900/20 border border-red-700 rounded-lg p-4">
                              <p className="text-red-300 text-sm">{error}</p>
                              <button
                                onClick={() => runAnalysis(type)}
                                className="mt-2 px-3 py-1 bg-red-600 hover:bg-red-700 text-white text-sm rounded transition-colors"
                              >
                                Retry
                              </button>
                            </div>
                          )}

                          {result && (
                            <div className="space-y-4">
                              <div className="flex items-center justify-between">
                                <div className="text-sm text-gray-400">
                                  Completed: {new Date(result.timestamp).toLocaleString()}
                                </div>
                                                                 <AnimatedCopyButton
                                   content={result.analysis}
                                 />
                              </div>
                              <div className="prose prose-invert max-w-none">
                                <ReactMarkdown
                                  components={{
                                    h1: ({ children }) => <h1 className="text-xl font-bold text-white mb-4 mt-6 first:mt-0">{children}</h1>,
                                    h2: ({ children }) => <h2 className="text-lg font-semibold text-white mb-3 mt-5 first:mt-0">{children}</h2>,
                                    h3: ({ children }) => <h3 className="text-base font-semibold text-white mb-2 mt-4 first:mt-0">{children}</h3>,
                                    p: ({ children }) => <p className="text-white mb-3 leading-relaxed last:mb-0">{children}</p>,
                                    ul: ({ children }) => <ul className="text-white mb-4 space-y-1 list-disc list-inside">{children}</ul>,
                                    ol: ({ children }) => <ol className="text-white mb-4 space-y-1 list-decimal list-inside">{children}</ol>,
                                    li: ({ children }) => <li className="text-white leading-relaxed">{children}</li>,
                                    code: ({ children, className }) => {
                                      const isInline = !className;
                                      if (isInline) {
                                        return <code className="bg-gray-800 text-blue-300 px-1.5 py-0.5 rounded text-sm font-mono">{children}</code>;
                                      }
                                      const match = /language-(\w+)/.exec(className || '');
                                      return (
                                        <SyntaxHighlighter
                                          style={atomDark}
                                          language={match ? match[1] : undefined}
                                          PreTag="div"
                                          customStyle={{ borderRadius: '0.5rem', fontSize: '0.95em', margin: '0.5em 0' }}
                                        >
                                          {String(children).replace(/\n$/, '')}
                                        </SyntaxHighlighter>
                                      );
                                    },
                                    blockquote: ({ children }) => <blockquote className="border-l-4 border-accent pl-4 italic text-gray-300 mb-4">{children}</blockquote>,
                                    strong: ({ children }) => <strong className="font-semibold text-white">{children}</strong>,
                                    em: ({ children }) => <em className="italic text-gray-300">{children}</em>
                                  }}
                                >
                                  {result.analysis}
                                </ReactMarkdown>
                              </div>
                            </div>
                          )}

                          {!isLoading && !error && !result && (
                            <div className="text-center py-8 text-gray-400">
                              <Icon className="w-12 h-12 mx-auto mb-3 opacity-50" />
                              <p>Click &quot;Analyze All&quot; or select this analysis type to begin</p>
                            </div>
                          )}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              );
            })}
          </div>
        </div>
      </motion.div>
    </div>
  );
} 