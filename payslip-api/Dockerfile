FROM node:22-alpine

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm install

COPY . .

ENV TSC_WATCHFILE=PriorityPollingInterval
ENV TSC_WATCHDIRECTORY=DynamicPriorityPolling

EXPOSE 3000

CMD ["npx", "nest", "start", "--watch"]
