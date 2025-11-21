FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .
# Генеруємо клієнт Prisma
RUN npx prisma generate

RUN npm run build

CMD ["npm", "run", "start:prod"]