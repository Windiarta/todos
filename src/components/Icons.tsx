import React from 'react';
import type { IssuePriority, IssueStatus } from '../types';



export const PriorityIcon: React.FC<{ priority: IssuePriority; size?: number }> = ({ priority, size = 14 }) => {
  switch (priority) {
    case 'urgent':
      return (
        <svg width={size} height={size} viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ color: 'var(--error-color)' }}>
          <rect x="1.5" y="1.5" width="13" height="13" rx="2" stroke="currentColor" strokeWidth="1.5" />
          <path d="M8 5V9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          <circle cx="8" cy="11.5" r="0.75" fill="currentColor" />
        </svg>
      );
    case 'high':
      return (
        <svg width={size} height={size} viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ color: 'var(--text-secondary)' }}>
          <rect x="2.5" y="3.5" width="2" height="9" rx="0.5" fill="currentColor" />
          <rect x="7" y="3.5" width="2" height="9" rx="0.5" fill="currentColor" />
          <rect x="11.5" y="3.5" width="2" height="9" rx="0.5" fill="currentColor" />
        </svg>
      );
    case 'medium':
      return (
        <svg width={size} height={size} viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ color: 'var(--text-tertiary)' }}>
          <rect x="2.5" y="3.5" width="2" height="9" rx="0.5" fill="currentColor" />
          <rect x="7" y="3.5" width="2" height="9" rx="0.5" fill="currentColor" />
          <rect x="11.5" y="3.5" width="2" height="9" rx="0.5" stroke="currentColor" strokeWidth="1" fill="none" />
        </svg>
      );
    case 'low':
      return (
        <svg width={size} height={size} viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ color: 'var(--text-tertiary)' }}>
          <rect x="2.5" y="3.5" width="2" height="9" rx="0.5" fill="currentColor" />
          <rect x="7" y="3.5" width="2" height="9" rx="0.5" stroke="currentColor" strokeWidth="1" fill="none" />
          <rect x="11.5" y="3.5" width="2" height="9" rx="0.5" stroke="currentColor" strokeWidth="1" fill="none" />
        </svg>
      );
    case 'none':
    default:
      return (
        <svg width={size} height={size} viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ color: 'var(--text-tertiary)', strokeDasharray: '2,2' }}>
          <circle cx="8" cy="8" r="6" stroke="currentColor" strokeWidth="1.5" />
        </svg>
      );
  }
};

export const StatusIcon: React.FC<{ status: IssueStatus; size?: number }> = ({ status, size = 14 }) => {
  switch (status) {
    case 'backlog':
      return (
        <svg width={size} height={size} viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ color: 'var(--text-tertiary)', strokeDasharray: '2.5,1.5' }}>
          <circle cx="8" cy="8" r="6" stroke="currentColor" strokeWidth="1.5" />
        </svg>
      );
    case 'todo':
      return (
        <svg width={size} height={size} viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ color: 'var(--text-secondary)' }}>
          <circle cx="8" cy="8" r="6" stroke="currentColor" strokeWidth="1.5" />
        </svg>
      );
    case 'in_progress':
      return (
        <svg width={size} height={size} viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ color: '#e0a96d' }}>
          <path d="M8 2C4.68629 2 2 4.68629 2 8C2 11.3137 4.68629 14 8 14V2Z" fill="currentColor" />
          <circle cx="8" cy="8" r="6" stroke="currentColor" strokeWidth="1.5" />
        </svg>
      );
    case 'done':
      return (
        <svg width={size} height={size} viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ color: 'var(--primary-color)' }}>
          <circle cx="8" cy="8" r="6.25" fill="currentColor" fillOpacity="0.1" stroke="currentColor" strokeWidth="1.5" />
          <path d="M5.5 8.5L7 10L10.5 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      );
    case 'canceled':
      return (
        <svg width={size} height={size} viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ color: 'var(--text-tertiary)' }}>
          <circle cx="8" cy="8" r="6" stroke="currentColor" strokeWidth="1.5" />
          <path d="M4 4L12 12" stroke="currentColor" strokeWidth="1.5" />
        </svg>
      );
  }
};
