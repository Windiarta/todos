import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { X, Users, Hash } from 'lucide-react';

export const CreateProjectModal: React.FC = () => {
  const {
    isCreateProjectOpen,
    toggleCreateProject,
    createProject,
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

  const handleClose = () => {
    setName('');
    setDescription('');
    setGoal('');
    setSelectedMemberIds([]);
    setSlackChannel('');
    setSlackPrivilege('disabled');
    setDiscordChannel('');
    setDiscordPrivilege('disabled');
    toggleCreateProject(false);
  };

  const handleSave = async () => {
    if (!name.trim()) return;
    try {
      await createProject({
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

  if (!isCreateProjectOpen) return null;

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
              Create New Project
            </span>
          </div>
          <button className="btn-icon" onClick={handleClose}>
            <X size={16} />
          </button>
        </div>

        <div className="modal-body" style={{ gap: '20px', padding: '24px' }}>
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
        </div>

        <div className="modal-footer" style={{ borderTop: '1px solid var(--border-color)', padding: '16px 24px' }}>
          <button className="btn-secondary" onClick={handleClose}>Cancel</button>
          <button 
            className="btn-primary" 
            onClick={handleSave}
            disabled={!name.trim()}
            style={{ opacity: name.trim() ? 1 : 0.5 }}
          >
            Create Project
          </button>
        </div>
      </div>
    </div>
  );
};
