# Linear Clone: Premium Collaborative Todo & Issue Management

A premium, glassmorphic dark-themed Project & Issue management application modeled after Linear. Featuring an AI Copilot integrated via Model Context Protocol (MCP), Slack/Discord channel connectors, real-time collaboration, and multi-project Gantt chart timelines.

---

## 🚀 Key Features

*   **Beautiful Aesthetics**: Highly-curated dark mode theme with glassmorphism overlays (`backdrop-filter`), smooth micro-animations, and dynamic visual states.
*   **AI Workspace Copilot**: Block-based markdown chat panel connected directly to your issues and codebase.
*   **MCP (Model Context Protocol)**: Seamless extensibility to local tools, databases, and filesystem contexts.
*   **Chat Platform Integrations**: Connect project updates directly to Slack (via Socket Mode Bolt bot) and Discord channels.
*   **Interactive Workspace & Gantt Timelines**: Drag-and-drop kanban boards, issue detail side-panels, and unified Gantt-style planning.

---

## 🛠️ Tech Stack

*   **Frontend**: React (v19), TypeScript, Vite, Vanilla CSS.
*   **Backend**: Node.js, Express, PostgreSQL, WebSockets.
*   **Integrations**: `@slack/bolt`, `discord.js`.

---

## 📦 Getting Started

### Prerequisites
*   Node.js (v18+)
*   PostgreSQL running locally or on a remote server

### Installation & Setup

1.  **Clone the repository**:
    ```bash
    git clone https://github.com/Windiarta/todos.git
    cd todos
    ```

2.  **Install dependencies**:
    ```bash
    # Install client dependencies
    npm install

    # Install server dependencies
    cd server
    npm install
    cd ..
    ```

3.  **Database Configuration**:
    *   Create a database named `todos` (or your preferred name).
    *   Initialize the tables using `server/schema.sql`:
        ```bash
        psql -d todos -f server/schema.sql
        ```

4.  **Environment Variables**:
    *   Create a `.env` file inside the `server/` directory:
        ```env
        PORT=5001
        DATABASE_URL=postgresql://username:password@localhost:5432/todos
        ENCRYPTION_SECRET=your_32_character_secret_key_here
        # Optional Chat Integration Keys:
        SLACK_BOT_TOKEN=xoxb-...
        SLACK_APP_TOKEN=xapp-...
        DISCORD_TOKEN=...
        GEMINI_API_KEY=AIzaSy...
        ```

### Running Locally

To run both servers concurrently in development mode:

**Start Backend Server:**
```bash
cd server
npm run dev
```

**Start Frontend Client:**
```bash
# In a new terminal tab/window in the root directory
npm run dev
```

Visit the app locally at `http://localhost:5173`.

---

## 📘 Documentation

*   Detailed workspace architecture, issues lifecycle, and extension guidelines are documented in [collaboration.md](collaboration.md).
*   Visual specifications and theme-tokens can be found in [DESIGN.md](DESIGN.md).
