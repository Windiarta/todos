export type IssueStatus = 'backlog' | 'todo' | 'in_progress' | 'done' | 'canceled';

export type IssuePriority = 'none' | 'low' | 'medium' | 'high' | 'urgent';

export interface User {
  id: string;
  name: string;
  avatarColor: string; // Tailwind/CSS color class or hex code
  initials: string;
}

export interface Label {
  id: string;
  name: string;
  color: string; // CSS custom variable or hex code
}

export interface Subtask {
  id: string;
  title: string;
  completed: boolean;
}

export interface Comment {
  id: string;
  issueId: string;
  user: User;
  body: string;
  createdAt: string;
}

export interface Issue {
  id: string;
  title: string;
  description: string;
  status: IssueStatus;
  priority: IssuePriority;
  assignee?: User;
  creator: User;
  dueDate?: string;
  labels: Label[];
  estimate?: number; // Story points
  subtasks: Subtask[];
  projectId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Project {
  id: string;
  name: string;
  description?: string;
  goal?: string;
  slackChannel?: string;
  slackPrivilege: 'disabled' | 'read_only' | 'read_write';
  discordChannel?: string;
  discordPrivilege: 'disabled' | 'read_only' | 'read_write';
  createdAt: string;
  members: User[];
}

export type ViewType = 'list' | 'board';
export type FilterType = 'all' | 'my_issues' | 'inbox' | 'urgent';

export interface CopilotMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  isExecuting?: boolean;
}
