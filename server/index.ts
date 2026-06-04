import express from 'express';
import pg from 'pg';
import cors from 'cors';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { encrypt, decrypt } from './crypto.js';
import { initializeChatBots, restartChatBots, sendHelloToChannels, sendBotNotification, runAiChatLoop } from './botManager.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 5001;

app.use(cors());
app.use(express.json());

// Database connection configuration
const pool = new pg.Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_DATABASE,
  password: process.env.DB_PASSWORD,
  port: parseInt(process.env.DB_PORT || '5432'),
  connectionString: process.env.DATABASE_URL
});

// Helper to initialize the database using schema.sql
async function initializeDatabase() {
  try {
    const schemaPath = path.join(__dirname, 'schema.sql');
    if (fs.existsSync(schemaPath)) {
      console.log('Reading database schema from schema.sql...');
      const schemaSql = fs.readFileSync(schemaPath, 'utf8');
      await pool.query(schemaSql);
      console.log('Database initialized successfully with tables and mock data.');
    } else {
      console.warn('schema.sql not found. Skipping auto-initialization.');
    }
  } catch (error) {
    console.error('Failed to initialize database schema:', error);
  }
}

// ----------------------------------------------------
// DB Entities Fetch Helpers to assemble nesting objects
// ----------------------------------------------------

async function getUsersMap() {
  const res = await pool.query('SELECT * FROM users');
  const usersMap: Record<string, any> = {};
  res.rows.forEach(u => {
    usersMap[u.id] = {
      id: u.id,
      name: u.name,
      avatarColor: u.avatar_color,
      initials: u.initials
    };
  });
  return usersMap;
}

async function getLabelsMap() {
  const res = await pool.query('SELECT * FROM labels');
  const labelsMap: Record<string, any> = {};
  res.rows.forEach(l => {
    labelsMap[l.id] = {
      id: l.id,
      name: l.name,
      color: l.color
    };
  });
  return labelsMap;
}

async function fetchFullIssues() {
  const users = await getUsersMap();
  const labels = await getLabelsMap();

  // Query issues
  const issuesRes = await pool.query('SELECT * FROM issues ORDER BY created_at DESC');
  
  // Query all subtasks
  const subtasksRes = await pool.query('SELECT * FROM subtasks');
  const subtasksByIssue: Record<string, any[]> = {};
  subtasksRes.rows.forEach(s => {
    if (!subtasksByIssue[s.issue_id]) {
      subtasksByIssue[s.issue_id] = [];
    }
    subtasksByIssue[s.issue_id].push({
      id: s.id,
      title: s.title,
      completed: s.completed
    });
  });

  // Query all issue labels
  const issueLabelsRes = await pool.query('SELECT * FROM issue_labels');
  const labelsByIssue: Record<string, any[]> = {};
  issueLabelsRes.rows.forEach(il => {
    if (!labelsByIssue[il.issue_id]) {
      labelsByIssue[il.issue_id] = [];
    }
    const lbl = labels[il.label_id];
    if (lbl) {
      labelsByIssue[il.issue_id].push(lbl);
    }
  });

  // Assemble issues
  return issuesRes.rows.map(row => {
    return {
      id: row.id,
      title: row.title,
      description: row.description || '',
      status: row.status,
      priority: row.priority,
      assignee: row.assignee_id ? users[row.assignee_id] : undefined,
      creator: users[row.creator_id] || { id: row.creator_id, name: 'System', avatarColor: '#ccc', initials: 'SY' },
      dueDate: row.due_date || undefined,
      labels: labelsByIssue[row.id] || [],
      estimate: row.estimate !== null ? row.estimate : undefined,
      subtasks: subtasksByIssue[row.id] || [],
      projectId: row.project_id || undefined,
      createdAt: row.created_at.toISOString(),
      updatedAt: row.updated_at.toISOString()
    };
  });
}

// ----------------------------------------------------
// API ROUTES
// ----------------------------------------------------

// GET users
app.get('/api/users', async (req, res) => {
  try {
    const usersMap = await getUsersMap();
    res.json(Object.values(usersMap));
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// GET labels
app.get('/api/labels', async (req, res) => {
  try {
    const labelsMap = await getLabelsMap();
    res.json(Object.values(labelsMap));
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// GET issues
app.get('/api/issues', async (req, res) => {
  try {
    const issues = await fetchFullIssues();
    res.json(issues);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Helper to send bot notifications when a ticket is created
async function sendProjectNotification(issue: any, projectId: string | null) {
  await sendBotNotification(issue, projectId);
}

// POST issues (Create)
app.post('/api/issues', async (req, res) => {
  try {
    const { title, description, status, priority, estimate, assigneeId, labelIds, projectId } = req.body;
    
    // Auto-calculate the next issue index (LIN-X)
    const countRes = await pool.query('SELECT id FROM issues');
    const numbers = countRes.rows.map(r => parseInt(r.id.replace('LIN-', ''))).filter(n => !isNaN(n));
    const nextNum = numbers.length > 0 ? Math.max(...numbers) + 1 : 1;
    const issueId = `LIN-${nextNum}`;

    // Current user is mapped as u1 (default Win)
    const creatorId = 'u1';

    // Insert issue row
    const query = `
      INSERT INTO issues (id, title, description, status, priority, assignee_id, creator_id, estimate, project_id)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING *
    `;
    const values = [
      issueId,
      title || 'Untitled Issue',
      description || '',
      status || 'todo',
      priority || 'none',
      assigneeId || null,
      creatorId,
      estimate !== undefined ? estimate : null,
      projectId || null
    ];
    
    await pool.query(query, values);

    // Insert labels mappings if provided
    if (labelIds && Array.isArray(labelIds)) {
      for (const labelId of labelIds) {
        await pool.query(
          'INSERT INTO issue_labels (issue_id, label_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
          [issueId, labelId]
        );
      }
    }

    // Retrieve full issue details to send back to client
    const allIssues = await fetchFullIssues();
    const createdIssue = allIssues.find(i => i.id === issueId);

    // Trigger bot notifications asynchronously
    if (createdIssue && projectId) {
      sendProjectNotification(createdIssue, projectId);
    }

    res.status(201).json(createdIssue);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// PUT issues (Update)
app.put('/api/issues/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { title, description, status, priority, estimate, assigneeId, labelIds, dueDate, projectId } = req.body;

    // Check if issue exists
    const checkRes = await pool.query('SELECT * FROM issues WHERE id = $1', [id]);
    if (checkRes.rows.length === 0) {
      return res.status(404).json({ error: 'Issue not found' });
    }

    // Dynamic field updates
    const updates: string[] = [];
    const values: any[] = [];
    let valIndex = 1;

    if (title !== undefined) {
      updates.push(`title = $${valIndex++}`);
      values.push(title);
    }
    if (description !== undefined) {
      updates.push(`description = $${valIndex++}`);
      values.push(description);
    }
    if (status !== undefined) {
      updates.push(`status = $${valIndex++}`);
      values.push(status);
    }
    if (priority !== undefined) {
      updates.push(`priority = $${valIndex++}`);
      values.push(priority);
    }
    if (estimate !== undefined) {
      updates.push(`estimate = $${valIndex++}`);
      values.push(estimate === null ? null : estimate);
    }
    if (assigneeId !== undefined) {
      updates.push(`assignee_id = $${valIndex++}`);
      values.push(assigneeId === null ? null : assigneeId);
    }
    if (dueDate !== undefined) {
      updates.push(`due_date = $${valIndex++}`);
      values.push(dueDate === null ? null : dueDate);
    }
    if (projectId !== undefined) {
      updates.push(`project_id = $${valIndex++}`);
      values.push(projectId === null ? null : projectId);
    }

    // Always update updatedAt timestamp
    updates.push(`updated_at = NOW()`);

    if (updates.length > 0) {
      const updateQuery = `
        UPDATE issues 
        SET ${updates.join(', ')} 
        WHERE id = $${valIndex}
      `;
      values.push(id);
      await pool.query(updateQuery, values);
    }

    // Update labels mappings if labelIds array is supplied
    if (labelIds !== undefined && Array.isArray(labelIds)) {
      // Clear current maps
      await pool.query('DELETE FROM issue_labels WHERE issue_id = $1', [id]);
      
      // Re-insert
      for (const labelId of labelIds) {
        await pool.query(
          'INSERT INTO issue_labels (issue_id, label_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
          [id, labelId]
        );
      }
    }

    const allIssues = await fetchFullIssues();
    const updatedIssue = allIssues.find(i => i.id === id);
    res.json(updatedIssue);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// DELETE issues
app.delete('/api/issues/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const checkRes = await pool.query('SELECT * FROM issues WHERE id = $1', [id]);
    if (checkRes.rows.length === 0) {
      return res.status(404).json({ error: 'Issue not found' });
    }

    // Delete issue - cascading will drop comments, subtasks, and labels mappings
    await pool.query('DELETE FROM issues WHERE id = $1', [id]);
    res.json({ message: `Issue ${id} deleted successfully` });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// GET comments
app.get('/api/comments', async (req, res) => {
  try {
    const users = await getUsersMap();
    const commentRes = await pool.query('SELECT * FROM comments ORDER BY created_at ASC');
    
    const comments = commentRes.rows.map(row => {
      return {
        id: row.id,
        issueId: row.issue_id,
        user: users[row.user_id] || { id: row.user_id, name: 'System', avatarColor: '#ccc', initials: 'SY' },
        body: row.body,
        createdAt: row.created_at.toISOString()
      };
    });
    
    res.json(comments);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// POST comments
app.post('/api/comments', async (req, res) => {
  try {
    const { issueId, body } = req.body;
    if (!body || !body.trim()) {
      return res.status(400).json({ error: 'Comment body is required' });
    }

    const commentId = `c_${Date.now()}`;
    const userId = 'u1'; // Current user Win

    const query = `
      INSERT INTO comments (id, issue_id, user_id, body)
      VALUES ($1, $2, $3, $4)
      RETURNING *
    `;
    await pool.query(query, [commentId, issueId, userId, body]);

    const users = await getUsersMap();
    res.status(201).json({
      id: commentId,
      issueId,
      user: users[userId],
      body,
      createdAt: new Date().toISOString()
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// POST subtasks (Create)
app.post('/api/issues/:issueId/subtasks', async (req, res) => {
  try {
    const { issueId } = req.params;
    const { title } = req.body;

    if (!title || !title.trim()) {
      return res.status(400).json({ error: 'Subtask title is required' });
    }

    const subtaskId = `s_${Date.now()}`;
    const query = `
      INSERT INTO subtasks (id, issue_id, title, completed)
      VALUES ($1, $2, $3, false)
      RETURNING *
    `;
    await pool.query(query, [subtaskId, issueId, title.trim()]);

    res.status(201).json({
      id: subtaskId,
      title: title.trim(),
      completed: false
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// PUT subtasks (Update completion status/title)
app.put('/api/subtasks/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { completed, title } = req.body;

    const checkRes = await pool.query('SELECT * FROM subtasks WHERE id = $1', [id]);
    if (checkRes.rows.length === 0) {
      return res.status(404).json({ error: 'Subtask not found' });
    }

    const updates: string[] = [];
    const values: any[] = [];
    let valIndex = 1;

    if (completed !== undefined) {
      updates.push(`completed = $${valIndex++}`);
      values.push(completed);
    }
    if (title !== undefined) {
      updates.push(`title = $${valIndex++}`);
      values.push(title);
    }

    const query = `
      UPDATE subtasks 
      SET ${updates.join(', ')} 
      WHERE id = $${valIndex}
      RETURNING *
    `;
    values.push(id);
    
    const result = await pool.query(query, values);
    const row = result.rows[0];

    res.json({
      id: row.id,
      title: row.title,
      completed: row.completed
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// DELETE subtasks
app.delete('/api/subtasks/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const checkRes = await pool.query('SELECT * FROM subtasks WHERE id = $1', [id]);
    if (checkRes.rows.length === 0) {
      return res.status(404).json({ error: 'Subtask not found' });
    }

    await pool.query('DELETE FROM subtasks WHERE id = $1', [id]);
    res.json({ message: `Subtask ${id} deleted successfully` });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// GET settings
app.get('/api/settings', async (req, res) => {
  try {
    const dbRes = await pool.query('SELECT * FROM settings');
    const settings: Record<string, string> = {};
    
    const secretKeys = ['gemini_api_key', 'openai_api_key', 'anthropic_api_key', 'slack_bot_token', 'slack_app_token', 'discord_bot_token'];
    const plainKeys = ['active_ai_connector', 'gemini_model', 'openai_model', 'anthropic_model', 'ollama_base_url', 'ollama_model'];
    const allKeys = [...secretKeys, ...plainKeys];

    // Set default empty settings
    allKeys.forEach(k => {
      settings[k] = k === 'active_ai_connector' ? 'gemini' : '';
    });

    dbRes.rows.forEach(row => {
      if (secretKeys.includes(row.key)) {
        const decrypted = decrypt(row.value);
        if (decrypted) {
          settings[row.key] = '••••••••'; // mask it for the frontend
        }
      } else if (plainKeys.includes(row.key)) {
        settings[row.key] = row.value || '';
      }
    });

    res.json(settings);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// POST settings
app.post('/api/settings', async (req, res) => {
  try {
    const settings = req.body;
    const secretKeys = ['gemini_api_key', 'openai_api_key', 'anthropic_api_key', 'slack_bot_token', 'slack_app_token', 'discord_bot_token'];
    const plainKeys = ['active_ai_connector', 'gemini_model', 'openai_model', 'anthropic_model', 'ollama_base_url', 'ollama_model'];
    const allKeys = [...secretKeys, ...plainKeys];

    for (const key of allKeys) {
      const val = settings[key];
      if (val === undefined) continue;

      if (secretKeys.includes(key)) {
        if (val === '••••••••') {
          // Value was not modified, keep existing
          continue;
        }

        if (!val || !val.trim()) {
          // Cleared value
          await pool.query('DELETE FROM settings WHERE key = $1', [key]);
        } else {
          // New value, encrypt and save
          const encrypted = encrypt(val.trim());
          await pool.query(
            'INSERT INTO settings (key, value, updated_at) VALUES ($1, $2, NOW()) ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = NOW()',
            [key, encrypted]
          );
        }
      } else {
        // Plain key
        if (val === null || val === undefined || String(val).trim() === '') {
          await pool.query('DELETE FROM settings WHERE key = $1', [key]);
        } else {
          await pool.query(
            'INSERT INTO settings (key, value, updated_at) VALUES ($1, $2, NOW()) ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = NOW()',
            [key, String(val).trim()]
          );
        }
      }
    }

    // Call bot manager to restart listeners if settings change
    if (typeof restartChatBots === 'function') {
      await restartChatBots();
    }

    res.json({ message: 'Settings saved successfully' });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// POST chat (Copilot AI Chatbot)
app.post('/api/chat', async (req, res) => {
  try {
    const { messages, projectId } = req.body;
    if (!messages || !Array.isArray(messages)) {
      return res.status(400).json({ error: 'Messages must be a valid array' });
    }

    console.log(`[Copilot Chat] Received request with ${messages.length} messages, project: ${projectId}`);

    const systemPrompt = `You are a professional project manager AI assistant integrated into the Linear Clone web application workspace.
You help the user manage tasks, issues, and tickets in their workspace.
You have access to tools to list issues, create tickets, update issues, add comments, and manage subtasks.

Rules:
1. When asked to create a ticket, you MUST have both a clear title and description. If either is missing or unclear, call the 'ask_for_clarification' tool. Do NOT guess or make up fields.
2. If you execute tools, explain the outcome clearly to the user.
3. Keep responses helpful and concise. Use markdown formatting.
4. The current project ID is: ${projectId || 'null'}. When calling tools, default to this project ID if applicable.`;

    const responseText = await runAiChatLoop(messages, projectId || '', systemPrompt);

    res.json({ text: responseText });
  } catch (error: any) {
    console.error('[Copilot Chat Error]', error);
    res.status(500).json({ error: error.message || String(error) });
  }
});

// GET projects
app.get('/api/projects', async (req, res) => {
  try {
    const projectsRes = await pool.query('SELECT * FROM projects ORDER BY created_at DESC');
    const usersMap = await getUsersMap();

    // Fetch project member links
    const membersRes = await pool.query('SELECT * FROM project_members');
    const membersByProject: Record<string, any[]> = {};
    membersRes.rows.forEach(m => {
      if (!membersByProject[m.project_id]) {
        membersByProject[m.project_id] = [];
      }
      const usr = usersMap[m.user_id];
      if (usr) {
        membersByProject[m.project_id].push(usr);
      }
    });

    const projects = projectsRes.rows.map(row => ({
      id: row.id,
      name: row.name,
      description: row.description || '',
      goal: row.goal || '',
      slackChannel: row.slack_channel || '',
      slackPrivilege: row.slack_privilege || 'disabled',
      discordChannel: row.discord_channel || '',
      discordPrivilege: row.discord_privilege || 'disabled',
      createdAt: row.created_at.toISOString(),
      members: membersByProject[row.id] || []
    }));

    res.json(projects);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// POST projects
app.post('/api/projects', async (req, res) => {
  try {
    const {
      name,
      description,
      goal,
      slackChannel,
      slackPrivilege,
      discordChannel,
      discordPrivilege,
      memberIds
    } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'Project name is required' });
    }

    const projectId = `p_${Date.now()}`;

    const query = `
      INSERT INTO projects (
        id, name, description, goal, 
        slack_webhook_url, slack_channel, slack_privilege, 
        discord_webhook_url, discord_channel, discord_privilege
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING *
    `;
    const values = [
      projectId,
      name.trim(),
      description || null,
      goal || null,
      null, // slack_webhook_url (removed)
      slackChannel || null,
      slackPrivilege || 'disabled',
      null, // discord_webhook_url (removed)
      discordChannel || null,
      discordPrivilege || 'disabled'
    ];

    const result = await pool.query(query, values);
    const project = result.rows[0];

    // Insert project members
    if (memberIds && Array.isArray(memberIds)) {
      for (const userId of memberIds) {
        await pool.query(
          'INSERT INTO project_members (project_id, user_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
          [projectId, userId]
        );
      }
    }

    // Fetch users map to return member details
    const usersMap = await getUsersMap();
    const projectMembers = (memberIds || []).map((uid: string) => usersMap[uid]).filter(Boolean);

    // Call bot manager to restart listeners if channels change
    if (typeof restartChatBots === 'function') {
      await restartChatBots();
    }

    res.status(201).json({
      id: project.id,
      name: project.name,
      description: project.description || '',
      goal: project.goal || '',
      slackChannel: project.slack_channel || '',
      slackPrivilege: project.slack_privilege || 'disabled',
      discordChannel: project.discord_channel || '',
      discordPrivilege: project.discord_privilege || 'disabled',
      createdAt: project.created_at ? (project.created_at instanceof Date ? project.created_at.toISOString() : new Date(project.created_at).toISOString()) : new Date().toISOString(),
      members: projectMembers
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// PUT projects
app.put('/api/projects/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const {
      name,
      description,
      goal,
      slackChannel,
      slackPrivilege,
      discordChannel,
      discordPrivilege,
      memberIds
    } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'Project name is required' });
    }

    // Verify project exists
    const checkRes = await pool.query('SELECT * FROM projects WHERE id = $1', [id]);
    if (checkRes.rows.length === 0) {
      return res.status(404).json({ error: 'Project not found' });
    }

    const query = `
      UPDATE projects
      SET 
        name = $1,
        description = $2,
        goal = $3,
        slack_webhook_url = $4,
        slack_channel = $5,
        slack_privilege = $6,
        discord_webhook_url = $7,
        discord_channel = $8,
        discord_privilege = $9
      WHERE id = $10
      RETURNING *
    `;
    const values = [
      name.trim(),
      description || null,
      goal || null,
      null, // slack_webhook_url (removed)
      slackChannel || null,
      slackPrivilege || 'disabled',
      null, // discord_webhook_url (removed)
      discordChannel || null,
      discordPrivilege || 'disabled',
      id
    ];

    const result = await pool.query(query, values);
    const project = result.rows[0];

    // Synchronize members: Delete existing and add new
    await pool.query('DELETE FROM project_members WHERE project_id = $1', [id]);
    if (memberIds && Array.isArray(memberIds)) {
      for (const userId of memberIds) {
        await pool.query(
          'INSERT INTO project_members (project_id, user_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
          [id, userId]
        );
      }
    }

    // Fetch users map to return member details
    const usersMap = await getUsersMap();
    const projectMembers = (memberIds || []).map((uid: string) => usersMap[uid]).filter(Boolean);

    // Call bot manager to restart listeners if settings change
    if (typeof restartChatBots === 'function') {
      await restartChatBots();
    }

    res.json({
      id: project.id,
      name: project.name,
      description: project.description || '',
      goal: project.goal || '',
      slackChannel: project.slack_channel || '',
      slackPrivilege: project.slack_privilege || 'disabled',
      discordChannel: project.discord_channel || '',
      discordPrivilege: project.discord_privilege || 'disabled',
      createdAt: project.created_at.toISOString(),
      members: projectMembers
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});


// POST project hello connection test
app.post('/api/projects/:id/send-hello', async (req, res) => {
  try {
    const { id } = req.params;
    const projectRes = await pool.query('SELECT * FROM projects WHERE id = $1', [id]);
    if (projectRes.rows.length === 0) {
      return res.status(404).json({ error: 'Project not found' });
    }
    const project = projectRes.rows[0];
    const status = await sendHelloToChannels(project);
    res.json(status);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});


// Start Express Server
app.listen(PORT, async () => {
  console.log(`Server is running at http://localhost:${PORT}`);
  // Run DB schemas initialization on boot
  await initializeDatabase();
  
  // Initialize chatbot listeners asynchronously
  try {
    await initializeChatBots();
  } catch (err) {
    console.error('Failed to initialize chatbot listeners:', err);
  }
});
