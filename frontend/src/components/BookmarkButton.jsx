import React, { useState, useEffect } from 'react';
import { Bookmark } from 'lucide-react';

const BOOKMARKS_KEY = 'hpc_bookmarks';

function getBookmarks() {
  try {
    return JSON.parse(localStorage.getItem(BOOKMARKS_KEY) || '[]');
  } catch { return []; }
}

function saveBookmarks(bookmarks) {
  localStorage.setItem(BOOKMARKS_KEY, JSON.stringify(bookmarks));
}

export default function BookmarkButton({ moduleId, lessonId, lessonTitle, moduleName }) {
  const [isBookmarked, setIsBookmarked] = useState(false);
  const [hovered, setHovered] = useState(false);

  useEffect(() => {
    const check = () => {
      const bookmarks = getBookmarks();
      setIsBookmarked(bookmarks.some(
        (b) => String(b.moduleId) === String(moduleId) && String(b.lessonId) === String(lessonId)
      ));
    };
    check();
    window.addEventListener('bookmark-changed', check);
    return () => window.removeEventListener('bookmark-changed', check);
  }, [moduleId, lessonId]);

  const toggle = () => {
    const bookmarks = getBookmarks();
    if (isBookmarked) {
      const updated = bookmarks.filter(
        (b) => !(String(b.moduleId) === String(moduleId) && String(b.lessonId) === String(lessonId))
      );
      saveBookmarks(updated);
      setIsBookmarked(false);
    } else {
      bookmarks.push({
        moduleId: String(moduleId),
        lessonId: String(lessonId),
        lessonTitle: lessonTitle || 'Untitled Lesson',
        moduleName: moduleName || 'Module ' + moduleId,
        timestamp: Date.now(),
      });
      saveBookmarks(bookmarks);
      setIsBookmarked(true);
    }
    window.dispatchEvent(new CustomEvent('bookmark-changed'));
  };

  return (
    <button
      onClick={toggle}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      title={isBookmarked ? 'Remove bookmark' : 'Bookmark this lesson'}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: '34px',
        height: '34px',
        borderRadius: '8px',
        border: '1px solid ' + (isBookmarked ? 'rgba(234, 179, 8, 0.3)' : '#334155'),
        background: isBookmarked
          ? 'rgba(234, 179, 8, 0.1)'
          : hovered
            ? 'rgba(255, 255, 255, 0.05)'
            : 'transparent',
        color: isBookmarked ? '#eab308' : hovered ? '#f1f5f9' : '#64748b',
        cursor: 'pointer',
        transition: 'all 150ms ease',
        flexShrink: 0,
      }}
    >
      <Bookmark size={16} fill={isBookmarked ? '#eab308' : 'none'} />
    </button>
  );
}
