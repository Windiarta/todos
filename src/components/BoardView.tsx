import React from 'react';
import { useApp } from '../context/AppContext';
import { PriorityIcon, StatusIcon } from './Icons';
import type { IssueStatus } from '../types';

export const BoardView: React.FC = () => {
  const { 
    issues, 
    searchQuery, 
    filterType, 
    currentUser, 
    updateIssue, 
    setActiveIssueId,
    activeIssue,
    activeProjectId
  } = useApp();

  // 1. Filtering Logic
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

  // Define column keys and titles
  const columns: { status: IssueStatus; label: string }[] = [
    { status: 'backlog', label: 'backlog' },
    { status: 'todo', label: 'to do' },
    { status: 'in_progress', label: 'in progress' },
    { status: 'done', label: 'done' },
    { status: 'canceled', label: 'canceled' }
  ];

  // Drag and Drop handlers
  const handleDragStart = (e: React.DragEvent, id: string) => {
    e.dataTransfer.setData('text/plain', id);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent, targetStatus: IssueStatus) => {
    e.preventDefault();
    const id = e.dataTransfer.getData('text/plain');
    if (id) {
      updateIssue(id, { status: targetStatus });
    }
  };

  return (
    <div className="board-view-container">
      {columns.map(col => {
        const colIssues = filteredIssues.filter(i => i.status === col.status);
        
        return (
          <div 
            key={col.status} 
            className="board-column"
            onDragOver={handleDragOver}
            onDrop={(e) => handleDrop(e, col.status)}
          >
            <div className="board-column-header">
              <div className="board-column-title">
                <StatusIcon status={col.status} size={13} />
                <span>{col.label}</span>
              </div>
              <span className="board-column-count">{colIssues.length}</span>
            </div>

            <div className="board-cards-container">
              {colIssues.map(issue => {
                const isActive = activeIssue?.id === issue.id;
                
                return (
                  <div 
                    key={issue.id}
                    className={`board-card ${isActive ? 'active' : ''}`}
                    draggable
                    onDragStart={(e) => handleDragStart(e, issue.id)}
                    onClick={() => setActiveIssueId(isActive ? null : issue.id)}
                  >
                    <div className="board-card-header">
                      <span className="issue-key" style={{ minWidth: 'auto' }}>{issue.id}</span>
                      {issue.assignee ? (
                        <div 
                          className="avatar" 
                          style={{ 
                            width: '18px', 
                            height: '18px', 
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
                            width: '18px', 
                            height: '18px', 
                            fontSize: '8px', 
                            backgroundColor: 'transparent',
                            border: '1px dashed var(--border-color)',
                            color: 'var(--text-tertiary)' 
                          }}
                        >
                          --
                        </div>
                      )}
                    </div>

                    <div className="board-card-title">{issue.title}</div>

                    <div className="board-card-footer">
                      <PriorityIcon priority={issue.priority} size={12} />
                      
                      <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap', marginLeft: 'auto' }}>
                        {issue.labels.map(label => (
                          <span 
                            key={label.id} 
                            style={{ 
                              width: '6px', 
                              height: '6px', 
                              borderRadius: '50%', 
                              backgroundColor: label.color 
                            }}
                            title={label.name}
                          />
                        ))}
                        
                        {issue.estimate !== undefined && (
                          <span className="badge-estimate" style={{ padding: '0px 3px', fontSize: '9px', lineHeight: '10px' }}>
                            {issue.estimate}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
};
