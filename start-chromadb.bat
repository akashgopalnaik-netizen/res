@echo off
echo ======================================
echo   Restaurant App - Start ChromaDB
echo ======================================
echo.

set CHROMA_EXE=C:\Users\naika\AppData\Roaming\Python\Python313\Scripts\chroma.exe

if not exist "%CHROMA_EXE%" (
    echo ERROR: chroma.exe not found at expected path.
    echo Run: pip install chromadb
    pause
    exit /b 1
)

echo Starting ChromaDB at http://localhost:8000
echo Data stored in: server\chroma_data
echo.
echo Press Ctrl+C to stop ChromaDB
echo.

"%CHROMA_EXE%" run --path server\chroma_data
