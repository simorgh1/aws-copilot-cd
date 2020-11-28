FROM node:14 AS build
WORKDIR /srv
RUN npm install raw-body http pino-http runes pino-pretty

FROM node:14-slim
WORKDIR /srv
COPY --from=build /srv .
ADD . .
EXPOSE 3000
CMD ["node", "index.js"]