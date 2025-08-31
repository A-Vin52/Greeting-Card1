# Manual Project Startup and Build Guide

This document provides instructions on how to manually start, work on, and build your project.

## The Problem with `npm` and Permissions

It's common to face permission errors with `npm` on Windows. This usually happens because `npm` needs to access or create folders in protected locations. The steps below show how to get around this by running your terminal with the correct permissions.

This project uses Vite and React with TypeScript. You cannot simply open the `index.html` file in a browser because the TypeScript code (`.tsx` files) must be compiled into JavaScript first. The following steps guide you through this process.

---

## Step 1: Open a Terminal with Administrator Rights

To avoid permission errors, always run your command-line tool as an administrator.

1.  Click the **Start** button on your Windows taskbar.
2.  Type `cmd` or `powershell`.
3.  You will see **Command Prompt** or **Windows PowerShell** in the search results. Right-click on it.
4.  From the context menu, select **"Run as administrator"**.
5.  A new terminal window will open with administrator privileges.
6.  In this new terminal, navigate to your project folder:
    ```sh
    cd "k:\AI and I created\Idea\Greeting-Card1\Greeting-Card1"
    ```

---

## Step 2: Install Project Dependencies

Before running the project, you must download the necessary libraries (like React, Vite, etc.) defined in your `package.json` file.

1.  In the administrator terminal you opened in Step 1, run this command:
    ```sh
    npm install
    ```
2.  This command will download all required packages into the `node_modules` directory. You only need to do this once. If you add new libraries to the project in the future, you will need to run it again.

---

## Step 3: Start the Development Server

Now you can start the local server to see your project live in the browser.

1.  In the same administrator terminal, run the following command:
    ```sh
    npm run dev
    ```
2.  This command tells Vite to start its development server. The terminal will display a message indicating that the server is running and provide a URL, which is usually `http://localhost:5173`.
3.  Open this URL in your web browser. You should now see your greeting card application.

---

## How to Save and Build Your Project

### Saving Your Work

While the development server (`npm run dev`) is running, any changes you make to your source code files (e.g., `src/components/App.tsx`) will be detected automatically when you save the file in your code editor. The web page in your browser will update instantly to reflect your changes.

### Creating a Final, Shareable Version

When you are happy with your greeting card and want to create a final version that you can upload to the internet, you need to "build" the project.

1.  If the development server is running, stop it by pressing `Ctrl + C` in the terminal.
2.  Run the build command:
    ```sh
    npm run build
    ```
3.  This command creates a new folder named `dist` in your project directory. This folder contains the final, optimized HTML, CSS, and JavaScript files.
4.  You can upload the contents of the `dist` folder to any web hosting service to share your greeting card with others. The `deploy` script in your `package.json` is configured to publish this `dist` folder to GitHub Pages.
