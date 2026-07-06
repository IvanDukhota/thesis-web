FROM pgvector/pgvector:pg15
COPY init-db.sql /docker-entrypoint-initdb.d/init-db.sql
RUN chmod 644 /docker-entrypoint-initdb.d/init-db.sql
