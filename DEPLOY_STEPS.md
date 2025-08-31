# How to Deploy Your Greeting Card

This guide provides the steps to deploy your project to GitHub Pages after making changes.

## Step-by-Step Guide

### Step 1: Make Your Changes

Add or edit any files in the project. For example, adding new music files to the `public/assets/music` directory.

### Step 2: Stage Your Changes

Open a terminal in the project's root directory and run the following command to add all your changes to the staging area for Git:

```bash
git add .
```

### Step 3: Commit Your Changes

Commit the staged changes to your local Git repository. This saves a snapshot of your changes.

```bash
git commit -m "Your descriptive message here"
```

Replace `"Your descriptive message here"` with a short description of the changes you made (e.g., `"Add new background music"`).

### Step 4: Push Your Code to GitHub

Push your committed changes from your local repository to the main branch on GitHub. This updates the code stored on GitHub.

```bash
git push
```

### Step 5: Deploy to GitHub Pages

Finally, run the following command. This will build your project (creating the `dist` folder) and then deploy the contents of the `dist` folder to your GitHub Pages website, making it live.

```bash
npm run deploy
```

After this command finishes, your changes should be live on your website.
