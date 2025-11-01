🗣️ Polyglot AI Translator ( Your Multilingual Speaking Coach )

This is a React application powered by the Gemini API for advanced, multi-step translation. It uses the browser's native Web Speech API for real-time voice transcription and text-to-speech output, and the Gemini API to process the transcribed English, correcting grammar, generating cultural insights, and providing a final, polished translation in a structured JSON format.

Technologies Used

Frontend Framework: React

Build Tool: Vite

Styling: Tailwind CSS

AI Backend: Google Gemini API (gemini-2.5-flash-preview-09-2025)

Browser APIs: Web Speech API (Speech Recognition and Speech Synthesis)

🚀 How to Run the Project

Follow these steps to set up and run the Polyglot AI Voice Assistant locally.

Prerequisites

You need to have Node.js (which includes npm) installed on your system.

Step 1: Install Dependencies

Navigate to the project directory in your terminal and install the required Node modules using npm:

npm install


Step 2: Configure the Gemini API Key

This application requires a Gemini API Key to perform grammar correction, tone analysis, and translation.

Get Your API Key: Obtain a key from Google AI Studio.

Update App.jsx: Open the src/App.jsx file. You will find the API configuration near the top:

// --- Gemini API Configuration for Cloud Fallback ---
// ⚠️ ACTION REQUIRED: Replace "YOUR_GEMINI_API_KEY_HERE" with the actual key you generated.
const API_KEY = "REPLACE-YOUR-GEMINI-API-KEY-HERE"; 
// ...


Replace the placeholder value with your actual key.

Step 3: Run the Development Server

Start the application in development mode using Vite:

npm run dev


This command will typically start the server on http://localhost:5173. Open this URL in a modern web browser (like Chrome, Edge, or Firefox) to use the application.

Note on Browser Compatibility: Speech Recognition (used for transcription) is a browser feature. For the best experience, use Google Chrome, as its implementation of the Web Speech API is generally the most robust.

Step 4: Using the Application

Select Language: Choose your desired target translation language from the dropdown menu (e.g., Spanish, French, Korean).

Click "Record": Click the microphone button to begin recording your voice. Your browser will prompt you for microphone permission if this is your first time.

Speak: Speak your phrase clearly in English.

Stop Recording: Click the button again (now labeled "Stop") or wait for the system to automatically stop when it detects a pause.

View Results: The application will then:

Show your Source Transcription.

Display the Corrected English (proofread by Gemini).

Provide Alternative Phrasings and Cultural Insights.

Show the Final AI Translation in the target language.

Hear Translation: Click the "Play Translation" button to hear the translated phrase spoken aloud via the Text-to-Speech API.