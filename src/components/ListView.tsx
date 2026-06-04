import React from 'react';
import { useApp } from '../context/AppContext';
import { PriorityIcon, StatusIcon } from './Icons';
import type { Issue, IssueStatus } from '../types';

export const ListView: React.FC = () => {
  const { 
    issues, 
    searchQuery, 
    filterType, 
    currentUser, 
    setActiveIssueId,
    activeIssue,
    activeProjectId
  } = useApp();

  // Helper to format date
  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  };

  // 1. Apply Filtering
  const filteredIssues = issues.filter(issue => {
    // A. Filter by Project ID
    if (activeProjectId && issue.projectId !== activeProjectId) {
      return false;
    }

    // B. Filter by Search Query
    const query = searchQuery.toLowerCase().trim();
    if (query) {
      const matchKey = issue.id.toLowerCase().includes(query);
      const matchTitle = issue.title.toLowerCase().includes(query);
      const matchDesc = issue.description.toLowerCase().includes(query);
      const matchLabel = issue.labels.some(l => l.name.toLowerCase().includes(query));
      if (!matchKey && !matchTitle && !matchDesc && !matchLabel) {
        return false;
      }
    }

    // C. Filter by Navigation Type
    switch (filterType) {
      case 'inbox':
      case 'my_issues':
        return issue.assignee?.id === currentUser.id;
      case 'urgent':
        return issue.priority === 'urgent';
      case 'all':
      default:
        return true;
    }
  });

  // 2. Group by Status
  const statusGroups: { title: IssueStatus; issues: Issue[] }[] = [
    { title: 'backlog', issues: [] },
    { title: 'todo', issues: [] },
    { title: 'in_progress', issues: [] },
    { title: 'done', issues: [] },
    { title: 'canceled', issues: [] }
  ];

  filteredIssues.forEach(issue => {
    const group = statusGroups.find(g => g.title === issue.status);
    if (group) {
      group.issues.push(issue);
    }
  });

  const hasAnyIssues = filteredIssues.length > 0;

  return (
    <div className="list-view-container">
      {!hasAnyIssues ? (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '300px', color: 'var(--text-tertiary)' }}>
          <LayersNoIssues />
          <span style={{ marginTop: '12px', fontSize: '14px' }}>No issues found matching your filters.</span>
        </div>
      ) : (
        statusGroups.map(group => {
          if (group.issues.length === 0) return null;
          return (
            <div key={group.title} className="status-group-section">
              <div className="view-section-header">
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <StatusIcon status={group.title} size={13} />
                  <span style={{ textTransform: 'capitalize' }}>
                    {group.title.replace('_', ' ')}
                  </span>
                </div>
                <span>{group.issues.length}</span>
              </div>
              
              <div className="status-group-rows">
                {group.issues.map(issue => {
                  const isActive = activeIssue?.id === issue.id;
                  return (
                    <div 
                      key={issue.id} 
                      className={`issue-row ${isActive ? 'active' : ''}`}
                      onClick={() => setActiveIssueId(isActive ? null : issue.id)}
                    >
                      <div className="issue-row-cell" style={{ gap: '12px', flexGrow: 1, minWidth: 0 }}>
                        <PriorityIcon priority={issue.priority} size={14} />
                        <span className="issue-key">{issue.id}</span>
                        <span className="issue-title" title={issue.title}>{issue.title}</span>
                      </div>
                      
                      <div className="issue-meta-tags">
                        {issue.labels.map(label => (
                          <span 
                            key={label.id} 
                            className="badge-label"
                            style={{ 
                              color: label.color, 
                              borderColor: `${label.color}30`, 
                              backgroundColor: `${label.color}08` 
                            }}
                          >
                            {label.name}
                          </span>
                        ))}
                        
                        {issue.estimate !== undefined && (
                          <span className="badge-estimate">
                            {issue.estimate}
                          </span>
                        )}

                        <span className="issue-date">
                          {formatDate(issue.createdAt)}
                        </span>

                        {issue.assignee ? (
                          <div 
                            className="avatar" 
                            style={{ 
                              width: '20px', 
                              height: '20px', 
                              fontSize: '8px', 
                              backgroundColor: issue.assignee.avatarColor 
                            }}
                            title={`Assigned to ${issue.assignee.name}`}
                          >
                            {issue.assignee.initials}
                          </div>
                        ) : (
                          <div 
                            className="avatar" 
                            style={{ 
                              width: '20px', 
                              height: '20px', 
                              fontSize: '8px', 
                              backgroundColor: 'transparent',
                              border: '1px dashed var(--border-color)',
                              color: 'var(--text-tertiary)' 
                            }}
                            title="Unassigned"
                          >
                            --
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })
      )}
    </div>
  );
};

// Internal icon for empty view state
const LayersNoIssues = () => (
  <svg width="40" height="40" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ color: 'var(--border-color)' }}>
    <path d="M12 4L3 8L12 12L21 8L12 4Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M3 12L12 16L21 12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M3 16L12 20L21 16" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);
