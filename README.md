# TechDesk – AI-Powered RCFA System

TechDesk is an AI-powered **Root Cause Failure Analysis (RCFA)** system designed to convert unstructured industrial failure logs into structured, actionable insights. Positioned as a **High-End Industrial Diagnostic Tool**, it uses a fine-tuned LLM (Llama-3.2 via Ollama) to analyze failure descriptions and output standardized JSON reports.

---

## 🎯 Product Overview

The goal of TechDesk is to reduce manual analysis time, standardize reporting, and improve decision-making for maintenance and reliability teams.

- **Primary Users**: Maintenance Engineers, Reliability Engineers, Operations Managers.
- **Key Problem Solved**: Handling large volumes of inconsistent failure logs and identifying patterns efficiently.

---

## 🧠 Core Features

### 1. Industrial Diagnostic Interface

- **'Slate & Steel' Theme**: A professional, dark-mode sidebar with a clean white/light-gray workspace optimized for industrial environments.
- **Real-time Feedback**: Color-coded **Latency Badges** (Green/Amber/Red) and a pulse-animated diagnostic button provide immediate visual cues.
- **Actionable Output**: One-click **Copy JSON** functionality for seamless integration into CMMS or maintenance reports.

### 2. AI-Driven Analysis

- **Inference**: Local AI inference via Ollama using the fine-tuned `techdesk-model`
- **Strict JSON Output**: Enforced by Pydantic validation and regex-based cleaning to strip conversational chatter.
- **Interactive Progress**: A multi-stage progress bar tracks the AI's internal consulting process in real-time.

### 3. History & Expandable Telemetry

- **Diagnostic History Log**: A centralized log of all previous AI analysis sessions with searchable and filterable capabilities.
- **Session-Specific Telemetry**: Each history row is expandable, revealing the **exact prompt** and **raw AI response** for that specific query.
- **Interactive Status**: Visual chevrons and color-coded OK/FAIL statuses indicate session health.

### 4. Benchmarking & Accuracy

- **Performance Dashboard**: Visual accuracy cards with percentage displays and progress bars.
- **Validation Highlighting**: Automatically highlights mismatches between AI predictions and ground truth.
- **Intelligent Error Handling**: Refactors technical Pydantic logs into user-friendly 'Invalid Category Detected' badges.

### 5. System Telemetry Logs

- **Terminal-Style Logs**: View raw backend-AI interactions in a dedicated monospace telemetry view.
- **Reload-Safe Architecture**: Logs are stored in the OS Temporary directory to bypass project file-watchers and prevent browser refreshes during analysis.

---

## 🏗️ Technical Architecture

### Tech Stack

- **Frontend**: HTML5, Tailwind CSS, Vanilla JavaScript (v1.0.5+).
- **Backend**: FastAPI (Python), Pydantic, Logging.
- **AI Layer**: Ollama (Llama-3.2 model).

### High-Level Flow

`[Frontend (Industrial UI)]` → `[FastAPI Backend]` → `[Ollama API]` → `[techdesk-model]`

---

## 🚀 Getting Started

### Prerequisites

- Python 3.10+
- [Ollama](https://ollama.com/) installed and running.
- Fine-tuned model registered as `techdesk-model`.

### Installation

1. **Setup the Backend**:

   ```powershell
   cd backend
   pip install -r requirements.txt
   python -m uvicorn main:app --reload --port 8080
   ```

   The backend will start at `http://localhost:8080`.
2. **Setup the Frontend**:
   Serve the `frontend` folder using a local server:

   ```powershell
   cd frontend
   python -m http.server 3000
   ```

   Navigate to `http://localhost:3000`.

---

## 🔌 API Design

### `POST /analyze`

Analyzes a failure description with latency tracking.

- **Request**: `{"failure_description": "..."}`
- **Response**: Includes `failure_category`, `root_cause`, `action_plan`, and `latency`.

### `GET /benchmark`

Runs the benchmarking suite against the ground truth dataset.

### `GET /logs`

Retrieves the latest system interaction logs from external temp storage.

---

## 📊 Documentation Log (Changelog)

### v1.0.5 - Expandable Session Telemetry

- **Interactive History**: Implemented expandable rows in the Diagnostic History Log.
- **Per-Query Logs**: Users can now view the specific prompt and raw AI response for any past interaction by clicking the row.
- **Visual Cues**: Added interactive chevrons and hover states to the history table.

### v1.0.4 - High-End Industrial UI/UX

- **Professional Theme**: Applied 'Slate & Steel' palette with dark sidebar and clean main workspace.
- **Enhanced Benchmarking**: Added accuracy summary cards, row highlighting for mismatches, and user-friendly error badges.
- **Real-time UI**: Implemented Latency Badges (Green/Amber/Red), 'Copy JSON' functionality, and button pulse animations.
- **Typography**: Integrated 'Inter' font and FontAwesome icons for a production-grade look.

### v1.0.3 - Stability & Logging Fixes

- **Externalized Logging**: Moved logs to the OS temp directory to prevent development tools from triggering unintended page reloads.
- **Cache Busting**: Added versioning to ensure latest frontend logic is always active.

### v1.0.2 - UX & Performance Updates

- **Progress Bar**: Added dynamic progress bar with multi-stage status messages.
- **Sequential Execution**: Refactored frontend to use sequential `async/await` to eliminate race conditions.

### v1.0.1 - AI Integration

- **Ollama Service**: Core service for local Ollama API communication.
- **JSON Repair**: Robust cleaning logic for conversational AI responses.

### v1.0.0 - Foundation

- Initial FastAPI + Vanilla JS structure.
- Core RCFA prompt engineering.
