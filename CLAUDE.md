# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Logent is a Logseq plugin for academics that provides AI-powered chat functionality and automatic paper information fetching from academic sources. The plugin is built in TypeScript and integrates with both OpenAI and Anthropic APIs.

## Development Commands

- `npm install` - Install dependencies  
- `npm run dev` - Development mode with TypeScript file watching
- `npm run build` - Build the plugin for production (compiles TypeScript to JavaScript)

## Architecture

### Core Structure
- **Main Entry Point**: `src/index.ts` - Simple import of the plugin module
- **Plugin Implementation**: `src/plugin.ts` - Contains all functionality in a single file (~840 lines)
- **Build Output**: TypeScript compiles to `plugin.js` in root directory (excluded from git)
- **Development**: Always edit `src/plugin.ts`, never `plugin.js` directly

### Key Components

**Multi-Provider AI Client**: Supports both OpenAI and Anthropic APIs with unified interface:
- OpenAI: Standard chat completions API with streaming support
- Anthropic: Messages API with format conversion to OpenAI-compatible responses
- Configurable models: GPT-3.5/4, Claude-3.5-sonnet/haiku, Claude-3-opus

**Logseq Integration**: 
- Slash commands: `/a-ask`, `/a-chat`, `/a-new`, `/a-swap`, `/a-dev`
- Block-based conversation threading with parent/child context
- Block iteration features: create new edited versions or edit in place
- Format-aware responses for both Markdown and Org mode
- Automatic property tagging (`language-model:: model-name`)

**Conversation Context**:
- `/a-ask`: Single-turn questions using current block content
- `/a-chat`: Multi-turn conversations using parent block + all child blocks as context
- `/a-new`: Create improved version in new sibling block after current block
- `/a-swap`: Replace current block content with improved version
- Context building via `childBlockToMessage()` function that identifies user vs assistant messages

**Stream Processing**: Real-time response streaming with configurable timeout and error handling

### Configuration
Settings managed through Logseq's settings schema with 10+ configurable options including provider selection, API keys, models, streaming preferences, and system messages.

### TypeScript Configuration
- Target: ES2020 with DOM libraries
- No module system (outputs plain JS)
- Strict mode disabled for Logseq compatibility
- Excludes test directory and compiled JS files