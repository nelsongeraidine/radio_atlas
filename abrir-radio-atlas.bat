@echo off
setlocal enabledelayedexpansion
cd /d "%~dp0"

set "PNPM_MJS=%APPDATA%\npm\node_modules\pnpm\bin\pnpm.mjs"
set "USE_MJS=0"

call pnpm -v >nul 2>nul
if errorlevel 1 (
    if exist "%PNPM_MJS%" (
        set "USE_MJS=1"
    ) else (
        echo Nao encontrei um pnpm funcional. Instale com: npm install -g pnpm
        pause
        exit /b 1
    )
)

if not exist node_modules (
    echo Instalando dependencias pela primeira vez, isso pode demorar um pouco...
    if "!USE_MJS!"=="1" (
        call node "%PNPM_MJS%" install
    ) else (
        call pnpm install
    )
    if errorlevel 1 (
        echo Falha ao instalar dependencias.
        pause
        exit /b 1
    )
)

echo Iniciando Radio Atlas...
if "!USE_MJS!"=="1" (
    start "Radio Atlas - dev server" cmd /k node "%PNPM_MJS%" dev
) else (
    start "Radio Atlas - dev server" cmd /k pnpm dev
)

echo Aguardando o servidor subir...
for /l %%i in (1,1,30) do (
    powershell -NoProfile -Command "try { (New-Object Net.Sockets.TcpClient).Connect('127.0.0.1',3000); exit 0 } catch { exit 1 }" >nul 2>nul
    if not errorlevel 1 goto :ready
    timeout /t 1 /nobreak >nul
)

:ready
start "" http://localhost:3000

endlocal
