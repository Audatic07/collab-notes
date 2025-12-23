// Note editor page with real-time collaboration
// Uses TipTap for rich text and Socket.IO for sync

import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import { useAuth } from '../context/AuthContext';
import { notesApi, Note } from '../lib/api';
import { getSocket } from '../lib/socket';
import PresenceIndicator from '../components/PresenceIndicator';

interface PresenceUser {
  odId: string;
  name: string;
  email: string;
}

export default function NoteEditorPage() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();

  const [note, setNote] = useState<Note | null>(null);
  const [title, setTitle] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [presence, setPresence] = useState<PresenceUser[]>([]);
  const [lastUpdate, setLastUpdate] = useState<string>('');

  // Track if we're the one making changes (to avoid sync loops)
  const isLocalChange = useRef(false);
  // Debounce timer for saving
  const saveTimer = useRef<ReturnType<typeof setTimeout>>();

  // Initialize TipTap editor
  const editor = useEditor({
    extensions: [
      StarterKit,
      Placeholder.configure({
        placeholder: 'Start writing...',
      }),
    ],
    editable: false, // Will enable if user is owner
    content: '',
    onUpdate: ({ editor }) => {
      // Only sync if this is a local change and user is owner
      if (isLocalChange.current || !note?.isOwner) return;

      isLocalChange.current = true;
      debouncedSave(editor.getJSON());
    },
  });

  // Debounced save function - waits 300ms after last keystroke
  const debouncedSave = useCallback(
    (content: object) => {
      if (saveTimer.current) {
        clearTimeout(saveTimer.current);
      }

      saveTimer.current = setTimeout(() => {
        const socket = getSocket();
        if (socket && id) {
          setSaving(true);
          socket.emit('note-update', {
            noteId: id,
            content: JSON.stringify(content),
            title,
          });

          // Reset saving indicator after brief delay
          setTimeout(() => {
            setSaving(false);
            isLocalChange.current = false;
          }, 500);
        }
      }, 300);
    },
    [id, title]
  );

  // Load note and setup socket
  useEffect(() => {
    if (!id) return;

    const loadNote = async () => {
      try {
        const data = await notesApi.get(id);
        setNote(data.note);
        setTitle(data.note.title);

        // Set editor content
        if (editor) {
          const content = data.note.content
            ? JSON.parse(data.note.content)
            : { type: 'doc', content: [] };
          editor.commands.setContent(content);
          // Enable editing only for owner
          editor.setEditable(data.note.isOwner || false);
        }
      } catch (err) {
        setError('Note not found');
      } finally {
        setLoading(false);
      }
    };

    loadNote();
  }, [id, editor]);

  // Setup socket connection
  useEffect(() => {
    if (!id || loading) return;

    const socket = getSocket();
    if (!socket) return;

    // Join the note room
    socket.emit('join-note', id);

    // Listen for presence updates
    socket.on('presence-update', (data: { users: PresenceUser[] }) => {
      setPresence(data.users);
    });

    // Listen for note updates from other users
    socket.on(
      'note-updated',
      (data: { content: string; title?: string; updatedBy: string }) => {
        // Update local state if it wasn't our change
        if (!isLocalChange.current) {
          if (editor && data.content) {
            const content = JSON.parse(data.content);
            editor.commands.setContent(content);
          }
          if (data.title) {
            setTitle(data.title);
          }
          setLastUpdate(`Updated by ${data.updatedBy}`);
          setTimeout(() => setLastUpdate(''), 3000);
        }
        isLocalChange.current = false;
      }
    );

    // Cleanup on unmount
    return () => {
      socket.emit('leave-note', id);
      socket.off('presence-update');
      socket.off('note-updated');
    };
  }, [id, loading, editor]);

  // Handle title change
  const handleTitleChange = (newTitle: string) => {
    setTitle(newTitle);
    if (note?.isOwner && editor) {
      isLocalChange.current = true;
      debouncedSave(editor.getJSON());
    }
  };

  if (loading) {
    return <div className="loading">Loading note...</div>;
  }

  if (error) {
    return (
      <div className="error-container">
        <p>{error}</p>
        <Link to="/notes">Back to notes</Link>
      </div>
    );
  }

  return (
    <div className="editor-container">
      <header className="editor-header">
        <div className="header-left">
          <Link to="/notes" className="back-link">
            ← Back
          </Link>
          <input
            type="text"
            className="title-input"
            value={title}
            onChange={(e) => handleTitleChange(e.target.value)}
            placeholder="Note title"
            disabled={!note?.isOwner}
          />
          {saving && <span className="saving-indicator">Saving...</span>}
          {lastUpdate && <span className="update-indicator">{lastUpdate}</span>}
        </div>
        <div className="header-right">
          <PresenceIndicator users={presence} currentUserId={user?.id || ''} />
        </div>
      </header>

      {!note?.isOwner && (
        <div className="viewer-banner">
          👁️ View only - This note belongs to {note?.owner?.name}
        </div>
      )}

      <div className="editor-toolbar">
        <button
          onClick={() => editor?.chain().focus().toggleBold().run()}
          className={editor?.isActive('bold') ? 'active' : ''}
          disabled={!note?.isOwner}
          title="Bold"
        >
          <strong>B</strong>
        </button>
        <button
          onClick={() => editor?.chain().focus().toggleItalic().run()}
          className={editor?.isActive('italic') ? 'active' : ''}
          disabled={!note?.isOwner}
          title="Italic"
        >
          <em>I</em>
        </button>
        <button
          onClick={() => editor?.chain().focus().toggleStrike().run()}
          className={editor?.isActive('strike') ? 'active' : ''}
          disabled={!note?.isOwner}
          title="Strikethrough"
        >
          <s>S</s>
        </button>
        <span className="toolbar-divider">|</span>
        <button
          onClick={() =>
            editor?.chain().focus().toggleHeading({ level: 1 }).run()
          }
          className={editor?.isActive('heading', { level: 1 }) ? 'active' : ''}
          disabled={!note?.isOwner}
          title="Heading 1"
        >
          H1
        </button>
        <button
          onClick={() =>
            editor?.chain().focus().toggleHeading({ level: 2 }).run()
          }
          className={editor?.isActive('heading', { level: 2 }) ? 'active' : ''}
          disabled={!note?.isOwner}
          title="Heading 2"
        >
          H2
        </button>
        <span className="toolbar-divider">|</span>
        <button
          onClick={() => editor?.chain().focus().toggleBulletList().run()}
          className={editor?.isActive('bulletList') ? 'active' : ''}
          disabled={!note?.isOwner}
          title="Bullet List"
        >
          • List
        </button>
        <button
          onClick={() => editor?.chain().focus().toggleOrderedList().run()}
          className={editor?.isActive('orderedList') ? 'active' : ''}
          disabled={!note?.isOwner}
          title="Numbered List"
        >
          1. List
        </button>
        <button
          onClick={() => editor?.chain().focus().toggleCodeBlock().run()}
          className={editor?.isActive('codeBlock') ? 'active' : ''}
          disabled={!note?.isOwner}
          title="Code Block"
        >
          {'</>'}
        </button>
      </div>

      <EditorContent editor={editor} className="editor-content" />

      <footer className="editor-footer">
        <span>
          Note ID: <code>{id}</code> — Share this URL to collaborate!
        </span>
      </footer>
    </div>
  );
}
