# 🧠 MedMap  
> **AI-powered interactive medical knowledge visualizer** built with React, TypeScript, D3.js, and Gemini API.

MedMap helps medical learners and professionals **understand complex medical concepts visually**.  
Simply enter a topic like *“Diabetes Mellitus”* and watch an intelligent, color-coded mind map unfold showing causes, symptoms, diagnostics, and treatments, powered by AI.

## 🧩 Tech Stack

| Technology | Purpose |
|-------------|----------|
| **React + TypeScript** | Core UI and logic framework |
| **Vite** | Lightning-fast dev environment and build tool |
| **Tailwind CSS** | Styling and responsive layout |
| **D3.js** | Data-driven mind map visualization |
| **Gemini API (Google AI)** | Generates conceptual medical relationships |
| **Vercel** | Hosting and deployment platform |

---

## 🧠 How It Works

1. The user enters a **medical topic** in the search bar.  
2. The app calls the **Gemini API**, which returns related concepts and relationships.  
3. **D3.js** visualizes these relationships as interactive nodes and links.  
4. Clicking on a node opens a **Side Panel** showing more details, allowing users to dive deeper or start a new map.  

---

## 🛠️ Installation

```bash
# Clone the repository
git clone https://github.com/SM1LE-X/MEDMAP.git
cd medmap

# Install dependencies
npm install

# Create a .env file in the root directory and add:
VITE_GEMINI_API_KEY=your_gemini_api_key_here

# Start the development server
npm run dev
