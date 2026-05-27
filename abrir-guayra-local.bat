@echo off
set URL=http://localhost:5173/recepcion
set PROFILE=%USERPROFILE%\guayra-chrome-profile

set CHROME1="C:\Program Files\Google\Chrome\Application\chrome.exe"
set CHROME2="C:\Program Files (x86)\Google\Chrome\Application\chrome.exe"

if exist %CHROME1% (
    start "" %CHROME1% --kiosk-printing --app=%URL% --user-data-dir="%PROFILE%"
) else if exist %CHROME2% (
    start "" %CHROME2% --kiosk-printing --app=%URL% --user-data-dir="%PROFILE%"
) else (
    echo No se encontro Chrome.
    pause
)
