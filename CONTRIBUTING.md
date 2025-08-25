# 🤝 Contributing to Seolaxy Discord Bot

Thank you for your interest in contributing to the Seolaxy Discord Bot! This document provides guidelines and instructions for contributing to this project.

## 📋 Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [Development Process](#development-process)
- [Code Style](#code-style)
- [Commit Guidelines](#commit-guidelines)
- [Pull Request Process](#pull-request-process)
- [Issue Reporting](#issue-reporting)

## Code of Conduct

This project adheres to a code of conduct. By participating, you are expected to uphold this code:

- Be respectful and inclusive
- Exercise consideration and empathy
- Focus on what is best for the community
- Gracefully accept constructive criticism

## Getting Started

### Prerequisites

- Node.js 16.9.0 or higher
- npm latest version
- Git
- A Discord account and server for testing

### Setup Development Environment

1. **Fork the repository** on GitHub
2. **Clone your fork** locally:
   ```bash
   git clone https://github.com/your-username/seolaxy-discord-bot.git
   cd seolaxy-discord-bot
   ```

3. **Install dependencies**:
   ```bash
   npm install
   ```

4. **Set up environment**:
   ```bash
   npm run setup
   # or manually copy env.example to .env and fill in values
   ```

5. **Deploy commands** for testing:
   ```bash
   npm run deploy
   ```

6. **Start the bot** in development mode:
   ```bash
   npm run dev
   ```

## Development Process

### Branching Strategy

- `main` - Production-ready code
- `develop` - Integration branch for features
- `feature/feature-name` - New features
- `bugfix/bug-name` - Bug fixes
- `hotfix/fix-name` - Critical production fixes

### Workflow

1. Create a new branch from `main`:
   ```bash
   git checkout main
   git pull origin main
   git checkout -b feature/your-feature-name
   ```

2. Make your changes following the [Code Style](#code-style) guidelines

3. Test your changes thoroughly

4. Commit your changes using [conventional commits](#commit-guidelines)

5. Push to your fork and submit a pull request

## Code Style

### ESLint Configuration

This project uses ESLint for code linting. Run linting before committing:

```bash
# Check for linting errors
npm run lint

# Fix auto-fixable linting errors
npm run lint:fix
```

### Style Guidelines

- **Indentation**: 4 spaces
- **Quotes**: Single quotes for strings
- **Semicolons**: Always use semicolons
- **Line length**: 100 characters maximum
- **Function naming**: camelCase
- **Constants**: UPPER_SNAKE_CASE
- **File naming**: kebab-case for files

### Code Structure

```javascript
// Good example
const { Client, GatewayIntentBits } = require('discord.js');

class CommandHandler {
    constructor(client) {
        this.client = client;
    }

    async executeCommand(interaction) {
        // Implementation
    }
}

module.exports = CommandHandler;
```

### Documentation

- Add JSDoc comments for functions and classes
- Update README.md if adding new features
- Include inline comments for complex logic

```javascript
/**
 * Handles the hello command interaction
 * @param {CommandInteraction} interaction - The Discord interaction object
 * @returns {Promise<void>}
 */
async function handleHelloCommand(interaction) {
    // Implementation
}
```

## Commit Guidelines

### Conventional Commits

Use [Conventional Commits](https://www.conventionalcommits.org/) format:

```
<type>[optional scope]: <description>

[optional body]

[optional footer(s)]
```

### Types

- **feat**: A new feature
- **fix**: A bug fix
- **docs**: Documentation only changes
- **style**: Changes that do not affect the meaning of the code
- **refactor**: A code change that neither fixes a bug nor adds a feature
- **perf**: A code change that improves performance
- **test**: Adding missing tests or correcting existing tests
- **chore**: Changes to the build process or auxiliary tools

### Examples

```bash
feat: add music playback command
fix: resolve memory leak in event handler
docs: update installation instructions
style: fix indentation in index.js
refactor: extract command handler into separate module
```

## Pull Request Process

### Before Submitting

1. **Ensure tests pass** (if applicable)
2. **Run linting**: `npm run lint:fix`
3. **Update documentation** if needed
4. **Test your changes** thoroughly
5. **Check your branch is up to date** with main

### PR Template

When creating a pull request, include:

```markdown
## Description
Brief description of changes

## Type of Change
- [ ] Bug fix
- [ ] New feature
- [ ] Breaking change
- [ ] Documentation update

## Testing
- [ ] Tested locally
- [ ] Commands work as expected
- [ ] No console errors

## Checklist
- [ ] Code follows style guidelines
- [ ] Self-review completed
- [ ] Documentation updated
- [ ] No merge conflicts
```

### Review Process

1. **Automated checks** must pass
2. **Code review** by maintainers
3. **Testing** in development environment
4. **Approval** required before merging

## Issue Reporting

### Bug Reports

Use the bug report template and include:

- **Description**: Clear description of the bug
- **Steps to reproduce**: Step-by-step reproduction
- **Expected behavior**: What should happen
- **Actual behavior**: What actually happens
- **Environment**: OS, Node.js version, bot version
- **Logs**: Relevant error messages or logs

### Feature Requests

Include:

- **Problem**: What problem does this solve?
- **Solution**: Proposed solution or feature
- **Alternatives**: Any alternative solutions considered
- **Additional context**: Screenshots, examples, etc.

## Development Guidelines

### Adding New Commands

1. **Add command definition** in `scripts/deploy-commands.js`
2. **Add command handler** in `src/index.js`
3. **Test the command** thoroughly
4. **Update documentation**

Example:
```javascript
// In deploy-commands.js
{
    name: 'ping',
    description: 'Replies with Pong!',
}

// In index.js
case 'ping':
    await handlePingCommand(interaction);
    break;

async function handlePingCommand(interaction) {
    await interaction.reply('🏓 Pong!');
}
```

### Error Handling

Always include proper error handling:

```javascript
try {
    // Command logic
    await interaction.reply('Success!');
} catch (error) {
    log.error(`Error in command: ${error.message}`);
    
    const errorMessage = {
        content: '❌ Something went wrong!',
        ephemeral: true
    };

    if (interaction.replied || interaction.deferred) {
        await interaction.followUp(errorMessage);
    } else {
        await interaction.reply(errorMessage);
    }
}
```

### Logging

Use the built-in logging utility:

```javascript
log.info('Information message');
log.warn('Warning message');
log.error('Error message');
log.debug('Debug message'); // Only shows when LOG_LEVEL=debug
```

## Testing

### Manual Testing

1. **Deploy commands**: `npm run deploy`
2. **Start bot**: `npm run dev`
3. **Test in Discord**: Use commands in your test server
4. **Check logs**: Monitor console output for errors

### Future Testing Framework

We plan to add automated testing. Consider:

- Unit tests for utility functions
- Integration tests for command handlers
- Mock Discord interactions for testing

## Release Process

Releases are handled by maintainers:

1. **Version bump** in package.json
2. **Update CHANGELOG.md**
3. **Create GitHub release**
4. **Deploy to production**

## Getting Help

- **Documentation**: Check README.md and docs/ folder
- **Issues**: Search existing issues before creating new ones
- **Discussions**: Use GitHub Discussions for questions
- **Discord**: Join our Discord server (if available)

## Recognition

Contributors will be recognized in:

- **README.md**: Contributors section
- **Release notes**: Major contributors mentioned
- **GitHub**: Contributor stats and badges

---

Thank you for contributing to Seolaxy Discord Bot! 🎉
