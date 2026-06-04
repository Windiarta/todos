import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { X, Sparkles } from 'lucide-react';
import type { IssuePriority, IssueStatus } from '../types';
import { aiDraftIssue } from '../utils/aiEngine';

export const CreateIssueModal: React.FC = () => {
  const { 
    isCreateModalOpen, 
    toggleCreateModal, 
    createIssue, 
    users, 
    labels,
    setActiveIssueId,
    projects,
    activeProjectId
  } = useApp();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [status, setStatus] = useState<IssueStatus>('todo');
  const [priority, setPriority] = useState<IssuePriority>('none');
  const [estimate, setEstimate] = useState<number | undefined>(undefined);
  const [assigneeId, setAssigneeId] = useState<string>('');
  const [selectedLabelIds, setSelectedLabelIds] = useState<string[]>([]);
  const [projectId, setProjectId] = useState<string>('');
  const [isAiLoading, setIsAiLoading] = useState(false);

  React.useEffect(() => {
    if (isCreateModalOpen) {
      setProjectId(activeProjectId || '');
    }
  }, [isCreateModalOpen, activeProjectId]);

  const handleSave = async () => {
    if (!title.trim()) return;
    try {
      const newIssue = await createIssue({
        title: title.trim(),
        description,
        status,
        priority,
        estimate,
        labelIds: selectedLabelIds,
        assigneeId: assigneeId || undefined,
        projectId: projectId || undefined
      });
      
      // Select the newly created issue
      setActiveIssueId(newIssue.id);
      handleClose();
    } catch (err) {
      console.error(err);
    }
  };

  const handleClose = () => {
    setTitle('');
    setDescription('');
    setStatus('todo');
    setPriority('none');
    setEstimate(undefined);
    setAssigneeId('');
    setSelectedLabelIds([]);
    setProjectId('');
    setIsAiLoading(false);
    toggleCreateModal(false);
  };

  const handleAiDraft = async () => {
    if (!title.trim()) return;
    setIsAiLoading(true);
    try {
      const result = await aiDraftIssue(title);
      setDescription(result.description);
      setPriority(result.priority);
      setEstimate(result.estimate);
      
      // Match suggested labels
      const matchedLabelIds = labels
        .filter(l => result.labelNames.includes(l.name))
        .map(l => l.id);
      setSelectedLabelIds(matchedLabelIds);
    } catch (e) {
      console.error(e);
    } finally {
      setIsAiLoading(false);
    }
  };

  const toggleLabel = (labelId: string) => {
    setSelectedLabelIds(prev => 
      prev.includes(labelId) 
        ? prev.filter(id => id !== labelId)
        : [...prev, labelId]
    );
  };

  if (!isCreateModalOpen) return null;

  return (
    <div className="modal-overlay" onClick={handleClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span className="modal-title">Create New Issue</span>
            {title.trim().length > 3 && (
              <button 
                className="ai-draft-badge" 
                onClick={handleAiDraft}
                disabled={isAiLoading}
                style={{ marginLeft: '12px' }}
              >
                <Sparkles size={11} />
                <span>{isAiLoading ? 'Drafting...' : 'Draft with AI'}</span>
              </button>
            )}
          </div>
          <button className="btn-icon" onClick={handleClose}>
            <X size={16} />
          </button>
        </div>

        <div className="modal-body">
          {isAiLoading && (
            <div className="ai-sparkles-container">
              <div className="ai-typing-indicator">
                <div className="ai-typing-dot"></div>
                <div className="ai-typing-dot"></div>
                <div className="ai-typing-dot"></div>
              </div>
              <span>Linear AI is drafting details based on your title...</span>
            </div>
          )}

          <input 
            type="text" 
            placeholder="Issue title" 
            className="input-title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            autoFocus
          />

          <textarea 
            placeholder="Add description (markdown supported)..." 
            className="textarea-desc"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />

          <div className="issue-properties-grid">
            <div className="property-badge-select">
              <span>Project:</span>
              <select value={projectId} onChange={(e) => setProjectId(e.target.value)}>
                <option value="">No Project</option>
                {projects.map(p => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </div>

            <div className="property-badge-select">
              <span>Status:</span>
              <select value={status} onChange={(e) => setStatus(e.target.value as IssueStatus)}>
                <option value="backlog">Backlog</option>
                <option value="todo">To Do</option>
                <option value="in_progress">In Progress</option>
                <option value="done">Done</option>
                <option value="canceled">Canceled</option>
              </select>
            </div>

            <div className="property-badge-select">
              <span>Priority:</span>
              <select value={priority} onChange={(e) => setPriority(e.target.value as IssuePriority)}>
                <option value="none">No Priority</option>
                <option value="urgent">Urgent</option>
                <option value="high">High</option>
                <option value="medium">Medium</option>
                <option value="low">Low</option>
              </select>
            </div>

            <div className="property-badge-select">
              <span>Estimate:</span>
              <select 
                value={estimate === undefined ? '' : estimate} 
                onChange={(e) => setEstimate(e.target.value ? parseInt(e.target.value) : undefined)}
              >
                <option value="">No Estimate</option>
                <option value="0">0 SP</option>
                <option value="1">1 SP</option>
                <option value="2">2 SP</option>
                <option value="3">3 SP</option>
                <option value="5">5 SP</option>
                <option value="8">8 SP</option>
              </select>
            </div>

            <div className="property-badge-select">
              <span>Assignee:</span>
              <select value={assigneeId} onChange={(e) => setAssigneeId(e.target.value)}>
                <option value="">Unassigned</option>
                {users.map(u => (
                  <option key={u.id} value={u.id}>{u.name}</option>
                ))}
              </select>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <span style={{ fontSize: '11px', fontWeight: '600', color: 'var(--text-tertiary)', textTransform: 'uppercase' }}>Labels</span>
            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
              {labels.map(label => {
                const isSelected = selectedLabelIds.includes(label.id);
                return (
                  <button 
                    key={label.id}
                    className="badge-label"
                    onClick={() => toggleLabel(label.id)}
                    style={{
                      color: label.color,
                      borderColor: isSelected ? label.color : 'var(--border-color)',
                      backgroundColor: isSelected ? `${label.color}15` : 'transparent',
                      cursor: 'pointer',
                      transition: 'all 0.1s'
                    }}
                  >
                    {label.name}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        <div className="modal-footer">
          <button className="btn-secondary" onClick={handleClose}>Cancel</button>
          <button 
            className="btn-primary" 
            onClick={handleSave}
            disabled={!title.trim()}
            style={{ opacity: title.trim() ? 1 : 0.5 }}
          >
            Create Issue
          </button>
        </div>
      </div>
    </div>
  );
};
