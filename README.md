# Russian Flashcard Generator

A full-stack application for generating intelligent Russian language flashcards to accelerate vocabulary and grammar learning. Built with a modern React + Azure-based architecture.

> ⚡ Designed to be used in conjunction with Anki for spaced repetition learning.

---

## 🚀 Overview

The **Russian Flashcard Generator** helps learners create high-quality flashcards automatically, reducing manual effort and improving retention through structured repetition.

It supports generating:
- Vocabulary flashcards
- Grammar-based examples
- Sentence-based context learning
- Native audio provided by Forvo
- Azure AI generated audio

---

## ✨ Features

- 🧠 AI-assisted flashcard generation
- 📚 Support for vocabulary, phrases, and grammar
- 🔊 Forvo integration for native speaker pronunciation
- 📖 Wiktionary integration for definitions and linguistic detail
- 🗣️ Azure Speech Service for AI-powered text-to-speech
- ⚡ Fast and responsive UI with React
- 🔒 Secure API integration

---

## 🏗️ Tech Stack

### Frontend
- React
- React Router
- TypeScript
- Mantine UI

### Backend
- Azure Functions (serverless API)
- RESTful APIs
- Azure AI Search
- Azure Speech Service
- Open AI integration

### Authentication (optional)
- Microsoft Entra ID

---

## 🔗 Dependencies

### 🌍 External APIs & Services

This project relies on the following external services:

- 🔊 **Forvo API** – Native pronunciation audio  
  https://api.forvo.com/

- 🤖 **OpenAI API** – AI-powered flashcard generation and language processing  
  https://platform.openai.com/home

---

### ☁️ Azure Resources

The application is built on Azure serverless and cloud-native services:

- ⚡ **Azure Functions** – Backend API layer (serverless compute)
- 🔎 **Azure AI Search** – Semantic search of translations and linguistic metadata
- 🗣️ **Azure Speech Service** – Text-to-speech generation for audio flashcards
- 🌐 **Azure Static Web Apps** – Hosting for the React frontend
- 💾 **Azure Storage Account** – Storage for media, flashcards, and assets
- 🔐 **Azure Key Vault (optional)** – Secure storage for API keys and secrets

---

## ⚙️ Configuration

### React App Configuration 

Add the below configuration to your env file (replacing examples):

**Your SPA app registration**
```env
VITE_AAD_CLIENT_ID=3daafc20-d3d6-4c1f-a91f-d9b87d68bf3b
VITE_AAD_TENANT_ID=d4bfbeda-57f3-4cea-98c4-21245eb37168
```

**API application and base URL**
```env
VITE_API_CLIENT_ID=4c65cf31-118a-4cc3-b970-15cc20df31c7
VITE_API_BASE_URL=https://func-yourfunctionapp.azurewebsites.net
```

### Function App Configuration

Add the below configuration to your Function App's Environment variables.

Use Key Vault references for enhanced security.

**Your SPA app registration**
```env
"AzureWebJobsStorage": "CONNECITON_STRING",
"OPENAI_API_KEY": "YOUR_OPENAI_KEY",
"SPEECH_SERVICE_KEY": "YOUR_SPEECH_SERVICE_KEY",
"FORVO_API_KEY": "YOUR_FORVO_API_KEY",
"AZURE_SEARCH_API_KEY": "YOUR_SEARCH_KEY",
"AZURE_SEARCH_ENDPOINT": "YOUR_SEARCH_ENDPOINT"
```

## Application Architecture

<img width="781" height="781" alt="Flashcard App drawio(2)" src="https://github.com/user-attachments/assets/2bd65715-ac4b-4ea5-8648-dcd867117f5e" />
