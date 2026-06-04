-- Drop tables if needed for full clean reset (commented out by default)
-- DROP TABLE IF EXISTS comments;
-- DROP TABLE IF EXISTS subtasks;
-- DROP TABLE IF EXISTS issue_labels;
-- DROP TABLE IF EXISTS issues;
-- DROP TABLE IF EXISTS labels;
-- DROP TABLE IF EXISTS users;

-- Create Users Table
CREATE TABLE IF NOT EXISTS users (
    id VARCHAR(50) PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    avatar_color VARCHAR(50) NOT NULL,
    initials VARCHAR(10) NOT NULL
);

-- Create Labels Table
CREATE TABLE IF NOT EXISTS labels (
    id VARCHAR(50) PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    color VARCHAR(50) NOT NULL
);

-- Create Issues Table
CREATE TABLE IF NOT EXISTS issues (
    id VARCHAR(50) PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    status VARCHAR(50) NOT NULL,
    priority VARCHAR(50) NOT NULL,
    assignee_id VARCHAR(50) REFERENCES users(id) ON DELETE SET NULL,
    creator_id VARCHAR(50) NOT NULL REFERENCES users(id),
    estimate INTEGER,
    due_date VARCHAR(50),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create Issue Labels Join Table
CREATE TABLE IF NOT EXISTS issue_labels (
    issue_id VARCHAR(50) REFERENCES issues(id) ON DELETE CASCADE,
    label_id VARCHAR(50) REFERENCES labels(id) ON DELETE CASCADE,
    PRIMARY KEY (issue_id, label_id)
);

-- Create Subtasks Table
CREATE TABLE IF NOT EXISTS subtasks (
    id VARCHAR(50) PRIMARY KEY,
    issue_id VARCHAR(50) NOT NULL REFERENCES issues(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    completed BOOLEAN NOT NULL DEFAULT FALSE
);

-- Create Comments Table
CREATE TABLE IF NOT EXISTS comments (
    id VARCHAR(50) PRIMARY KEY,
    issue_id VARCHAR(50) NOT NULL REFERENCES issues(id) ON DELETE CASCADE,
    user_id VARCHAR(50) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    body TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create Settings Table
CREATE TABLE IF NOT EXISTS settings (
    key VARCHAR(100) PRIMARY KEY,
    value TEXT NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create Projects Table
CREATE TABLE IF NOT EXISTS projects (
    id VARCHAR(50) PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    goal TEXT,
    slack_webhook_url TEXT,
    slack_channel VARCHAR(100),
    slack_privilege VARCHAR(50) DEFAULT 'disabled',
    discord_webhook_url TEXT,
    discord_channel VARCHAR(100),
    discord_privilege VARCHAR(50) DEFAULT 'disabled',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create Project Members Table
CREATE TABLE IF NOT EXISTS project_members (
    project_id VARCHAR(50) REFERENCES projects(id) ON DELETE CASCADE,
    user_id VARCHAR(50) REFERENCES users(id) ON DELETE CASCADE,
    PRIMARY KEY (project_id, user_id)
);

-- Link Issues to Projects
ALTER TABLE issues ADD COLUMN IF NOT EXISTS project_id VARCHAR(50) REFERENCES projects(id) ON DELETE SET NULL;

-- Seed Initial Mock Users
INSERT INTO users (id, name, avatar_color, initials) VALUES
('u1', 'Win (You)', '#5e6ad2', 'WI'),
('u2', 'Alex River', '#da70d6', 'AR'),
('u3', 'Sarah Vance', '#8a2be2', 'SV'),
('u4', 'James Kim', '#d97706', 'JK')
ON CONFLICT (id) DO UPDATE SET 
  name = EXCLUDED.name, 
  avatar_color = EXCLUDED.avatar_color, 
  initials = EXCLUDED.initials;

-- Seed Initial Mock Labels
INSERT INTO labels (id, name, color) VALUES
('l1', 'bug', '#e24848'),
('l2', 'feature', '#5e6ad2'),
('l3', 'refactor', '#8a2be2'),
('l4', 'security', '#da70d6'),
('l5', 'documentation', '#6e7681')
ON CONFLICT (id) DO UPDATE SET 
  name = EXCLUDED.name, 
  color = EXCLUDED.color;

-- Seed Initial Mock Issues
INSERT INTO issues (id, title, description, status, priority, assignee_id, creator_id, estimate, created_at, updated_at) VALUES
('LIN-1', 'Implement JWT Token refresh flow in client', '### User Story
As a developer, I want the client authentication state to automatically refresh when the short-lived access token expires, so that the session is secure and users don''t face sudden logouts.

### Acceptance Criteria
- [x] Detect 401 status on API calls.
- [ ] Call \`/auth/refresh\` endpoint with HttpOnly refresh cookie.
- [ ] Retry original request on success.
- [ ] Redirect to sign-in page if refresh token is expired or invalid.

### Technical Notes
Verify state updates and session duration trackers.', 'in_progress', 'high', 'u1', 'u3', 3, NOW() - INTERVAL '3 days', NOW() - INTERVAL '2 hours'),

('LIN-2', 'Fix memory leak in board view rerendering', '### Bug Context
A memory leak was reported during heavy drag-and-drop actions on the Kanban columns. Heap profiling shows unmounted cards still holding references to drag events.

### Steps to Reproduce
1. Open Task Board View.
2. Drag cards back and forth between columns.
3. Observe increasing memory layout in Chrome DevTools performance monitor.

### Expected Behavior
Event listeners should properly detach upon card cleanups.', 'todo', 'urgent', 'u2', 'u1', 8, NOW() - INTERVAL '1 day', NOW() - INTERVAL '4 hours'),

('LIN-3', 'Draft product release guide for v1.2', 'Draft detailed documentation outlining features, breaking changes, and deployment protocols for our upcoming v1.2 release.', 'backlog', 'low', NULL, 'u3', 1, NOW() - INTERVAL '5 days', NOW() - INTERVAL '5 days'),

('LIN-4', 'Optimize database indexes on issues table', 'Add composite indexes on `status`, `assignee_id`, and `created_at` fields to accelerate core workspace queries. Currently, fetching issues counts takes > 250ms when database holds > 10k items.', 'done', 'medium', 'u3', 'u2', 5, NOW() - INTERVAL '10 days', NOW() - INTERVAL '8 days')
ON CONFLICT (id) DO NOTHING;

-- Seed Initial Issue Labels Mapping
INSERT INTO issue_labels (issue_id, label_id) VALUES
('LIN-1', 'l2'), -- LIN-1 has 'feature'
('LIN-1', 'l4'), -- LIN-1 has 'security'
('LIN-2', 'l1'), -- LIN-2 has 'bug'
('LIN-2', 'l3'), -- LIN-2 has 'refactor'
('LIN-3', 'l5'), -- LIN-3 has 'documentation'
('LIN-4', 'l3')  -- LIN-4 has 'refactor'
ON CONFLICT (issue_id, label_id) DO NOTHING;

-- Seed Initial Subtasks
INSERT INTO subtasks (id, issue_id, title, completed) VALUES
('s1', 'LIN-1', 'Detect 401 status on API calls', true),
('s2', 'LIN-1', 'Call /auth/refresh endpoint', false),
('s3', 'LIN-1', 'Retry failed request on refresh success', false),
('s4', 'LIN-2', 'Analyze heap profile in DevTools', false),
('s5', 'LIN-2', 'Unsubscribe event listeners in card components', false),
('s6', 'LIN-4', 'Create EXPLAIN query benchmarks', true),
('s7', 'LIN-4', 'Apply database index migration script', true)
ON CONFLICT (id) DO NOTHING;

-- Seed Initial Comments
INSERT INTO comments (id, issue_id, user_id, body, created_at) VALUES
('c1', 'LIN-1', 'u3', 'I already set up the basic router endpoint for /auth/refresh yesterday. It checks the HTTPS cookies correctly.', NOW() - INTERVAL '10 hours'),
('c2', 'LIN-1', 'u1', 'Awesome! That speeds up the client implementation. I will start testing it with Axios interceptors.', NOW() - INTERVAL '9 hours')
ON CONFLICT (id) DO NOTHING;

-- Seed Initial Projects
INSERT INTO projects (id, name, description, goal, slack_webhook_url, slack_channel, slack_privilege, discord_webhook_url, discord_channel, discord_privilege) VALUES
('p1', 'Linear Integration', 'Integrating Slack and Discord MCP servers and AI assisting functionalities.', 'Connect channel conversations directly to ticket workflows.', NULL, 'general', 'read_write', NULL, 'general', 'read_write'),
('p2', 'Database Migrations', 'Upgrading backend state to use PostgreSQL.', 'Switch entirely from local state to production-grade DB.', NULL, 'database-logs', 'read_only', NULL, 'database-logs', 'disabled')
ON CONFLICT (id) DO NOTHING;

-- Seed Project Members
INSERT INTO project_members (project_id, user_id) VALUES
('p1', 'u1'), ('p1', 'u2'), ('p1', 'u3'),
('p2', 'u3'), ('p2', 'u4')
ON CONFLICT DO NOTHING;

-- Link existing issues to projects
UPDATE issues SET project_id = 'p1' WHERE id IN ('LIN-1', 'LIN-3') AND project_id IS NULL;
UPDATE issues SET project_id = 'p2' WHERE id = 'LIN-2' AND project_id IS NULL;

