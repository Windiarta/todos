import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { StatusIcon, PriorityIcon } from './Icons';
import { X, Trash2, Sparkles, PlusCircle, Trash } from 'lucide-react';
import type { IssueStatus, IssuePriority } from '../types';
import { aiGenerateSubtasks } from '../utils/aiEngine';

export const IssueDetailPanel: React.FC = () => {
  const { 
    activeIssue, 
    setActiveIssueId, 
    updateIssue, 
    deleteIssue,
    users, 
    labels,
    comments,
    addComment,
    addSubtask,
    toggleSubtask,
    deleteSubtask
  } = useApp();

  const [isEditingDesc, setIsEditingDesc] = useState(false);
  const [descValue, setDescValue] = useState('');
  const [commentValue, setCommentValue] = useState('');
  const [newSubtaskTitle, setNewSubtaskTitle] = useState('');
  const [isAiLoading, setIsAiLoading] = useState(false);

  // Sync state with activeIssue changes
  useEffect(() => {
    if (activeIssue) {
      setDescValue(activeIssue.description || '');
      setIsEditingDesc(false);
    }
  }, [activeIssue?.id]);

  if (!activeIssue) return null;

  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    updateIssue(activeIssue.id, { title: e.target.value });
  };

  const handleDescBlur = () => {
    updateIssue(activeIssue.id, { description: descValue });
    setIsEditingDesc(false);
  };

  const handleCommentSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (commentValue.trim()) {
      addComment(activeIssue.id, commentValue.trim());
      setCommentValue('');
    }
  };

  const handleAddSubtaskSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (newSubtaskTitle.trim()) {
      addSubtask(activeIssue.id, newSubtaskTitle.trim());
      setNewSubtaskTitle('');
    }
  };

  const handleAiSubtasks = async () => {
    setIsAiLoading(true);
    try {
      const generated = await aiGenerateSubtasks(activeIssue.title, activeIssue.description);
      generated.forEach(subTitle => {
        addSubtask(activeIssue.id, subTitle);
      });
    } catch (e) {
      console.error(e);
    } finally {
      setIsAiLoading(false);
    }
  };

  // Inline markdown tokenizer
  const formatInline = (text: string): React.ReactNode[] => {
    if (!text) return [];
    const tokenRegex = /(`[^`]+`|\*\*(?:[^*]|\*(?!\*))+\*\*|__(?:[^_]|_(?!_))+__|(?<!\*)\*(?:[^*\n])+\*(?!\*)|\[([^\]]+)\]\(([^)]+)\))/g;
    const result: React.ReactNode[] = [];
    let lastIdx = 0;
    let match: RegExpExecArray | null;
    while ((match = tokenRegex.exec(text)) !== null) {
      if (match.index > lastIdx) result.push(text.slice(lastIdx, match.index));
      const t = match[0];
      if (t.startsWith('`') && t.endsWith('`')) {
        result.push(<code key={match.index} style={{ fontFamily: 'monospace', background: 'rgba(255,255,255,0.06)', padding: '1px 4px', borderRadius: '3px', fontSize: '12px' }}>{t.slice(1,-1)}</code>);
      } else if (t.startsWith('**') && t.endsWith('**')) {
        result.push(<strong key={match.index} style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{t.slice(2,-2)}</strong>);
      } else if (t.startsWith('__') && t.endsWith('__')) {
        result.push(<strong key={match.index} style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{t.slice(2,-2)}</strong>);
      } else if (t.startsWith('*') && t.endsWith('*')) {
        result.push(<em key={match.index}>{t.slice(1,-1)}</em>);
      } else if (t.startsWith('[')) {
        const lm = t.match(/\[([^\]]+)\]\(([^)]+)\)/);
        if (lm) result.push(<a key={match.index} href={lm[2]} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--primary-color)', textDecoration: 'underline' }}>{lm[1]}</a>);
        else result.push(t);
      } else result.push(t);
      lastIdx = match.index + t.length;
    }
    if (lastIdx < text.length) result.push(text.slice(lastIdx));
    return result;
  };

  // Block-based markdown renderer
  const renderMarkdown = (text: string) => {
    if (!text) {
      return (
        <p style={{ fontStyle: 'italic', color: 'var(--text-tertiary)' }}>
          No description provided. Double click to add details.
        </p>
      );
    }

    type Block =
      | { type: 'heading'; level: 1 | 2 | 3; content: string }
      | { type: 'ul'; items: string[] }
      | { type: 'ol'; items: string[] }
      | { type: 'checkbox'; items: { checked: boolean; text: string }[] }
      | { type: 'blockquote'; content: string }
      | { type: 'code'; content: string }
      | { type: 'paragraph'; content: string }
      | { type: 'spacer' };

    const lines = text.split('\n');
    const blocks: Block[] = [];
    let i = 0;
    while (i < lines.length) {
      const line = lines[i];
      if (line.trim().startsWith('```')) {
        const codeLines: string[] = []; i++;
        while (i < lines.length && !lines[i].trim().startsWith('```')) { codeLines.push(lines[i]); i++; }
        blocks.push({ type: 'code', content: codeLines.join('\n') }); i++; continue;
      }
      if (/^###\s/.test(line)) { blocks.push({ type: 'heading', level: 3, content: line.replace(/^###\s/, '') }); i++; continue; }
      if (/^##\s/.test(line))  { blocks.push({ type: 'heading', level: 2, content: line.replace(/^##\s/, '') }); i++; continue; }
      if (/^#\s/.test(line))   { blocks.push({ type: 'heading', level: 1, content: line.replace(/^#\s/, '') }); i++; continue; }
      if (/^\d+\.\s/.test(line)) {
        const items: string[] = [];
        while (i < lines.length && /^\d+\.\s/.test(lines[i])) { items.push(lines[i].replace(/^\d+\.\s/, '')); i++; }
        blocks.push({ type: 'ol', items }); continue;
      }
      if (/^- \[[ xX]\] /.test(line)) {
        const items: { checked: boolean; text: string }[] = [];
        while (i < lines.length && /^- \[[ xX]\] /.test(lines[i])) {
          items.push({ checked: /^- \[[xX]\] /.test(lines[i]), text: lines[i].replace(/^- \[[ xX]\] /, '') });
          i++;
        }
        blocks.push({ type: 'checkbox', items }); continue;
      }
      if (/^[-*]\s/.test(line)) {
        const items: string[] = [];
        while (i < lines.length && /^[-*]\s/.test(lines[i])) { items.push(lines[i].replace(/^[-*]\s/, '')); i++; }
        blocks.push({ type: 'ul', items }); continue;
      }
      if (/^>\s/.test(line)) { blocks.push({ type: 'blockquote', content: line.replace(/^>\s/, '') }); i++; continue; }
      if (line.trim() === '') { blocks.push({ type: 'spacer' }); i++; continue; }
      blocks.push({ type: 'paragraph', content: line }); i++;
    }

    return blocks.map((block, bIdx) => {
      switch (block.type) {
        case 'heading': {
          const Tag = `h${block.level}` as 'h1' | 'h2' | 'h3';
          const sizes = { 1: '16px', 2: '14px', 3: '13px' };
          return <Tag key={bIdx} style={{ marginTop: '16px', marginBottom: '6px', fontWeight: 600, color: 'var(--text-primary)', fontSize: sizes[block.level] }}>{formatInline(block.content)}</Tag>;
        }
        case 'ul':
          return (
            <ul key={bIdx} style={{ paddingLeft: 0, margin: '6px 0', listStyle: 'none' }}>
              {block.items.map((item, k) => (
                <li key={k} style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', margin: '3px 0', color: 'var(--text-secondary)' }}>
                  <span style={{ color: 'var(--primary-color)', marginTop: '6px', fontSize: '7px', flexShrink: 0 }}>●</span>
                  <span>{formatInline(item)}</span>
                </li>
              ))}
            </ul>
          );
        case 'ol':
          return (
            <ol key={bIdx} style={{ paddingLeft: 0, margin: '6px 0', listStyle: 'none' }}>
              {block.items.map((item, k) => (
                <li key={k} style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', margin: '3px 0', color: 'var(--text-secondary)' }}>
                  <span style={{ color: 'var(--primary-color)', fontWeight: 700, fontSize: '12px', minWidth: '16px', flexShrink: 0 }}>{k+1}.</span>
                  <span>{formatInline(item)}</span>
                </li>
              ))}
            </ol>
          );
        case 'checkbox':
          return (
            <div key={bIdx} style={{ margin: '6px 0', display: 'flex', flexDirection: 'column', gap: '5px' }}>
              {block.items.map((item, k) => (
                <div key={k} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px' }}>
                  <div style={{ width: 14, height: 14, borderRadius: '3px', border: `1px solid ${item.checked ? 'var(--primary-color)' : 'rgba(255,255,255,0.2)'}`, background: item.checked ? 'var(--primary-color)' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    {item.checked && <span style={{ color: 'white', fontSize: '9px' }}>✓</span>}
                  </div>
                  <span style={{ textDecoration: item.checked ? 'line-through' : 'none', color: item.checked ? 'var(--text-tertiary)' : 'var(--text-secondary)' }}>{formatInline(item.text)}</span>
                </div>
              ))}
            </div>
          );
        case 'blockquote':
          return <blockquote key={bIdx} style={{ borderLeft: '2px solid var(--border-focus)', paddingLeft: '8px', color: 'var(--text-tertiary)', fontStyle: 'italic', margin: '8px 0' }}>{formatInline(block.content)}</blockquote>;
        case 'code':
          return <pre key={bIdx} style={{ background: 'rgba(0,0,0,0.4)', border: '1px solid var(--border-color)', borderRadius: '6px', padding: '10px 12px', fontFamily: 'monospace', fontSize: '12px', overflowX: 'auto', margin: '8px 0', color: '#93c5fd', whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}><code>{block.content}</code></pre>;
        case 'spacer':
          return <div key={bIdx} style={{ height: '8px' }} />;
        default:
          return <p key={bIdx} style={{ margin: '5px 0', color: 'var(--text-secondary)' }}>{formatInline((block as any).content ?? '')}</p>;
      }
    });
  };

  const activeComments = comments.filter(c => c.issueId === activeIssue.id);

  return (
    <aside className="split-sidebar">
      <div className="detail-header">
        <div className="detail-header-left">
          <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-tertiary)' }}>{activeIssue.id}</span>
        </div>
        <div style={{ display: 'flex', gap: '6px' }}>
          <button 
            className="btn-icon" 
            title="Delete Issue"
            onClick={() => deleteIssue(activeIssue.id)}
            style={{ color: 'var(--error-color)' }}
          >
            <Trash2 size={14} />
          </button>
          <button className="btn-icon" onClick={() => setActiveIssueId(null)}>
            <X size={14} />
          </button>
        </div>
      </div>

      <div className="detail-body">
        {/* Title */}
        <input 
          type="text" 
          value={activeIssue.title}
          onChange={handleTitleChange}
          className="detail-title-input"
          placeholder="Issue title"
        />

        {/* Properties Grid */}
        <div className="detail-properties">
          <span className="property-label"><StatusIcon status={activeIssue.status} size={12} /> Status</span>
          <div className="property-value">
            <select 
              value={activeIssue.status} 
              onChange={(e) => updateIssue(activeIssue.id, { status: e.target.value as IssueStatus })}
              className="property-select"
            >
              <option value="backlog">Backlog</option>
              <option value="todo">To Do</option>
              <option value="in_progress">In Progress</option>
              <option value="done">Done</option>
              <option value="canceled">Canceled</option>
            </select>
          </div>

          <span className="property-label"><PriorityIcon priority={activeIssue.priority} size={12} /> Priority</span>
          <div className="property-value">
            <select 
              value={activeIssue.priority} 
              onChange={(e) => updateIssue(activeIssue.id, { priority: e.target.value as IssuePriority })}
              className="property-select"
            >
              <option value="none">No Priority</option>
              <option value="urgent">Urgent</option>
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </select>
          </div>

          <span className="property-label">Estimate</span>
          <div className="property-value">
            <select 
              value={activeIssue.estimate === undefined ? '' : activeIssue.estimate} 
              onChange={(e) => updateIssue(activeIssue.id, { estimate: e.target.value ? parseInt(e.target.value) : undefined })}
              className="property-select"
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

          <span className="property-label">Assignee</span>
          <div className="property-value">
            <select 
              value={activeIssue.assignee?.id || ''} 
              onChange={(e) => {
                const selectedUser = users.find(u => u.id === e.target.value);
                updateIssue(activeIssue.id, { assignee: selectedUser || undefined });
              }}
              className="property-select"
            >
              <option value="">Unassigned</option>
              {users.map(u => (
                <option key={u.id} value={u.id}>{u.name}</option>
              ))}
            </select>
          </div>

          <span className="property-label">Tags</span>
          <div className="property-value" style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
            {labels.map(label => {
              const hasTag = activeIssue.labels.some(l => l.id === label.id);
              return (
                <button
                  key={label.id}
                  onClick={() => {
                    const newLabels = hasTag 
                      ? activeIssue.labels.filter(l => l.id !== label.id)
                      : [...activeIssue.labels, label];
                    updateIssue(activeIssue.id, { labels: newLabels });
                  }}
                  className="badge-label"
                  style={{
                    fontSize: '9px',
                    padding: '1px 4px',
                    cursor: 'pointer',
                    color: label.color,
                    borderColor: hasTag ? label.color : 'var(--border-color)',
                    backgroundColor: hasTag ? `${label.color}15` : 'transparent'
                  }}
                >
                  {label.name}
                </button>
              );
            })}
          </div>
        </div>

        {/* Description Section */}
        <div className="detail-description-wrapper">
          <span className="detail-section-label">Description</span>
          {isEditingDesc ? (
            <textarea
              className="detail-textarea"
              value={descValue}
              onChange={(e) => setDescValue(e.target.value)}
              onBlur={handleDescBlur}
              autoFocus
            />
          ) : (
            <div 
              className="markdown-preview" 
              onDoubleClick={() => setIsEditingDesc(true)}
              title="Double click to edit"
              style={{ cursor: 'text', padding: '6px 0' }}
            >
              {renderMarkdown(activeIssue.description)}
            </div>
          )}
        </div>

        {/* Checklist Subtasks */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', borderTop: '1px solid var(--border-color)', paddingTop: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
            <span className="detail-section-label" style={{ marginBottom: 0 }}>Checklist ({activeIssue.subtasks.filter(s => s.completed).length}/{activeIssue.subtasks.length})</span>
            
            <button 
              onClick={handleAiSubtasks}
              disabled={isAiLoading}
              className="ai-draft-badge" 
              style={{ fontSize: '10px', padding: '2px 6px', gap: '4px' }}
            >
              <Sparkles size={10} />
              <span>{isAiLoading ? 'Analyzing...' : 'Linear AI Subtasks'}</span>
            </button>
          </div>

          {isAiLoading && (
            <div className="ai-sparkles-container" style={{ padding: '6px 10px', fontSize: '11px' }}>
              <div className="ai-typing-indicator">
                <div className="ai-typing-dot"></div>
                <div className="ai-typing-dot"></div>
                <div className="ai-typing-dot"></div>
              </div>
              <span>Linear AI is analyzing issue details to outline subtasks...</span>
            </div>
          )}

          {activeIssue.subtasks.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              {activeIssue.subtasks.map(sub => (
                <div key={sub.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px', flexGrow: 1, cursor: 'pointer', fontSize: '12px' }}>
                    <input 
                      type="checkbox" 
                      checked={sub.completed}
                      onChange={() => toggleSubtask(activeIssue.id, sub.id)}
                      style={{ accentColor: 'var(--primary-color)' }}
                    />
                    <span style={{ 
                      textDecoration: sub.completed ? 'line-through' : 'none', 
                      color: sub.completed ? 'var(--text-tertiary)' : 'var(--text-secondary)'
                    }}>
                      {sub.title}
                    </span>
                  </label>
                  <button 
                    onClick={() => deleteSubtask(activeIssue.id, sub.id)}
                    className="btn-icon" 
                    style={{ width: '18px', height: '18px', padding: 0 }}
                  >
                    <Trash size={10} />
                  </button>
                </div>
              ))}
            </div>
          )}

          <form onSubmit={handleAddSubtaskSubmit} className="comment-input-container" style={{ marginTop: '4px' }}>
            <input 
              type="text" 
              placeholder="Add subtask title..."
              value={newSubtaskTitle}
              onChange={(e) => setNewSubtaskTitle(e.target.value)}
              className="comment-input"
              style={{ fontSize: '11px', padding: '4px 8px' }}
            />
            <button type="submit" className="btn-secondary" style={{ padding: '4px 8px', fontSize: '11px' }}>
              <PlusCircle size={12} />
            </button>
          </form>
        </div>

        {/* Comments Section */}
        <div className="comments-section">
          <span className="detail-section-label">Discussion</span>
          
          <div className="comment-list">
            {activeComments.map(comment => (
              <div key={comment.id} className="comment-item">
                <div className="avatar" style={{ width: '20px', height: '20px', fontSize: '8px', backgroundColor: comment.user.avatarColor }}>
                  {comment.user.initials}
                </div>
                <div className="comment-right">
                  <div className="comment-author-meta">
                    <span className="comment-author">{comment.user.name}</span>
                    <span className="comment-time">
                      {new Date(comment.createdAt).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  <div className="comment-body">{comment.body}</div>
                </div>
              </div>
            ))}
          </div>

          <form onSubmit={handleCommentSubmit} className="comment-input-container">
            <input 
              type="text" 
              placeholder="Post a comment..."
              value={commentValue}
              onChange={(e) => setCommentValue(e.target.value)}
              className="comment-input"
            />
            <button type="submit" className="btn-primary" style={{ padding: '4px 10px', fontSize: '11px' }}>Comment</button>
          </form>
        </div>
      </div>
    </aside>
  );
};
