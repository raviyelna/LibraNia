import express from 'express';
import * as path from 'path';
import * as fs from 'fs';
import {
  initFileStorage,
  createNote,
  updateNote,
  getNoteById,
  getAllNotes,
  deleteNote,
  restoreNote,
} from './electron/services/file-storage.service';

const app = express();
app.use(express.json());

// Initialize file storage
const storageDir = path.join(process.cwd(), 'test-storage');
if (!fs.existsSync(storageDir)) {
  fs.mkdirSync(storageDir, { recursive: true });
}
initFileStorage(storageDir);

// GET /notes - Get all notes
app.get('/notes', (req, res) => {
  try {
    const notes = getAllNotes();
    res.json({ success: true, data: notes });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET /notes/:id - Get note by ID
app.get('/notes/:id', (req, res) => {
  try {
    const note = getNoteById(req.params.id);
    if (!note) {
      return res.status(404).json({ success: false, error: 'Note not found' });
    }
    res.json({ success: true, data: note });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST /notes - Create note
app.post('/notes', (req, res) => {
  try {
    const { title, body, metadata } = req.body;
    if (!title || !body) {
      return res.status(400).json({ success: false, error: 'title and body required' });
    }
    const note = createNote({ title, body, metadata });
    res.json({ success: true, data: note });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// PATCH /notes/:id - Update note
app.patch('/notes/:id', (req, res) => {
  try {
    const { title, body, metadata } = req.body;
    const note = updateNote(req.params.id, { title, body, metadata });
    res.json({ success: true, data: note });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// DELETE /notes/:id - Delete note
app.delete('/notes/:id', (req, res) => {
  try {
    const deleted = deleteNote(req.params.id);
    if (!deleted) {
      return res.status(404).json({ success: false, error: 'Note not found' });
    }
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST /notes/:id/restore - Restore deleted note
app.post('/notes/:id/restore', (req, res) => {
  try {
    const note = restoreNote(req.params.id);
    res.json({ success: true, data: note });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

const PORT = 3000;
app.listen(PORT, () => {
  console.log(`\n✅ Test API running on http://localhost:${PORT}`);
  console.log(`📁 Storage directory: ${storageDir}\n`);
  console.log('Test commands:');
  console.log('  curl -X POST http://localhost:3000/notes -H "Content-Type: application/json" -d "{\\"title\\":\\"Test\\",\\"body\\":\\"Hello\\"}"');
  console.log('  curl http://localhost:3000/notes');
  console.log('  curl -X PATCH http://localhost:3000/notes/<ID> -H "Content-Type: application/json" -d "{\\"body\\":\\"Updated\\"}"');
  console.log('  curl -X DELETE http://localhost:3000/notes/<ID>');
});
