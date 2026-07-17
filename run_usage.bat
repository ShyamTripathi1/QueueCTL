@echo off
queuectl enqueue "{\"id\":\"job1\",\"command\":\"echo Hello World\"}"
queuectl worker start --count 3
timeout /t 3 /nobreak > nul
queuectl status
queuectl list --state completed
queuectl worker stop
