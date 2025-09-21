import { nanoid } from '../lib/nanoid.js';
import { readJSON, writeJSON } from '../lib/db.js';

export const sectionRoutes = [
  {
    method: 'GET',
    path: '/api/sections',
    handler: async (req, res) => {
      const sections = await readJSON('sections.json');
      res.json(sections);
    }
  },
  {
    method: 'POST',
    path: '/api/sections',
    handler: async (req, res) => {
      const { title, color, userId } = req.body;
      if (!title) {
        throw new Error('Title required');
      }
      const sections = await readJSON('sections.json');
      const newSection = {
        id: nanoid(),
        title,
        color: color || '#6272a4',
        userId: userId || 'demo-user',
        createdAt: new Date().toISOString()
      };
      sections.push(newSection);
      await writeJSON('sections.json', sections);
      res.status(201).json(newSection);
    }
  },
  {
    method: 'PUT',
    path: '/api/sections/:id',
    handler: async (req, res) => {
      const { id } = req.params;
      const sections = await readJSON('sections.json');
      if (!sections.some((section) => section.id === id)) {
        throw new Error('Section not found');
      }
      const updated = sections.map((section) => (section.id === id ? { ...section, ...req.body } : section));
      await writeJSON('sections.json', updated);
      res.json(updated.find((section) => section.id === id));
    }
  },
  {
    method: 'DELETE',
    path: '/api/sections/:id',
    handler: async (req, res) => {
      const { id } = req.params;
      const sections = await readJSON('sections.json');
      const filtered = sections.filter((section) => section.id !== id);
      if (filtered.length === sections.length) {
        throw new Error('Section not found');
      }
      await writeJSON('sections.json', filtered);
      res.status(204).json({});
    }
  }
];
