FROM node:22-alpine AS development

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm install

COPY . .

ENV TSC_WATCHFILE=PriorityPollingInterval
ENV TSC_WATCHDIRECTORY=DynamicPriorityPolling

EXPOSE 3000

CMD ["npx", "nest", "start", "--watch"]

FROM node:22-alpine AS build

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm install

COPY . .
RUN npm run build

FROM node:22-alpine AS production

WORKDIR /app

ENV NODE_ENV=production

COPY package.json package-lock.json ./
RUN npm install --omit=dev

COPY --from=build /app/dist ./dist

EXPOSE 3000

CMD ["node", "dist/main"]
