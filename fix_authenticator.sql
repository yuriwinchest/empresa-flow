ALTER ROLE authenticator WITH PASSWORD 'postgres';
GRANT CONNECT ON DATABASE postgres TO authenticator;
GRANT USAGE ON SCHEMA public TO authenticator;
ALTER ROLE authenticator WITH LOGIN;
