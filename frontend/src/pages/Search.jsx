import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search as SearchIcon, BookOpen, FileText, Code, X } from 'lucide-react';
import DEMO_MODULES from '../data/modules.json';
import { LESSON_EXERCISES } from '../data/exerciseData';
import { LESSON_EXERCISES_2 } from '../data/exerciseData2';

const styles = {
  container: {
    maxWidth: '900px',
    margin: '0 auto',
    animation: 'fadeIn 0.4s ease-out',
  },
  header: {
    marginBottom: '2rem',
  },
  title: {
    fontSize: '1.75rem',
    fontWeight: '800',
    color: '#f1f5f9',
    marginBottom: '0.25rem',
    letterSpacing: '-0.025em',
  },
  subtitle: {
    fontSize: '0.9375rem',
    color: '#64748b',
    marginBottom: '1.5rem',
  },
  searchWrapper: {
    position: 'relative',
    marginBottom: '2rem',
  },
  searchIcon: {
    position: 'absolute',
    left: '1rem',
    top: '50%',
    transform: 'translateY(-50%)',
    color: '#64748b',
    pointerEvents: 'none',
  },
  searchInput: {
    width: '100%',
    padding: '0.875rem 3rem 0.875rem 3rem',
    fontSize: '1rem',
    fontFamily: 'Inter, system-ui, sans-serif',
    color: '#f1f5f9',
    background: '#1e293b',
    border: '1px solid #334155',
    borderRadius: '12px',
    outline: 'none',
    transition: 'border-color 150ms ease, box-shadow 150ms ease',
    boxSizing: 'border-box',
  },
  searchInputFocused: {
    borderColor: '#06b6d4',
    boxShadow: '0 0 0 3px rgba(6, 182, 212, 0.15)',
  },
  clearBtn: {
    position: 'absolute',
    right: '0.75rem',
    top: '50%',
    transform: 'translateY(-50%)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '28px',
    height: '28px',
    borderRadius: '6px',
    border: 'none',
    background: 'rgba(255, 255, 255, 0.05)',
    color: '#94a3b8',
    cursor: 'pointer',
    transition: 'all 150ms ease',
  },
  shortcutHint: {
    position: 'absolute',
    right: '0.75rem',
    top: '50%',
    transform: 'translateY(-50%)',
    fontSize: '0.75rem',
    color: '#64748b',
    background: 'rgba(255, 255, 255, 0.05)',
    border: '1px solid #334155',
    borderRadius: '6px',
    padding: '0.2rem 0.5rem',
    pointerEvents: 'none',
    fontFamily: 'monospace',
  },
  resultsSummary: {
    fontSize: '0.875rem',
    color: '#94a3b8',
    marginBottom: '1.5rem',
    fontWeight: '500',
  },
  categorySection: {
    marginBottom: '2rem',
  },
  categoryHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    marginBottom: '0.75rem',
    fontSize: '0.8125rem',
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
  },
  categoryCount: {
    fontSize: '0.75rem',
    fontWeight: '600',
    padding: '0.15rem 0.5rem',
    borderRadius: '10px',
    marginLeft: '0.25rem',
  },
  resultCard: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: '0.75rem',
    padding: '1rem 1.25rem',
    background: '#1e293b',
    border: '1px solid #334155',
    borderRadius: '10px',
    marginBottom: '0.5rem',
    cursor: 'pointer',
    transition: 'all 150ms ease',
    textDecoration: 'none',
  },
  resultCardHover: {
    borderColor: '#06b6d4',
    background: 'rgba(6, 182, 212, 0.05)',
  },
  resultIconWrapper: {
    width: '36px',
    height: '36px',
    borderRadius: '8px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  resultTitle: {
    fontSize: '0.9375rem',
    fontWeight: '600',
    color: '#f1f5f9',
    marginBottom: '0.25rem',
  },
  resultDescription: {
    fontSize: '0.8125rem',
    color: '#94a3b8',
    lineHeight: '1.4',
  },
  resultMeta: {
    fontSize: '0.75rem',
    color: '#64748b',
    marginTop: '0.25rem',
  },
  emptyState: {
    textAlign: 'center',
    padding: '4rem 2rem',
    color: '#94a3b8',
  },
  emptyIcon: {
    margin: '0 auto 1rem',
    opacity: 0.3,
  },
  emptyTitle: {
    fontSize: '1.125rem',
    fontWeight: '600',
    color: '#f1f5f9',
    marginBottom: '0.5rem',
  },
  emptyText: {
    fontSize: '0.875rem',
    color: '#64748b',
  },
  initialState: {
    textAlign: 'center',
    padding: '4rem 2rem',
    color: '#94a3b8',
  },
  initialIcon: {
    margin: '0 auto 1rem',
    opacity: 0.2,
  },
  initialTitle: {
    fontSize: '1.125rem',
    fontWeight: '600',
    color: '#f1f5f9',
    marginBottom: '0.5rem',
  },
  initialText: {
    fontSize: '0.875rem',
    color: '#64748b',
    lineHeight: '1.5',
  },
};

const categoryConfig = {
  modules: { label: 'Modules', icon: BookOpen, color: '#06b6d4', bg: 'rgba(6, 182, 212, 0.1)', border: 'rgba(6, 182, 212, 0.3)' },
  lessons: { label: 'Lessons', icon: FileText, color: '#10b981', bg: 'rgba(16, 185, 129, 0.1)', border: 'rgba(16, 185, 129, 0.3)' },
  exercises: { label: 'Exercises', icon: Code, color: '#8b5cf6', bg: 'rgba(139, 92, 246, 0.1)', border: 'rgba(139, 92, 246, 0.3)' },
};

function buildSearchIndex(modules) {
  const items = [];

  modules.forEach((mod) => {
    items.push({
      type: 'module',
      category: 'modules',
      id: mod.id,
      title: mod.title,
      description: mod.description,
      meta: `${mod.level} - ${mod.estimated_hours}h - ${mod.lessons?.length || 0} lessons`,
      path: `/modules/${mod.id}`,
      searchText: `${mod.title} ${mod.description} ${(mod.skills || []).join(' ')} ${mod.level}`.toLowerCase(),
    });

    (mod.lessons || []).forEach((lesson) => {
      items.push({
        type: 'lesson',
        category: 'lessons',
        id: lesson.id,
        moduleId: mod.id,
        title: lesson.title,
        description: (lesson.objectives || []).join(', '),
        meta: `${mod.title} - ${lesson.estimated_minutes} min`,
        path: `/modules/${mod.id}/lessons/${lesson.id}`,
        searchText: `${lesson.title} ${(lesson.objectives || []).join(' ')} ${lesson.slug || ''}`.toLowerCase(),
      });

      const allExercises = { ...LESSON_EXERCISES, ...LESSON_EXERCISES_2 };
      const exercises = allExercises[lesson.id] || [];
      exercises.forEach((exercise) => {
        items.push({
          type: 'exercise',
          category: 'exercises',
          id: exercise.id,
          lessonId: lesson.id,
          moduleId: mod.id,
          title: exercise.title,
          description: exercise.description || '',
          meta: `${lesson.title} - ${exercise.type} - ${exercise.points} pts`,
          path: `/modules/${mod.id}/lessons/${lesson.id}`,
          searchText: `${exercise.title} ${exercise.description || ''} ${exercise.type}`.toLowerCase(),
        });
      });
    });
  });

  return items;
}

export default function Search() {
  const navigate = useNavigate();
  const inputRef = useRef(null);
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [isFocused, setIsFocused] = useState(false);
  const [hoveredResult, setHoveredResult] = useState(null);

  const searchIndex = useMemo(() => buildSearchIndex(DEMO_MODULES), []);

  // Debounce search query
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(query.trim().toLowerCase());
    }, 300);
    return () => clearTimeout(timer);
  }, [query]);

  // Auto-focus on mount
  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.focus();
    }
  }, []);

  // Ctrl+K / Cmd+K shortcut
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        if (inputRef.current) {
          inputRef.current.focus();
          inputRef.current.select();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const results = useMemo(() => {
    if (!debouncedQuery) return { modules: [], lessons: [], exercises: [] };

    const terms = debouncedQuery.split(/\s+/).filter(Boolean);

    const matches = searchIndex.filter((item) =>
      terms.every((term) => item.searchText.includes(term))
    );

    return {
      modules: matches.filter((m) => m.category === 'modules'),
      lessons: matches.filter((m) => m.category === 'lessons'),
      exercises: matches.filter((m) => m.category === 'exercises'),
    };
  }, [debouncedQuery, searchIndex]);

  const totalResults = results.modules.length + results.lessons.length + results.exercises.length;

  const handleResultClick = useCallback((path) => {
    navigate(path);
  }, [navigate]);

  const handleClear = useCallback(() => {
    setQuery('');
    setDebouncedQuery('');
    if (inputRef.current) {
      inputRef.current.focus();
    }
  }, []);

  const renderResultCard = (item, index) => {
    const config = categoryConfig[item.category];
    const Icon = config.icon;
    const key = `${item.category}-${item.id}-${index}`;
    const isHovered = hoveredResult === key;

    return (
      <div
        key={key}
        style={{
          ...styles.resultCard,
          ...(isHovered ? styles.resultCardHover : {}),
        }}
        onClick={() => handleResultClick(item.path)}
        onMouseEnter={() => setHoveredResult(key)}
        onMouseLeave={() => setHoveredResult(null)}
      >
        <div style={{ ...styles.resultIconWrapper, background: config.bg }}>
          <Icon size={18} color={config.color} />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={styles.resultTitle}>{item.title}</div>
          {item.description && (
            <div style={styles.resultDescription}>{item.description}</div>
          )}
          <div style={styles.resultMeta}>{item.meta}</div>
        </div>
      </div>
    );
  };

  const renderCategory = (categoryKey) => {
    const items = results[categoryKey];
    if (items.length === 0) return null;

    const config = categoryConfig[categoryKey];
    const Icon = config.icon;

    return (
      <div key={categoryKey} style={styles.categorySection}>
        <div style={{ ...styles.categoryHeader, color: config.color }}>
          <Icon size={16} />
          {config.label}
          <span style={{ ...styles.categoryCount, background: config.bg, color: config.color, border: `1px solid ${config.border}` }}>
            {items.length}
          </span>
        </div>
        {items.map((item, index) => renderResultCard(item, index))}
      </div>
    );
  };

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h1 style={styles.title}>Search</h1>
        <p style={styles.subtitle}>
          Search across modules, lessons, and exercises
        </p>
      </div>

      <div style={styles.searchWrapper}>
        <div style={styles.searchIcon}>
          <SearchIcon size={20} />
        </div>
        <input
          ref={inputRef}
          type="text"
          placeholder="Search modules, lessons, exercises..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          style={{
            ...styles.searchInput,
            ...(isFocused ? styles.searchInputFocused : {}),
          }}
        />
        {query ? (
          <button
            style={styles.clearBtn}
            onClick={handleClear}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)';
              e.currentTarget.style.color = '#f1f5f9';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)';
              e.currentTarget.style.color = '#94a3b8';
            }}
          >
            <X size={16} />
          </button>
        ) : (
          <div style={styles.shortcutHint}>
            {navigator.platform.includes('Mac') ? '\u2318K' : 'Ctrl+K'}
          </div>
        )}
      </div>

      {debouncedQuery && totalResults > 0 && (
        <>
          <div style={styles.resultsSummary}>
            {totalResults} result{totalResults !== 1 ? 's' : ''} for "{debouncedQuery}"
          </div>
          {renderCategory('modules')}
          {renderCategory('lessons')}
          {renderCategory('exercises')}
        </>
      )}

      {debouncedQuery && totalResults === 0 && (
        <div style={styles.emptyState}>
          <SearchIcon size={48} style={styles.emptyIcon} />
          <h2 style={styles.emptyTitle}>No results found</h2>
          <p style={styles.emptyText}>
            No matches for "{debouncedQuery}". Try different keywords or check your spelling.
          </p>
        </div>
      )}

      {!debouncedQuery && (
        <div style={styles.initialState}>
          <SearchIcon size={48} style={styles.initialIcon} />
          <h2 style={styles.initialTitle}>Start typing to search</h2>
          <p style={styles.initialText}>
            Search across {DEMO_MODULES.length} modules, {searchIndex.filter((i) => i.category === 'lessons').length} lessons, and {searchIndex.filter((i) => i.category === 'exercises').length} exercises.
          </p>
        </div>
      )}
    </div>
  );
}
