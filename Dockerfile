FROM python:3.12-slim

ENV HOST=0.0.0.0
ENV PORT=8081
ENV DATA_FILE=/data/masseng-dev-db.json
ENV CORS_ORIGINS=*
ENV PYTHONUNBUFFERED=1

WORKDIR /app
COPY server.py ./server.py

RUN mkdir -p /data

EXPOSE 8081

CMD ["python", "server.py"]
