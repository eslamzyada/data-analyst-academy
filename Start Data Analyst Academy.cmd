@echo off
title Data Analyst Academy
cd /d "%~dp0app"
where node >nul 2>nul
if errorlevel 1 (
  echo.
  echo   Node.js is needed to run the Academy, and it was not found.
  echo   Install the LTS version from https://nodejs.org, then double-click this file again.
  echo.
  pause
  exit /b 1
)
echo.
echo   Starting Data Analyst Academy...
node server\index.js --open
if errorlevel 1 (
  echo.
  echo   Something went wrong while starting. The message above explains what.
  pause
)
