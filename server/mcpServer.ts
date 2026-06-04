import pg from 'pg';
import dotenv from 'dotenv';
import { decrypt } from './crypto.js';

dotenv.config();

// Re-use same database configuration
const pool = new pg.Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_DATABASE,
  password: process.env.DB_PASSWORD,
  port: parseInt(process.env.DB_PORT || '5432'),
  connectionString: process.env.DATABASE_URL
});

// Tool schemas compliant with Model Context Protocol
export const mcpTools = [
  {
    name: 'create_ticket',
    description: 'Creates a new ticket in the database. Call this ONLY when both title and description are clearly known.',
    inputSchema: {
      type: 'object',
      properties: {
        title: {
          type: 'string',
          description: 'A brief, descriptive summary of the issue.'
        },
        description: {
          type: 'string',
          description: 'A detailed description of the issue, reproducing steps, context, or requirements.'
        },
        priority: {
          type: 'string',
          enum: ['none', 'low', 'medium', 'high', 'urgent'],
          description: 'The priority of the ticket. Defaults to none.'
        },
        projectId: {
          type: 'string',
          description: 'The associated project ID, if available.'
        }
      },
      required: ['title', 'description']
    }
  },
  {
    name: 'list_issues',
    description: 'Lists or searches issues in the database with optional filters.',
    inputSchema: {
      type: 'object',
      properties: {
        projectId: {
          type: 'string',
          description: 'Filter issues by project ID.'
        },
        status: {
          type: 'string',
          enum: ['backlog', 'todo', 'in_progress', 'done'],
          description: 'Filter issues by status.'
        },
        assigneeId: {
          type: 'string',
          description: 'Filter issues by assignee ID (e.g. u1, u2, u3, u4).'
        },
        priority: {
          type: 'string',
          enum: ['none', 'low', 'medium', 'high', 'urgent'],
          description: 'Filter issues by priority.'
        }
      }
    }
  },
  {
    name: 'update_issue',
    description: 'Updates details of an existing issue in the database.',
    inputSchema: {
      type: 'object',
      properties: {
        issueId: {
          type: 'string',
          description: 'The ID of the issue to update (e.g., LIN-1).'
        },
        title: {
          type: 'string',
          description: 'Updated brief summary of the issue.'
        },
        description: {
          type: 'string',
          description: 'Updated detailed description of the issue.'
        },
        status: {
          type: 'string',
          enum: ['backlog', 'todo', 'in_progress', 'done'],
          description: 'Updated status of the issue.'
        },
        priority: {
          type: 'string',
          enum: ['none', 'low', 'medium', 'high', 'urgent'],
          description: 'Updated priority of the issue.'
        },
        estimate: {
          type: 'integer',
          description: 'Updated estimation points/hours.'
        },
        assigneeId: {
          type: 'string',
          description: 'Updated assignee ID, or null to unassign.'
        }
      },
      required: ['issueId']
    }
  },
  {
    name: 'add_comment',
    description: 'Posts a comment to an issue thread.',
    inputSchema: {
      type: 'object',
      properties: {
        issueId: {
          type: 'string',
          description: 'The ID of the issue (e.g., LIN-1).'
        },
        body: {
          type: 'string',
          description: 'The text body of the comment.'
        },
        userId: {
          type: 'string',
          description: 'The ID of the user posting the comment (defaults to u1).'
        }
      },
      required: ['issueId', 'body']
    }
  },
  {
    name: 'manage_subtasks',
    description: 'Adds, removes, or toggles completion of subtasks of an issue.',
    inputSchema: {
      type: 'object',
      properties: {
        issueId: {
          type: 'string',
          description: 'The ID of the issue (e.g., LIN-1).'
        },
        action: {
          type: 'string',
          enum: ['add', 'remove', 'toggle'],
          description: 'The action to perform on subtasks.'
        },
        title: {
          type: 'string',
          description: 'The title of the new subtask (required for action: add).'
        },
        subtaskId: {
          type: 'string',
          description: 'The ID of the subtask to remove or toggle.'
        },
        completed: {
          type: 'boolean',
          description: 'Set completion state (optional, defaults to false on add).'
        }
      },
      required: ['issueId', 'action']
    }
  },
  {
    name: 'ask_for_clarification',
    description: 'Call this tool when either the title or description of the issue is missing or unclear in the chat conversation. Do NOT guess or make assumptions.',
    inputSchema: {
      type: 'object',
      properties: {
        question: {
          type: 'string',
          description: 'The response message asking the user to provide the missing title, description, or other details. Be polite and specific.'
        }
      },
      required: ['question']
    }
  }
];

// Tool executors
export async function executeTool(name: string, args: any): Promise<any> {
  console.log(`MCP Executing tool: ${name}`, args);

  if (name === 'create_ticket') {
    const { title, description, priority, projectId } = args;

    if (!title || !title.trim()) {
      throw new Error('Missing title field');
    }
    if (!description || !description.trim()) {
      throw new Error('Missing description field');
    }

    // Auto-calculate the next issue index (LIN-X)
    const countRes = await pool.query('SELECT id FROM issues');
    const numbers = countRes.rows.map(r => parseInt(r.id.replace('LIN-', ''))).filter(n => !isNaN(n));
    const nextNum = numbers.length > 0 ? Math.max(...numbers) + 1 : 1;
    const issueId = `LIN-${nextNum}`;

    // Bot creator mapping
    const creatorId = 'u1'; // Default system user

    const query = `
      INSERT INTO issues (id, title, description, status, priority, assignee_id, creator_id, estimate, project_id)
      VALUES ($1, $2, $3, 'todo', $4, null, $5, null, $6)
      RETURNING *
    `;
    const values = [
      issueId,
      title.trim(),
      description.trim(),
      priority || 'none',
      creatorId,
      projectId || null
    ];

    const result = await pool.query(query, values);
    const createdIssue = result.rows[0];

    // Trigger chatbot notification asynchronously (via dynamic import to avoid circular dependency)
    try {
      if (projectId) {
        const { sendBotNotification } = await import('./botManager.js');
        await sendBotNotification(createdIssue, projectId);
      }
    } catch (e) {
      console.error('Failed to trigger bot notification from create_ticket:', e);
    }

    return {
      success: true,
      ticketId: issueId,
      title: createdIssue.title,
      description: createdIssue.description,
      priority: createdIssue.priority
    };
  }

  if (name === 'list_issues') {
    const { projectId, status, assigneeId, priority } = args;
    let query = 'SELECT * FROM issues WHERE 1=1';
    const values: any[] = [];
    let paramIndex = 1;

    if (projectId) {
      query += ` AND project_id = $${paramIndex++}`;
      values.push(projectId);
    }
    if (status) {
      query += ` AND status = $${paramIndex++}`;
      values.push(status);
    }
    if (assigneeId) {
      query += ` AND assignee_id = $${paramIndex++}`;
      values.push(assigneeId);
    }
    if (priority) {
      query += ` AND priority = $${paramIndex++}`;
      values.push(priority);
    }

    query += ' ORDER BY created_at DESC';
    const dbRes = await pool.query(query, values);
    return dbRes.rows;
  }

  if (name === 'update_issue') {
    const { issueId, title, description, status, priority, estimate, assigneeId } = args;

    // Check if issue exists
    const checkRes = await pool.query('SELECT * FROM issues WHERE id = $1', [issueId]);
    if (checkRes.rows.length === 0) {
      throw new Error(`Issue ${issueId} not found.`);
    }

    const current = checkRes.rows[0];
    const fieldsToUpdate: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    if (title !== undefined) {
      fieldsToUpdate.push(`title = $${paramIndex++}`);
      values.push(title);
    }
    if (description !== undefined) {
      fieldsToUpdate.push(`description = $${paramIndex++}`);
      values.push(description);
    }
    if (status !== undefined) {
      fieldsToUpdate.push(`status = $${paramIndex++}`);
      values.push(status);
    }
    if (priority !== undefined) {
      fieldsToUpdate.push(`priority = $${paramIndex++}`);
      values.push(priority);
    }
    if (estimate !== undefined) {
      fieldsToUpdate.push(`estimate = $${paramIndex++}`);
      values.push(estimate);
    }
    if (assigneeId !== undefined) {
      fieldsToUpdate.push(`assignee_id = $${paramIndex++}`);
      values.push(assigneeId === 'null' || assigneeId === null ? null : assigneeId);
    }

    if (fieldsToUpdate.length === 0) {
      return { success: true, message: 'No fields updated.', issue: current };
    }

    values.push(issueId);
    const updateQuery = `
      UPDATE issues 
      SET ${fieldsToUpdate.join(', ')}, updated_at = NOW() 
      WHERE id = $${paramIndex} 
      RETURNING *
    `;
    const result = await pool.query(updateQuery, values);
    const updatedIssue = result.rows[0];

    // Trigger chatbot notification asynchronously (via dynamic import to avoid circular dependency)
    try {
      if (updatedIssue.project_id) {
        const { sendBotNotification } = await import('./botManager.js');
        await sendBotNotification(updatedIssue, updatedIssue.project_id);
      }
    } catch (e) {
      console.error('Failed to trigger bot notification from update_issue:', e);
    }

    return { success: true, issue: updatedIssue };
  }

  if (name === 'add_comment') {
    const { issueId, body, userId } = args;
    const commentId = `c_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const authorId = userId || 'u1'; // fallback to user u1

    // Check if issue exists
    const checkRes = await pool.query('SELECT * FROM issues WHERE id = $1', [issueId]);
    if (checkRes.rows.length === 0) {
      throw new Error(`Issue ${issueId} not found.`);
    }

    const query = `
      INSERT INTO comments (id, issue_id, user_id, body, created_at)
      VALUES ($1, $2, $3, $4, NOW())
      RETURNING *
    `;
    const result = await pool.query(query, [commentId, issueId, authorId, body]);
    return { success: true, comment: result.rows[0] };
  }

  if (name === 'manage_subtasks') {
    const { issueId, action, title, subtaskId, completed } = args;

    // Check if issue exists
    const checkRes = await pool.query('SELECT * FROM issues WHERE id = $1', [issueId]);
    if (checkRes.rows.length === 0) {
      throw new Error(`Issue ${issueId} not found.`);
    }

    if (action === 'add') {
      if (!title || !title.trim()) {
        throw new Error('Title is required to add a subtask.');
      }
      const newSubtaskId = `s_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
      const query = `
        INSERT INTO subtasks (id, issue_id, title, completed)
        VALUES ($1, $2, $3, $4)
        RETURNING *
      `;
      const result = await pool.query(query, [newSubtaskId, issueId, title.trim(), completed || false]);
      return { success: true, action: 'add', subtask: result.rows[0] };
    }

    if (action === 'remove') {
      if (!subtaskId) {
        throw new Error('subtaskId is required to remove a subtask.');
      }
      const result = await pool.query('DELETE FROM subtasks WHERE id = $1 AND issue_id = $2 RETURNING *', [subtaskId, issueId]);
      if (result.rows.length === 0) {
        throw new Error(`Subtask ${subtaskId} not found on issue ${issueId}.`);
      }
      return { success: true, action: 'remove', deletedId: subtaskId };
    }

    if (action === 'toggle') {
      if (!subtaskId) {
        throw new Error('subtaskId is required to toggle a subtask.');
      }
      let updateQuery = '';
      let values = [];
      if (completed !== undefined) {
        updateQuery = 'UPDATE subtasks SET completed = $1 WHERE id = $2 AND issue_id = $3 RETURNING *';
        values = [completed, subtaskId, issueId];
      } else {
        updateQuery = 'UPDATE subtasks SET completed = NOT completed WHERE id = $1 AND issue_id = $2 RETURNING *';
        values = [subtaskId, issueId];
      }
      const result = await pool.query(updateQuery, values);
      if (result.rows.length === 0) {
        throw new Error(`Subtask ${subtaskId} not found on issue ${issueId}.`);
      }
      return { success: true, action: 'toggle', subtask: result.rows[0] };
    }

    throw new Error(`Unknown subtask action: ${action}`);
  }

  if (name === 'ask_for_clarification') {
    const { question } = args;
    return {
      success: false,
      clarificationRequired: true,
      question
    };
  }

  throw new Error(`Unknown tool: ${name}`);
}

// Stdin/Stdout JSON-RPC 2.0 protocol support for MCP client compatibility
if (process.argv[1] && (process.argv[1].endsWith('mcpServer.ts') || process.argv[1].endsWith('mcpServer.js'))) {
  console.error('MCP Server starting on stdio...');

  process.stdin.setEncoding('utf8');
  process.stdin.on('data', async (chunk) => {
    try {
      const lines = chunk.toString().split('\n').filter(l => l.trim());
      for (const line of lines) {
        const message = JSON.parse(line);
        if (message.jsonrpc !== '2.0') continue;

        if (message.method === 'tools/list') {
          process.stdout.write(JSON.stringify({
            jsonrpc: '2.0',
            id: message.id,
            result: { tools: mcpTools }
          }) + '\n');
        } else if (message.method === 'tools/call') {
          try {
            const result = await executeTool(message.params.name, message.params.arguments);
            process.stdout.write(JSON.stringify({
              jsonrpc: '2.0',
              id: message.id,
              result: {
                content: [{
                  type: 'text',
                  text: JSON.stringify(result)
                }]
              }
            }) + '\n');
          } catch (err: any) {
            process.stdout.write(JSON.stringify({
              jsonrpc: '2.0',
              id: message.id,
              error: {
                code: -32603,
                message: err.message
              }
            }) + '\n');
          }
        }
      }
    } catch (e) {
      console.error('Failed to parse stdin input:', e);
    }
  });
}
