import type { IssuePriority } from '../types';

interface AIDraftResult {
  description: string;
  priority: IssuePriority;
  estimate: number;
  labelNames: string[];
}

export const aiDraftIssue = async (title: string): Promise<AIDraftResult> => {
  // Simulate network latency
  await new Promise((resolve) => setTimeout(resolve, 800));

  const lowerTitle = title.toLowerCase();
  let description = '';
  let priority: IssuePriority = 'medium';
  let estimate = 2;
  let labelNames: string[] = ['feature'];

  // Smart heuristic rules
  if (lowerTitle.includes('bug') || lowerTitle.includes('fix') || lowerTitle.includes('error') || lowerTitle.includes('fail') || lowerTitle.includes('crash')) {
    priority = 'high';
    estimate = 1;
    labelNames = ['bug'];
    description = `### Error Context
A problem was reported where the application behaves unexpectedly.

### Steps to Reproduce
1. Navigate to the affected page.
2. Trigger the action matching: "${title}"
3. Observe the error in the console or UI.

### Expected Behavior
The action should complete successfully without throwing exceptions or showing error messages.

### Technical Notes
Verify state updates and console log traces. Check if input validation handles edge cases.`;
  } else if (lowerTitle.includes('auth') || lowerTitle.includes('login') || lowerTitle.includes('password') || lowerTitle.includes('signup')) {
    priority = 'high';
    estimate = 3;
    labelNames = ['feature', 'security'];
    description = `### User Story
As a user, I want a secure authentication mechanism for "${title}" so that my personal data remains safe.

### Acceptance Criteria
- [ ] User can securely input credentials.
- [ ] Error messages display on invalid login attempts.
- [ ] Token session persists in localStorage.
- [ ] Session expires after 24 hours of inactivity.

### Security Checklist
- Encrypt passwords in transit.
- Implement rate limiting on the authentication endpoint.`;
  } else if (lowerTitle.includes('refactor') || lowerTitle.includes('clean') || lowerTitle.includes('rewrite') || lowerTitle.includes('optim')) {
    priority = 'low';
    estimate = 5;
    labelNames = ['refactor'];
    description = `### Objective
Refactor the codebase around "${title}" to improve maintainability, reduce technical debt, and boost performance.

### Areas to Optimize
- Identify redundant render cycles or logic loops.
- Extract utility functions into helper files.
- Add TypeScript type annotations.

### Non-goals
We should not modify any user-facing product features or UI styles in this pass.`;
  } else if (lowerTitle.includes('doc') || lowerTitle.includes('readme') || lowerTitle.includes('guide')) {
    priority = 'none';
    estimate = 1;
    labelNames = ['documentation'];
    description = `### Description
Draft detailed documentation for "${title}" to guide onboarding developers and external users.

### Key Sections to Include
- Getting Started & Prerequisites
- Code Architecture Diagram
- API Reference Guides
- Troubleshooting Tips`;
  } else {
    // Generic draft
    description = `### Summary
Implement the requirements for: **${title}**.

### Proposed Solution
Create the UI components and hook up context bindings. Write clear state handlers and ensure compatibility across desktop and mobile browsers.

### Acceptance Criteria
- [ ] Core interface is functional and responsive.
- [ ] Unit tests cover critical interaction states.
- [ ] Theme variables (Dark/Light modes) are correctly applied.`;
  }

  return { description, priority, estimate, labelNames };
};

export const aiGenerateSubtasks = async (title: string, description: string): Promise<string[]> => {
  // Simulate network latency
  await new Promise((resolve) => setTimeout(resolve, 1000));

  const lowerTitle = title.toLowerCase() + ' ' + description.toLowerCase();
  
  if (lowerTitle.includes('bug') || lowerTitle.includes('fix')) {
    return [
      'Write reproducible test case',
      'Inspect API payload and response log files',
      'Fix root state validation failure',
      'Verify fix works on mobile and desktop layout',
      'Add unit regression test'
    ];
  }
  
  if (lowerTitle.includes('auth') || lowerTitle.includes('login') || lowerTitle.includes('sign')) {
    return [
      'Design form fields (email, password inputs)',
      'Add client-side form validation',
      'Implement API token exchange handler',
      'Set up authentication Context and session cookies',
      'Redirect user on successful authentication'
    ];
  }

  if (lowerTitle.includes('refactor') || lowerTitle.includes('performance') || lowerTitle.includes('clean')) {
    return [
      'Analyze bundle sizes and render bottlenecks',
      'Deconstruct monolithic component into smaller units',
      'Memoize slow functional handlers and selectors',
      'Run TypeScript compilation test without errors'
    ];
  }

  // Default fallback subtasks
  return [
    'Define API schema and frontend TypeScript interfaces',
    'Build skeletal UI component mockups',
    'Hook up click handlers and loading states',
    'Incorporate dark mode theme styling variables',
    'Write documentation checklist'
  ];
};

interface AIChatResponse {
  answer: string;
  action?: {
    type: 'create_issue' | 'filter_issues' | 'change_theme' | 'navigate';
    payload: any;
  };
}

export const processAIChatCommand = async (query: string): Promise<AIChatResponse> => {
  // Simulate network latency
  await new Promise((resolve) => setTimeout(resolve, 600));

  const cleanQuery = query.replace(/^ai\s+/i, '').trim().toLowerCase();

  // Create issue instruction
  if (cleanQuery.startsWith('create issue') || cleanQuery.startsWith('new issue') || cleanQuery.startsWith('add issue')) {
    const titleMatch = query.match(/(?:create|new|add)\s+issue\s+(?:titled|named|for)?\s*["']?([^"']+)["']?/i);
    const title = titleMatch ? titleMatch[1] : 'AI Drafted Issue';
    const draft = await aiDraftIssue(title);
    
    return {
      answer: `I have drafted a new issue for you: "**${title}**". I've populated the description template, set the priority to **${draft.priority}**, assigned an estimate of **${draft.estimate} SP**, and suggested the label **"${draft.labelNames[0]}"**. You can review and click save!`,
      action: {
        type: 'create_issue',
        payload: {
          title,
          description: draft.description,
          priority: draft.priority,
          estimate: draft.estimate,
          labels: draft.labelNames
        }
      }
    };
  }

  // Change theme instruction
  if (cleanQuery.includes('theme') || cleanQuery.includes('dark mode') || cleanQuery.includes('light mode')) {
    let theme: 'dark' | 'light' | 'dawn' | 'dusk' = 'dark';
    if (cleanQuery.includes('light')) theme = 'light';
    else if (cleanQuery.includes('dawn') || cleanQuery.includes('purple')) theme = 'dawn';
    else if (cleanQuery.includes('dusk') || cleanQuery.includes('warm') || cleanQuery.includes('bronze')) theme = 'dusk';

    return {
      answer: `Switched the theme to **${theme.toUpperCase()}**. Let me know if you'd like to try another style (dark, light, dawn, or dusk)!`,
      action: {
        type: 'change_theme',
        payload: { theme }
      }
    };
  }

  // Filter issues instruction
  if (cleanQuery.includes('my issues') || cleanQuery.includes('assigned to me') || cleanQuery.includes('mine')) {
    return {
      answer: `Filtering board and list views to show only your assigned tasks.`,
      action: {
        type: 'filter_issues',
        payload: { filter: 'my_issues' }
      }
    };
  }

  if (cleanQuery.includes('urgent') || cleanQuery.includes('high priority')) {
    return {
      answer: `Filtering board and list views to highlight urgent issues.`,
      action: {
        type: 'filter_issues',
        payload: { filter: 'urgent' }
      }
    };
  }

  if (cleanQuery.includes('all issues') || cleanQuery.includes('reset filter') || cleanQuery.includes('show all')) {
    return {
      answer: `Filters cleared. Showing all active issues in the workspace.`,
      action: {
        type: 'filter_issues',
        payload: { filter: 'all' }
      }
    };
  }

  // Helpful conversational Q&A
  if (cleanQuery.includes('help') || cleanQuery.includes('shortcut') || cleanQuery.includes('keyboard')) {
    return {
      answer: `Here are the global keyboard shortcuts available in the workspace:
- \`C\`: Open the Create Issue modal
- \`CMD+K\` (or \`Ctrl+K\`): Toggle the Command Bar
- \`G\` then \`L\`: Switch to List View
- \`G\` then \`B\`: Switch to Board View
- \`G\` then \`I\`: View Inbox (filters assigned to you)
- \`Esc\`: Close active panel or modal

You can also use natural language here: e.g., "*create issue fix login button*", "*theme light*", or "*show my issues*"!`
    };
  }

  // General conversational fallbacks
  const greetings = ['hello', 'hi', 'hey', 'sup', 'yo'];
  if (greetings.some(g => cleanQuery.startsWith(g))) {
    return {
      answer: `Hello! I am your Linear AI workspace assistant. I can help you draft issues, create subtask lists, change visual themes, or filter work items. Try asking me to: "*create issue fix navbar crash*"!`
    };
  }

  return {
    answer: `I understood your query, but I'm not sure how to execute it as an automated action.

To perform actions, try saying:
- "*create issue [title]*"
- "*theme [dark/light/dawn/dusk]*"
- "*show my issues*" or "*show all issues*"

Otherwise, feel free to ask about keyboard shortcuts by typing "*shortcuts*"!`
  };
};
