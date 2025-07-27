'use client';

import { useState, useCallback, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  MagnifyingGlassIcon, 
  FunnelIcon, 
  XMarkIcon,
  DocumentTextIcon,
  ChatBubbleLeftRightIcon,
  DocumentMagnifyingGlassIcon,
  CalendarIcon,
  ArrowsUpDownIcon
} from '@heroicons/react/24/outline';
import axios from 'axios';
import { useDebounce } from '@/hooks/useDebounce';

interface SearchResult {
  id: string;
  type: 'document' | 'chat' | 'message';
  title?: string;
  content?: string;
  filename?: string;
  sessionName?: string;
  createdAt: string;
  [key: string]: any;
}

interface SearchAndFilterProps {
  userId: string;
  onResultSelect?: (result: SearchResult) => void;
  className?: string;
}

type ContentType = 'all' | 'documents' | 'chats' | 'messages';
type SortField = 'createdAt' | 'title' | 'filename' | 'sessionName';
type SortOrder = 'asc' | 'desc';

export default function SearchAndFilter({ userId, onResultSelect, className = '' }: SearchAndFilterProps) {
  const [query, setQuery] = useState('');
  const [contentType, setContentType] = useState<ContentType>('all');
  const [sortBy, setSortBy] = useState<SortField>('createdAt');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasSearched, setHasSearched] = useState(false);

  const debouncedQuery = useDebounce(query, 300);

  // Search function
  const performSearch = useCallback(async () => {
    if (!debouncedQuery.trim() && !dateFrom && !dateTo) {
      setResults([]);
      setHasSearched(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams({
        userId,
        q: debouncedQuery,
        type: contentType,
        sortBy,
        sortOrder,
        limit: '20'
      });

      if (dateFrom) params.append('dateFrom', dateFrom);
      if (dateTo) params.append('dateTo', dateTo);

      const response = await axios.get(`/api/search?${params}`);
      setResults(response.data.results || []);
      setHasSearched(true);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Search failed');
      setResults([]);
    } finally {
      setLoading(false);
    }
  }, [debouncedQuery, contentType, sortBy, sortOrder, dateFrom, dateTo, userId]);

  // Perform search when dependencies change
  useEffect(() => {
    performSearch();
  }, [performSearch]);

  // Clear search
  const clearSearch = useCallback(() => {
    setQuery('');
    setContentType('all');
    setSortBy('createdAt');
    setSortOrder('desc');
    setDateFrom('');
    setDateTo('');
    setResults([]);
    setError(null);
    setHasSearched(false);
  }, []);

  // Get result title/name
  const getResultTitle = useCallback((result: SearchResult) => {
    switch (result.type) {
      case 'document':
        return result.filename || result.title || 'Untitled Document';
      case 'chat':
        return result.sessionName || result.title || 'Untitled Chat';
      case 'message':
        return (result.content?.substring(0, 50) + (result.content && result.content.length > 50 ? '...' : '')) || 'Message';
      default:
        return 'Unknown';
    }
  }, []);

  // Get result icon
  const getResultIcon = useCallback((type: string) => {
    switch (type) {
      case 'document':
        return DocumentTextIcon;
      case 'chat':
        return ChatBubbleLeftRightIcon;
      case 'message':
        return DocumentMagnifyingGlassIcon;
      default:
        return DocumentTextIcon;
    }
  }, []);

  // Format date
  const formatDate = useCallback((dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }, []);

  // Filter options
  const contentTypeOptions = [
    { value: 'all', label: 'All Content', icon: DocumentMagnifyingGlassIcon },
    { value: 'documents', label: 'Documents', icon: DocumentTextIcon },
    { value: 'chats', label: 'Chats', icon: ChatBubbleLeftRightIcon },
    { value: 'messages', label: 'Messages', icon: DocumentMagnifyingGlassIcon }
  ];

  const sortOptions = [
    { value: 'createdAt', label: 'Date' },
    { value: 'title', label: 'Title' },
    { value: 'filename', label: 'Filename' },
    { value: 'sessionName', label: 'Session Name' }
  ];

  return (
    <div className={`bg-surface rounded-lg border border-gray-700 ${className}`}>
      {/* Search Bar */}
      <div className="p-4 border-b border-gray-700">
        <div className="relative">
          <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search documents, chats, and messages..."
            className="w-full pl-10 pr-10 py-2 bg-slate border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent"
            aria-label="Search content"
          />
          {query && (
            <button
              onClick={() => setQuery('')}
              className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-white transition-colors"
              aria-label="Clear search"
            >
              <XMarkIcon className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Filter Toggle */}
        <div className="flex items-center justify-between mt-3">
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="flex items-center gap-2 px-3 py-1.5 text-sm bg-gray-700 hover:bg-gray-600 text-white rounded transition-colors"
            aria-expanded={showFilters}
            aria-controls="search-filters"
          >
            <FunnelIcon className="w-4 h-4" />
            Filters
            {showFilters ? ' (Hide)' : ' (Show)'}
          </button>

          {(query || dateFrom || dateTo || contentType !== 'all') && (
            <button
              onClick={clearSearch}
              className="text-sm text-gray-400 hover:text-white transition-colors"
              aria-label="Clear all filters"
            >
              Clear All
            </button>
          )}
        </div>
      </div>

      {/* Filters */}
      <AnimatePresence>
        {showFilters && (
          <motion.div
            id="search-filters"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="border-b border-gray-700"
          >
            <div className="p-4 space-y-4">
              {/* Content Type Filter */}
              <div>
                <label className="block text-sm font-medium text-white mb-2">
                  Content Type
                </label>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                  {contentTypeOptions.map(({ value, label, icon: Icon }) => (
                    <button
                      key={value}
                      onClick={() => setContentType(value as ContentType)}
                      className={`flex items-center gap-2 px-3 py-2 text-sm rounded-lg transition-colors ${
                        contentType === value
                          ? 'bg-accent text-white'
                          : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                      }`}
                      aria-pressed={contentType === value}
                    >
                      <Icon className="w-4 h-4" />
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Date Range */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-white mb-2">
                    From Date
                  </label>
                  <div className="relative">
                    <CalendarIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      type="date"
                      value={dateFrom}
                      onChange={(e) => setDateFrom(e.target.value)}
                      className="w-full pl-10 pr-3 py-2 bg-slate border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-accent"
                      aria-label="Filter from date"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-white mb-2">
                    To Date
                  </label>
                  <div className="relative">
                    <CalendarIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      type="date"
                      value={dateTo}
                      onChange={(e) => setDateTo(e.target.value)}
                      className="w-full pl-10 pr-3 py-2 bg-slate border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-accent"
                      aria-label="Filter to date"
                    />
                  </div>
                </div>
              </div>

              {/* Sort Options */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-white mb-2">
                    Sort By
                  </label>
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value as SortField)}
                    className="w-full px-3 py-2 bg-slate border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-accent"
                    aria-label="Sort by field"
                  >
                    {sortOptions.map(({ value, label }) => (
                      <option key={value} value={value}>
                        {label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-white mb-2">
                    Sort Order
                  </label>
                  <button
                    onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
                    className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-slate border border-gray-600 rounded-lg text-white hover:bg-gray-700 transition-colors"
                    aria-label={`Sort ${sortOrder === 'asc' ? 'descending' : 'ascending'}`}
                  >
                    <ArrowsUpDownIcon className="w-4 h-4" />
                    {sortOrder === 'asc' ? 'Ascending' : 'Descending'}
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Results */}
      <div className="p-4">
        {loading && (
          <div className="flex items-center justify-center py-8">
            <div className="text-center">
              <div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin mx-auto mb-3" />
              <p className="text-gray-400">Searching...</p>
            </div>
          </div>
        )}

        {error && (
          <div className="bg-red-900/20 border border-red-700 rounded-lg p-4">
            <p className="text-red-300 text-sm">{error}</p>
          </div>
        )}

        {!loading && !error && hasSearched && results.length === 0 && (
          <div className="text-center py-8 text-gray-400">
            <DocumentMagnifyingGlassIcon className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p>No results found</p>
            <p className="text-sm">Try adjusting your search terms or filters</p>
          </div>
        )}

        {!loading && !error && results.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm text-gray-400 mb-3">
              <span>{results.length} result{results.length !== 1 ? 's' : ''} found</span>
            </div>
            {results.map((result) => {
              const Icon = getResultIcon(result.type);
              return (
                <motion.button
                  key={`${result.type}-${result.id}`}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  onClick={() => onResultSelect?.(result)}
                  className="w-full text-left p-3 bg-slate hover:bg-gray-700 rounded-lg transition-colors border border-gray-700 hover:border-gray-600"
                  aria-label={`Select ${result.type}: ${getResultTitle(result)}`}
                >
                  <div className="flex items-start gap-3">
                    <div className="flex-shrink-0 p-2 bg-gray-700 rounded-lg">
                      <Icon className="w-4 h-4 text-gray-300" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="text-white font-medium truncate">
                        {getResultTitle(result)}
                      </h4>
                      <p className="text-sm text-gray-400 mt-1">
                        {formatDate(result.createdAt)}
                      </p>
                      {result.content && result.type === 'message' && (
                        <p className="text-sm text-gray-500 mt-1 line-clamp-2">
                          {result.content}
                        </p>
                      )}
                    </div>
                    <div className="flex-shrink-0">
                      <span className="text-xs bg-gray-700 text-gray-300 px-2 py-1 rounded">
                        {result.type}
                      </span>
                    </div>
                  </div>
                </motion.button>
              );
            })}
          </div>
        )}

        {!loading && !error && !hasSearched && (
          <div className="text-center py-8 text-gray-400">
            <MagnifyingGlassIcon className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p>Enter a search query to find content</p>
            <p className="text-sm">You can search across documents, chats, and messages</p>
          </div>
        )}
      </div>
    </div>
  );
} 