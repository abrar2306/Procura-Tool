# How to Run Procura (Simple Guide)

This guide will help you start the Procura application on your computer. You will need to open **two separate terminal windows** (Command Prompt or PowerShell) — one for the Backend and one for the Frontend.

## Step 1: Start the Backend

The backend is the brain of the application (written in Python). 

1. Open a terminal (Command Prompt or PowerShell).
2. Navigate to the **project root** folder where `Procura-Tool` is located (this is important — the server is imported as `server`, which resolves from the repo root).
3. Run the following command to start the backend server:
   ```cmd
   python -m uvicorn server:app --host 0.0.0.0 --port 8001 --reload
   ```
   *(Note: Make sure you have installed the required Python packages first using `pip install -r requirements.txt` if this is your first time setting it up).*

4. Keep this terminal window open and running. You should see a message saying "Application startup complete".

---

## Step 2: Start the Frontend

The frontend is the user interface you interact with in your browser.

1. Open a **new, second** terminal window.
2. Navigate to the `Procura-Tool` folder again.
3. Go into the `frontend` folder by typing:
   ```cmd
   cd frontend
   ```
4. Run the following command to start the frontend interface:
   ```cmd
   npm start
   ```
   *(Note: `yarn start` also works if your Yarn version matches the lockfile. If it's your first time, run `npm install` first to install dependencies).*

5. Make sure the backend port matches what the frontend calls. If the backend runs on `8001`, create a `frontend/.env` file containing:
   ```
   REACT_APP_BACKEND_URL=http://localhost:8001
   ```
   (Without it the frontend defaults to `http://localhost:8000`.)

6. Keep this terminal window open too. The application should automatically open in your default web browser at `http://localhost:3000`.

---

## Summary
You must always have **both** terminal windows running at the same time to use the app. 
- **Terminal 1 (`backend` folder)**: Runs the Python API server.
- **Terminal 2 (`frontend` folder)**: Runs the React web interface.

To stop the servers at any time, just click on the respective terminal window and press `Ctrl + C` on your keyboard.
