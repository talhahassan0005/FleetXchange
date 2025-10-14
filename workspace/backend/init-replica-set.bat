@echo off
echo Initializing MongoDB replica set...

REM Initialize replica set
mongosh --eval "rs.initiate({_id: 'rs0', members: [{_id: 0, host: 'localhost:27017'}]})"

echo Replica set initialized!
pause
