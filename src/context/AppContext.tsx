import React, { createContext, useContext, useState, useEffect } from 'react';
import type { Issue, IssueStatus, IssuePriority, User, Label, Comment, ViewType, FilterType, Project, CopilotMessage } from '../types';

interface AppContextProps {
  issues: Issue[];
  activeIssue: Issue | null;
  searchQuery: string;
  viewType: ViewType;
  filterType: FilterType;
  users: User[];
  labels: Label[];
  currentUser: User;
  comments: Comment[];
  isCreateModalOpen: boolean;
  isCommandMenuOpen: boolean;
  theme: 'dark' | 'light' | 'dawn' | 'dusk';
  
  // Projects and Settings
  projects: Project[];
  activeProjectId: string | null;
  setActiveProjectId: (id: string | null) => void;
  isSettingsOpen: boolean;
  toggleSettings: (open?: boolean) => void;
  saveSettings: (settings: Record<string, string>) => Promise<void>;
  fetchSettings: () => Promise<Record<string, string>>;
  isCreateProjectOpen: boolean;
  toggleCreateProject: (open?: boolean) => void;
  createProject: (data: {
    name: string;
    description?: string;
    goal?: string;
    slackChannel?: string;
    slackPrivilege: string;
    discordChannel?: string;
    discordPrivilege: string;
    memberIds: string[];
  }) => Promise<Project>;
  isEditProjectOpen: boolean;
  projectToEdit: Project | null;
  toggleEditProject: (open?: boolean, project?: Project) => void;
  updateProject: (id: string, data: {
    name: string;
    description?: string;
    goal?: string;
    slackChannel?: string;
    slackPrivilege: string;
    discordChannel?: string;
    discordPrivilege: string;
    memberIds: string[];
  }) => Promise<Project>;

  createIssue: (data: {
    title: string;
    description: string;
    status: IssueStatus;
    priority: IssuePriority;
    estimate?: number;
    labelIds: string[];
    assigneeId?: string;
    projectId?: string;
  }) => Promise<Issue>;
  updateIssue: (id: string, updates: Partial<Issue>) => void;
  deleteIssue: (id: string) => void;
  addComment: (issueId: string, body: string) => void;
  addSubtask: (issueId: string, title: string) => void;
  toggleSubtask: (issueId: string, subtaskId: string) => void;
  deleteSubtask: (issueId: string, subtaskId: string) => void;
  setTheme: (theme: 'dark' | 'light' | 'dawn' | 'dusk') => void;
  setActiveIssueId: (id: string | null) => void;
  setSearchQuery: (query: string) => void;
  setViewType: (type: ViewType) => void;
  setFilterType: (filter: FilterType) => void;
  toggleCreateModal: (open?: boolean) => void;
  toggleCommandMenu: (open?: boolean) => void;
  copilotMessages: CopilotMessage[];
  isCopilotOpen: boolean;
  toggleCopilot: (open?: boolean) => void;
  sendMessageToCopilot: (content: string) => Promise<void>;
  clearCopilotHistory: () => void;
}

const AppContext = createContext<AppContextProps | undefined>(undefined);

// Core Mock Data / Fallbacks
const MOCK_USERS: User[] = [
  { id: 'u1', name: 'Win (You)', avatarColor: '#5e6ad2', initials: 'WI' },
  { id: 'u2', name: 'Alex River', avatarColor: '#da70d6', initials: 'AR' },
  { id: 'u3', name: 'Sarah Vance', avatarColor: '#8a2be2', initials: 'SV' },
  { id: 'u4', name: 'James Kim', avatarColor: '#d97706', initials: 'JK' },
];

const MOCK_LABELS: Label[] = [
  { id: 'l1', name: 'bug', color: '#e24848' },
  { id: 'l2', name: 'feature', color: '#5e6ad2' },
  { id: 'l3', name: 'refactor', color: '#8a2be2' },
  { id: 'l4', name: 'security', color: '#da70d6' },
  { id: 'l5', name: 'documentation', color: '#6e7681' },
];

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [issues, setIssues] = useState<Issue[]>([]);
  const [comments, setComments] = useState<Comment[]>([]);
  const [users, setUsers] = useState<User[]>(MOCK_USERS);
  const [labels, setLabels] = useState<Label[]>(MOCK_LABELS);

  const [projects, setProjects] = useState<Project[]>([]);
  const [activeProjectId, setActiveProjectId] = useState<string | null>(null);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isCreateProjectOpen, setIsCreateProjectOpen] = useState(false);
  const [isEditProjectOpen, setIsEditProjectOpen] = useState(false);
  const [projectToEdit, setProjectToEdit] = useState<Project | null>(null);

  const [activeIssueId, setActiveIssueIdState] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [viewType, setViewType] = useState<ViewType>('list');
  const [filterType, setFilterType] = useState<FilterType>('all');
  
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isCommandMenuOpen, setIsCommandMenuOpen] = useState(false);
  
  const [theme, setThemeState] = useState<'dark' | 'light' | 'dawn' | 'dusk'>(() => {
    return (localStorage.getItem('linear_theme') as any) || 'dark';
  });

  // AI Copilot state
  const [isCopilotOpen, setIsCopilotOpen] = useState(false);
  const [copilotMessages, setCopilotMessages] = useState<CopilotMessage[]>([]);

  const toggleCopilot = (open?: boolean) => {
    setIsCopilotOpen(prev => open !== undefined ? open : !prev);
  };

  const clearCopilotHistory = () => {
    setCopilotMessages([]);
  };

  const refreshData = async () => {
    try {
      const [issuesRes, commentsRes, projectsRes] = await Promise.all([
        fetch('/api/issues'),
        fetch('/api/comments'),
        fetch('/api/projects')
      ]);
      
      if (issuesRes.ok) {
        const fetchedIssues = await issuesRes.json();
        setIssues(fetchedIssues);
      }
      if (commentsRes.ok) {
        const fetchedComments = await commentsRes.json();
        setComments(fetchedComments);
      }
      if (projectsRes.ok) {
        const fetchedProjects = await projectsRes.json();
        setProjects(fetchedProjects);
      }
    } catch (err) {
      console.error('Failed to refresh data:', err);
    }
  };

  const sendMessageToCopilot = async (content: string) => {
    const userMsg: CopilotMessage = {
      id: `msg_${Date.now()}_user`,
      role: 'user',
      content,
      timestamp: new Date().toISOString()
    };
    
    // We must pass the correct previous messages. Wait, setState is functional but we can also use functional update here,
    // but we need to compute history based on current state. So we'll use a functional state update to send the fetch,
    // or use a local variable / closure. Let's capture the current messages correctly.
    setCopilotMessages(prev => {
      const updated = [...prev, userMsg];
      
      const assistantId = `msg_${Date.now()}_assistant`;
      const tempAssistantMsg: CopilotMessage = {
        id: assistantId,
        role: 'assistant',
        content: '',
        timestamp: new Date().toISOString(),
        isExecuting: true
      };
      
      // Execute the request asynchronously
      const history = updated.map(m => ({
        role: m.role,
        content: m.content
      }));

      fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: history,
          projectId: activeProjectId
        })
      })
      .then(async res => {
        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          throw new Error(errData.error || 'Failed to get response from AI Copilot');
        }
        const data = await res.json();
        setCopilotMessages(current => current.map(m => 
          m.id === assistantId 
            ? { ...m, content: data.text, isExecuting: false } 
            : m
        ));
        await refreshData();
      })
      .catch(err => {
        console.error('[sendMessageToCopilot Error]', err);
        setCopilotMessages(current => current.map(m => 
          m.id === assistantId 
            ? { ...m, content: `Error: ${err.message || 'Something went wrong.'}`, isExecuting: false } 
            : m
        ));
      });

      return [...updated, tempAssistantMsg];
    });
  };

  // Fetch initial data from PostgreSQL Backend
  useEffect(() => {
    const loadData = async () => {
      try {
        const [issuesRes, commentsRes, usersRes, labelsRes, projectsRes] = await Promise.all([
          fetch('/api/issues'),
          fetch('/api/comments'),
          fetch('/api/users'),
          fetch('/api/labels'),
          fetch('/api/projects')
        ]);
        
        if (issuesRes.ok) {
          const fetchedIssues = await issuesRes.json();
          setIssues(fetchedIssues);
        }
        if (commentsRes.ok) {
          const fetchedComments = await commentsRes.json();
          setComments(fetchedComments);
        }
        if (usersRes.ok) {
          const fetchedUsers = await usersRes.json();
          setUsers(fetchedUsers);
        }
        if (labelsRes.ok) {
          const fetchedLabels = await labelsRes.json();
          setLabels(fetchedLabels);
        }
        if (projectsRes.ok) {
          const fetchedProjects = await projectsRes.json();
          setProjects(fetchedProjects);
        }
      } catch (err) {
        console.error('Failed to connect to backend server. Using local defaults.', err);
      }
    };
    loadData();
  }, []);

  // Update Theme in DOM
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('linear_theme', theme);
  }, [theme]);

  const setTheme = (newTheme: 'dark' | 'light' | 'dawn' | 'dusk') => {
    setThemeState(newTheme);
  };

  const createIssue = async (data: {
    title: string;
    description: string;
    status: IssueStatus;
    priority: IssuePriority;
    estimate?: number;
    labelIds: string[];
    assigneeId?: string;
    projectId?: string;
  }): Promise<Issue> => {
    try {
      const response = await fetch('/api/issues', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      
      if (!response.ok) {
        throw new Error('Server returned error on issue creation');
      }

      const newIssue: Issue = await response.json();
      setIssues(prev => [newIssue, ...prev]);
      return newIssue;
    } catch (error) {
      console.error('Error creating issue in PostgreSQL:', error);
      // Fallback local create if server fails
      const nextNum = issues.length > 0 
        ? Math.max(...issues.map(i => parseInt(i.id.replace('LIN-', '')))) + 1 
        : 1;
      
      const selectedLabels = labels.filter(l => data.labelIds.includes(l.id));
      const selectedAssignee = users.find(u => u.id === data.assigneeId);

      const newIssue: Issue = {
        id: `LIN-${nextNum}`,
        title: data.title || 'Untitled Issue',
        description: data.description,
        status: data.status,
        priority: data.priority,
        assignee: selectedAssignee,
        creator: users[0],
        estimate: data.estimate,
        labels: selectedLabels,
        subtasks: [],
        projectId: data.projectId,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      setIssues(prev => [newIssue, ...prev]);
      return newIssue;
    }
  };

  const updateIssue = async (id: string, updates: Partial<Issue>) => {
    // Optimistic Update
    setIssues(prev => prev.map(issue => {
      if (issue.id === id) {
        return {
          ...issue,
          ...updates,
          updatedAt: new Date().toISOString()
        };
      }
      return issue;
    }));

    try {
      // Map update fields to backend parameters
      const payload: any = { ...updates };
      if (updates.labels) {
        payload.labelIds = updates.labels.map(l => l.id);
      }
      if (updates.assignee !== undefined) {
        payload.assigneeId = updates.assignee ? updates.assignee.id : null;
      }

      const response = await fetch(`/api/issues/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (response.ok) {
        const updatedIssue = await response.json();
        // Sync with verified server details
        setIssues(prev => prev.map(issue => issue.id === id ? updatedIssue : issue));
      }
    } catch (error) {
      console.error('Error updating issue in PostgreSQL:', error);
    }
  };

  const deleteIssue = async (id: string) => {
    // Optimistic Update
    setIssues(prev => prev.filter(issue => issue.id !== id));
    if (activeIssueId === id) {
      setActiveIssueIdState(null);
    }

    try {
      await fetch(`/api/issues/${id}`, {
        method: 'DELETE'
      });
    } catch (error) {
      console.error('Error deleting issue in PostgreSQL:', error);
    }
  };

  const addComment = async (issueId: string, body: string) => {
    if (!body.trim()) return;
    try {
      const response = await fetch('/api/comments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ issueId, body })
      });

      if (response.ok) {
        const newComment = await response.json();
        setComments(prev => [...prev, newComment]);
      }
    } catch (error) {
      console.error('Error adding comment in PostgreSQL:', error);
    }
  };

  const addSubtask = async (issueId: string, title: string) => {
    if (!title.trim()) return;
    try {
      const response = await fetch(`/api/issues/${issueId}/subtasks`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title })
      });

      if (response.ok) {
        const newSubtask = await response.json();
        setIssues(prev => prev.map(issue => {
          if (issue.id === issueId) {
            return {
              ...issue,
              subtasks: [...issue.subtasks, newSubtask],
              updatedAt: new Date().toISOString()
            };
          }
          return issue;
        }));
      }
    } catch (error) {
      console.error('Error adding subtask in PostgreSQL:', error);
    }
  };

  const toggleSubtask = async (issueId: string, subtaskId: string) => {
    // Find subtask to toggle
    const issue = issues.find(i => i.id === issueId);
    if (!issue) return;
    const subtask = issue.subtasks.find(s => s.id === subtaskId);
    if (!subtask) return;

    const newCompleted = !subtask.completed;

    // Optimistic Update
    setIssues(prev => prev.map(issue => {
      if (issue.id === issueId) {
        return {
          ...issue,
          subtasks: issue.subtasks.map(sub => 
            sub.id === subtaskId ? { ...sub, completed: newCompleted } : sub
          ),
          updatedAt: new Date().toISOString()
        };
      }
      return issue;
    }));

    try {
      await fetch(`/api/subtasks/${subtaskId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ completed: newCompleted })
      });
    } catch (error) {
      console.error('Error toggling subtask in PostgreSQL:', error);
    }
  };

  const deleteSubtask = async (issueId: string, subtaskId: string) => {
    // Optimistic Update
    setIssues(prev => prev.map(issue => {
      if (issue.id === issueId) {
        return {
          ...issue,
          subtasks: issue.subtasks.filter(sub => sub.id !== subtaskId),
          updatedAt: new Date().toISOString()
        };
      }
      return issue;
    }));

    try {
      await fetch(`/api/subtasks/${subtaskId}`, {
        method: 'DELETE'
      });
    } catch (error) {
      console.error('Error deleting subtask in PostgreSQL:', error);
    }
  };

  const toggleCreateModal = (open?: boolean) => {
    setIsCreateModalOpen(prev => open !== undefined ? open : !prev);
  };

  const toggleCommandMenu = (open?: boolean) => {
    setIsCommandMenuOpen(prev => open !== undefined ? open : !prev);
  };

  const toggleSettings = (open?: boolean) => {
    setIsSettingsOpen(prev => open !== undefined ? open : !prev);
  };

  const toggleCreateProject = (open?: boolean) => {
    setIsCreateProjectOpen(prev => open !== undefined ? open : !prev);
  };

  const toggleEditProject = (open?: boolean, project?: Project) => {
    setIsEditProjectOpen(prev => open !== undefined ? open : !prev);
    if (project !== undefined) {
      setProjectToEdit(project);
    } else if (open === false) {
      setProjectToEdit(null);
    }
  };

  const fetchSettings = async (): Promise<Record<string, string>> => {
    try {
      const res = await fetch('/api/settings');
      if (res.ok) {
        return await res.json();
      }
    } catch (err) {
      console.error('Failed to fetch settings:', err);
    }
    return {};
  };

  const saveSettings = async (newSettings: Record<string, string>): Promise<void> => {
    try {
      const res = await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newSettings),
      });
      if (!res.ok) {
        throw new Error('Failed to save settings');
      }
    } catch (err) {
      console.error('Error saving settings:', err);
      throw err;
    }
  };

  const createProject = async (data: {
    name: string;
    description?: string;
    goal?: string;
    slackChannel?: string;
    slackPrivilege: string;
    discordChannel?: string;
    discordPrivilege: string;
    memberIds: string[];
  }): Promise<Project> => {
    try {
      const response = await fetch('/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      
      if (!response.ok) {
        throw new Error('Server returned error on project creation');
      }

      const newProject: Project = await response.json();
      setProjects(prev => [...prev, newProject]);
      return newProject;
    } catch (error) {
      console.error('Error creating project in PostgreSQL:', error);
      const newProject: Project = {
        id: `p_${Date.now()}`,
        name: data.name,
        description: data.description,
        goal: data.goal,
        slackChannel: data.slackChannel,
        slackPrivilege: data.slackPrivilege as any,
        discordChannel: data.discordChannel,
        discordPrivilege: data.discordPrivilege as any,
        createdAt: new Date().toISOString(),
        members: users.filter(u => data.memberIds.includes(u.id))
      };
      setProjects(prev => [...prev, newProject]);
      return newProject;
    }
  };

  const updateProject = async (id: string, data: {
    name: string;
    description?: string;
    goal?: string;
    slackChannel?: string;
    slackPrivilege: string;
    discordChannel?: string;
    discordPrivilege: string;
    memberIds: string[];
  }): Promise<Project> => {
    try {
      const response = await fetch(`/api/projects/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      
      if (!response.ok) {
        throw new Error('Server returned error on project update');
      }

      const updatedProject: Project = await response.json();
      setProjects(prev => prev.map(p => p.id === id ? updatedProject : p));
      
      // Update issues list if their project member list has changed or other factors
      // (Mostly project state mapping updates)
      return updatedProject;
    } catch (error) {
      console.error('Error updating project in PostgreSQL:', error);
      const updatedProject: Project = {
        id,
        name: data.name,
        description: data.description,
        goal: data.goal,
        slackChannel: data.slackChannel,
        slackPrivilege: data.slackPrivilege as any,
        discordChannel: data.discordChannel,
        discordPrivilege: data.discordPrivilege as any,
        createdAt: projectToEdit?.createdAt || new Date().toISOString(),
        members: users.filter(u => data.memberIds.includes(u.id))
      };
      setProjects(prev => prev.map(p => p.id === id ? updatedProject : p));
      return updatedProject;
    }
  };

  const activeIssue = issues.find(i => i.id === activeIssueId) || null;

  return (
    <AppContext.Provider value={{
      issues,
      activeIssue,
      searchQuery,
      viewType,
      filterType,
      users,
      labels,
      currentUser: users[0],
      comments,
      isCreateModalOpen,
      isCommandMenuOpen,
      theme,
      projects,
      activeProjectId,
      setActiveProjectId,
      isSettingsOpen,
      toggleSettings,
      saveSettings,
      fetchSettings,
      isCreateProjectOpen,
      toggleCreateProject,
      createProject,
      isEditProjectOpen,
      projectToEdit,
      toggleEditProject,
      updateProject,
      createIssue,
      updateIssue,
      deleteIssue,
      addComment,
      addSubtask,
      toggleSubtask,
      deleteSubtask,
      setTheme,
      setActiveIssueId: setActiveIssueIdState,
      setSearchQuery,
      setViewType,
      setFilterType,
      toggleCreateModal,
      toggleCommandMenu,
      copilotMessages,
      isCopilotOpen,
      toggleCopilot,
      sendMessageToCopilot,
      clearCopilotHistory
    }}>
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};
