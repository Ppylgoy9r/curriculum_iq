# Curriculum IQ 🧠
### AI-Powered Strategic Curriculum Intelligence Platform

Curriculum IQ is a high-performance analysis tool designed to audit academic curricula against industry trends using local AI (Ollama). It features a premium glassmorphism interface, robust batch management, and real-time analysis logs.

---

## 🚀 Quick Start (Local Development)

### Prerequisites
- **Node.js**: v20+
- **PostgreSQL**: Running locally or via Docker
- **Ollama**: Installed and running

### Setup
1. **Clone the repository**:
   ```bash
   git clone https://github.com/Ppylgoy9r/curriculum_iq.git
   cd curriculum_iq
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Configure Environment**:
   Create a `.env` file from the template:
   ```env
   DATABASE_URL="postgresql://user:password@localhost:5432/curriculum_iq?schema=public"
   OLLAMA_URL="http://127.0.0.1:11434"
   OLLAMA_MODEL="qwen2.5:3b"
   ```

4. **Initialize Database**:
   ```bash
   npx prisma db push
   ```

5. **Start Application**:
   ```bash
   npm run dev:all
   ```

---

## 🐳 Docker Deployment (Recommended)

Run the entire stack (App + Postgres + Ollama) with a single command:

```bash
docker-compose up -d
```
The app will be available at `http://localhost:3000`.

---

## 🏢 Office Laptop Migration Guide

If you need to run this on a restricted office laptop without internet access, follow these steps:

### 1. On your current machine:
Build and export the images to portable files:
```bash
# Build the stack
docker-compose build

# Export the application image
docker save curriculum-iq_app > curriculum_app.tar

# Export database and ollama (if needed)
docker save postgres:15-alpine > postgres.tar
docker save ollama/ollama:latest > ollama.tar
```

### 2. On your office laptop:
Copy the `.tar` files and the `docker-compose.yml` file, then run:
```bash
# Load the images
docker load < curriculum_app.tar
docker load < postgres.tar
docker load < ollama.tar

# Run the stack
docker-compose up -d
```

### 3. Customizing for Office Environment:
If you need to point to a different Ollama instance or use a specific model on the office laptop, update your environment variables when running:
```bash
OLLAMA_URL="http://office-ai-server:11434" OLLAMA_MODEL="llama3" docker-compose up -d
```

---

## 🛠 Tech Stack
- **Frontend**: React 19, Vite, Vanilla CSS (Premium Glassmorphism)
- **Backend**: Node.js, Express
- **Database**: PostgreSQL with Prisma ORM
- **AI Engine**: Ollama (Local LLM)
- **Infrastructure**: Docker & Docker Compose

---

## 📈 Features
- **Batch Processing**: Upload multiple XLS curricula for parallel analysis.
- **Deep Audit**: AI-driven gap analysis between curriculum content and industry trends.
- **Strategic Insights**: Weekly relevance scores and automated analyst notes.
- **Premium UI**: Full glassmorphism design with real-time processing terminal.
