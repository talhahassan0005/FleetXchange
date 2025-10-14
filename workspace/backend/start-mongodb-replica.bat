@echo off
echo Starting MongoDB as replica set...

REM Create data directory if it doesn't exist
if not exist "C:\data\db" mkdir "C:\data\db"

REM Start MongoDB with replica set configuration
mongod --dbpath C:\data\db --replSet rs0 --port 27017

pause
