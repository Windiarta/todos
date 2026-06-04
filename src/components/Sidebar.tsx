import React from 'react';
import { useApp } from '../context/AppContext';
import { 
  Inbox, 
  User as UserIcon, 
  Layers, 
  AlertCircle, 
  List, 
  Kanban,
  Sparkles,
  Settings,
  Plus
} from 'lucide-react';
import type { FilterType, ViewType } from '../types';

export const Sidebar: React.FC = () => {
  const { 
    issues, 
    filterType, 
    setFilterType, 
    viewType, 
    setViewType, 
    currentUser,
    theme,
    setTheme,
    projects,
    activeProjectId,
    setActiveProjectId,
    toggleSettings,
    toggleCreateProject,
    toggleEditProject
  } = useApp();

  // Helper counts
  const myIssuesCount = issues.filter(i => i.assignee?.id === currentUser.id && i.status !== 'done' && i.status !== 'canceled').length;
  const allIssuesCount = issues.filter(i => i.status !== 'done' && i.status !== 'canceled').length;
  const urgentCount = issues.filter(i => i.priority === 'urgent' && i.status !== 'done' && i.status !== 'canceled').length;

  const handleFilterClick = (type: FilterType) => {
    setFilterType(type);
    setActiveProjectId(null); // Clear project filter on global workspace filters
  };

  const handleViewClick = (type: ViewType) => {
    setViewType(type);
  };

  return (
    <aside className="sidebar">
      <div className="sidebar-header">
        <div className="workspace-badge">
          <div className="workspace-logo">L</div>
          <span>Acme Corp</span>
        </div>
        <div className="ai-badge" style={{ fontSize: '9px', padding: '1px 4px' }}>
          <Sparkles size={10} />
          <span>AI Active</span>
        </div>
      </div>

      <div className="sidebar-nav">

        {/* Projects Section — top of sidebar */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
          <span className="sidebar-section-title" style={{ margin: 0 }}>Projects</span>
          <button
            onClick={() => toggleCreateProject(true)}
            style={{ background: 'none', border: 'none', color: 'var(--text-tertiary)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2px', borderRadius: '4px' }}
            title="Create Project"
          >
            <Plus size={14} />
          </button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', maxHeight: '200px', overflowY: 'auto', marginBottom: '4px' }}>
          {projects.length === 0 ? (
            <div style={{ padding: '6px 12px', fontSize: '11px', color: 'var(--text-tertiary)', fontStyle: 'italic' }}>
              No projects yet
            </div>
          ) : (
            projects.map(project => {
              const isActive = activeProjectId === project.id;
              return (
                <div
                  key={project.id}
                  className={`nav-item ${isActive ? 'active' : ''}`}
                  onClick={() => setActiveProjectId(project.id)}
                  style={{ cursor: 'pointer' }}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') setActiveProjectId(project.id);
                  }}
                >
                  <div className="nav-item-left" style={{ minWidth: 0 }}>
                    <span style={{ fontSize: '10px', marginRight: '6px', flexShrink: 0 }}>📁</span>
                    <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={project.name}>{project.name}</span>
                  </div>
                  <button
                    className="project-settings-btn"
                    onClick={(e) => { e.stopPropagation(); toggleEditProject(true, project); }}
                    style={{ background: 'none', border: 'none', color: 'var(--text-tertiary)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '4px', borderRadius: '50%' }}
                    title="Project Settings"
                  >
                    <Settings size={12} />
                  </button>
                </div>
              );
            })
          )}
        </div>

        <div className="sidebar-divider"></div>

        {/* Issue Filters */}
        <span className="sidebar-section-title" style={{ marginTop: '8px' }}>Views</span>

        <button
          className={`nav-item ${filterType === 'my_issues' && !activeProjectId ? 'active' : ''}`}
          onClick={() => handleFilterClick('my_issues')}
        >
          <div className="nav-item-left">
            <UserIcon size={14} />
            <span>My Issues</span>
          </div>
          <span className="nav-item-count">{myIssuesCount}</span>
        </button>

        <button
          className={`nav-item ${filterType === 'all' && !activeProjectId ? 'active' : ''}`}
          onClick={() => handleFilterClick('all')}
        >
          <div className="nav-item-left">
            <Layers size={14} />
            <span>All Issues</span>
          </div>
          <span className="nav-item-count">{allIssuesCount}</span>
        </button>

        <button
          className={`nav-item ${filterType === 'urgent' && !activeProjectId ? 'active' : ''}`}
          onClick={() => handleFilterClick('urgent')}
        >
          <div className="nav-item-left">
            <AlertCircle size={14} style={{ color: 'var(--error-color)' }} />
            <span>Urgent</span>
          </div>
          <span className="nav-item-count" style={{ color: 'var(--error-color)', backgroundColor: 'rgba(226,72,72,0.1)' }}>{urgentCount}</span>
        </button>

        <button
          className={`nav-item ${filterType === 'inbox' && !activeProjectId ? 'active' : ''}`}
          onClick={() => handleFilterClick('inbox')}
        >
          <div className="nav-item-left">
            <Inbox size={14} />
            <span>Inbox</span>
          </div>
          <span className="nav-item-count">{myIssuesCount}</span>
        </button>

        <div className="sidebar-divider"></div>

        {/* Layout Toggle */}
        <span className="sidebar-section-title">Layout</span>

        <button
          className={`nav-item ${viewType === 'list' ? 'active' : ''}`}
          onClick={() => handleViewClick('list')}
        >
          <div className="nav-item-left">
            <List size={14} />
            <span>List</span>
          </div>
        </button>

        <button
          className={`nav-item ${viewType === 'board' ? 'active' : ''}`}
          onClick={() => handleViewClick('board')}
        >
          <div className="nav-item-left">
            <Kanban size={14} />
            <span>Board</span>
          </div>
        </button>

        <div className="sidebar-divider" style={{ marginTop: 'auto' }}></div>

        {/* Settings */}
        <button
          className="nav-item"
          onClick={() => toggleSettings(true)}
          style={{ marginBottom: '8px' }}
        >
          <div className="nav-item-left">
            <Settings size={14} />
            <span>Settings</span>
          </div>
        </button>
      </div>

      <div className="sidebar-footer">
        <div className="user-profile">
          <div className="avatar" style={{ backgroundColor: currentUser.avatarColor }}>
            {currentUser.initials}
          </div>
          <span>{currentUser.name}</span>
        </div>
        
        <div className="theme-toggle-wrapper">
          <select 
            value={theme} 
            onChange={(e) => setTheme(e.target.value as any)}
            className="property-select"
            style={{ fontSize: '11px', padding: '2px 4px', width: 'auto', backgroundColor: 'transparent', border: '1px solid var(--border-color)', borderRadius: '3px' }}
          >
            <option value="dark" style={{ backgroundColor: 'var(--panel-bg)', color: 'var(--text-primary)' }}>Dark</option>
            <option value="light" style={{ backgroundColor: 'var(--panel-bg)', color: 'var(--text-primary)' }}>Light</option>
            <option value="dawn" style={{ backgroundColor: 'var(--panel-bg)', color: 'var(--text-primary)' }}>Dawn</option>
            <option value="dusk" style={{ backgroundColor: 'var(--panel-bg)', color: 'var(--text-primary)' }}>Dusk</option>
          </select>
        </div>
      </div>
    </aside>
  );
};
