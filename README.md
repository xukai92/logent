# Logent: A Logseq Plugin for Academics

Logent contains a set of Logseq utilities for academics, providing AI-powered chat functionality and automatic paper information fetching from academic sources.

## Features

### 🤖 AI Chat Integration
- **OpenAI API Support**: Chat with AI models directly in your Logseq blocks
- **Multiple Models**: Support for GPT-3.5-turbo, GPT-4-turbo, GPT-4-vision-preview, and custom models
- **Streaming Responses**: Real-time streaming of AI responses
- **Context-Aware Chat**: Conversational chat that maintains context from parent blocks
- **Format-Aware**: Automatic formatting for both Markdown and Org mode

### 📚 Paper Information Extraction
- **ArXiv Support**: Automatically fetch paper titles and abstracts from ArXiv URLs
- **OpenReview Support**: Extract paper information from OpenReview submissions
- **Smart URL Handling**: Converts PDF URLs to web versions for better parsing
- **Auto-Formatting**: Creates properly formatted links with collapsed abstracts

## Installation

1. Download or clone this repository
2. Place the plugin folder in your Logseq plugins directory
3. Enable the plugin in Logseq settings
4. Configure your OpenAI API key in the plugin settings

## Usage

### Available Slash Commands

- `/a-ask` - Ask AI a question about the current block content
- `/a-chat` - Continue conversation with AI using parent block context
- `/a-link` - Convert a paper URL into a formatted link with abstract
- `/a-links` - Process multiple paper URLs in child blocks

### Setting Up OpenAI API

1. Go to plugin settings
2. Set your OpenAI API key
3. Choose your preferred model
4. Configure other options like streaming, system message, etc.

### Fetching Paper Information

Simply paste an ArXiv or OpenReview URL in a block and use `/a-link` to automatically:
- Extract the paper title
- Fetch the abstract
- Create a properly formatted link
- Collapse the abstract for clean organization

### AI Chat Features

Use `/a-ask` for single-turn questions or `/a-chat` for multi-turn conversations that maintain context from the conversation thread.

## Development

This plugin has been converted from ClojureScript to TypeScript for better maintainability and type safety.

### Prerequisites
- Node.js (install using https://github.com/tj/n or similar)
- npm package manager

### Development Commands
- `npm install` - Install dependencies
- `npm run dev` - Development mode with file watching
- `npm run build` - Build the plugin for production

### Project Structure
- `src/plugin.ts` - Main plugin entry point with all functionality
- `src/main/` - Modular TypeScript source (planned architecture)
- `index.html` - Plugin manifest
- `package.json` - Package configuration with Logseq plugin metadata

## License

MIT License - see package.json for details.

## Author

Created by Kai Xu (@xukai92)