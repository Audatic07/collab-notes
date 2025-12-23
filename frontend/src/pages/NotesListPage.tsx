// Notes list page
// Shows all notes owned by current user

import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { notesApi, Note } from '../lib/api';

export default function NotesListPage() {
  const [notes, setNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [creating, setCreating] = useState(false);

  const { user, logout } = useAuth();
  const navigate = useNavigate();

  // Fetch notes on mount
  useEffect(() => {
    loadNotes();
  }, []);

  const loadNotes = async () => {
    try {
      const data = await notesApi.list();
      setNotes(data.notes);
    } catch (err) {
      setError('Failed to load notes');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateNote = async () => {
    setCreating(true);
    try {
      const data = await notesApi.create({ title: 'Untitled Note' });
      navigate(`/notes/${data.note.id}`);
    } catch (err) {
      setError('Failed to create note');
      setCreating(false);
    }
  };

  const handleDeleteNote = async (id: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (!confirm('Delete this note?')) return;

    try {
      await notesApi.delete(id);
      setNotes(notes.filter((n) => n.id !== id));
    } catch (err) {
      setError('Failed to delete note');
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (loading) {
    return <div className="loading">Loading notes...</div>;
  }

  return (
    <div className="notes-container">
      <header className="notes-header">
        <div className="header-left">
          <h1>📝 My Notes</h1>
          <span className="user-info">Logged in as {user?.name}</span>
        </div>
        <div className="header-right">
          <button
            className="btn-primary"
            onClick={handleCreateNote}
            disabled={creating}
          >
            {creating ? 'Creating...' : '+ New Note'}
          </button>
          <button className="btn-secondary" onClick={logout}>
            Logout
          </button>
        </div>
      </header>

      {error && <div className="error-message">{error}</div>}

      <div className="share-info">
        <strong>💡 Collaboration tip:</strong> Share a note URL with others to
        let them view in real-time. Only you (the owner) can edit.
      </div>

      {notes.length === 0 ? (
        <div className="empty-state">
          <p>No notes yet. Create your first note!</p>
        </div>
      ) : (
        <div className="notes-grid">
          {notes.map((note) => (
            <Link
              to={`/notes/${note.id}`}
              key={note.id}
              className="note-card"
            >
              <h3>{note.title || 'Untitled'}</h3>
              <p className="note-date">Updated {formatDate(note.updatedAt)}</p>
              <button
                className="delete-btn"
                onClick={(e) => handleDeleteNote(note.id, e)}
                title="Delete note"
              >
                🗑️
              </button>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
