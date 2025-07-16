@echo off
echo 🚀 Starting Full-Stack Web Application...
echo.

REM Check if Docker is running
docker info >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ Docker is not running. Please start Docker and try again.
    pause
    exit /b 1
)

echo 📦 Building and starting all services...
docker-compose up --build

echo.
echo ✅ Application started successfully!
echo.
echo 🌐 Access your application:
echo    Frontend: http://localhost:3000
echo    Backend API: http://localhost:3001
echo    Database: localhost:5432
echo.
echo 📝 Useful commands:
echo    View logs: docker-compose logs -f
echo    Stop services: docker-compose down
echo    Rebuild: docker-compose up --build
pause 