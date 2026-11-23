@echo off
rem LLM-сервер для генерації текстів гри (етап 5): Qwen3.5-35B-A3B на RX 6700 XT (Vulkan0), частина експертів на CPU, OpenAI-сумісний API на 127.0.0.1:8080.
rem P102-100 (Vulkan1) лишається вільною для ComfyUI. Закрий вікно "Ashfog LLM", щоб зупинити.
set LLAMA=E:\AI\llama.cpp-vulkan\llama-server.exe
set MODEL=E:\AI\models\qwen35-35b-a3b\Qwen3.5-35B-A3B-UD-Q4_K_L.gguf
rem Швидша, але з гіршою українською: E:\AI\models\unsloth\Qwen3.5-9B-GGUF\Qwen3.5-9B-Q4_K_M.gguf
curl -s http://127.0.0.1:8080/health | find "ok" >nul
if not errorlevel 1 (echo Сервер уже працює. & exit /b 0)
start "Ashfog LLM" /min "%LLAMA%" -m "%MODEL%" -dev Vulkan0 -fit on -fitt 1024 -c 8192 -np 1 -fa on --host 127.0.0.1 --port 8080 --alias ashfog
echo Сервер запускається на http://127.0.0.1:8080 ...
