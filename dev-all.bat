@echo off
title MediaGen - Full Dev Environment
echo ============================================
echo   MediaGen - Starting Full Dev Environment
echo ============================================
echo.

:: ---- LM Studio Server ----
echo [1/3] Starting LM Studio server...
lms server start
if %ERRORLEVEL% NEQ 0 (
    echo        WARNING: LM Studio server failed to start.
    echo        Make sure LM Studio is installed and a model is loaded.
) else (
    echo        LM Studio server started.
)
echo.

:: ---- ComfyUI Server ----
echo [2/3] Starting ComfyUI server...
set COMFYUI_VENV=C:\Users\PC\Documents\ComfyUI\.venv\Scripts\python.exe
set COMFYUI_MAIN=C:\Users\PC\AppData\Local\Programs\@comfyorgcomfyui-electron\resources\ComfyUI\main.py
set COMFYUI_EXTRA_MODELS=C:\Users\PC\AppData\Roaming\ComfyUI\extra_models_config.yaml

if not exist "%COMFYUI_VENV%" (
    echo        ERROR: ComfyUI venv not found at %COMFYUI_VENV%
    echo        Skipping ComfyUI...
) else (
    start "ComfyUI Server" "%COMFYUI_VENV%" "%COMFYUI_MAIN%" --listen 127.0.0.1 --port 8188 --output-directory "C:\Users\PC\Documents\ComfyUI\output" --input-directory "C:\Users\PC\Documents\ComfyUI\input" --extra-model-paths-config "%COMFYUI_EXTRA_MODELS%"
    echo        ComfyUI server starting on http://127.0.0.1:8188
)
echo.

:: ---- Next.js Dev Server ----
echo [3/3] Starting Next.js dev server...
echo        http://localhost:3000
echo ============================================
echo.
npm run dev
