# addon-todoist-chore-board/Dockerfile
# Build the React application
FROM node:18-alpine AS builder
WORKDIR /app
COPY web-ui/package.json web-ui/package-lock.json ./
RUN npm install
COPY web-ui/ ./
RUN npm run build

# Serve the application using a lightweight web server
FROM nginx:1.21-alpine
RUN apk add --no-cache jq
COPY --from=builder /app/dist /usr/share/nginx/html
COPY run.sh /
RUN chmod +x /run.sh
EXPOSE 80
CMD [ "/run.sh" ]
