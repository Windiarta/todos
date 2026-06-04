import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { X, Users, Hash, Send, Loader2, AlertCircle } from 'lucide-react';

export const EditProjectModal: React.FC = () => {
  const {
    isEditProjectOpen,
    projectToEdit,
    toggleEditProject,
    updateProject,
    users
  } = useApp();

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [goal, setGoal] = useState('');
  const [selectedMemberIds, setSelectedMemberIds] = useState<string[]>([]);
  const [slackChannel, setSlackChannel] = useState('');
  const [slackPrivilege, setSlackPrivilege] = useState('disabled');
  const [discordChannel, setDiscordChannel] = useState('');
  const [discordPrivilege, setDiscordPrivilege] = useState('disabled');

  // Diagnostics states
  const [isTesting, setIsTesting] = useState(false);
  const [testResults, setTestResults] = useState<any | null>(null);

  // Sync state with projectToEdit
  useEffect(() => {
    if (projectToEdit) {
      setName(projectToEdit.name || '');
      setDescription(projectToEdit.description || '');
      setGoal(projectToEdit.goal || '');
      setSelectedMemberIds(projectToEdit.members?.map(m => m.id) || []);
      setSlackChannel(projectToEdit.slackChannel || '');
      setSlackPrivilege(projectToEdit.slackPrivilege || 'disabled');
      setDiscordChannel(projectToEdit.discordChannel || '');
      setDiscordPrivilege(projectToEdit.discordPrivilege || 'disabled');
      setTestResults(null);
    }
  }, [projectToEdit, isEditProjectOpen]);

  if (!isEditProjectOpen || !projectToEdit) return null;

  const handleClose = () => {
    toggleEditProject(false);
  };

  const handleSave = async () => {
    if (!name.trim()) return;
    try {
      await updateProject(projectToEdit.id, {
        name: name.trim(),
        description: description.trim() || undefined,
        goal: goal.trim() || undefined,
        slackChannel: slackChannel.trim() || undefined,
        slackPrivilege,
        discordChannel: discordChannel.trim() || undefined,
        discordPrivilege,
        memberIds: selectedMemberIds
      });
      handleClose();
    } catch (err) {
      console.error(err);
    }
  };

  const toggleMember = (userId: string) => {
    setSelectedMemberIds(prev =>
      prev.includes(userId)
        ? prev.filter(id => id !== userId)
        : [...prev, userId]
    );
  };

  const handleTestConnection = async () => {
    setIsTesting(true);
    setTestResults(null);
    try {
      // First save the current project state so the backend tests the updated values
      await updateProject(projectToEdit.id, {
        name: name.trim(),
        description: description.trim() || undefined,
        goal: goal.trim() || undefined,
        slackChannel: slackChannel.trim() || undefined,
        slackPrivilege,
        discordChannel: discordChannel.trim() || undefined,
        discordPrivilege,
        memberIds: selectedMemberIds
      });

      const response = await fetch(`/api/projects/${projectToEdit.id}/send-hello`, {
        method: 'POST'
      });
      if (response.ok) {
        const data = await response.json();
        setTestResults(data);
      } else {
        throw new Error('Failed to run diagnostics connection test');
      }
    } catch (error: any) {
      console.error(error);
      setTestResults({
        slackBot: 'failed',
        discordBot: 'failed',
        error: error.message
      });
    } finally {
      setIsTesting(false);
    }
  };

  const renderStatusBadge = (status: string) => {
    switch (status) {
      case 'success':
        return (
          <span style={{ color: '#2ea44f', backgroundColor: 'rgba(46, 164, 79, 0.1)', padding: '2px 6px', borderRadius: '3px', fontWeight: 500, fontSize: '10px' }}>
            Connected
          </span>
        );
      case 'failed':
        return (
          <span style={{ color: '#cb2431', backgroundColor: 'rgba(203, 36, 49, 0.1)', padding: '2px 6px', borderRadius: '3px', fontWeight: 500, fontSize: '10px' }}>
            Failed
          </span>
        );
      case 'not_configured':
      default:
        return (
          <span style={{ color: 'var(--text-tertiary)', backgroundColor: 'rgba(110, 118, 129, 0.1)', padding: '2px 6px', borderRadius: '3px', fontWeight: 500, fontSize: '10px' }}>
            Not Configured
          </span>
        );
    }
  };

  return (
    <div className="modal-overlay" onClick={handleClose}>
      <div 
        className="modal-content" 
        onClick={(e) => e.stopPropagation()}
        style={{
          width: '680px',
          maxHeight: '90vh',
          background: 'rgba(20, 21, 23, 0.85)',
          backdropFilter: 'blur(12px) saturate(190%)',
          border: '1px solid var(--border-hover)',
          borderRadius: '12px'
        }}
      >
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span className="modal-title" style={{ fontSize: '15px', color: 'var(--text-primary)' }}>
              Project Settings: {projectToEdit.name}
            </span>
          </div>
          <button className="btn-icon" onClick={handleClose}>
            <X size={16} />
          </button>
        </div>

        <div className="modal-body" style={{ gap: '20px', padding: '24px', overflowY: 'auto', maxHeight: 'calc(90vh - 120px)' }}>
          {/* Project Details Section */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '11px', fontWeight: '600', color: 'var(--text-tertiary)', textTransform: 'uppercase', marginBottom: '6px' }}>Project Name *</label>
              <input
                type="text"
                placeholder="e.g. Linear Integration"
                className="input-title"
                value={name}
                onChange={(e) => setName(e.target.value)}
                autoFocus
                style={{ fontSize: '15px', borderBottom: '1px solid var(--border-color)', padding: '6px 0' }}
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: '600', color: 'var(--text-tertiary)', textTransform: 'uppercase', marginBottom: '6px' }}>Description</label>
                <textarea
                  placeholder="What is this project about?"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  style={{
                    width: '100%',
                    minHeight: '80px',
                    backgroundColor: 'rgba(255,255,255,0.02)',
                    border: '1px solid var(--border-color)',
                    borderRadius: '6px',
                    padding: '8px',
                    fontSize: '12px',
                    color: 'var(--text-primary)',
                    resize: 'vertical'
                  }}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: '600', color: 'var(--text-tertiary)', textTransform: 'uppercase', marginBottom: '6px' }}>Goal / Objective</label>
                <textarea
                  placeholder="Key objective of the project..."
                  value={goal}
                  onChange={(e) => setGoal(e.target.value)}
                  style={{
                    width: '100%',
                    minHeight: '80px',
                    backgroundColor: 'rgba(255,255,255,0.02)',
                    border: '1px solid var(--border-color)',
                    borderRadius: '6px',
                    padding: '8px',
                    fontSize: '12px',
                    color: 'var(--text-primary)',
                    resize: 'vertical'
                  }}
                />
              </div>
            </div>
          </div>

          {/* Team Members Selection */}
          <div>
            <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', fontWeight: '600', color: 'var(--text-tertiary)', textTransform: 'uppercase', marginBottom: '8px' }}>
              <Users size={12} />
              <span>Project Members</span>
            </label>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              {users.map(user => {
                const isSelected = selectedMemberIds.includes(user.id);
                return (
                  <button
                    key={user.id}
                    onClick={() => toggleMember(user.id)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      padding: '6px 12px',
                      borderRadius: '20px',
                      border: '1px solid',
                      borderColor: isSelected ? 'var(--primary-color)' : 'var(--border-color)',
                      backgroundColor: isSelected ? 'rgba(94, 106, 210, 0.15)' : 'transparent',
                      color: isSelected ? '#fff' : 'var(--text-secondary)',
                      fontSize: '12px',
                      cursor: 'pointer',
                      transition: 'all 0.1s'
                    }}
                  >
                    <span 
                      style={{ 
                        width: '8px', 
                        height: '8px', 
                        borderRadius: '50%', 
                        backgroundColor: user.avatarColor 
                      }} 
                    />
                    <span>{user.name}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '16px' }} />

          {/* Connections Section */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
            {/* Slack Connection */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', padding: '12px', background: 'rgba(255,255,255,0.01)', border: '1px solid var(--border-color)', borderRadius: '8px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', borderBottom: '1px solid var(--border-color)', paddingBottom: '6px', marginBottom: '4px' }}>
                <span style={{ fontSize: '12px', fontWeight: '700', color: '#36C5F0' }}>Slack Connection</span>
              </div>
              
              <div>
                <label style={{ display: 'block', fontSize: '10px', color: 'var(--text-tertiary)', textTransform: 'uppercase', marginBottom: '4px' }}>Channel Location (Name or ID)</label>
                <div style={{ position: 'relative' }}>
                  <Hash size={12} style={{ position: 'absolute', left: '8px', top: '9px', color: 'var(--text-tertiary)' }} />
                  <input
                    type="text"
                    placeholder="general"
                    value={slackChannel}
                    onChange={(e) => setSlackChannel(e.target.value)}
                    style={{
                      width: '100%',
                      backgroundColor: 'rgba(0,0,0,0.2)',
                      border: '1px solid var(--border-color)',
                      borderRadius: '4px',
                      padding: '6px 8px 6px 24px',
                      fontSize: '11px',
                      color: 'var(--text-primary)'
                    }}
                  />
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '10px', color: 'var(--text-tertiary)', textTransform: 'uppercase', marginBottom: '4px' }}>Privilege Access</label>
                <select
                  value={slackPrivilege}
                  onChange={(e) => setSlackPrivilege(e.target.value)}
                  style={{
                    width: '100%',
                    backgroundColor: 'rgba(0,0,0,0.2)',
                    border: '1px solid var(--border-color)',
                    borderRadius: '4px',
                    padding: '6px',
                    fontSize: '11px',
                    color: 'var(--text-primary)',
                    cursor: 'pointer'
                  }}
                >
                  <option value="disabled">Disabled</option>
                  <option value="read_only">Read Only (Bot Notifications Only)</option>
                  <option value="read_write">Read Write (Full Chatbot Assist)</option>
                </select>
              </div>
            </div>

            {/* Discord Connection */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', padding: '12px', background: 'rgba(255,255,255,0.01)', border: '1px solid var(--border-color)', borderRadius: '8px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', borderBottom: '1px solid var(--border-color)', paddingBottom: '6px', marginBottom: '4px' }}>
                <span style={{ fontSize: '12px', fontWeight: '700', color: '#5865F2' }}>Discord Connection</span>
              </div>
              
              <div>
                <label style={{ display: 'block', fontSize: '10px', color: 'var(--text-tertiary)', textTransform: 'uppercase', marginBottom: '4px' }}>Channel Location (ID)</label>
                <div style={{ position: 'relative' }}>
                  <Hash size={12} style={{ position: 'absolute', left: '8px', top: '9px', color: 'var(--text-tertiary)' }} />
                  <input
                    type="text"
                    placeholder="123456789012345678"
                    value={discordChannel}
                    onChange={(e) => setDiscordChannel(e.target.value)}
                    style={{
                      width: '100%',
                      backgroundColor: 'rgba(0,0,0,0.2)',
                      border: '1px solid var(--border-color)',
                      borderRadius: '4px',
                      padding: '6px 8px 6px 24px',
                      fontSize: '11px',
                      color: 'var(--text-primary)'
                    }}
                  />
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '10px', color: 'var(--text-tertiary)', textTransform: 'uppercase', marginBottom: '4px' }}>Privilege Access</label>
                <select
                  value={discordPrivilege}
                  onChange={(e) => setDiscordPrivilege(e.target.value)}
                  style={{
                    width: '100%',
                    backgroundColor: 'rgba(0,0,0,0.2)',
                    border: '1px solid var(--border-color)',
                    borderRadius: '4px',
                    padding: '6px',
                    fontSize: '11px',
                    color: 'var(--text-primary)',
                    cursor: 'pointer'
                  }}
                >
                  <option value="disabled">Disabled</option>
                  <option value="read_only">Read Only (Bot Notifications Only)</option>
                  <option value="read_write">Read Write (Full Chatbot Assist)</option>
                </select>
              </div>
            </div>
          </div>

          {/* Inline Diagnostics Test connection */}
          <div style={{ 
            marginTop: '10px', 
            padding: '16px', 
            background: 'rgba(94, 106, 210, 0.03)', 
            border: '1px dashed rgba(94, 106, 210, 0.25)', 
            borderRadius: '8px',
            display: 'flex',
            flexDirection: 'column',
            gap: '12px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                <span style={{ fontSize: '12px', fontWeight: '600', color: 'var(--text-primary)' }}>Integrations Diagnostics</span>
                <span style={{ fontSize: '10px', color: 'var(--text-tertiary)' }}>Test connection endpoints with active settings</span>
              </div>
              <button 
                onClick={handleTestConnection}
                disabled={isTesting}
                className="btn-secondary"
                style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: '6px',
                  borderColor: 'rgba(94, 106, 210, 0.3)',
                  backgroundColor: 'rgba(94, 106, 210, 0.05)',
                  padding: '6px 12px',
                  fontSize: '11px',
                  borderRadius: '4px'
                }}
              >
                {isTesting ? (
                  <Loader2 size={12} className="animate-spin" />
                ) : (
                  <Send size={12} />
                )}
                <span>Test & Save</span>
              </button>
            </div>

            {testResults && (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', fontSize: '11px', borderTop: '1px solid var(--border-color)', paddingTop: '12px' }}>
                {/* Slack Results */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--text-secondary)', fontWeight: 500 }}>Slack Chatbot</span>
                    {renderStatusBadge(testResults.slackBot)}
                  </div>
                  {testResults.errors?.slackBot && (
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: '4px', color: 'var(--error-color)', fontSize: '10px', backgroundColor: 'rgba(226, 72, 72, 0.05)', padding: '4px 6px', borderRadius: '4px', wordBreak: 'break-all' }}>
                      <AlertCircle size={10} style={{ flexShrink: 0, marginTop: '1px' }} />
                      <span>{testResults.errors.slackBot}</span>
                    </div>
                  )}
                </div>

                {/* Discord Results */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--text-secondary)', fontWeight: 500 }}>Discord Chatbot</span>
                    {renderStatusBadge(testResults.discordBot)}
                  </div>
                  {testResults.errors?.discordBot && (
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: '4px', color: 'var(--error-color)', fontSize: '10px', backgroundColor: 'rgba(226, 72, 72, 0.05)', padding: '4px 6px', borderRadius: '4px', wordBreak: 'break-all' }}>
                      <AlertCircle size={10} style={{ flexShrink: 0, marginTop: '1px' }} />
                      <span>{testResults.errors.discordBot}</span>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="modal-footer" style={{ borderTop: '1px solid var(--border-color)', padding: '16px 24px' }}>
          <button className="btn-secondary" onClick={handleClose}>Cancel</button>
          <button 
            className="btn-primary" 
            onClick={handleSave}
            disabled={!name.trim()}
            style={{ opacity: name.trim() ? 1 : 0.5 }}
          >
            Save Settings
          </button>
        </div>
      </div>
    </div>
  );
};
