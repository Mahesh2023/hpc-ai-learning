import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bookmark, FileText, Trash2, ExternalLink, Clock } from 'lucide-react';

const BOOKMARKS_KEY = 'hpc_bookmarks';
const NOTES_KEY = 'hpc_notes';

function getBookmarks() {
  try {
    return JSON.parse(localStorage.getItem(BOOKMARKS_KEY) || '[]');
  } catch { return []; }
}

function getNotes() {
  try {
    return JSON.parse(localStorage.getItem(NOTES_KEY) || '[]');
  } catch { return []; }
}

function saveBookmarks(bookmarks) {
  localStorage.setItem(BOOKMARKS_KEY, JSON.stringify(bookmarks));
}

function saveNotes(notes) {
  localStorage.setItem(NOTES_KEY, JSON.stringify(notes));
}

function formatDate(ts) {
  if (!ts) return '';
  const d = new Date(ts);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) +
    ' at ' + d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
}

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
    letterSpacing: '-0.025em',
    marginBottom: '0.25rem',
  },
  subtitle: {
    fontSize: '0.875rem',
    color: '#64748b',
    fontWeight: '500',
  },
  tabs: {
    display: 'flex',
    gap: '0.25rem',
    marginBottom: '1.5rem',
    borderBottom: '1px solid #334155',
    paddingBottom: '0',
  },
  tab: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    padding: '0.75rem 1.25rem',
    fontSize: '0.875rem',
    fontWeight: '600',
    color: '#64748b',
    background: 'transparent',
    border: 'none',
    borderBottom: '2px solid transparent',
    cursor: 'pointer',
    transition: 'all 150ms ease',
    marginBottom: '-1px',
  },
  tabActive: {
    color: '#06b6d4',
    borderBottom: '2px solid #06b6d4',
  },
  badge: {
    padding: '0.0625rem 0.4375rem',
    borderRadius: '6px',
    fontSize: '0.6875rem',
    fontWeight: '700',
    background: 'rgba(6, 182, 212, 0.1)',
    color: '#06b6d4',
  },
  card: {
    background: '#1e293b',
    border: '1px solid #334155',
    borderRadius: '14px',
    padding: '1.25rem 1.5rem',
    marginBottom: '0.75rem',
    transition: 'all 150ms ease',
  },
  cardTop: {
    display: 'flex',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: '1rem',
  },
  cardTitle: {
    fontSize: '0.9375rem',
    fontWeight: '700',
    color: '#f1f5f9',
    marginBottom: '0.25rem',
  },
  cardModule: {
    fontSize: '0.75rem',
    fontWeight: '600',
    color: '#8b5cf6',
    marginBottom: '0.5rem',
  },
  cardDate: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.375rem',
    fontSize: '0.6875rem',
    color: '#64748b',
  },
  cardActions: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    flexShrink: 0,
  },
  iconBtn: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '32px',
    height: '32px',
    borderRadius: '8px',
    border: '1px solid #334155',
    background: 'transparent',
    color: '#64748b',
    cursor: 'pointer',
    transition: 'all 150ms ease',
  },
  noteContent: {
    fontSize: '0.8125rem',
    color: '#94a3b8',
    lineHeight: '1.7',
    marginTop: '0.75rem',
    padding: '0.75rem 1rem',
    background: 'rgba(0, 0, 0, 0.15)',
    borderRadius: '8px',
    whiteSpace: 'pre-wrap',
    wordBreak: 'break-word',
  },
  emptyState: {
    textAlign: 'center',
    padding: '4rem 2rem',
    color: '#64748b',
  },
  emptyIcon: {
    margin: '0 auto 1rem',
    opacity: 0.3,
  },
  emptyTitle: {
    fontSize: '1.125rem',
    fontWeight: '600',
    color: '#94a3b8',
    marginBottom: '0.5rem',
  },
  emptyText: {
    fontSize: '0.8125rem',
    color: '#64748b',
  },
  noteEditArea: {
    width: '100%',
    minHeight: '80px',
    marginTop: '0.75rem',
    padding: '0.75rem 1rem',
    background: 'rgba(0, 0, 0, 0.2)',
    border: '1px solid #334155',
    borderRadius: '8px',
    color: '#f1f5f9',
    fontSize: '0.8125rem',
    lineHeight: '1.7',
    fontFamily: 'Inter, system-ui, sans-serif',
    resize: 'vertical',
    outline: 'none',
  },
  saveBtn: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '0.375rem',
    marginTop: '0.5rem',
    padding: '0.375rem 0.875rem',
    fontSize: '0.75rem',
    fontWeight: '700',
    borderRadius: '8px',
    border: 'none',
    background: 'linear-gradient(135deg, #06b6d4, #8b5cf6)',
    color: '#0f172a',
    cursor: 'pointer',
    transition: 'all 150ms ease',
  },
};

export default function Notes() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('bookmarks');
  const [bookmarks, setBookmarks] = useState([]);
  const [notes, setNotes] = useState([]);
  const [editingNoteId, setEditingNoteId] = useState(null);
  const [editContent, setEditContent] = useState('');

  const loadData = () => {
    setBookmarks(getBookmarks().sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0)));
    setNotes(getNotes().sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0)));
  };

  useEffect(() => {
    loadData();
    const handler = () => loadData();
    window.addEventListener('bookmark-changed', handler);
    return () => window.removeEventListener('bookmark-changed', handler);
  }, []);

  const removeBookmark = (moduleId, lessonId) => {
    const updated = bookmarks.filter(
      (b) => !(b.moduleId === moduleId && b.lessonId === lessonId)
    );
    saveBookmarks(updated);
    setBookmarks(updated);
    window.dispatchEvent(new CustomEvent('bookmark-changed'));
  };

  const deleteNote = (id) => {
    const updated = notes.filter((n) => n.id !== id);
    saveNotes(updated);
    setNotes(updated);
  };

  const startEditing = (note) => {
    setEditingNoteId(note.id);
    setEditContent(note.content);
  };

  const saveEdit = (id) => {
    const updated = notes.map((n) =>
      n.id === id ? { ...n, content: editContent, timestamp: Date.now() } : n
    );
    saveNotes(updated);
    setNotes(updated.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0)));
    setEditingNoteId(null);
    setEditContent('');
  };

  const goToLesson = (moduleId, lessonId) => {
    navigate('/modules/' + moduleId + '/lessons/' + lessonId);
  };

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h1 style={styles.title}>Notes & Bookmarks</h1>
        <p style={styles.subtitle}>Your saved lessons and study notes</p>
      </div>

      {/* Tabs */}
      <div style={styles.tabs}>
        <button
          style={{ ...styles.tab, ...(activeTab === 'bookmarks' ? styles.tabActive : {}) }}
          onClick={() => setActiveTab('bookmarks')}
        >
          <Bookmark size={16} />
          Bookmarks
          <span style={styles.badge}>{bookmarks.length}</span>
        </button>
        <button
          style={{ ...styles.tab, ...(activeTab === 'notes' ? styles.tabActive : {}) }}
          onClick={() => setActiveTab('notes')}
        >
          <FileText size={16} />
          Notes
          <span style={styles.badge}>{notes.length}</span>
        </button>
      </div>

      {/* Bookmarks Tab */}
      {activeTab === 'bookmarks' && (
        <div>
          {bookmarks.length === 0 ? (
            <div style={styles.emptyState}>
              <Bookmark size={48} style={styles.emptyIcon} />
              <div style={styles.emptyTitle}>No bookmarks yet</div>
              <div style={styles.emptyText}>
                Bookmark lessons while studying to quickly find them later.
              </div>
            </div>
          ) : (
            bookmarks.map((bm) => (
              <div key={bm.moduleId + '-' + bm.lessonId} style={styles.card}>
                <div style={styles.cardTop}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={styles.cardModule}>{bm.moduleName || 'Module ' + bm.moduleId}</div>
                    <div style={styles.cardTitle}>{bm.lessonTitle || 'Lesson ' + bm.lessonId}</div>
                    <div style={styles.cardDate}>
                      <Clock size={12} />
                      {formatDate(bm.timestamp)}
                    </div>
                  </div>
                  <div style={styles.cardActions}>
                    <button
                      style={styles.iconBtn}
                      title="Go to lesson"
                      onClick={() => goToLesson(bm.moduleId, bm.lessonId)}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = 'rgba(6, 182, 212, 0.1)';
                        e.currentTarget.style.color = '#06b6d4';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = 'transparent';
                        e.currentTarget.style.color = '#64748b';
                      }}
                    >
                      <ExternalLink size={14} />
                    </button>
                    <button
                      style={styles.iconBtn}
                      title="Remove bookmark"
                      onClick={() => removeBookmark(bm.moduleId, bm.lessonId)}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = 'rgba(239, 68, 68, 0.1)';
                        e.currentTarget.style.color = '#ef4444';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = 'transparent';
                        e.currentTarget.style.color = '#64748b';
                      }}
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Notes Tab */}
      {activeTab === 'notes' && (
        <div>
          {notes.length === 0 ? (
            <div style={styles.emptyState}>
              <FileText size={48} style={styles.emptyIcon} />
              <div style={styles.emptyTitle}>No notes yet</div>
              <div style={styles.emptyText}>
                Add notes while studying lessons to capture key insights.
              </div>
            </div>
          ) : (
            notes.map((note) => (
              <div key={note.id} style={styles.card}>
                <div style={styles.cardTop}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={styles.cardModule}>{note.lessonTitle || 'Lesson ' + note.lessonId}</div>
                    <div style={styles.cardDate}>
                      <Clock size={12} />
                      {formatDate(note.timestamp)}
                    </div>
                  </div>
                  <div style={styles.cardActions}>
                    <button
                      style={styles.iconBtn}
                      title="Go to lesson"
                      onClick={() => goToLesson(note.moduleId, note.lessonId)}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = 'rgba(6, 182, 212, 0.1)';
                        e.currentTarget.style.color = '#06b6d4';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = 'transparent';
                        e.currentTarget.style.color = '#64748b';
                      }}
                    >
                      <ExternalLink size={14} />
                    </button>
                    <button
                      style={styles.iconBtn}
                      title="Delete note"
                      onClick={() => deleteNote(note.id)}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = 'rgba(239, 68, 68, 0.1)';
                        e.currentTarget.style.color = '#ef4444';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = 'transparent';
                        e.currentTarget.style.color = '#64748b';
                      }}
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
                {editingNoteId === note.id ? (
                  <div>
                    <textarea
                      style={styles.noteEditArea}
                      value={editContent}
                      onChange={(e) => setEditContent(e.target.value)}
                      autoFocus
                    />
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      <button style={styles.saveBtn} onClick={() => saveEdit(note.id)}>
                        Save
                      </button>
                      <button
                        style={{ ...styles.saveBtn, background: '#334155', color: '#94a3b8' }}
                        onClick={() => { setEditingNoteId(null); setEditContent(''); }}
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <div
                    style={styles.noteContent}
                    onClick={() => startEditing(note)}
                    title="Click to edit"
                  >
                    {note.content || 'Empty note — click to edit'}
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
